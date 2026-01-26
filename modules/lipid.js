/**
 * Hyperlipidemia Module
 * 高血脂模組 - UI v2.0 重構版
 * 使用新元件庫實現現代化卡片式設計，含 CV 風險視覺化
 */

(function() {
    DiseaseModules.lipid = {
        async getCardSummary() {
            try {
                const ldlObs = await fetchObservations([LOINC.LDL, LOINC.LDL_ALT], 1);

                if (ldlObs.length > 0) {
                    const value = ldlObs[0].valueQuantity?.value;
                    const status = evaluateStatus('ldl', value);

                    return UI.cardContent({
                        label: 'LDL-C',
                        value: value,
                        unit: 'mg/dL',
                        status: status ? UI.statusBadge(status.text, status.class) : ''
                    });
                }

                return '<div class="no-data">無血脂資料</div>';
            } catch (error) {
                return '<div class="no-data">載入失敗</div>';
            }
        },

        async getDetailContent() {
            try {
                // Fetch all lipid observations
                const lipidCodes = [
                    LOINC.TOTAL_CHOLESTEROL, LOINC.LDL, LOINC.LDL_ALT,
                    LOINC.HDL, LOINC.TRIGLYCERIDES
                ];
                const lipidObs = await fetchObservations(lipidCodes, 50);

                // Group by date
                const lipidByDate = {};
                lipidObs.forEach(obs => {
                    const code = obs.code?.coding?.[0]?.code;
                    const date = obs.effectiveDateTime?.split('T')[0] || '';

                    if (!lipidByDate[date]) {
                        lipidByDate[date] = { date: date, datetime: obs.effectiveDateTime };
                    }

                    if (obs.valueQuantity) {
                        if (code === LOINC.TOTAL_CHOLESTEROL) lipidByDate[date].tc = obs.valueQuantity.value;
                        else if (code === LOINC.LDL || code === LOINC.LDL_ALT) lipidByDate[date].ldl = obs.valueQuantity.value;
                        else if (code === LOINC.HDL) lipidByDate[date].hdl = obs.valueQuantity.value;
                        else if (code === LOINC.TRIGLYCERIDES) lipidByDate[date].tg = obs.valueQuantity.value;
                    }
                });

                const lipidHistory = Object.values(lipidByDate)
                    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
                    .slice(0, 10);

                const latest = lipidHistory[0] || {};

                // Calculate CV risk and targets
                const cvRisk = this.getCVRiskLevel();
                const ldlTarget = this.getLDLTarget(cvRisk.level);
                const drugStatus = this.getDrugStatus();

                let html = '';

                // Section 1: CV 風險分級
                html += UI.section('心血管風險分級', UI.cvRiskLevel({
                    level: cvRisk.level,
                    label: cvRisk.label,
                    target: ldlTarget.target,
                    factors: cvRisk.factors
                }));

                // Section 2: 血脂檢驗
                html += UI.section('血脂檢驗', `
                    <div class="metrics-grid-new">
                        ${this.buildLDLCard(latest, ldlTarget)}
                        ${this.buildHDLCard(latest)}
                        ${this.buildTGCard(latest)}
                        ${this.buildTCCard(latest)}
                    </div>
                `);

                // Section 3: LDL 達標進度
                if (latest.ldl != null) {
                    html += UI.section('LDL 達標進度', UI.progressBar({
                        current: latest.ldl,
                        target: ldlTarget.targetValue,
                        max: 200,
                        unit: 'mg/dL',
                        label: 'LDL-C'
                    }));
                }

                // Section 4: 降脂藥物階梯
                html += UI.section('降脂藥物治療', UI.drugLadder(this.buildDrugLadder(drugStatus)));

                // Section 5: CDS 建議
                html += `
                    <div class="section">
                        <div class="section__title">臨床決策建議</div>
                        <div id="lipid-cds-recommendations" class="cds-section-new">
                            <div class="no-data">載入建議中...</div>
                        </div>
                    </div>
                `;

                // Load CDS recommendations asynchronously
                setTimeout(() => this.loadCDSRecommendations(), 100);

                return html;

            } catch (error) {
                console.error('Error loading lipid detail:', error);
                return '<div class="error-message">載入失敗</div>';
            }
        },

        buildLDLCard(latest, ldlTarget) {
            const value = latest?.ldl;
            const status = evaluateStatus('ldl', value);

            return UI.metricCard({
                label: 'LDL-C',
                value: value ? Math.round(value) : null,
                unit: 'mg/dL',
                status: status,
                target: `目標 <${ldlTarget.targetValue}`,
                date: latest?.datetime
            });
        },

        buildHDLCard(latest) {
            const value = latest?.hdl;
            const status = this.getHDLStatus(value);

            return UI.metricCard({
                label: 'HDL-C',
                value: value ? Math.round(value) : null,
                unit: 'mg/dL',
                status: status,
                target: '目標 ≥40 (男)/≥50 (女)'
            });
        },

        buildTGCard(latest) {
            const value = latest?.tg;
            const status = evaluateStatus('triglycerides', value);

            return UI.metricCard({
                label: '三酸甘油酯',
                value: value ? Math.round(value) : null,
                unit: 'mg/dL',
                status: status,
                target: '目標 <150'
            });
        },

        buildTCCard(latest) {
            const value = latest?.tc;
            const status = evaluateStatus('totalCholesterol', value);

            return UI.metricCard({
                label: '總膽固醇',
                value: value ? Math.round(value) : null,
                unit: 'mg/dL',
                status: status,
                target: '參考 <200'
            });
        },

        getHDLStatus(value) {
            if (!value) return { text: '無資料', class: 'neutral' };
            if (value >= 60) return { text: '理想', class: 'good' };
            if (value >= 40) return { text: '正常', class: 'good' };
            return { text: '偏低', class: 'warning' };
        },

        getCVRiskLevel() {
            const factors = [];
            let level = 'low';

            // Check for ASCVD
            const hasASCVD = conditionsData?.some(c => {
                const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();
                return display.includes('atherosclerotic') || display.includes('ascvd') ||
                       display.includes('myocardial infarction') || display.includes('心肌梗塞') ||
                       display.includes('stroke') || display.includes('中風');
            });

            if (hasASCVD) {
                factors.push('ASCVD');
                level = 'very-high';
            }

            // Check for severe CKD
            const egfr = observationsCache[LOINC.EGFR]?.valueQuantity?.value;
            if (egfr && egfr < 30) {
                factors.push('嚴重 CKD (eGFR<30)');
                level = 'very-high';
            } else if (egfr && egfr < 60) {
                factors.push('中度 CKD');
                if (level !== 'very-high') level = 'high';
            }

            // Check for DM with target organ damage
            const hasDM = detectedDiseases?.includes('dm');
            const hasDMComplications = conditionsData?.some(c => {
                const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();
                return display.includes('retinopathy') || display.includes('nephropathy') ||
                       display.includes('neuropathy') || display.includes('視網膜') ||
                       display.includes('腎病變') || display.includes('神經病變');
            });

            if (hasDM && hasDMComplications) {
                factors.push('DM + 靶器官損傷');
                level = 'very-high';
            } else if (hasDM) {
                factors.push('糖尿病');
            }

            // Check for familial hypercholesterolemia
            const hasFH = conditionsData?.some(c => {
                const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();
                return display.includes('familial hypercholesterol') || display.includes('家族性高膽固醇');
            });

            if (hasFH) {
                factors.push('家族性高膽固醇血症');
                if (level !== 'very-high') level = 'high';
            }

            // Check for severe hypertension
            const sbp = observationsCache[LOINC.BP_SYSTOLIC]?.valueQuantity?.value;
            const dbp = observationsCache[LOINC.BP_DIASTOLIC]?.valueQuantity?.value;
            if ((sbp && sbp >= 180) || (dbp && dbp >= 110)) {
                factors.push('重度高血壓');
                if (level !== 'very-high') level = 'high';
            }

            // Check for very high LDL
            const ldl = observationsCache[LOINC.LDL]?.valueQuantity?.value ||
                        observationsCache[LOINC.LDL_ALT]?.valueQuantity?.value;
            if (ldl && ldl > 190) {
                factors.push('LDL >190 mg/dL');
                if (level !== 'very-high') level = 'high';
            }

            // If no high risk factors, check for moderate
            if (level === 'low' && factors.length === 0) {
                if (detectedDiseases?.includes('lipid')) {
                    factors.push('高血脂症');
                    level = 'moderate';
                }
            }

            const labels = {
                'very-high': '極高風險',
                'high': '高風險',
                'moderate': '中等風險',
                'low': '低風險'
            };

            return {
                level: level,
                label: labels[level],
                factors: factors
            };
        },

        getLDLTarget(riskLevel) {
            const targets = {
                'very-high': { target: '<55', targetValue: 55, note: '並降低 ≥50%' },
                'high': { target: '<70', targetValue: 70, note: '並降低 ≥50%' },
                'moderate': { target: '<100', targetValue: 100, note: '' },
                'low': { target: '<116', targetValue: 116, note: '' }
            };
            return targets[riskLevel] || targets['moderate'];
        },

        getDrugStatus() {
            const hasDrug = (keywords, classCode) => {
                // Check normalized medications first
                if (window.normalizedMedicationsData?.length > 0) {
                    const found = normalizedMedicationsData.some(m =>
                        m.normalized && m.class === classCode
                    );
                    if (found) return true;
                }

                // Fallback to keyword search
                if (medicationsData?.length > 0) {
                    return medicationsData.some(m =>
                        keywords.some(kw => m.name.toLowerCase().includes(kw))
                    );
                }
                return false;
            };

            return {
                statin: hasDrug(['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'fluvastatin', 'pitavastatin', 'lovastatin'], 'Statin'),
                ezetimibe: hasDrug(['ezetimibe', 'zetia'], 'Ezetimibe'),
                pcsk9i: hasDrug(['evolocumab', 'alirocumab', 'repatha', 'praluent'], 'PCSK9i')
            };
        },

        buildDrugLadder(drugStatus) {
            const steps = [
                {
                    number: 1,
                    name: 'Statin',
                    description: '高強度 Statin 為首選',
                    active: drugStatus.statin,
                    status: drugStatus.statin ? '使用中' : '建議使用'
                },
                {
                    number: 2,
                    name: '+ Ezetimibe',
                    description: 'LDL 未達標時加用',
                    active: drugStatus.ezetimibe,
                    status: drugStatus.ezetimibe ? '使用中' : (drugStatus.statin ? '建議加用' : '待評估')
                },
                {
                    number: 3,
                    name: '+ PCSK9i',
                    description: '極高風險且仍未達標時考慮',
                    active: drugStatus.pcsk9i,
                    status: drugStatus.pcsk9i ? '使用中' : '待評估'
                }
            ];

            // Determine which step is "next"
            if (!drugStatus.statin) {
                steps[0].next = true;
            } else if (!drugStatus.ezetimibe) {
                steps[1].next = true;
            } else if (!drugStatus.pcsk9i) {
                steps[2].next = true;
            }

            return steps;
        },

        async loadCDSRecommendations() {
            const container = document.getElementById('lipid-cds-recommendations');
            if (!container) return;

            try {
                if (typeof CDSEngine === 'undefined' || !CDSEngine.evaluateLipid) {
                    container.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    return;
                }

                let cdsResult = CDSEngine.getCachedLipid?.();
                if (!cdsResult) {
                    cdsResult = await CDSEngine.evaluateLipid();
                }

                if (!cdsResult || !cdsResult.recommendations || cdsResult.recommendations.length === 0) {
                    container.innerHTML = '<div class="no-data">目前無特別建議</div>';
                    return;
                }

                // Sort by priority and render
                const sorted = [...cdsResult.recommendations].sort((a, b) =>
                    (a.priority || 99) - (b.priority || 99)
                );

                const getPriorityType = (rec) => {
                    if (rec.priority === 1 || rec.category === 'statin_therapy') return 'urgent';
                    if (rec.priority === 2 || rec.category === 'combination_therapy') return 'warning';
                    return 'suggestion';
                };

                let html = '';

                // Add Lp(a) suggestion if not measured
                const context = cdsResult.context || {};
                if (context.lpa == null) {
                    html += UI.cdsCard({
                        priority: 'info',
                        message: '建議檢測 Lp(a)',
                        detail: '每位成人一生中至少測量一次 Lp(a)，作為心血管風險評估',
                        sources: ['ESC/EAS 2025']
                    });
                }

                sorted.slice(0, 4).forEach(rec => {
                    html += UI.cdsCard({
                        priority: getPriorityType(rec),
                        message: rec.message,
                        detail: rec.detail || '',
                        evidence: rec.evidence_level ? `LOE ${rec.evidence_level}` : '',
                        sources: ['ESC/EAS 2025']
                    });
                });

                container.innerHTML = html;
            } catch (error) {
                console.error('Lipid CDS evaluation failed:', error);
                container.innerHTML = '<div class="no-data">載入建議失敗</div>';
            }
        }
    };
})();
