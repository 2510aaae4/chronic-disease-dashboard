/**
 * Atrial Fibrillation Module (AF)
 * 心房顫動模組 - UI v2.0 重構版
 * 使用新元件庫實現現代化卡片式設計，含 CHA₂DS₂-VA 和 HAS-BLED 評分視覺化
 */

(function() {
    // AF Drug classes for status pills
    const AF_DRUG_CLASSES = [
        { code: 'NOAC', name: 'NOAC', keywords: ['dabigatran', 'rivaroxaban', 'apixaban', 'edoxaban', 'pradaxa', 'xarelto', 'eliquis'] },
        { code: 'VKA', name: 'Warfarin', keywords: ['warfarin', 'coumadin'] },
        { code: 'Antiplatelet', name: '抗血小板', keywords: ['aspirin', 'clopidogrel', 'plavix', 'ticagrelor'] },
        { code: 'Beta-blocker', name: 'β-Blocker', keywords: ['metoprolol', 'bisoprolol', 'carvedilol', 'atenolol'] },
        { code: 'CCB', name: 'CCB', keywords: ['diltiazem', 'verapamil'] },
        { code: 'Antiarrhythmic', name: '抗心律不整', keywords: ['amiodarone', 'flecainide', 'propafenone', 'sotalol', 'dronedarone'] }
    ];

    DiseaseModules.af = {
        async getCardSummary() {
            try {
                // Check for INR (anticoagulation monitoring)
                const inrObs = await fetchObservations(LOINC.INR, 1);

                if (inrObs.length > 0) {
                    const value = inrObs[0].valueQuantity?.value;
                    const status = evaluateStatus('inr', value);

                    return UI.cardContent({
                        label: 'INR',
                        value: value?.toFixed(1),
                        unit: '',
                        status: status ? UI.statusBadge(status.text, status.class) : ''
                    });
                }

                // Fallback to heart rate
                const hr = observationsCache[LOINC.HEART_RATE];
                if (hr?.valueQuantity) {
                    const value = hr.valueQuantity.value;
                    const status = evaluateStatus('heartRate', value);

                    return UI.cardContent({
                        label: '心率',
                        value: Math.round(value),
                        unit: 'bpm',
                        status: status ? UI.statusBadge(status.text, status.class) : ''
                    });
                }

                return '<div class="no-data">無監測資料</div>';
            } catch (error) {
                return '<div class="no-data">載入失敗</div>';
            }
        },

        async getDetailContent() {
            try {
                // Fetch heart rate
                const hrObservations = await fetchObservations(LOINC.HEART_RATE, 5);
                const latestHR = hrObservations[0];

                // Get AF medications
                const afMeds = medicationsData.filter(m =>
                    m.categories.includes('af') && m.status === 'active'
                );

                // Check if patient is on warfarin
                const isOnWarfarin = this.isOnWarfarin(afMeds);
                const drugStatus = this.getDrugStatus();

                let html = '';

                // Section 1: 心律監測
                html += UI.section('心律監測', `
                    <div class="metrics-grid-new">
                        ${this.buildHRCard(latestHR)}
                        ${this.buildRhythmStatusCard()}
                    </div>
                `);

                // Section 2: 中風/出血風險評估 (載入中)
                html += `
                    <div class="section">
                        <div class="section__title">中風/出血風險評估</div>
                        <div id="af-risk-scores" class="risk-scores-container">
                            <div class="no-data">載入評估中...</div>
                        </div>
                    </div>
                `;

                // Section 3: 抗凝血治療狀態 (載入中)
                html += `
                    <div class="section">
                        <div class="section__title">抗凝血治療狀態</div>
                        <div id="af-anticoagulation-status">
                            <div class="no-data">載入中...</div>
                        </div>
                    </div>
                `;

                // Section 4: 抗凝血/心律控制藥物狀態
                html += UI.section('藥物狀態', UI.drugStatusPills(drugStatus));

                // Section 5: INR 歷史紀錄 (僅 Warfarin 使用者)
                if (isOnWarfarin) {
                    const inrObs = await fetchObservations(LOINC.INR, 20);
                    const inrHistory = inrObs.map(obs => ({
                        date: obs.effectiveDateTime,
                        value: obs.valueQuantity?.value,
                        unit: obs.valueQuantity?.unit || ''
                    })).filter(i => i.value);

                    if (inrHistory.length > 0) {
                        html += UI.section('INR 監測歷史', this.buildINRHistorySection(inrHistory));
                    }
                }

                // Section 6: CDS 建議
                html += `
                    <div class="section">
                        <div class="section__title">臨床決策建議</div>
                        <div id="af-cds-recommendations" class="cds-section-new">
                            <div class="no-data">載入建議中...</div>
                        </div>
                    </div>
                `;

                // Load CDS evaluations asynchronously
                setTimeout(() => this.loadCDSEvaluations(), 100);

                return html;

            } catch (error) {
                console.error('Error loading AF detail:', error);
                return '<div class="error-message">載入失敗</div>';
            }
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
                target: 'AF 目標 <110 (休息)',
                date: hrObs.effectiveDateTime
            });
        },

        buildRhythmStatusCard() {
            // Check for rhythm control vs rate control strategy
            const isOnRhythmControl = this.isOnRhythmControlDrugs();
            const isOnRateControl = this.isOnRateControlDrugs();

            let strategy = '未確定';
            let strategyClass = 'neutral';

            if (isOnRhythmControl && isOnRateControl) {
                strategy = '心律+心率控制';
                strategyClass = 'good';
            } else if (isOnRhythmControl) {
                strategy = '心律控制';
                strategyClass = 'good';
            } else if (isOnRateControl) {
                strategy = '心率控制';
                strategyClass = 'good';
            }

            return UI.metricCard({
                label: '治療策略',
                value: strategy,
                unit: '',
                status: { text: isOnRhythmControl || isOnRateControl ? '使用中' : '待評估', class: strategyClass }
            });
        },

        isOnWarfarin(afMeds) {
            // Check normalized medications first
            if (window.normalizedMedicationsData?.length > 0) {
                return normalizedMedicationsData.some(m =>
                    m.normalized && m.class === 'VKA'
                );
            }

            // Fallback to raw data
            return afMeds?.some(med => {
                const nameLower = med.name.toLowerCase();
                return nameLower.includes('warfarin') || nameLower.includes('coumadin');
            }) || false;
        },

        isOnRhythmControlDrugs() {
            const keywords = ['amiodarone', 'flecainide', 'propafenone', 'sotalol', 'dronedarone'];

            if (window.normalizedMedicationsData?.length > 0) {
                return normalizedMedicationsData.some(m =>
                    m.normalized && keywords.some(kw => m.generic?.toLowerCase().includes(kw))
                );
            }

            return medicationsData.some(m =>
                keywords.some(kw => m.name.toLowerCase().includes(kw))
            );
        },

        isOnRateControlDrugs() {
            const keywords = ['metoprolol', 'bisoprolol', 'carvedilol', 'atenolol', 'diltiazem', 'verapamil', 'digoxin'];

            if (window.normalizedMedicationsData?.length > 0) {
                return normalizedMedicationsData.some(m =>
                    m.normalized && keywords.some(kw => m.generic?.toLowerCase().includes(kw))
                );
            }

            return medicationsData.some(m =>
                keywords.some(kw => m.name.toLowerCase().includes(kw))
            );
        },

        getDrugStatus() {
            const status = [];

            for (const drugClass of AF_DRUG_CLASSES) {
                let isOn = false;
                let recommendation = null;

                // Check normalized medications first
                if (window.normalizedMedicationsData?.length > 0) {
                    isOn = normalizedMedicationsData.some(m =>
                        m.normalized && (m.class === drugClass.code ||
                            drugClass.keywords.some(kw => m.generic?.toLowerCase().includes(kw)))
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

                // Add recommendation note if applicable
                if (!isOn && drugClass.code === 'NOAC') {
                    recommendation = 'ESC 首選抗凝血劑';
                }

                status.push({
                    name: drugClass.name,
                    status: isOn ? 'active' : (recommendation ? 'recommended' : 'off'),
                    recommendation: recommendation
                });
            }

            return status;
        },

        async loadCDSEvaluations() {
            // Load risk scores
            const scoresContainer = document.getElementById('af-risk-scores');
            const anticoagContainer = document.getElementById('af-anticoagulation-status');
            const cdsContainer = document.getElementById('af-cds-recommendations');

            try {
                if (typeof CDSEngine === 'undefined' || !CDSEngine.evaluateAfib) {
                    if (scoresContainer) scoresContainer.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    if (anticoagContainer) anticoagContainer.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    if (cdsContainer) cdsContainer.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    return;
                }

                let cdsResult = CDSEngine.getCachedAfib?.();
                if (!cdsResult) {
                    cdsResult = await CDSEngine.evaluateAfib();
                }

                if (!cdsResult) {
                    if (scoresContainer) scoresContainer.innerHTML = '<div class="no-data">無法評估</div>';
                    if (anticoagContainer) anticoagContainer.innerHTML = '<div class="no-data">無法評估</div>';
                    if (cdsContainer) cdsContainer.innerHTML = '<div class="no-data">無法評估</div>';
                    return;
                }

                // Render risk scores
                if (scoresContainer) {
                    scoresContainer.innerHTML = this.buildRiskScoresSection(cdsResult);
                }

                // Render anticoagulation status
                if (anticoagContainer) {
                    anticoagContainer.innerHTML = this.buildAnticoagulationSection(cdsResult);
                }

                // Render CDS recommendations
                if (cdsContainer) {
                    cdsContainer.innerHTML = this.buildCDSRecommendations(cdsResult);
                }

            } catch (error) {
                console.error('AF CDS evaluation failed:', error);
                if (scoresContainer) scoresContainer.innerHTML = '<div class="no-data">載入失敗</div>';
                if (anticoagContainer) anticoagContainer.innerHTML = '<div class="no-data">載入失敗</div>';
                if (cdsContainer) cdsContainer.innerHTML = '<div class="no-data">載入失敗</div>';
            }
        },

        buildRiskScoresSection(cdsResult) {
            const { cha2ds2va, hasbled } = cdsResult;

            return `
                <div class="risk-scores-grid">
                    ${UI.scoreCard({
                        name: 'CHA₂DS₂-VA',
                        score: cha2ds2va.score,
                        maxScore: 9,
                        displayText: cha2ds2va.displayText,
                        riskLevel: cha2ds2va.score >= 2 ? 'high' : (cha2ds2va.score === 1 ? 'moderate' : 'low'),
                        interpretation: cha2ds2va.score >= 2 ? '建議抗凝血治療' : (cha2ds2va.score === 1 ? '考慮抗凝血治療' : '風險較低'),
                        components: cha2ds2va.components,
                        unknownComponents: cha2ds2va.unknownComponents
                    })}
                    ${UI.scoreCard({
                        name: 'HAS-BLED',
                        score: hasbled.score,
                        maxScore: 9,
                        displayText: hasbled.displayText,
                        riskLevel: hasbled.riskLevel,
                        interpretation: hasbled.riskLevel === 'high' ? '高出血風險 - 需密切監測' : '出血風險可接受',
                        components: hasbled.components,
                        unknownComponents: hasbled.unknownComponents
                    })}
                </div>
                <div class="score-source">
                    依據 ESC 2024 心房顫動管理指南 (CHA₂DS₂-VA 已移除性別因素)
                </div>
            `;
        },

        buildAnticoagulationSection(cdsResult) {
            const { anticoagulation, anticoagulationAlert, strokePreventionRec } = cdsResult;

            return UI.anticoagulationCard({
                isOnAnticoagulation: anticoagulation.isOnAnticoagulation,
                type: anticoagulation.type,
                medications: anticoagulation.medications,
                alert: anticoagulationAlert,
                recommendation: strokePreventionRec
            });
        },

        buildCDSRecommendations(cdsResult) {
            const { strokePreventionRec, anticoagulationAlert, recommendations } = cdsResult;

            let html = '';

            // Stroke prevention recommendation
            if (strokePreventionRec) {
                const priorityMap = { 1: 'urgent', 2: 'warning', 3: 'suggestion' };
                html += UI.cdsCard({
                    priority: priorityMap[strokePreventionRec.priority] || 'suggestion',
                    message: strokePreventionRec.text_zh,
                    detail: `Class ${strokePreventionRec.class} 建議`,
                    evidence: strokePreventionRec.evidence_level ? `LOE ${strokePreventionRec.evidence_level}` : '',
                    sources: ['ESC 2024']
                });
            }

            // Anticoagulation alert
            if (anticoagulationAlert) {
                html += UI.cdsCard({
                    priority: anticoagulationAlert.priority === 1 ? 'urgent' : 'warning',
                    message: anticoagulationAlert.message,
                    detail: anticoagulationAlert.detail || '',
                    sources: ['ESC 2024']
                });
            }

            // Additional recommendations
            if (recommendations && recommendations.length > 0) {
                recommendations.slice(0, 3).forEach(rec => {
                    html += UI.cdsCard({
                        priority: rec.priority === 1 ? 'urgent' : (rec.priority === 2 ? 'warning' : 'suggestion'),
                        message: rec.text_zh || rec.message,
                        detail: rec.detail || '',
                        evidence: rec.evidence_level ? `LOE ${rec.evidence_level}` : '',
                        sources: ['ESC 2024']
                    });
                });
            }

            return html || '<div class="no-data">目前無特別建議</div>';
        },

        buildINRHistorySection(inrHistory) {
            if (inrHistory.length === 0) {
                return '<p class="no-data">無 INR 歷史紀錄</p>';
            }

            // Calculate TTR (Time in Therapeutic Range) if enough data
            let ttrDisplay = '';
            if (inrHistory.length >= 3) {
                const inTherapeuticRange = inrHistory.filter(inr => inr.value >= 2.0 && inr.value <= 3.0).length;
                const ttr = Math.round((inTherapeuticRange / inrHistory.length) * 100);
                const ttrStatus = ttr >= 70 ? 'good' : (ttr >= 50 ? 'warning' : 'danger');

                ttrDisplay = `
                    <div class="ttr-summary">
                        <span class="ttr-label">治療範圍時間 (TTR):</span>
                        <span class="ttr-value status-${ttrStatus}">${ttr}%</span>
                        <span class="ttr-note">(目標 ≥70%，若 <65% 考慮轉 NOAC)</span>
                    </div>
                `;
            }

            // Build INR trend chart placeholder
            const chartHtml = `
                <div class="chart-container" style="height: 200px; position: relative;">
                    <canvas id="af-inr-chart"></canvas>
                </div>
            `;

            // Schedule chart rendering
            setTimeout(() => {
                if (window.DashboardCharts?.createINRHistoryChart) {
                    DashboardCharts.createINRHistoryChart('af-inr-chart', inrHistory);
                }
            }, 50);

            // Build recent INR table
            const recentINRs = inrHistory.slice(0, 5);
            const rows = recentINRs.map(inr => {
                const status = evaluateStatus('inr', inr.value);
                return [
                    formatDate(inr.date),
                    inr.value.toFixed(2),
                    status ? UI.statusBadge(status.text, status.class) : '-'
                ];
            });

            const tableHtml = UI.dataTable({
                headers: ['日期', 'INR', '狀態'],
                rows: rows
            });

            return `
                ${ttrDisplay}
                ${chartHtml}
                <div class="inr-table-container">
                    ${tableHtml}
                </div>
                <div class="inr-note">治療目標範圍: 2.0 - 3.0</div>
            `;
        }
    };
})();
