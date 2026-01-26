/**
 * Diabetes Module (DM)
 * 糖尿病模組 - UI v2.0 重構版
 * 使用新元件庫實現現代化卡片式設計
 */

(function() {
    const DM_SNOMED = {
        DIABETES: ['44054006', '73211009', '46635009', '8801005'],
        DIABETIC_RETINOPATHY: ['422034002', '1551000119108', '4855003', '390834004'],
        DIABETIC_NEPHROPATHY: ['127013003', '421893009'],
        DIABETIC_NEUROPATHY: ['230572002', '421895002']
    };

    // Drug classes for DM
    const DM_DRUG_CLASSES = [
        { code: 'SGLT2i', name: 'SGLT2i', keywords: ['empagliflozin', 'dapagliflozin', 'canagliflozin'] },
        { code: 'GLP1RA', name: 'GLP-1 RA', keywords: ['semaglutide', 'liraglutide', 'dulaglutide', 'exenatide'] },
        { code: 'Biguanide', name: 'Metformin', keywords: ['metformin'] },
        { code: 'DPP4i', name: 'DPP-4i', keywords: ['sitagliptin', 'saxagliptin', 'linagliptin', 'alogliptin', 'vildagliptin'] },
        { code: 'SU', name: 'SU', keywords: ['glimepiride', 'gliclazide', 'glipizide', 'glyburide'] },
        { code: 'TZD', name: 'TZD', keywords: ['pioglitazone'] },
        { code: 'Insulin', name: 'Insulin', keywords: ['insulin'] }
    ];

    DiseaseModules.dm = {
        async getCardSummary() {
            try {
                const hba1c = observationsCache[LOINC.HBA1C] ||
                              (await fetchObservations(LOINC.HBA1C, 1))[0];

                if (hba1c?.valueQuantity) {
                    const value = hba1c.valueQuantity.value;
                    const status = evaluateStatus('hba1c', value);

                    return UI.cardContent({
                        label: '最新 HbA1c',
                        value: value,
                        unit: '%',
                        status: UI.statusBadge(status.text, status.class)
                    });
                }

                return '<div class="no-data">無 HbA1c 資料</div>';
            } catch (error) {
                console.error('DM card summary error:', error);
                return '<div class="no-data">載入失敗</div>';
            }
        },

        async getDetailContent() {
            try {
                // Fetch all data in parallel
                const [hba1cList, glucoseList, acrList, egfrList] = await Promise.all([
                    fetchObservations(LOINC.HBA1C, 10),
                    fetchObservations([LOINC.GLUCOSE, LOINC.GLUCOSE_ALT], 5),
                    fetchObservations([LOINC.ACR, LOINC.ACR_ALT], 5),
                    fetchObservations(LOINC.EGFR, 3)
                ]);

                const complications = this.checkComplications();
                const drugStatus = this.getDrugStatus();
                const hba1cTarget = this.getHbA1cTarget();

                let html = '';

                // Section 1: 血糖控制 (Metrics + Target)
                html += UI.section('血糖控制', `
                    <div class="metrics-grid-new">
                        ${this.buildHbA1cCard(hba1cList[0], hba1cTarget)}
                        ${this.buildGlucoseCard(glucoseList[0])}
                        ${this.buildTargetCard(hba1cTarget)}
                    </div>
                `);

                // Section 2: HbA1c 歷史趨勢
                if (hba1cList.length > 1) {
                    html += UI.section('HbA1c 歷史趨勢', `
                        <div class="chart-container" style="height: 250px; position: relative;">
                            <canvas id="dm-hba1c-chart"></canvas>
                        </div>
                    `);

                    const chartData = hba1cList.map(obs => ({
                        date: obs.effectiveDateTime,
                        value: obs.valueQuantity?.value
                    })).filter(d => d.value != null);

                    setTimeout(() => {
                        if (window.DashboardCharts && chartData.length > 0) {
                            DashboardCharts.createHbA1cHistoryChart('dm-hba1c-chart', chartData);
                        }
                    }, 50);
                }

                // Section 3: 腎病變篩檢
                html += UI.section('腎病變篩檢', `
                    <div class="metrics-grid-new">
                        ${this.buildACRCard(acrList[0])}
                        ${this.buildEGFRCard(egfrList[0])}
                    </div>
                `);

                // Section 4: 併發症狀態
                html += UI.section('併發症狀態', UI.complicationsList([
                    { name: '視網膜病變', present: complications.retinopathy, note: complications.retinopathy ? '需眼科追蹤' : '' },
                    { name: '腎病變', present: complications.nephropathy },
                    { name: '神經病變', present: complications.neuropathy }
                ]));

                // Section 5: 降糖藥物狀態
                html += UI.section('降糖藥物狀態', UI.drugStatusPills(drugStatus));

                // Section 6: CDS 建議
                html += `
                    <div class="section">
                        <div class="section__title">臨床決策建議</div>
                        <div id="cds-recommendations" class="cds-section-new">
                            <div class="no-data">載入建議中...</div>
                        </div>
                    </div>
                `;

                // Load CDS recommendations asynchronously
                setTimeout(() => this.loadCDSRecommendations(), 100);

                return html;
            } catch (error) {
                console.error('DM detail content error:', error);
                return '<div class="error-message">載入詳細資料失敗</div>';
            }
        },

        buildHbA1cCard(obs, target) {
            const value = obs?.valueQuantity?.value;
            const status = evaluateStatus('hba1c', value);
            const targetValue = parseFloat(target?.target?.replace(/[<>%]/g, '')) || 7;

            // Calculate trend if we have history
            let trend = null;
            if (observationsCache[LOINC.HBA1C + '_history']?.length > 1) {
                const history = observationsCache[LOINC.HBA1C + '_history'];
                const prev = history[1]?.valueQuantity?.value;
                if (prev && value) {
                    const diff = value - prev;
                    if (Math.abs(diff) >= 0.2) {
                        trend = { direction: diff > 0 ? 'up' : 'down', value: Math.abs(diff).toFixed(1) };
                    }
                }
            }

            return UI.metricCard({
                label: 'HbA1c',
                value: value ? value.toFixed(1) : null,
                unit: '%',
                status: status,
                target: `目標 ${target?.target || '<7%'}`,
                date: obs?.effectiveDateTime,
                trend: trend
            });
        },

        buildGlucoseCard(obs) {
            const value = obs?.valueQuantity?.value;
            const status = evaluateStatus('glucose', value);

            return UI.metricCard({
                label: '空腹血糖',
                value: value ? Math.round(value) : null,
                unit: 'mg/dL',
                status: status,
                target: '目標 80-130',
                date: obs?.effectiveDateTime
            });
        },

        buildACRCard(obs) {
            const value = obs?.valueQuantity?.value;
            const status = evaluateStatus('acr', value);

            return UI.metricCard({
                label: 'ACR',
                value: value ? Math.round(value) : null,
                unit: 'mg/g',
                status: status,
                target: '目標 <30',
                date: obs?.effectiveDateTime
            });
        },

        buildEGFRCard(obs) {
            const value = obs?.valueQuantity?.value;
            const status = evaluateStatus('egfr', value);

            return UI.metricCard({
                label: 'eGFR',
                value: value ? Math.round(value) : null,
                unit: 'mL/min',
                status: status,
                target: '目標 ≥60',
                date: obs?.effectiveDateTime
            });
        },

        buildTargetCard(target) {
            return UI.targetCard({
                title: '個人化 HbA1c 目標',
                value: target?.target || '<7%',
                indication: target?.indication || '一般成人',
                note: target?.note || '',
                evidence: target?.evidence || 'COR I / LOE A'
            });
        },

        getHbA1cTarget() {
            // Get individualized HbA1c target based on patient characteristics
            // This would typically come from CDSEngine
            try {
                if (typeof CDSEngine !== 'undefined' && CDSEngine.getCachedDM) {
                    const cached = CDSEngine.getCachedDM();
                    if (cached?.context?.hba1cTarget) {
                        return cached.context.hba1cTarget;
                    }
                }
            } catch (e) {
                console.warn('Could not get HbA1c target from CDS:', e);
            }

            // Default target
            const age = patientData?.birthDate ?
                Math.floor((new Date() - new Date(patientData.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

            if (age && age >= 75) {
                return { target: '7.5-8.0%', indication: '≥75 歲長者', note: '避免低血糖', evidence: 'COR I / LOE B' };
            } else if (age && age >= 65) {
                return { target: '<7.5%', indication: '65-74 歲', note: '', evidence: 'COR I / LOE B' };
            }

            return { target: '<7%', indication: '一般成人', note: '', evidence: 'COR I / LOE A' };
        },

        getDrugStatus() {
            // Check which drug classes the patient is on
            const status = [];

            for (const drugClass of DM_DRUG_CLASSES) {
                let isOn = false;
                let recommendation = null;

                // Check normalized medications first
                if (window.normalizedMedicationsData?.length > 0) {
                    isOn = normalizedMedicationsData.some(m =>
                        m.normalized && m.class === drugClass.code
                    );
                }

                // Fallback to keyword search
                if (!isOn && medicationsData?.length > 0) {
                    isOn = medicationsData.some(m =>
                        drugClass.keywords.some(kw =>
                            m.name.toLowerCase().includes(kw)
                        )
                    );
                }

                // Check if this drug class is recommended
                if (!isOn) {
                    // SGLT2i and GLP-1 RA are priority recommendations for patients with ASCVD/HF/CKD
                    const hasASCVD = conditionsData?.some(c =>
                        c.code?.coding?.[0]?.display?.toLowerCase().includes('atherosclerotic') ||
                        c.code?.text?.toLowerCase().includes('ascvd')
                    );
                    const hasHF = detectedDiseases?.includes('hf');
                    const hasCKD = detectedDiseases?.includes('ckd');

                    if (drugClass.code === 'SGLT2i' && (hasHF || hasCKD)) {
                        recommendation = 'HF/CKD 優先建議';
                    } else if (drugClass.code === 'GLP1RA' && hasASCVD) {
                        recommendation = 'ASCVD 優先建議';
                    }
                }

                status.push({
                    name: drugClass.name,
                    status: isOn ? 'active' : (recommendation ? 'recommended' : 'off'),
                    recommendation: recommendation
                });
            }

            return status;
        },

        checkComplications() {
            const activeConditions = conditionsData.filter(c =>
                c.clinicalStatus?.coding?.[0]?.code === 'active'
            );

            const hasCondition = (snomedCodes, keywords) => {
                return activeConditions.some(condition => {
                    const code = condition.code?.coding?.[0]?.code;
                    const display = (condition.code?.coding?.[0]?.display || condition.code?.text || '').toLowerCase();

                    if (snomedCodes.includes(code)) return true;
                    return keywords.some(kw => display.includes(kw.toLowerCase()));
                });
            };

            return {
                retinopathy: hasCondition(DM_SNOMED.DIABETIC_RETINOPATHY, ['retinopathy', '視網膜']),
                nephropathy: hasCondition(DM_SNOMED.DIABETIC_NEPHROPATHY, ['nephropathy', '腎病']),
                neuropathy: hasCondition(DM_SNOMED.DIABETIC_NEUROPATHY, ['neuropathy', '神經病變'])
            };
        },

        async loadCDSRecommendations() {
            const container = document.getElementById('cds-recommendations');
            if (!container) return;

            try {
                if (typeof CDSEngine === 'undefined') {
                    container.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    return;
                }

                // Get recommendations
                let cached = CDSEngine.getCachedDM?.();
                let recommendations;
                if (cached) {
                    recommendations = cached.recommendations;
                } else {
                    recommendations = await CDSEngine.evaluate();
                }

                if (!recommendations || recommendations.length === 0) {
                    container.innerHTML = '<div class="no-data">目前無特別建議</div>';
                    return;
                }

                // Sort by priority and render using new CDS cards
                const sorted = [...recommendations].sort((a, b) =>
                    (a.priority || 99) - (b.priority || 99)
                );

                // Map priority to card type
                const getPriorityType = (rec) => {
                    if (rec.priority === 1 || rec.category === 'contraindication') return 'urgent';
                    if (rec.priority === 2 || rec.category === 'warning') return 'warning';
                    if (rec.category === 'monitoring') return 'info';
                    return 'suggestion';
                };

                let html = '';
                sorted.slice(0, 6).forEach(rec => {
                    html += UI.cdsCard({
                        priority: getPriorityType(rec),
                        message: rec.text_zh || rec.text || rec.message,
                        detail: rec.detail || '',
                        evidence: rec.evidence_level ? `LOE ${rec.evidence_level}` : '',
                        sources: ['ADA 2026']
                    });
                });

                container.innerHTML = html;
            } catch (error) {
                console.error('CDS evaluation error:', error);
                container.innerHTML = '<div class="no-data">載入建議失敗</div>';
            }
        }
    };
})();
