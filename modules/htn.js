/**
 * Hypertension Module (HTN)
 * 高血壓模組 - UI v2.0 重構版
 * 使用新元件庫實現現代化卡片式設計
 */

(function() {
    // Drug classes for HTN
    const HTN_DRUG_CLASSES = [
        { code: 'ACEi', name: 'ACEi', keywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'perindopril'] },
        { code: 'ARB', name: 'ARB', keywords: ['losartan', 'valsartan', 'irbesartan', 'telmisartan', 'olmesartan', 'candesartan'] },
        { code: 'ARNI', name: 'ARNI', keywords: ['sacubitril'] },
        { code: 'CCB', name: 'CCB', keywords: ['amlodipine', 'nifedipine', 'diltiazem', 'verapamil', 'felodipine', 'lercanidipine'] },
        { code: 'Beta-blocker', name: 'β-Blocker', keywords: ['metoprolol', 'atenolol', 'bisoprolol', 'carvedilol', 'propranolol', 'nebivolol'] },
        { code: 'Thiazide', name: 'Thiazide', keywords: ['hydrochlorothiazide', 'indapamide', 'chlorthalidone'] },
        { code: 'MRA', name: 'MRA', keywords: ['spironolactone', 'eplerenone'] }
    ];

    DiseaseModules.htn = {
        async getCardSummary() {
            const systolic = observationsCache[LOINC.BP_SYSTOLIC];
            const diastolic = observationsCache[LOINC.BP_DIASTOLIC];

            if (systolic?.valueQuantity && diastolic?.valueQuantity) {
                const sys = systolic.valueQuantity.value;
                const dia = diastolic.valueQuantity.value;
                const status = evaluateBPStatus(sys, dia);

                return UI.cardContent({
                    label: '最新血壓',
                    value: `${sys.toFixed(0)}/${dia.toFixed(0)}`,
                    unit: 'mmHg',
                    status: status ? UI.statusBadge(status.text, status.class) : ''
                });
            }

            return '<div class="no-data">無血壓資料</div>';
        },

        async getDetailContent() {
            try {
                // Fetch blood pressure history
                const bpObservations = await fetchObservations([LOINC.BP_SYSTOLIC, LOINC.BP_DIASTOLIC], 50);

                // Group observations by date
                const bpByDate = {};
                bpObservations.forEach(obs => {
                    const code = obs.code?.coding?.[0]?.code;
                    const date = obs.effectiveDateTime?.split('T')[0] || '';

                    if (!bpByDate[date]) {
                        bpByDate[date] = { date: date, datetime: obs.effectiveDateTime };
                    }

                    if (code === LOINC.BP_SYSTOLIC && obs.valueQuantity) {
                        bpByDate[date].systolic = obs.valueQuantity.value;
                    } else if (code === LOINC.BP_DIASTOLIC && obs.valueQuantity) {
                        bpByDate[date].diastolic = obs.valueQuantity.value;
                    }
                });

                const bpHistory = Object.values(bpByDate)
                    .filter(bp => bp.systolic && bp.diastolic)
                    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
                    .slice(0, 10);

                // Fetch heart rate
                const hrObservations = await fetchObservations(LOINC.HEART_RATE, 5);

                const latestBP = bpHistory[0];
                const latestHR = hrObservations[0];
                const bpTarget = this.getBPTarget();
                const comorbidities = this.getComorbidities();
                const drugStatus = this.getDrugStatus();

                let html = '';

                // Section 1: 血壓控制 (Metrics + Target)
                html += UI.section('血壓控制', `
                    <div class="metrics-grid-new">
                        ${this.buildBPCard(latestBP, bpTarget)}
                        ${this.buildHRCard(latestHR)}
                        ${this.buildTargetCard(bpTarget)}
                    </div>
                `);

                // Section 2: 血壓歷史趨勢
                if (bpHistory.length > 1) {
                    html += UI.section('血壓歷史趨勢', `
                        <div class="chart-container" style="height: 250px; position: relative;">
                            <canvas id="htn-bp-chart"></canvas>
                        </div>
                    `);

                    setTimeout(() => {
                        if (window.DashboardCharts) {
                            DashboardCharts.createBPHistoryChart('htn-bp-chart', bpHistory);
                        }
                    }, 50);
                }

                // Section 3: 相關共病
                const comorbidityLabels = {
                    dm: '糖尿病',
                    ckd: 'CKD',
                    hf: '心衰竭',
                    chd: '冠心病',
                    stroke: '中風',
                    ascvd: 'ASCVD'
                };
                const activeComorbidities = Object.entries(comorbidities)
                    .filter(([_, hasIt]) => hasIt)
                    .map(([name, _]) => comorbidityLabels[name] || name);

                if (activeComorbidities.length > 0) {
                    html += UI.section('相關共病', UI.comorbidityPills(activeComorbidities));
                }

                // Section 4: 降壓藥物狀態
                html += UI.section('降壓藥物狀態', UI.drugStatusPills(drugStatus));

                // Section 5: CDS 建議
                html += `
                    <div class="section">
                        <div class="section__title">臨床決策建議</div>
                        <div id="htn-cds-recommendations" class="cds-section-new">
                            <div class="no-data">載入建議中...</div>
                        </div>
                    </div>
                `;

                // Load CDS recommendations asynchronously
                setTimeout(() => this.loadCDSRecommendations(), 100);

                return html;

            } catch (error) {
                console.error('Error loading HTN detail:', error);
                return '<div class="error-message">載入失敗</div>';
            }
        },

        buildBPCard(latestBP, target) {
            if (!latestBP) {
                return UI.metricCard({
                    label: '血壓',
                    value: null,
                    unit: 'mmHg',
                    status: { text: '無資料', class: 'neutral' }
                });
            }

            const status = evaluateBPStatus(latestBP.systolic, latestBP.diastolic);

            return UI.metricCard({
                label: '血壓',
                value: `${latestBP.systolic.toFixed(0)}/${latestBP.diastolic.toFixed(0)}`,
                unit: 'mmHg',
                status: status,
                target: `目標 ${target?.target || '<130/80'}`,
                date: latestBP.datetime
            });
        },

        buildHRCard(hrObs) {
            if (!hrObs?.valueQuantity) {
                return UI.metricCard({
                    label: '心率',
                    value: null,
                    unit: 'bpm',
                    status: { text: '無資料', class: 'neutral' }
                });
            }

            const hr = hrObs.valueQuantity.value;
            const status = evaluateStatus('heartRate', hr);

            return UI.metricCard({
                label: '心率',
                value: Math.round(hr),
                unit: 'bpm',
                status: status,
                target: '目標 60-100',
                date: hrObs.effectiveDateTime
            });
        },

        buildTargetCard(target) {
            return UI.targetCard({
                title: '個人化血壓目標',
                value: target?.target || '<130/80 mmHg',
                indication: target?.indication || '一般成人',
                note: target?.note || '',
                evidence: target?.evidence || 'COR I / LOE A'
            });
        },

        getBPTarget() {
            // Get individualized BP target based on comorbidities
            const comorbidities = this.getComorbidities();

            // Priority order for BP targets (Taiwan 2022 Guidelines)
            if (comorbidities.ckd) {
                return { target: '<130/80 mmHg', indication: 'CKD 患者', note: '可耐受則可更嚴格', evidence: 'COR I / LOE B' };
            }
            if (comorbidities.hf) {
                return { target: '<130/80 mmHg', indication: '心衰竭患者', note: '', evidence: 'COR I / LOE B' };
            }
            if (comorbidities.stroke) {
                return { target: '<130/80 mmHg', indication: '中風後', note: '', evidence: 'COR I / LOE B' };
            }
            if (comorbidities.chd || comorbidities.ascvd) {
                return { target: '<130/80 mmHg', indication: 'ASCVD/冠心病', note: '高風險可考慮 <120', evidence: 'COR I / LOE A' };
            }
            if (comorbidities.dm) {
                return { target: '<130/80 mmHg', indication: '糖尿病患者', note: '', evidence: 'COR I / LOE A' };
            }

            // Check age for elderly
            const age = patientData?.birthDate ?
                Math.floor((new Date() - new Date(patientData.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

            if (age && age >= 65) {
                return { target: '<130/80 mmHg', indication: '≥65 歲長者', note: '評估耐受度', evidence: 'COR I / LOE B' };
            }

            return { target: '<130/80 mmHg', indication: '一般成人', note: '', evidence: 'COR I / LOE A' };
        },

        getComorbidities() {
            return {
                dm: detectedDiseases?.includes('dm') || false,
                ckd: detectedDiseases?.includes('ckd') || false,
                hf: detectedDiseases?.includes('hf') || false,
                chd: conditionsData?.some(c => {
                    const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();
                    return display.includes('coronary') || display.includes('冠狀動脈') || display.includes('冠心病');
                }) || false,
                stroke: conditionsData?.some(c => {
                    const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();
                    return display.includes('stroke') || display.includes('中風') || display.includes('腦血管');
                }) || false,
                ascvd: conditionsData?.some(c => {
                    const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();
                    return display.includes('atherosclerotic') || display.includes('ascvd');
                }) || false
            };
        },

        getDrugStatus() {
            const status = [];

            for (const drugClass of HTN_DRUG_CLASSES) {
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

                // Check for recommendations based on comorbidities
                if (!isOn) {
                    const comorbidities = this.getComorbidities();
                    if ((drugClass.code === 'ACEi' || drugClass.code === 'ARB') && comorbidities.ckd) {
                        recommendation = 'CKD 優先建議';
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
            const container = document.getElementById('htn-cds-recommendations');
            if (!container) return;

            try {
                if (typeof CDSEngine === 'undefined' || !CDSEngine.evaluateHTN) {
                    container.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    return;
                }

                let cdsResult = CDSEngine.getCachedHTN?.();
                if (!cdsResult) {
                    cdsResult = await CDSEngine.evaluateHTN();
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
                    if (rec.priority === 1 || rec.category === 'contraindication') return 'urgent';
                    if (rec.priority === 2 || rec.category === 'warning') return 'warning';
                    return 'suggestion';
                };

                let html = '';
                sorted.slice(0, 5).forEach(rec => {
                    html += UI.cdsCard({
                        priority: getPriorityType(rec),
                        message: rec.message,
                        detail: rec.detail || '',
                        evidence: rec.cor && rec.evidence_level ? `COR ${rec.cor} / LOE ${rec.evidence_level}` : '',
                        sources: ['台灣高血壓指引 2022']
                    });
                });

                container.innerHTML = html;
            } catch (error) {
                console.error('HTN CDS evaluation failed:', error);
                container.innerHTML = '<div class="no-data">載入建議失敗</div>';
            }
        }
    };
})();
