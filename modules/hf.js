/**
 * Heart Failure Module (HF)
 * 心衰竭模組 - UI v2.0 重構版
 * 使用新元件庫實現現代化卡片式設計，含 GDMT 四大支柱視覺化
 */

(function() {
    DiseaseModules.hf = {
        async getCardSummary() {
            try {
                const bnpObs = await fetchObservations([LOINC.NT_PROBNP, LOINC.BNP], 1);

                if (bnpObs.length > 0) {
                    const value = bnpObs[0].valueQuantity?.value;
                    const code = bnpObs[0].code?.coding?.[0]?.code;
                    const isNTproBNP = code === LOINC.NT_PROBNP;
                    const label = isNTproBNP ? 'NT-proBNP' : 'BNP';
                    const status = isNTproBNP
                        ? evaluateStatus('ntProBnp', value)
                        : evaluateStatus('bnp', value);

                    return UI.cardContent({
                        label: label,
                        value: value,
                        unit: 'pg/mL',
                        status: status ? UI.statusBadge(status.text, status.class) : ''
                    });
                }

                return '<div class="no-data">無 BNP 資料</div>';
            } catch (error) {
                return '<div class="no-data">載入失敗</div>';
            }
        },

        async getDetailContent() {
            try {
                // Fetch BNP/NT-proBNP history
                const bnpObs = await fetchObservations([LOINC.NT_PROBNP, LOINC.BNP], 20);

                // Fetch LVEF from multiple possible LOINC codes
                const lvefObs = await fetchObservations([
                    LOINC.LVEF, LOINC.LVEF_ECHO, LOINC.LVEF_NUCLEAR,
                    LOINC.LVEF_VENTRICULOGRAM, LOINC.LVEF_MRI, LOINC.LVEF_ANGIO
                ], 5);

                // Fetch weight for fluid monitoring
                const weightObs = await fetchObservations(LOINC.WEIGHT, 10);

                // Process BNP history
                const bnpHistory = bnpObs.map(obs => ({
                    date: obs.effectiveDateTime,
                    value: obs.valueQuantity?.value,
                    type: obs.code?.coding?.[0]?.code === LOINC.NT_PROBNP ? 'NT-proBNP' : 'BNP',
                    unit: obs.valueQuantity?.unit || 'pg/mL'
                })).filter(b => b.value);

                const latestBNP = bnpHistory[0];
                const latestLVEF = lvefObs[0]?.valueQuantity?.value;
                const lvefSource = this.getLVEFSource(lvefObs[0]);

                // Get HF classification
                const hfClassification = this.getHFClassification(latestLVEF, lvefSource);
                const gdmtStatus = this.getGDMTStatus();

                let html = '';

                // Section 1: HF 分類 + LVEF
                html += UI.section('心衰竭分類', UI.hfClassification({
                    type: hfClassification.type,
                    label: hfClassification.label,
                    lvef: latestLVEF,
                    source: lvefSource,
                    needsConfirmation: hfClassification.needsConfirmation
                }));

                // Section 2: 心臟功能指標
                html += UI.section('心臟功能指標', `
                    <div class="metrics-grid-new">
                        ${this.buildBNPCard(latestBNP)}
                        ${this.buildLVEFCard(latestLVEF, lvefObs[0]?.effectiveDateTime, lvefSource)}
                    </div>
                `);

                // Section 3: GDMT 四大支柱 (for HFrEF/HFmrEF)
                if (hfClassification.type === 'HFrEF' || hfClassification.type === 'HFmrEF') {
                    html += UI.section('GDMT 四大支柱', UI.gdmtPillars({
                        arni: gdmtStatus.arni,
                        acei: gdmtStatus.acei,
                        arb: gdmtStatus.arb,
                        betaBlocker: gdmtStatus.betaBlocker,
                        mra: gdmtStatus.mra,
                        sglt2i: gdmtStatus.sglt2i
                    }));
                }

                // Section 4: 體重監測
                html += UI.section('體液監測', this.buildWeightMonitoring(weightObs));

                // Section 5: BNP 歷史趨勢
                if (bnpHistory.length > 1) {
                    html += UI.section('BNP 歷史紀錄', this.buildBNPHistory(bnpHistory));
                }

                // Section 6: CDS 建議
                html += `
                    <div class="section">
                        <div class="section__title">臨床決策建議</div>
                        <div id="hf-cds-recommendations" class="cds-section-new">
                            <div class="no-data">載入建議中...</div>
                        </div>
                    </div>
                `;

                // Load CDS recommendations asynchronously
                setTimeout(() => this.loadCDSRecommendations(), 100);

                return html;

            } catch (error) {
                console.error('Error loading HF detail:', error);
                return '<div class="error-message">載入失敗</div>';
            }
        },

        buildBNPCard(latestBNP) {
            if (!latestBNP) {
                return UI.metricCard({
                    label: 'BNP/NT-proBNP',
                    value: null,
                    unit: 'pg/mL',
                    status: { text: '無資料', class: 'neutral' }
                });
            }

            const isNTproBNP = latestBNP.type === 'NT-proBNP';
            const status = isNTproBNP
                ? evaluateStatus('ntProBnp', latestBNP.value)
                : evaluateStatus('bnp', latestBNP.value);

            return UI.metricCard({
                label: latestBNP.type,
                value: Math.round(latestBNP.value),
                unit: latestBNP.unit,
                status: status,
                target: isNTproBNP ? '目標 <300 (穩定)' : '目標 <100 (穩定)',
                date: latestBNP.date
            });
        },

        buildLVEFCard(lvef, date, source) {
            const status = evaluateStatus('lvef', lvef);
            const classification = this.getHFClassification(lvef, source);

            return UI.metricCard({
                label: 'LVEF',
                value: lvef ? Math.round(lvef) : null,
                unit: '%',
                status: status || { text: '無資料', class: 'neutral' },
                target: classification.type ? `${classification.type}` : '',
                date: date
            });
        },

        getLVEFSource(obs) {
            if (!obs) return null;
            const code = obs.code?.coding?.[0]?.code;
            const sources = {
                [LOINC.LVEF]: 'Echo',
                [LOINC.LVEF_ECHO]: 'Echo',
                [LOINC.LVEF_NUCLEAR]: 'Nuclear',
                [LOINC.LVEF_VENTRICULOGRAM]: 'Ventriculogram',
                [LOINC.LVEF_MRI]: 'MRI',
                [LOINC.LVEF_ANGIO]: 'Angiography'
            };
            return sources[code] || 'Unknown';
        },

        getHFClassification(lvef, source) {
            // If no LVEF, try to infer from diagnosis codes
            if (lvef == null) {
                const hfType = this.inferHFTypeFromConditions();
                if (hfType) {
                    return {
                        ...hfType,
                        needsConfirmation: true
                    };
                }
                return {
                    type: null,
                    label: '未分類',
                    description: '需要心臟超音波檢查確認 LVEF',
                    needsConfirmation: true
                };
            }

            if (lvef <= 40) {
                return {
                    type: 'HFrEF',
                    label: 'HFrEF (收縮功能降低)',
                    description: `LVEF ≤40% (${source || 'Echo'})`,
                    needsConfirmation: false
                };
            } else if (lvef <= 49) {
                return {
                    type: 'HFmrEF',
                    label: 'HFmrEF (收縮功能輕度降低)',
                    description: `LVEF 41-49% (${source || 'Echo'})`,
                    needsConfirmation: false
                };
            } else {
                return {
                    type: 'HFpEF',
                    label: 'HFpEF (收縮功能保留)',
                    description: `LVEF ≥50% (${source || 'Echo'})`,
                    needsConfirmation: false
                };
            }
        },

        inferHFTypeFromConditions() {
            if (!conditionsData) return null;

            // SNOMED and ICD-10 codes for HF subtypes
            const hfSubtypes = {
                HFrEF: {
                    snomed: ['981000124106', '703272007'],
                    icd10: ['I50.2', 'I50.20', 'I50.21', 'I50.22', 'I50.23'],
                    keywords: ['reduced ejection', 'systolic', 'hfref']
                },
                HFmrEF: {
                    snomed: ['981000124105'],
                    icd10: ['I50.3', 'I50.30', 'I50.31', 'I50.32', 'I50.33'],
                    keywords: ['mildly reduced', 'mid-range', 'hfmref']
                },
                HFpEF: {
                    snomed: ['981000124104', '418304008'],
                    icd10: ['I50.4', 'I50.40', 'I50.41', 'I50.42', 'I50.43'],
                    keywords: ['preserved ejection', 'diastolic', 'hfpef']
                }
            };

            for (const [type, codes] of Object.entries(hfSubtypes)) {
                const found = conditionsData.some(c => {
                    const code = c.code?.coding?.[0]?.code;
                    const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();

                    if (codes.snomed.includes(code)) return true;
                    if (codes.icd10.some(icd => code?.startsWith(icd))) return true;
                    return codes.keywords.some(kw => display.includes(kw));
                });

                if (found) {
                    const labels = {
                        HFrEF: { label: 'HFrEF (依診斷)', description: '由診斷代碼推斷' },
                        HFmrEF: { label: 'HFmrEF (依診斷)', description: '由診斷代碼推斷' },
                        HFpEF: { label: 'HFpEF (依診斷)', description: '由診斷代碼推斷' }
                    };
                    return { type, ...labels[type] };
                }
            }

            return null;
        },

        getGDMTStatus() {
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

            const arni = hasDrug(['sacubitril', 'entresto'], 'ARNI');
            const acei = hasDrug(['lisinopril', 'enalapril', 'ramipril', 'captopril', 'perindopril'], 'ACEi');
            const arb = hasDrug(['losartan', 'valsartan', 'irbesartan', 'telmisartan', 'olmesartan'], 'ARB');
            const betaBlocker = hasDrug(['carvedilol', 'metoprolol', 'bisoprolol', 'nebivolol'], 'Beta-blocker');
            const mra = hasDrug(['spironolactone', 'eplerenone'], 'MRA');
            const sglt2i = hasDrug(['empagliflozin', 'dapagliflozin', 'canagliflozin'], 'SGLT2i');

            const pillar1 = arni || acei || arb;
            const pillar2 = betaBlocker;
            const pillar3 = mra;
            const pillar4 = sglt2i;

            const completedCount = [pillar1, pillar2, pillar3, pillar4].filter(Boolean).length;

            return {
                arni,
                acei,
                arb,
                betaBlocker,
                mra,
                sglt2i,
                pillar1,
                pillar2,
                pillar3,
                pillar4,
                completedCount,
                complete: completedCount === 4
            };
        },

        buildWeightMonitoring(weightObs) {
            if (!weightObs || weightObs.length === 0) {
                return '<div class="no-data">無體重紀錄</div>';
            }

            const weights = weightObs.map(w => ({
                date: w.effectiveDateTime,
                value: w.valueQuantity?.value,
                unit: w.valueQuantity?.unit || 'kg'
            })).filter(w => w.value);

            if (weights.length === 0) {
                return '<div class="no-data">無體重紀錄</div>';
            }

            const latest = weights[0];
            const weekAgo = weights.find(w => {
                const diff = (new Date(latest.date) - new Date(w.date)) / (1000 * 60 * 60 * 24);
                return diff >= 5 && diff <= 10;
            });

            let weightChange = null;
            let changeStatus = 'neutral';
            if (weekAgo) {
                weightChange = latest.value - weekAgo.value;
                if (weightChange >= 2) changeStatus = 'danger';
                else if (weightChange >= 1) changeStatus = 'warning';
                else if (weightChange <= -2) changeStatus = 'warning';
                else changeStatus = 'good';
            }

            return `
                <div class="metrics-grid-new">
                    ${UI.metricCard({
                        label: '目前體重',
                        value: latest.value.toFixed(1),
                        unit: 'kg',
                        status: { text: '最新量測', class: 'info' },
                        date: latest.date
                    })}
                    ${weightChange !== null ? UI.metricCard({
                        label: '一週變化',
                        value: (weightChange > 0 ? '+' : '') + weightChange.toFixed(1),
                        unit: 'kg',
                        status: {
                            text: changeStatus === 'danger' ? '需注意' :
                                  changeStatus === 'warning' ? '輕微變化' : '穩定',
                            class: changeStatus
                        }
                    }) : ''}
                </div>
                ${Math.abs(weightChange) >= 2 ? `
                    <div class="cds-card cds-card--warning" style="margin-top: var(--space-md);">
                        <div class="cds-card__message">體重變化 >2kg/週，注意體液滯留</div>
                        <div class="cds-card__detail">建議評估利尿劑調整需求</div>
                    </div>
                ` : ''}
            `;
        },

        buildBNPHistory(bnpHistory) {
            const rows = bnpHistory.slice(0, 5).map(bnp => {
                const isNTproBNP = bnp.type === 'NT-proBNP';
                const status = isNTproBNP
                    ? evaluateStatus('ntProBnp', bnp.value)
                    : evaluateStatus('bnp', bnp.value);
                return [
                    formatDate(bnp.date),
                    bnp.type,
                    `${bnp.value.toFixed(0)} ${bnp.unit}`,
                    status ? UI.statusBadge(status.text, status.class) : '-'
                ];
            });

            return UI.dataTable({
                headers: ['日期', '檢驗項目', '數值', '狀態'],
                rows: rows
            });
        },

        async loadCDSRecommendations() {
            const container = document.getElementById('hf-cds-recommendations');
            if (!container) return;

            try {
                if (typeof CDSEngine === 'undefined' || !CDSEngine.evaluateHF) {
                    container.innerHTML = '<div class="no-data">CDS 引擎未載入</div>';
                    return;
                }

                let cdsResult = CDSEngine.getCachedHF?.();
                if (!cdsResult) {
                    cdsResult = await CDSEngine.evaluateHF();
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
                    if (rec.priority === 1 || rec.category === 'avoid_medications') return 'urgent';
                    if (rec.priority === 2 || rec.category === 'monitoring') return 'warning';
                    if (rec.category === 'gdmt_optimization') return 'suggestion';
                    return 'info';
                };

                let html = '';
                sorted.slice(0, 5).forEach(rec => {
                    html += UI.cdsCard({
                        priority: getPriorityType(rec),
                        message: rec.message,
                        detail: rec.detail || '',
                        evidence: rec.evidence_level ? `LOE ${rec.evidence_level}` : '',
                        sources: ['ESC 2021/2023']
                    });
                });

                container.innerHTML = html;
            } catch (error) {
                console.error('HF CDS evaluation failed:', error);
                container.innerHTML = '<div class="no-data">載入建議失敗</div>';
            }
        }
    };
})();
