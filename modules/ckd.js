/**
 * Chronic Kidney Disease Module (CKD)
 * 慢性腎臟病模組 - UI v2.0 重構版
 * 使用新元件庫實現現代化卡片式設計，含 KDIGO 風險矩陣
 */

(function() {
    // Drug classes for CKD
    const CKD_DRUG_CLASSES = [
        { code: 'SGLT2i', name: 'SGLT2i', keywords: ['empagliflozin', 'dapagliflozin', 'canagliflozin'] },
        { code: 'ACEi', name: 'ACEi', keywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'perindopril'] },
        { code: 'ARB', name: 'ARB', keywords: ['losartan', 'valsartan', 'irbesartan', 'telmisartan', 'olmesartan'] },
        { code: 'MRA', name: 'Finerenone', keywords: ['finerenone', 'kerendia'] },
        { code: 'Statin', name: 'Statin', keywords: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin'] }
    ];

    DiseaseModules.ckd = {
        async getCardSummary() {
            const egfr = observationsCache[LOINC.EGFR];

            if (egfr?.valueQuantity) {
                const value = egfr.valueQuantity.value;
                const status = evaluateStatus('egfr', value);

                return UI.cardContent({
                    label: 'eGFR',
                    value: value,
                    unit: 'mL/min',
                    status: status ? UI.statusBadge(status.text, status.class) : ''
                });
            }

            return '<div class="no-data">無 eGFR 資料</div>';
        },

        async getDetailContent() {
            try {
                // Fetch kidney function tests
                const kidneyObs = await fetchObservations([
                    LOINC.EGFR, LOINC.CREATININE, LOINC.CREATININE_ALT,
                    LOINC.BUN, LOINC.ACR, LOINC.ACR_ALT
                ], 50);

                // Fetch electrolytes
                const electrolyteObs = await fetchObservations([
                    LOINC.POTASSIUM, LOINC.SODIUM, LOINC.HEMOGLOBIN
                ], 20);

                // Process kidney function by date
                const kidneyByDate = {};
                kidneyObs.forEach(obs => {
                    const code = obs.code?.coding?.[0]?.code;
                    const date = obs.effectiveDateTime?.split('T')[0] || '';

                    if (!kidneyByDate[date]) {
                        kidneyByDate[date] = { date: date, datetime: obs.effectiveDateTime };
                    }

                    if (obs.valueQuantity) {
                        if (code === LOINC.EGFR) kidneyByDate[date].egfr = obs.valueQuantity.value;
                        else if (code === LOINC.CREATININE || code === LOINC.CREATININE_ALT) kidneyByDate[date].creatinine = obs.valueQuantity.value;
                        else if (code === LOINC.BUN) kidneyByDate[date].bun = obs.valueQuantity.value;
                        else if (code === LOINC.ACR || code === LOINC.ACR_ALT) kidneyByDate[date].acr = obs.valueQuantity.value;
                    }
                });

                const kidneyHistory = Object.values(kidneyByDate)
                    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
                    .slice(0, 15);

                const latest = kidneyHistory[0] || {};

                // Get latest electrolytes
                const electrolytes = {};
                electrolyteObs.forEach(obs => {
                    const code = obs.code?.coding?.[0]?.code;
                    if (obs.valueQuantity && !electrolytes[code]) {
                        electrolytes[code] = {
                            value: obs.valueQuantity.value,
                            unit: obs.valueQuantity.unit,
                            date: obs.effectiveDateTime
                        };
                    }
                });

                const drugStatus = this.getDrugStatus();
                const ckdStage = this.getCKDStage(latest.egfr, latest.acr);

                let html = '';

                // Section 1: 腎功能指標
                html += UI.section('腎功能指標', `
                    <div class="metrics-grid-new">
                        ${this.buildEGFRCard(latest)}
                        ${this.buildCreatinineCard(latest)}
                        ${this.buildACRCard(latest)}
                        ${this.buildBUNCard(latest)}
                    </div>
                `);

                // Section 2: KDIGO 風險矩陣
                html += UI.section('KDIGO 風險分級', UI.kdigoMatrix({
                    egfr: latest.egfr,
                    acr: latest.acr,
                    stage: ckdStage
                }));

                // Section 3: 腎臟保護藥物狀態
                html += UI.section('腎臟保護藥物', UI.drugStatusPills(drugStatus));

                // Section 4: 電解質監測
                const k = electrolytes[LOINC.POTASSIUM];
                const hb = electrolytes[LOINC.HEMOGLOBIN];

                html += UI.section('重要監測指標', `
                    <div class="metrics-grid-new">
                        ${this.buildPotassiumCard(k)}
                        ${this.buildHemoglobinCard(hb)}
                    </div>
                `);

                // Section 5: 腎功能歷史趨勢
                if (kidneyHistory.length > 1) {
                    html += UI.section('腎功能歷史趨勢', `
                        <div class="chart-container" style="height: 250px; position: relative;">
                            <canvas id="ckd-egfr-chart"></canvas>
                        </div>
                    `);

                    setTimeout(() => {
                        if (window.DashboardCharts) {
                            DashboardCharts.createKidneyHistoryChart('ckd-egfr-chart', kidneyHistory);
                        }
                    }, 50);
                }

                // Section 6: CDS 建議
                html += `
                    <div class="section">
                        <div class="section__title">臨床決策建議</div>
                        <div id="ckd-cds-recommendations" class="cds-section-new">
                            <div class="no-data">載入建議中...</div>
                        </div>
                    </div>
                `;

                // Load CDS recommendations asynchronously
                setTimeout(() => this.loadCDSRecommendations(), 100);

                return html;

            } catch (error) {
                console.error('Error loading CKD detail:', error);
                return '<div class="error-message">載入失敗</div>';
            }
        },

        buildEGFRCard(latest) {
            const value = latest?.egfr;
            const status = evaluateStatus('egfr', value);
            const stage = this.getGFRStage(value);

            return UI.metricCard({
                label: 'eGFR',
                value: value ? Math.round(value) : null,
                unit: 'mL/min',
                status: status,
                target: stage ? `分期 ${stage.label}` : '',
                date: latest?.datetime
            });
        },

        buildCreatinineCard(latest) {
            const value = latest?.creatinine;
            const status = evaluateStatus('creatinine', value);

            return UI.metricCard({
                label: 'Creatinine',
                value: value ? value.toFixed(2) : null,
                unit: 'mg/dL',
                status: status,
                target: '目標 0.7-1.3'
            });
        },

        buildACRCard(latest) {
            const value = latest?.acr;
            const status = evaluateStatus('acr', value);
            const stage = this.getACRStage(value);

            return UI.metricCard({
                label: 'ACR',
                value: value ? Math.round(value) : null,
                unit: 'mg/g',
                status: status,
                target: stage ? `分期 ${stage.label}` : '目標 <30'
            });
        },

        buildBUNCard(latest) {
            const value = latest?.bun;
            const status = evaluateStatus('bun', value);

            return UI.metricCard({
                label: 'BUN',
                value: value ? Math.round(value) : null,
                unit: 'mg/dL',
                status: status,
                target: '目標 7-20'
            });
        },

        buildPotassiumCard(k) {
            const value = k?.value;
            const status = evaluateStatus('potassium', value);

            return UI.metricCard({
                label: '鉀離子 (K⁺)',
                value: value ? value.toFixed(1) : null,
                unit: 'mEq/L',
                status: status,
                target: '目標 3.5-5.0',
                date: k?.date
            });
        },

        buildHemoglobinCard(hb) {
            const value = hb?.value;
            const status = evaluateStatus('hemoglobin', value);

            return UI.metricCard({
                label: '血紅素 (Hb)',
                value: value ? value.toFixed(1) : null,
                unit: 'g/dL',
                status: status,
                target: 'CKD 目標 10-11.5',
                date: hb?.date
            });
        },

        getGFRStage(egfr) {
            if (egfr == null) return null;
            if (egfr >= 90) return { label: 'G1', desc: '正常或偏高', risk: 'low' };
            if (egfr >= 60) return { label: 'G2', desc: '輕度降低', risk: 'low' };
            if (egfr >= 45) return { label: 'G3a', desc: '輕中度降低', risk: 'moderate' };
            if (egfr >= 30) return { label: 'G3b', desc: '中重度降低', risk: 'high' };
            if (egfr >= 15) return { label: 'G4', desc: '重度降低', risk: 'very-high' };
            return { label: 'G5', desc: '腎衰竭', risk: 'very-high' };
        },

        getACRStage(acr) {
            if (acr == null) return null;
            if (acr < 30) return { label: 'A1', desc: '正常至輕度增加', risk: 'low' };
            if (acr < 300) return { label: 'A2', desc: '中度增加', risk: 'moderate' };
            return { label: 'A3', desc: '重度增加', risk: 'high' };
        },

        getCKDStage(egfr, acr) {
            const gfr = this.getGFRStage(egfr);
            const acrStage = this.getACRStage(acr);

            return {
                gfr: gfr,
                acr: acrStage,
                overallRisk: this.getOverallRisk(gfr?.risk, acrStage?.risk)
            };
        },

        getOverallRisk(gfrRisk, acrRisk) {
            const riskLevels = ['low', 'moderate', 'high', 'very-high'];
            const gfrIdx = riskLevels.indexOf(gfrRisk) || 0;
            const acrIdx = riskLevels.indexOf(acrRisk) || 0;
            return riskLevels[Math.max(gfrIdx, acrIdx)];
        },

        getDrugStatus() {
            const status = [];

            for (const drugClass of CKD_DRUG_CLASSES) {
                let isOn = false;
                let recommendation = null;

                // Check normalized medications first
                if (window.normalizedMedicationsData?.length > 0) {
                    isOn = normalizedMedicationsData.some(m =>
                        m.normalized && (m.class === drugClass.code ||
                            (drugClass.code === 'ACEi' && m.class === 'ACEi') ||
                            (drugClass.code === 'ARB' && m.class === 'ARB'))
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

                // Check for recommendations
                if (!isOn) {
                    const egfr = observationsCache[LOINC.EGFR]?.valueQuantity?.value;
                    const acr = observationsCache[LOINC.ACR]?.valueQuantity?.value || observationsCache[LOINC.ACR_ALT]?.valueQuantity?.value;

                    if (drugClass.code === 'SGLT2i' && egfr && egfr >= 20) {
                        recommendation = 'KDIGO 建議使用';
                    } else if ((drugClass.code === 'ACEi' || drugClass.code === 'ARB') && acr && acr >= 30) {
                        recommendation = '蛋白尿建議使用';
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

        async loadCDSRecommendations() {
            const container = document.getElementById('ckd-cds-recommendations');
            if (!container) return;

            try {
                if (typeof CDSEngine === 'undefined' || !CDSEngine.evaluateCKD) {
                    container.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    return;
                }

                let cdsResult = CDSEngine.getCachedCKD?.();
                if (!cdsResult) {
                    cdsResult = await CDSEngine.evaluateCKD();
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
                    if (rec.priority === 1 || rec.category === 'medication_safety' || rec.category === 'referral') return 'urgent';
                    if (rec.priority === 2 || rec.category === 'medication_adjustment') return 'warning';
                    return 'suggestion';
                };

                let html = '';
                sorted.slice(0, 5).forEach(rec => {
                    html += UI.cdsCard({
                        priority: getPriorityType(rec),
                        message: rec.message,
                        detail: rec.detail || '',
                        evidence: rec.evidence_level ? `LOE ${rec.evidence_level}` : '',
                        sources: ['KDIGO 2024']
                    });
                });

                container.innerHTML = html;
            } catch (error) {
                console.error('CKD CDS evaluation failed:', error);
                container.innerHTML = '<div class="no-data">載入建議失敗</div>';
            }
        }
    };
})();
