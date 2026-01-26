/**
 * Integrated CDS Engine with Gemini AI
 * 統合臨床決策支援引擎 - Gemini AI 整合版
 *
 * v1.0 - Initial implementation
 *
 * Features:
 * - Collects recommendations from all disease modules
 * - De-identifies patient data for privacy
 * - Calls Gemini API to synthesize recommendations
 * - Renders unified recommendation UI
 */

const IntegratedCDS = (function() {
    // API Configuration
    // In development: API key from environment variable or config
    // In production: Use Cloudflare Workers proxy
    let apiKey = null;
    let apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    // Cache for integrated results
    let integratedCache = null;
    let lastEvaluationTime = null;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Configure API settings
     */
    function configure(options) {
        if (options.apiKey) apiKey = options.apiKey;
        if (options.apiEndpoint) apiEndpoint = options.apiEndpoint;
    }

    /**
     * Check if API is configured
     */
    function isConfigured() {
        return apiKey !== null || apiEndpoint.includes('workers.dev');
    }

    /**
     * Build de-identified patient context
     * 建構去識別化的患者資料
     */
    function buildDeidentifiedContext() {
        const age = patientData?.birthDate ? calculateAge(patientData.birthDate) : null;
        const gender = patientData?.gender;

        // Get lab values from cache
        const getValue = (code) => {
            const codes = Array.isArray(code) ? code : [code];
            for (const c of codes) {
                const obs = observationsCache[c];
                if (obs?.valueQuantity?.value !== undefined) {
                    return obs.valueQuantity.value;
                }
            }
            return null;
        };

        // Get conditions (de-identified - only disease names, no dates)
        const conditions = conditionsData
            .filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active')
            .map(c => c.code?.coding?.[0]?.display || c.code?.text || '')
            .filter(Boolean);

        // Get medications - prefer normalized format if available
        let medications = [];
        if (typeof normalizedMedicationsData !== 'undefined' && normalizedMedicationsData.length > 0) {
            // Use AI-normalized medications with generic names and classes
            medications = normalizedMedicationsData
                .filter(m => m.normalized)
                .map(m => {
                    const parts = [m.generic];
                    if (m.dose) parts.push(m.dose);
                    if (m.frequency) parts.push(m.frequency);
                    if (m.class && m.class !== 'Other') parts.push(`(${m.class})`);
                    return parts.join(' ');
                });
        } else {
            // Fall back to original medication names
            medications = medicationsData
                .filter(m => m.status === 'active')
                .map(m => m.name)
                .filter(Boolean);
        }

        return {
            age,
            gender,
            conditions,
            medications,
            labs: {
                hba1c: getValue(LOINC.HBA1C),
                egfr: getValue(LOINC.EGFR),
                acr: getValue([LOINC.ACR, LOINC.ACR_ALT]),
                ldl: getValue([LOINC.LDL, LOINC.LDL_ALT]),
                sbp: getValue(LOINC.BP_SYSTOLIC),
                dbp: getValue(LOINC.BP_DIASTOLIC),
                bmi: getValue(LOINC.BMI),
                lvef: getValue(LOINC.LVEF),
                potassium: getValue(LOINC.POTASSIUM),
                hr: getValue(LOINC.HEART_RATE),
                tg: getValue(LOINC.TRIGLYCERIDES),
                tc: getValue(LOINC.TOTAL_CHOLESTEROL)
            }
        };
    }

    /**
     * Collect all CDS results from each disease module
     * 收集各疾病模組的 CDS 結果
     */
    async function collectAllCDSResults() {
        const results = {
            dm: null,
            htn: null,
            lipid: null,
            hf: null,
            ckd: null,
            afib: null
        };

        // Check which diseases the patient has
        const hasDM = detectedDiseases?.includes('dm');
        const hasHTN = detectedDiseases?.includes('htn');
        const hasLipid = detectedDiseases?.includes('lipid');
        const hasHF = detectedDiseases?.includes('hf');
        const hasCKD = detectedDiseases?.includes('ckd');
        const hasAF = detectedDiseases?.includes('af');

        // Collect CDS from each module if patient has the condition
        const promises = [];

        if (hasDM && typeof CDSEngine !== 'undefined') {
            promises.push(
                (async () => {
                    try {
                        results.dm = CDSEngine.getCachedDM?.() || await CDSEngine.evaluate?.();
                    } catch (e) {
                        console.warn('DM CDS failed:', e);
                    }
                })()
            );
        }

        if (hasHTN && typeof CDSEngine !== 'undefined') {
            promises.push(
                (async () => {
                    try {
                        results.htn = CDSEngine.getCachedHTN?.() || await CDSEngine.evaluateHTN?.();
                    } catch (e) {
                        console.warn('HTN CDS failed:', e);
                    }
                })()
            );
        }

        if (hasLipid && typeof CDSEngine !== 'undefined') {
            promises.push(
                (async () => {
                    try {
                        results.lipid = CDSEngine.getCachedLipid?.() || await CDSEngine.evaluateLipid?.();
                    } catch (e) {
                        console.warn('Lipid CDS failed:', e);
                    }
                })()
            );
        }

        if (hasHF && typeof CDSEngine !== 'undefined') {
            promises.push(
                (async () => {
                    try {
                        results.hf = CDSEngine.getCachedHF?.() || await CDSEngine.evaluateHF?.();
                    } catch (e) {
                        console.warn('HF CDS failed:', e);
                    }
                })()
            );
        }

        if (hasCKD && typeof CDSEngine !== 'undefined') {
            promises.push(
                (async () => {
                    try {
                        results.ckd = CDSEngine.getCachedCKD?.() || await CDSEngine.evaluateCKD?.();
                    } catch (e) {
                        console.warn('CKD CDS failed:', e);
                    }
                })()
            );
        }

        if (hasAF && typeof CDSEngine !== 'undefined') {
            promises.push(
                (async () => {
                    try {
                        results.afib = CDSEngine.getCachedAfib?.() || await CDSEngine.evaluateAfib?.();
                    } catch (e) {
                        console.warn('Afib CDS failed:', e);
                    }
                })()
            );
        }

        await Promise.all(promises);
        return results;
    }

    /**
     * Call Gemini API
     * 呼叫 Gemini API
     */
    async function callGeminiAPI(systemPrompt, userPrompt) {
        if (!isConfigured()) {
            throw new Error('Gemini API not configured. Please set API key.');
        }

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: systemPrompt + '\n\n---\n\n' + userPrompt }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3, // Lower temperature for more consistent output
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json'
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        };

        const url = apiEndpoint.includes('workers.dev')
            ? apiEndpoint
            : `${apiEndpoint}?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract text from Gemini response
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
            throw new Error('No content in Gemini response');
        }

        return textContent;
    }

    /**
     * Main evaluation function
     * 主要評估函數
     */
    async function evaluate(forceRefresh = false) {
        // Check cache
        if (!forceRefresh && integratedCache && lastEvaluationTime) {
            const elapsed = Date.now() - lastEvaluationTime;
            if (elapsed < CACHE_DURATION) {
                return integratedCache;
            }
        }

        // Check if API is configured
        if (!isConfigured()) {
            return {
                error: true,
                summary: 'AI 整合功能尚未設定',
                priority_actions: [],
                medication_alerts: [],
                monitoring_plan: [],
                lifestyle_recommendations: [],
                follow_up_note: '請設定 Gemini API Key 以啟用統合建議功能',
                needsConfiguration: true
            };
        }

        try {
            // Collect all CDS results
            const cdsResults = await collectAllCDSResults();

            // Check if there are any recommendations to integrate
            const hasRecommendations = Object.values(cdsResults).some(r =>
                r && r.recommendations && r.recommendations.length > 0
            );

            if (!hasRecommendations) {
                return {
                    error: false,
                    summary: '目前無需整合的建議',
                    priority_actions: [],
                    medication_alerts: [],
                    monitoring_plan: [],
                    lifestyle_recommendations: [],
                    follow_up_note: '各疾病模組均無產生建議，或病人無相關慢性病診斷',
                    isEmpty: true
                };
            }

            // Build de-identified context
            const patientContext = buildDeidentifiedContext();

            // Build prompts
            const systemPrompt = IntegratedCDSPrompts.SYSTEM_PROMPT;
            const userPrompt = IntegratedCDSPrompts.buildUserPrompt(patientContext, cdsResults);

            // Call Gemini API
            const responseText = await callGeminiAPI(systemPrompt, userPrompt);

            // Parse and validate response
            const parsed = IntegratedCDSPrompts.parseGeminiResponse(responseText);
            const validated = IntegratedCDSPrompts.validateResponse(parsed);

            // Cache the result
            integratedCache = validated;
            lastEvaluationTime = Date.now();

            return validated;

        } catch (error) {
            console.error('Integrated CDS evaluation failed:', error);
            return {
                error: true,
                summary: 'AI 整合評估失敗',
                priority_actions: [],
                medication_alerts: [],
                monitoring_plan: [],
                lifestyle_recommendations: [],
                follow_up_note: `錯誤: ${error.message}`,
                errorDetails: error.message
            };
        }
    }

    /**
     * Clear cache
     */
    function clearCache() {
        integratedCache = null;
        lastEvaluationTime = null;
    }

    /**
     * Get cached result
     */
    function getCached() {
        return integratedCache;
    }

    /**
     * Render integrated recommendations as HTML
     * 將統合建議渲染為 HTML - UI v2.0 重構版
     * 順序: Summary → 藥物整理 → 監測計畫 → 優先行動 → 生活型態
     */
    function renderIntegratedCDS(result) {
        if (!result) {
            return `
                <div class="ai-report ai-report--empty">
                    <div class="ai-report__empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4M12 8h.01"></path>
                        </svg>
                    </div>
                    <div class="ai-report__empty-text">尚未執行 AI 統合分析</div>
                    <div class="ai-report__empty-hint">點擊「重新分析」以產生統合建議</div>
                </div>
            `;
        }

        if (result.needsConfiguration) {
            return `
                <div class="ai-report ai-report--config">
                    <div class="ai-report__config-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <div class="ai-report__config-title">AI 統合功能尚未啟用</div>
                    <div class="ai-report__config-text">請設定 Gemini API Key 以啟用跨指引統合建議功能</div>
                </div>
            `;
        }

        if (result.isEmpty) {
            return `
                <div class="ai-report ai-report--empty">
                    <div class="ai-report__empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                    </div>
                    <div class="ai-report__empty-text">${result.summary}</div>
                    <div class="ai-report__empty-hint">各疾病模組均無產生建議，或病人無相關慢性病診斷</div>
                </div>
            `;
        }

        if (result.error) {
            return `
                <div class="ai-report ai-report--error">
                    <div class="ai-report__error-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <div class="ai-report__error-title">${result.summary}</div>
                    <div class="ai-report__error-text">${result.errorDetails || '請稍後再試'}</div>
                </div>
            `;
        }

        let html = '<div class="ai-report">';

        // Header with AI branding
        html += `
            <div class="ai-report__header">
                <div class="ai-report__badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    AI 統合建議
                </div>
                <div class="ai-report__powered">Powered by Gemini</div>
            </div>
        `;

        // 1. Summary Card
        html += `
            <div class="ai-report__summary">
                <div class="ai-report__summary-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16l4-4-4-4M8 12h8"></path>
                    </svg>
                </div>
                <div class="ai-report__summary-text">${result.summary}</div>
            </div>
        `;

        // 2. Medication Summary (藥物整理及建議)
        const medSummary = result.medication_summary;
        if (medSummary && (medSummary.current_assessment || medSummary.recommendations?.length > 0 || medSummary.alerts?.length > 0)) {
            html += '<div class="ai-report__section">';
            html += `
                <div class="ai-report__section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                    藥物整理及建議
                </div>
            `;

            // Current assessment
            if (medSummary.current_assessment) {
                html += `<div class="ai-report__med-assessment">${medSummary.current_assessment}</div>`;
            }

            // Medication recommendations
            if (medSummary.recommendations && medSummary.recommendations.length > 0) {
                html += '<div class="ai-report__med-list">';
                medSummary.recommendations.forEach(rec => {
                    const typeClass = rec.type === 'add' ? 'add' :
                                      rec.type === 'adjust' ? 'adjust' :
                                      rec.type === 'stop' ? 'stop' : 'monitor';
                    const typeLabel = rec.type === 'add' ? '新增' :
                                      rec.type === 'adjust' ? '調整' :
                                      rec.type === 'stop' ? '停用' : '監測';
                    html += `
                        <div class="ai-report__med-item ai-report__med-item--${typeClass}">
                            <div class="ai-report__med-type">${typeLabel}</div>
                            <div class="ai-report__med-content">
                                <div class="ai-report__med-drug">${rec.drug}</div>
                                <div class="ai-report__med-reason">${rec.reason}</div>
                                ${rec.sources && rec.sources.length > 0 ?
                                    `<div class="ai-report__med-sources">${rec.sources.join(' · ')}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
            }

            // Medication alerts
            if (medSummary.alerts && medSummary.alerts.length > 0) {
                html += '<div class="ai-report__alerts">';
                medSummary.alerts.forEach(alert => {
                    const alertClass = alert.type === 'conflict' ? 'danger' :
                                       alert.type === 'caution' ? 'warning' : 'info';
                    html += `
                        <div class="ai-report__alert ai-report__alert--${alertClass}">
                            <div class="ai-report__alert-icon">
                                ${alert.type === 'conflict' ?
                                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' :
                                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'}
                            </div>
                            <div class="ai-report__alert-content">
                                <div class="ai-report__alert-text">${alert.description}</div>
                                ${alert.affected_drugs && alert.affected_drugs.length > 0 ?
                                    `<div class="ai-report__alert-drugs">${alert.affected_drugs.join(', ')}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
            }

            html += '</div>';
        }

        // 3. Monitoring Plan (監測計畫)
        if (result.monitoring_plan && result.monitoring_plan.length > 0) {
            html += '<div class="ai-report__section">';
            html += `
                <div class="ai-report__section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3v18h18"/>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                    </svg>
                    監測計畫
                </div>
            `;
            html += '<div class="ai-report__monitoring-grid">';

            result.monitoring_plan.forEach(item => {
                const statusClass = item.status === '達標' ? 'good' :
                                    item.status === '未達標' ? 'danger' :
                                    item.status === '接近目標' ? 'warning' : 'neutral';
                html += `
                    <div class="ai-report__monitoring-item ai-report__monitoring-item--${statusClass}">
                        <div class="ai-report__monitoring-header">
                            <span class="ai-report__monitoring-name">${item.item}</span>
                            <span class="ai-report__monitoring-status">${item.status || '-'}</span>
                        </div>
                        <div class="ai-report__monitoring-values">
                            <div class="ai-report__monitoring-current">
                                <span class="ai-report__monitoring-label">目前</span>
                                <span class="ai-report__monitoring-value">${item.current_value || '-'}</span>
                            </div>
                            <div class="ai-report__monitoring-arrow">→</div>
                            <div class="ai-report__monitoring-target">
                                <span class="ai-report__monitoring-label">目標</span>
                                <span class="ai-report__monitoring-value">${item.target || '-'}</span>
                            </div>
                        </div>
                        <div class="ai-report__monitoring-freq">${item.frequency || ''}</div>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        // 4. Priority Actions (優先行動建議)
        if (result.priority_actions && result.priority_actions.length > 0) {
            html += '<div class="ai-report__section">';
            html += `
                <div class="ai-report__section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    優先行動建議
                </div>
            `;
            html += '<div class="ai-report__actions">';

            result.priority_actions.forEach((action, idx) => {
                const urgencyClass = action.urgency === 'urgent' ? 'urgent' :
                                     action.urgency === 'routine' ? 'routine' : 'optional';
                html += `
                    <div class="ai-report__action ai-report__action--${urgencyClass}">
                        <div class="ai-report__action-number">${idx + 1}</div>
                        <div class="ai-report__action-content">
                            <div class="ai-report__action-text">${action.action}</div>
                            ${action.rationale ? `<div class="ai-report__action-rationale">${action.rationale}</div>` : ''}
                        </div>
                        <div class="ai-report__action-badge">${action.urgency === 'urgent' ? '緊急' : action.urgency === 'routine' ? '常規' : '可選'}</div>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        // 5. Lifestyle Recommendations (生活型態建議)
        if (result.lifestyle_recommendations && result.lifestyle_recommendations.length > 0) {
            html += '<div class="ai-report__section">';
            html += `
                <div class="ai-report__section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    生活型態建議
                </div>
            `;
            html += '<div class="ai-report__lifestyle">';

            result.lifestyle_recommendations.forEach(rec => {
                html += `
                    <div class="ai-report__lifestyle-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <span>${rec}</span>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        // AI Disclaimer Footer
        html += `
            <div class="ai-report__footer">
                <div class="ai-report__disclaimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    此建議由 AI (Gemini) 整合多項臨床指引產生，僅供參考，最終決策請由醫療團隊判斷
                </div>
            </div>
        `;

        html += '</div>';

        return html;
    }

    // Public API
    return {
        configure,
        isConfigured,
        evaluate,
        clearCache,
        getCached,
        renderIntegratedCDS,
        buildDeidentifiedContext,
        collectAllCDSResults
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.IntegratedCDS = IntegratedCDS;

    // Auto-configure from window.GEMINI_API_KEY or window.GEMINI_API_ENDPOINT
    if (window.GEMINI_API_KEY) {
        IntegratedCDS.configure({ apiKey: window.GEMINI_API_KEY });
        console.log('IntegratedCDS: Configured with API key');
    }
    if (window.GEMINI_API_ENDPOINT) {
        IntegratedCDS.configure({ apiEndpoint: window.GEMINI_API_ENDPOINT });
        console.log('IntegratedCDS: Configured with custom endpoint');
    }
}
