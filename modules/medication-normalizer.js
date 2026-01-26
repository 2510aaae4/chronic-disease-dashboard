/**
 * Medication Normalizer - AI-powered medication name normalization
 * 藥物正規化模組 - 使用 AI 將混雜的藥名轉換為標準學名
 *
 * v1.0 - Initial implementation with Gemini 2.0 Flash
 */

const MedicationNormalizer = (function() {
    // API Configuration (shared with IntegratedCDS)
    let apiKey = null;
    let apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    // Cache for normalized medications
    let normalizedCache = new Map();
    let lastNormalizationResult = null;
    let lastDuplicateResult = null;

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
     * System prompt for medication normalization
     */
    const SYSTEM_PROMPT = `你是專業台灣藥師，擅長辨識台灣常見藥物的商品名與學名。

你的任務是將藥物清單正規化為標準格式。

## 輸出格式
請回傳 JSON 陣列，每個藥物包含：
- original: 原始輸入
- generic: 學名（英文小寫）
- dose: 劑量（如 "10mg", "500mg"）
- frequency: 頻次（如 "QD", "BID", "TID"，若無則為 null）
- class: 藥物分類代碼

## 藥物分類代碼對照
- SGLT2i: Empagliflozin, Dapagliflozin, Canagliflozin 等
- GLP1RA: Semaglutide, Liraglutide, Dulaglutide 等
- DPP4i: Sitagliptin, Linagliptin, Saxagliptin 等
- Biguanide: Metformin
- SU: Glimepiride, Gliclazide, Glipizide 等
- TZD: Pioglitazone
- Insulin: 所有胰島素
- ACEi: Lisinopril, Enalapril, Ramipril 等
- ARB: Losartan, Valsartan, Irbesartan, Telmisartan 等
- ARNI: Sacubitril/Valsartan
- BetaBlocker: Metoprolol, Bisoprolol, Carvedilol 等
- CCB: Amlodipine, Nifedipine, Diltiazem, Verapamil 等
- CCB-DHP: Amlodipine, Nifedipine, Felodipine 等
- CCB-NonDHP: Diltiazem, Verapamil
- Thiazide: Hydrochlorothiazide, Indapamide, Chlorthalidone 等
- LoopDiuretic: Furosemide, Bumetanide
- MRA: Spironolactone, Eplerenone, Finerenone
- Statin: Atorvastatin, Rosuvastatin, Simvastatin 等
- Ezetimibe: Ezetimibe
- PCSK9i: Evolocumab, Alirocumab
- Fibrate: Fenofibrate, Gemfibrozil
- Anticoagulant: Warfarin
- DOAC: Rivaroxaban, Apixaban, Dabigatran, Edoxaban
- Antiplatelet: Aspirin, Clopidogrel, Ticagrelor
- NSAID: Ibuprofen, Naproxen, Diclofenac, Celecoxib 等
- PPI: Omeprazole, Esomeprazole, Pantoprazole 等
- Other: 無法分類的藥物

## 台灣常見商品名範例
- 恩排糖/Jardiance = empagliflozin (SGLT2i)
- 福適佳/Forxiga = dapagliflozin (SGLT2i)
- 庫魯化/Glucophage = metformin (Biguanide)
- 泌樂寬/Loditon = metformin (Biguanide)
- 冠脂妥/Crestor = rosuvastatin (Statin)
- 立普妥/Lipitor = atorvastatin (Statin)
- 脈優/Norvasc = amlodipine (CCB-DHP)
- 得安穩/Diovan = valsartan (ARB)
- 安普諾維/Aprovel = irbesartan (ARB)
- 瑞寧/Entresto = sacubitril/valsartan (ARNI)
- 康肯/Concor = bisoprolol (BetaBlocker)
- 達比加群/Pradaxa = dabigatran (DOAC)
- 拜瑞妥/Xarelto = rivaroxaban (DOAC)
- 艾乐妥/Eliquis = apixaban (DOAC)

## 重要規則
1. 若無法辨識藥物，generic 填 "unknown"，class 填 "Other"
2. 若劑量或頻次不明確，填 null
3. 複方藥物請拆解（如 Lisinopril/HCTZ 分為兩個成分）
4. 一律使用英文小寫學名
5. 回傳純 JSON，不要加其他說明文字`;

    /**
     * Build user prompt with medication list
     */
    function buildUserPrompt(medications) {
        let prompt = '請正規化以下藥物清單：\n\n';
        medications.forEach((med, idx) => {
            prompt += `${idx + 1}. ${med}\n`;
        });
        return prompt;
    }

    /**
     * Call Gemini API for normalization
     */
    async function callGeminiAPI(userPrompt) {
        if (!isConfigured()) {
            throw new Error('Gemini API not configured');
        }

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: SYSTEM_PROMPT + '\n\n---\n\n' + userPrompt }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1, // Very low for consistent output
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json'
            }
        };

        const url = apiEndpoint.includes('workers.dev')
            ? apiEndpoint
            : `${apiEndpoint}?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            throw new Error('No content in Gemini response');
        }

        return textContent;
    }

    /**
     * Parse and validate API response
     */
    function parseResponse(responseText) {
        try {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.map(item => ({
                    original: item.original || '',
                    generic: (item.generic || 'unknown').toLowerCase(),
                    dose: item.dose || null,
                    frequency: item.frequency || null,
                    class: item.class || 'Other'
                }));
            }
            throw new Error('No JSON array found');
        } catch (error) {
            console.error('Failed to parse medication response:', error);
            return [];
        }
    }

    /**
     * Main normalization function
     * @param {Array} medications - Array of medication strings
     * @returns {Promise<Array>} - Normalized medication objects
     */
    async function normalize(medications) {
        if (!medications || medications.length === 0) {
            return [];
        }

        // Filter out empty strings
        const validMeds = medications.filter(m => m && m.trim());

        if (validMeds.length === 0) {
            return [];
        }

        // Check if API is configured
        if (!isConfigured()) {
            console.warn('MedicationNormalizer: API not configured, returning original medications');
            return validMeds.map(med => ({
                original: med,
                generic: med.toLowerCase(),
                dose: null,
                frequency: null,
                class: 'Other',
                normalized: false
            }));
        }

        try {
            console.log('MedicationNormalizer: Normalizing', validMeds.length, 'medications...');
            const startTime = Date.now();

            const userPrompt = buildUserPrompt(validMeds);
            const responseText = await callGeminiAPI(userPrompt);
            const normalized = parseResponse(responseText);

            // Mark as normalized
            normalized.forEach(med => med.normalized = true);

            const elapsed = Date.now() - startTime;
            console.log(`MedicationNormalizer: Completed in ${elapsed}ms`);

            // Cache the result
            lastNormalizationResult = normalized;

            // Update cache map
            normalized.forEach(med => {
                if (med.original) {
                    normalizedCache.set(med.original.toLowerCase(), med);
                }
            });

            // Auto-detect duplicates
            lastDuplicateResult = detectDuplicateClasses(normalized);
            if (lastDuplicateResult.length > 0) {
                console.log('MedicationNormalizer: Detected', lastDuplicateResult.length, 'duplicate/combination alerts');
            }

            return normalized;

        } catch (error) {
            console.error('MedicationNormalizer: Normalization failed:', error);
            // Return original medications without normalization
            return validMeds.map(med => ({
                original: med,
                generic: med.toLowerCase(),
                dose: null,
                frequency: null,
                class: 'Other',
                normalized: false,
                error: error.message
            }));
        }
    }

    /**
     * Get cached normalization result
     */
    function getCached() {
        return lastNormalizationResult;
    }

    /**
     * Get single medication from cache
     */
    function getCachedMedication(originalName) {
        return normalizedCache.get(originalName.toLowerCase());
    }

    /**
     * Clear cache
     */
    function clearCache() {
        normalizedCache.clear();
        lastNormalizationResult = null;
        lastDuplicateResult = null;
    }

    /**
     * Check if a medication belongs to a specific class
     */
    function isClass(normalizedMed, targetClass) {
        if (!normalizedMed) return false;
        return normalizedMed.class === targetClass;
    }

    /**
     * Filter medications by class
     */
    function filterByClass(normalizedMeds, targetClass) {
        if (!normalizedMeds) return [];
        return normalizedMeds.filter(med => med.class === targetClass);
    }

    /**
     * Check if any medication in the list belongs to a class
     */
    function hasClass(normalizedMeds, targetClass) {
        if (!normalizedMeds) return false;
        return normalizedMeds.some(med => med.class === targetClass);
    }

    /**
     * Get all unique drug classes from normalized medications
     */
    function getClasses(normalizedMeds) {
        if (!normalizedMeds) return [];
        return [...new Set(normalizedMeds.map(med => med.class))];
    }

    /**
     * Detect duplicate drug classes (multiple medications of same class)
     * @param {Array} normalizedMeds - Normalized medication objects
     * @returns {Array} - Array of duplicate class alerts
     */
    function detectDuplicateClasses(normalizedMeds) {
        if (!normalizedMeds || normalizedMeds.length === 0) return [];

        // Group medications by class
        const classCounts = {};
        normalizedMeds.forEach(med => {
            if (!med.normalized || med.class === 'Other') return;

            if (!classCounts[med.class]) {
                classCounts[med.class] = [];
            }
            classCounts[med.class].push(med);
        });

        // Find duplicates (classes with > 1 medication)
        const duplicates = [];

        // Define which classes are concerning when duplicated
        const clinicallySignificantClasses = {
            'Statin': { severity: 'warning', message: '使用多種 Statin 類藥物，可能增加肌肉病變風險' },
            'LoopDiuretic': { severity: 'info', message: '使用多種 Loop Diuretic，請確認劑量調整是否合適' },
            'SGLT2i': { severity: 'warning', message: '使用多種 SGLT2i，不建議合併使用' },
            'ACEi': { severity: 'warning', message: '使用多種 ACEi，不建議合併使用' },
            'ARB': { severity: 'warning', message: '使用多種 ARB，不建議合併使用' },
            'BetaBlocker': { severity: 'info', message: '使用多種 β阻斷劑，請確認是否需要' },
            'CCB': { severity: 'info', message: '使用多種鈣離子阻斷劑' },
            'CCB-DHP': { severity: 'info', message: '使用多種 DHP 類鈣離子阻斷劑' },
            'DPP4i': { severity: 'warning', message: '使用多種 DPP4i，不建議合併使用' },
            'GLP1RA': { severity: 'warning', message: '使用多種 GLP-1 RA，不建議合併使用' },
            'SU': { severity: 'warning', message: '使用多種磺脲類，可能增加低血糖風險' },
            'DOAC': { severity: 'danger', message: '使用多種 DOAC，嚴重出血風險！' },
            'Anticoagulant': { severity: 'danger', message: '使用多種抗凝血劑，嚴重出血風險！' },
            'NSAID': { severity: 'warning', message: '使用多種 NSAID，增加腸胃道及心血管風險' },
            'PPI': { severity: 'info', message: '使用多種 PPI' },
            'Thiazide': { severity: 'info', message: '使用多種 Thiazide 類利尿劑' },
            'MRA': { severity: 'warning', message: '使用多種 MRA，可能增加高血鉀風險' }
        };

        // Also check for dangerous combinations
        const dangerousCombinations = [
            { classes: ['ACEi', 'ARB'], severity: 'danger', message: 'ACEi + ARB 合併使用，不建議（增加腎損傷及高血鉀風險）' },
            { classes: ['ACEi', 'ARNI'], severity: 'danger', message: 'ACEi + ARNI 禁忌合併（血管性水腫風險）' },
            { classes: ['Anticoagulant', 'DOAC'], severity: 'danger', message: 'Warfarin + DOAC 合併使用，嚴重出血風險！' },
            { classes: ['NSAID', 'Anticoagulant'], severity: 'danger', message: 'NSAID + 抗凝血劑，增加出血風險' },
            { classes: ['NSAID', 'DOAC'], severity: 'danger', message: 'NSAID + DOAC，增加出血風險' }
        ];

        // Check for same-class duplicates
        for (const [className, meds] of Object.entries(classCounts)) {
            if (meds.length > 1) {
                const config = clinicallySignificantClasses[className] || {
                    severity: 'info',
                    message: `使用 ${meds.length} 種 ${className} 類藥物`
                };

                duplicates.push({
                    type: 'duplicate',
                    class: className,
                    severity: config.severity,
                    message: config.message,
                    medications: meds.map(m => m.generic || m.original),
                    count: meds.length
                });
            }
        }

        // Check for dangerous combinations
        for (const combo of dangerousCombinations) {
            const hasAll = combo.classes.every(cls => classCounts[cls] && classCounts[cls].length > 0);
            if (hasAll) {
                const affectedMeds = combo.classes.flatMap(cls =>
                    classCounts[cls].map(m => m.generic || m.original)
                );
                duplicates.push({
                    type: 'combination',
                    classes: combo.classes,
                    severity: combo.severity,
                    message: combo.message,
                    medications: affectedMeds
                });
            }
        }

        // Sort by severity (danger > warning > info)
        const severityOrder = { danger: 0, warning: 1, info: 2 };
        duplicates.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return duplicates;
    }

    /**
     * Get last duplicate detection result
     */
    function getDuplicates() {
        if (lastDuplicateResult === null && lastNormalizationResult) {
            lastDuplicateResult = detectDuplicateClasses(lastNormalizationResult);
        }
        return lastDuplicateResult || [];
    }

    // Public API
    return {
        configure,
        isConfigured,
        normalize,
        getCached,
        getCachedMedication,
        clearCache,
        isClass,
        filterByClass,
        hasClass,
        getClasses,
        detectDuplicateClasses,
        getDuplicates,
        // Constants for drug classes
        CLASS: {
            SGLT2I: 'SGLT2i',
            GLP1RA: 'GLP1RA',
            DPP4I: 'DPP4i',
            BIGUANIDE: 'Biguanide',
            SU: 'SU',
            TZD: 'TZD',
            INSULIN: 'Insulin',
            ACEI: 'ACEi',
            ARB: 'ARB',
            ARNI: 'ARNI',
            BETA_BLOCKER: 'BetaBlocker',
            CCB: 'CCB',
            CCB_DHP: 'CCB-DHP',
            CCB_NON_DHP: 'CCB-NonDHP',
            THIAZIDE: 'Thiazide',
            LOOP_DIURETIC: 'LoopDiuretic',
            MRA: 'MRA',
            STATIN: 'Statin',
            EZETIMIBE: 'Ezetimibe',
            PCSK9I: 'PCSK9i',
            FIBRATE: 'Fibrate',
            ANTICOAGULANT: 'Anticoagulant',
            DOAC: 'DOAC',
            ANTIPLATELET: 'Antiplatelet',
            NSAID: 'NSAID',
            PPI: 'PPI',
            OTHER: 'Other'
        }
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.MedicationNormalizer = MedicationNormalizer;

    // Auto-configure from window.GEMINI_API_KEY or window.GEMINI_API_ENDPOINT
    if (window.GEMINI_API_KEY) {
        MedicationNormalizer.configure({ apiKey: window.GEMINI_API_KEY });
        console.log('MedicationNormalizer: Configured with API key');
    }
    if (window.GEMINI_API_ENDPOINT) {
        MedicationNormalizer.configure({ apiEndpoint: window.GEMINI_API_ENDPOINT });
        console.log('MedicationNormalizer: Configured with custom endpoint');
    }
}
