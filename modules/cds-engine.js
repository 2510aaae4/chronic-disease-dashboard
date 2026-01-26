/**
 * CDS Engine - Clinical Decision Support Rule Engine
 * 臨床決策支援規則引擎
 *
 * v2.6 - Added cross-guideline conflict detection (TZD+HF, CCB+HF)
 * v2.5 - Added HTN CDS (Taiwan 2022 Guidelines)
 * v2.4 - Added CKD CDS (KDIGO 2024)
 * v2.3 - Added HF CDS (ESC 2021/2023)
 * v2.2 - Added Afib CDS (ESC 2024)
 * v2.1 - Added Lipid CDS (ESC/EAS 2025)
 * - Deduplicated recommendations
 * - Consolidated overlapping rules
 * - Category-based deduplication
 * - Priority-based selection when duplicates exist
 * - Lipid guideline support (LDL target, statin, ezetimibe, Lp(a))
 * - Afib guideline support (CHA2DS2-VA, HAS-BLED, anticoagulation)
 * - HF guideline support (GDMT, device, ivabradine, medication safety)
 * - CKD guideline support (SGLT2i, RASi, Finerenone, monitoring, referral)
 */

const CDSEngine = (function() {
    // Cached rules
    let rulesCache = null;
    let rulesLoaded = false;

    // Lipid rules cache
    let lipidRulesCache = null;
    let lipidRulesLoaded = false;

    // Afib rules cache
    let afibRulesCache = null;
    let afibRulesLoaded = false;

    // HF rules cache
    let hfRulesCache = null;
    let hfRulesLoaded = false;

    // CKD rules cache
    let ckdRulesCache = null;
    let ckdRulesLoaded = false;

    // HTN rules cache
    let htnRulesCache = null;
    let htnRulesLoaded = false;

    // Priority levels
    const PRIORITY = {
        HIGH: 1,      // 需立即處理
        MEDIUM: 2,    // 建議調整
        LOW: 3,       // 提醒/資訊
        INFO: 4       // 一般資訊
    };

    // Deduplication categories - only one recommendation per category
    const DEDUP_CATEGORIES = {
        A1C_GOAL: 'a1c_goal',                    // 6.3a, 6.4, 6.5 → 合併
        HYPOGLYCEMIA_RISK: 'hypoglycemia_risk', // 6.6, 6.14 → 合併
        ASCVD_THERAPY: 'ascvd_therapy',         // 9.7, 10.40a → 合併
        HF_THERAPY: 'hf_therapy',               // 9.8, 9.9a, 9.9b → 合併
        CKD_THERAPY: 'ckd_therapy',             // 9.10, 9.11, 11.x → 合併
        OBESITY_THERAPY: 'obesity_therapy',     // 8.16, 8.18 → 合併
        MASLD_THERAPY: 'masld_therapy',         // 4.26, 4.27a → 合併
        BP_CONTROL: 'bp_control',               // 10.4, 10.7 → 合併
        RAAS_THERAPY: 'raas_therapy',           // 10.8, 10.10 → 合併
        STATIN_THERAPY: 'statin_therapy',       // 10.18, 10.20 → 合併
        ALBUMINURIA: 'albuminuria'              // 11.2, 10.10 → 合併
    };

    /**
     * Load rules from DM_rule.json (once)
     */
    async function loadRules() {
        if (rulesLoaded) return rulesCache;

        try {
            const response = await fetch('DM_guideline/DM_rule.json');
            rulesCache = await response.json();
            rulesLoaded = true;
            console.log('CDS rules loaded:', rulesCache.total_recommendations);
            return rulesCache;
        } catch (error) {
            console.error('Failed to load CDS rules:', error);
            return null;
        }
    }

    /**
     * Load rules from Lipid_rule.json (once)
     */
    async function loadLipidRules() {
        if (lipidRulesLoaded) return lipidRulesCache;

        try {
            const response = await fetch('Lipid_guideline/Lipid_rule.json');
            lipidRulesCache = await response.json();
            lipidRulesLoaded = true;
            console.log('Lipid CDS rules loaded:', lipidRulesCache.total_recommendations);
            return lipidRulesCache;
        } catch (error) {
            console.error('Failed to load Lipid CDS rules:', error);
            return null;
        }
    }

    /**
     * Load rules from Afib_rule.json (once)
     */
    async function loadAfibRules() {
        if (afibRulesLoaded) return afibRulesCache;

        try {
            const response = await fetch('Afib_guideline/Afib_rule.json');
            afibRulesCache = await response.json();
            afibRulesLoaded = true;
            console.log('Afib CDS rules loaded:', afibRulesCache.total_recommendations);
            return afibRulesCache;
        } catch (error) {
            console.error('Failed to load Afib CDS rules:', error);
            return null;
        }
    }

    /**
     * Load rules from HF_rule.json (once)
     */
    async function loadHFRules() {
        if (hfRulesLoaded) return hfRulesCache;

        try {
            const response = await fetch('HF_guideline/HF_rule.json');
            hfRulesCache = await response.json();
            hfRulesLoaded = true;
            console.log('HF CDS rules loaded:', hfRulesCache.total_recommendations);
            return hfRulesCache;
        } catch (error) {
            console.error('Failed to load HF CDS rules:', error);
            return null;
        }
    }

    /**
     * Load rules from CKD_rule.json (once)
     */
    async function loadCKDRules() {
        if (ckdRulesLoaded) return ckdRulesCache;

        try {
            const response = await fetch('CKD_guideline/CKD_rule.json');
            ckdRulesCache = await response.json();
            ckdRulesLoaded = true;
            console.log('CKD CDS rules loaded:', ckdRulesCache.total_recommendations);
            return ckdRulesCache;
        } catch (error) {
            console.error('Failed to load CKD CDS rules:', error);
            return null;
        }
    }

    /**
     * Load rules from HTN_rule.json (once)
     */
    async function loadHTNRules() {
        if (htnRulesLoaded) return htnRulesCache;

        try {
            const response = await fetch('HTN_guideline/HTN_rule.json');
            htnRulesCache = await response.json();
            htnRulesLoaded = true;
            console.log('HTN CDS rules loaded:', htnRulesCache.total_recommendations);
            return htnRulesCache;
        } catch (error) {
            console.error('Failed to load HTN CDS rules:', error);
            return null;
        }
    }

    /**
     * Fetch additional data needed for CDS (batch)
     */
    async function fetchAdditionalData() {
        if (!client) return;

        const neededCodes = [
            LOINC.LDL, LOINC.LDL_ALT,
            LOINC.TRIGLYCERIDES,
            LOINC.BMI,
            LOINC.AST, LOINC.ALT,
            LOINC.HBA1C,
            LOINC.ACR, LOINC.ACR_ALT,
            LOINC.TOTAL_CHOLESTEROL,
            LOINC.HDL,
            '10835-7',  // Lp(a) mass [Mass/volume]
            '43583-4'   // Lp(a) [nmol/L]
        ];

        // Filter out codes already in cache
        const missingCodes = neededCodes.filter(code => !observationsCache[code]);

        if (missingCodes.length === 0) return;

        try {
            const response = await client.request(
                `Observation?patient=${client.patient.id}&code=${missingCodes.join(',')}&_sort=-date&_count=50`
            );

            const observations = response.entry?.map(e => e.resource) || [];
            observations.forEach(obs => {
                const code = obs.code?.coding?.[0]?.code;
                if (code && !observationsCache[code]) {
                    observationsCache[code] = obs;
                }
            });
        } catch (error) {
            console.error('Error fetching additional CDS data:', error);
        }
    }

    /**
     * Get patient context for rule evaluation
     */
    function getPatientContext() {
        const age = patientData?.birthDate ? calculateAge(patientData.birthDate) : null;
        const gender = patientData?.gender;

        // Get values from cache
        const getValue = (code) => {
            const obs = observationsCache[code] || observationsCache[code + '_ALT'];
            return obs?.valueQuantity?.value ?? null;
        };

        // Check conditions
        const hasCondition = (keywords) => {
            return conditionsData.some(c => {
                if (c.clinicalStatus?.coding?.[0]?.code !== 'active') return false;
                const display = (c.code?.coding?.[0]?.display || c.code?.text || '').toLowerCase();
                return keywords.some(kw => display.includes(kw.toLowerCase()));
            });
        };

        // Check medications - uses AI-normalized data if available, falls back to keyword search
        const hasMedication = (keywords) => {
            // First check AI-normalized medications by drug class
            if (typeof normalizedMedicationsData !== 'undefined' && normalizedMedicationsData.length > 0) {
                const normalizedMatch = normalizedMedicationsData.some(nm => {
                    if (!nm.normalized) return false;
                    const generic = (nm.generic || '').toLowerCase();
                    const drugClass = (nm.class || '').toLowerCase();
                    return keywords.some(kw => {
                        const kwLower = kw.toLowerCase();
                        return generic.includes(kwLower) || drugClass.includes(kwLower);
                    });
                });
                if (normalizedMatch) return true;
            }

            // Fall back to keyword search in original medication names
            return medicationsData.some(m => {
                if (m.status !== 'active') return false;
                const name = m.name.toLowerCase();
                return keywords.some(kw => name.includes(kw.toLowerCase()));
            });
        };

        // Check medications by drug class (from AI normalization)
        const hasDrugClass = (targetClass) => {
            if (typeof normalizedMedicationsData !== 'undefined' && normalizedMedicationsData.length > 0) {
                return normalizedMedicationsData.some(nm =>
                    nm.normalized && nm.class === targetClass
                );
            }
            return false;
        };

        const getMedicationClasses = () => {
            const classes = new Set();

            // Use AI-normalized drug classes if available
            if (typeof normalizedMedicationsData !== 'undefined' && normalizedMedicationsData.length > 0) {
                normalizedMedicationsData.forEach(nm => {
                    if (nm.normalized && nm.class) {
                        // Map AI drug classes to internal class names
                        const classMap = {
                            'Biguanide': 'metformin',
                            'SU': 'sulfonylurea',
                            'DPP4i': 'dpp4i',
                            'SGLT2i': 'sglt2i',
                            'GLP1RA': 'glp1ra',
                            'TZD': 'tzd',
                            'Insulin': 'insulin',
                            'Statin': 'statin',
                            'ACEi': 'acei',
                            'ARB': 'arb',
                            'ARNI': 'arni',
                            'BetaBlocker': 'betablocker',
                            'CCB': 'ccb',
                            'CCB-DHP': 'ccb_dhp',
                            'CCB-NonDHP': 'ccb_nondhp',
                            'Thiazide': 'thiazide',
                            'LoopDiuretic': 'loop_diuretic',
                            'MRA': 'mra',
                            'Ezetimibe': 'ezetimibe',
                            'PCSK9i': 'pcsk9i',
                            'Fibrate': 'fibrate',
                            'Anticoagulant': 'anticoagulant',
                            'DOAC': 'doac',
                            'Antiplatelet': 'antiplatelet',
                            'NSAID': 'nsaid',
                            'PPI': 'ppi'
                        };
                        const mappedClass = classMap[nm.class] || nm.class.toLowerCase();
                        classes.add(mappedClass);

                        // Also add generic name for specific drugs
                        if (nm.generic) {
                            if (nm.generic === 'metformin') classes.add('metformin');
                            if (nm.generic === 'aspirin') classes.add('aspirin');
                        }
                    }
                });
            }

            // Fall back to keyword-based classification
            medicationsData.filter(m => m.status === 'active').forEach(m => {
                const name = m.name.toLowerCase();
                if (name.includes('metformin')) classes.add('metformin');
                if (['glipizide', 'glyburide', 'glimepiride', 'glibenclamide'].some(k => name.includes(k))) classes.add('sulfonylurea');
                if (['sitagliptin', 'saxagliptin', 'linagliptin', 'alogliptin', 'vildagliptin'].some(k => name.includes(k))) classes.add('dpp4i');
                if (['empagliflozin', 'dapagliflozin', 'canagliflozin', 'ertugliflozin'].some(k => name.includes(k))) classes.add('sglt2i');
                if (['liraglutide', 'semaglutide', 'dulaglutide', 'exenatide', 'lixisenatide'].some(k => name.includes(k))) classes.add('glp1ra');
                if (['tirzepatide'].some(k => name.includes(k))) classes.add('gip_glp1ra');
                if (name.includes('insulin')) classes.add('insulin');
                if (name.includes('pioglitazone') || name.includes('rosiglitazone')) classes.add('tzd');
                if (['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'lovastatin', 'fluvastatin'].some(k => name.includes(k))) classes.add('statin');
                if (['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'perindopril'].some(k => name.includes(k))) classes.add('acei');
                if (['losartan', 'valsartan', 'irbesartan', 'olmesartan', 'telmisartan', 'candesartan'].some(k => name.includes(k))) classes.add('arb');
                if (name.includes('aspirin')) classes.add('aspirin');
                if (['finerenone', 'spironolactone', 'eplerenone'].some(k => name.includes(k))) classes.add('mra');
            });
            return classes;
        };

        const hba1c = getValue(LOINC.HBA1C);
        const egfr = getValue(LOINC.EGFR);
        const acr = getValue(LOINC.ACR) || getValue(LOINC.ACR_ALT);
        const ldl = getValue(LOINC.LDL) || getValue(LOINC.LDL_ALT);
        const tg = getValue(LOINC.TRIGLYCERIDES);
        const sbp = getValue(LOINC.BP_SYSTOLIC);
        const dbp = getValue(LOINC.BP_DIASTOLIC);
        const bmi = getValue(LOINC.BMI);
        const ast = getValue(LOINC.AST);
        const alt = getValue(LOINC.ALT);
        const glucose = getValue(LOINC.GLUCOSE) || getValue(LOINC.GLUCOSE_ALT);
        const lpa = getValue('10835-7') || getValue('43583-4'); // Lp(a)
        const tc = getValue(LOINC.TOTAL_CHOLESTEROL);

        // Calculate FIB-4 if we have the data
        const platelets = getValue('777-3'); // Platelet count
        let fib4 = null;
        if (age && ast && alt && platelets && platelets > 0) {
            fib4 = (age * ast) / (platelets * Math.sqrt(alt));
        }

        const medClasses = getMedicationClasses();

        // Check for ezetimibe
        const isOnEzetimibe = hasMedication(['ezetimibe', 'zetia', 'vytorin']);
        // Check for PCSK9 inhibitors
        const isOnPCSK9i = hasMedication(['evolocumab', 'alirocumab', 'repatha', 'praluent']);
        // Check for diabetes
        const hasDM = hasCondition(['diabetes', 'diabetic', '糖尿病']) ||
                      detectedDiseases?.includes('dm');
        // Check for hyperlipidemia
        const hasHyperlipidemia = hasCondition(['hyperlipidemia', 'dyslipidemia', 'hypercholesterolemia', '高血脂', '高膽固醇']) ||
                                  detectedDiseases?.includes('lipid');
        // Check for FH (Familial Hypercholesterolemia)
        const hasFH = hasCondition(['familial hypercholesterolemia', 'familial hypercholesterolaemia', '家族性高膽固醇血症']);

        return {
            age,
            gender,
            hba1c,
            egfr,
            acr,
            ldl,
            tg,
            tc,
            lpa,
            sbp,
            dbp,
            bmi,
            ast,
            alt,
            glucose,
            fib4,
            medClasses,
            hasMedication,
            hasCondition,
            // Condition flags
            hasASCVD: hasCondition(['atherosclerotic', 'coronary artery disease', 'myocardial infarction', 'stroke', 'peripheral artery', 'cad', 'ascvd', '冠心病', '心肌梗塞', '中風']),
            hasHF: hasCondition(['heart failure', 'cardiac failure', '心衰竭', '心臟衰竭']),
            hasHFpEF: hasCondition(['hfpef', 'preserved ejection', '射出分率保留']),
            // CKD: eGFR < 60 OR albuminuria OR CKD diagnosis (KDIGO definition)
            hasCKD: (egfr !== null && egfr < 60) ||
                    (acr !== null && acr >= 30) ||
                    hasCondition(['chronic kidney disease', 'ckd', '慢性腎臟病', '慢性腎病']) ||
                    detectedDiseases?.includes('ckd'),
            hasCKDByEGFR: egfr !== null && egfr < 60,
            hasSevereCKD: egfr !== null && egfr < 30,
            hasModerateCKD: egfr !== null && egfr >= 30 && egfr < 60,
            hasAlbuminuria: acr !== null && acr >= 30,
            hasSevereAlbuminuria: acr !== null && acr >= 300,
            hasRetinopathy: hasCondition(['retinopathy', '視網膜病變']),
            hasNephropathy: hasCondition(['nephropathy', '腎病變']),
            hasNeuropathy: hasCondition(['neuropathy', '神經病變']),
            hasMASLD: hasCondition(['masld', 'nafld', 'fatty liver', '脂肪肝', 'mash', 'nash']),
            hasObesity: bmi !== null && bmi >= 30,
            hasOverweight: bmi !== null && bmi >= 25,
            hasDM,
            hasHyperlipidemia,
            hasFH,
            isOnInsulin: medClasses.has('insulin'),
            isOnSGLT2i: medClasses.has('sglt2i'),
            isOnGLP1RA: medClasses.has('glp1ra') || medClasses.has('gip_glp1ra'),
            isOnMetformin: medClasses.has('metformin'),
            isOnStatin: medClasses.has('statin'),
            isOnEzetimibe,
            isOnPCSK9i,
            isOnACEi: medClasses.has('acei'),
            isOnARB: medClasses.has('arb'),
            isOnDPP4i: medClasses.has('dpp4i'),
            isOnTZD: medClasses.has('tzd'),
            isOnSU: medClasses.has('sulfonylurea'),
            isOnMRA: medClasses.has('mra'),
            isOnAspirin: medClasses.has('aspirin'),
            // Frailty/complexity indicators
            isElderly: age !== null && age >= 65,
            isVeryElderly: age !== null && age >= 75,
            hasFrailtyIndicators: hasCondition(['frail', 'dementia', 'cognitive', 'alzheimer', '失智', '衰弱']) ||
                                  (age !== null && age >= 80),
            hasMultipleMorbidities: [
                hasCondition(['heart failure', '心衰竭']),
                egfr !== null && egfr < 45,
                hasCondition(['stroke', '中風']),
                hasCondition(['cancer', '癌症'])
            ].filter(Boolean).length >= 2
        };
    }

    /**
     * Determine individualized HbA1c target based on patient characteristics
     */
    function getIndividualizedA1cTarget(ctx) {
        // Frail, complex comorbidities → less stringent
        if (ctx.hasFrailtyIndicators || ctx.hasMultipleMorbidities) {
            return { target: 8.0, range: '7.5-8.5%', reason: '衰弱/複雜共病', ruleId: '6.5' };
        }
        // Very elderly on high-risk medications → less stringent
        if (ctx.isVeryElderly && (ctx.isOnInsulin || ctx.isOnSU)) {
            return { target: 7.5, range: '7.0-8.0%', reason: '≥75歲且使用高低血糖風險藥物', ruleId: '6.5' };
        }
        // Elderly → slightly relaxed
        if (ctx.isElderly) {
            return { target: 7.5, range: '7.0-7.5%', reason: '≥65歲老年人', ruleId: '6.3a' };
        }
        // Good health, low risk → stricter goal possible
        if (ctx.age !== null && ctx.age < 50 && !ctx.hasASCVD && !ctx.hasCKD && !ctx.hasHF &&
            !ctx.isOnInsulin && !ctx.isOnSU) {
            return { target: 6.5, range: '<6.5%', reason: '健康良好、低風險', ruleId: '6.4' };
        }
        // Default for most adults
        return { target: 7.0, range: '<7%', reason: '一般成人標準', ruleId: '6.3a' };
    }

    /**
     * Consolidated rule evaluation - returns deduplicated recommendations
     */
    function evaluateAllRules(ctx) {
        const results = [];
        const triggeredCategories = new Set();

        // ========================================
        // 1. HbA1c 目標評估 (合併 6.3a, 6.4, 6.5)
        // ========================================
        if (ctx.hba1c !== null && !triggeredCategories.has(DEDUP_CATEGORIES.A1C_GOAL)) {
            const goalInfo = getIndividualizedA1cTarget(ctx);

            // HbA1c 過高
            if (ctx.hba1c > goalInfo.target) {
                // 衰弱者在可接受範圍內不警告
                if (!(ctx.hasFrailtyIndicators && ctx.hba1c <= 8.5)) {
                    const priority = ctx.hba1c > goalInfo.target + 1.5 ? PRIORITY.HIGH : PRIORITY.MEDIUM;
                    results.push({
                        id: goalInfo.ruleId,
                        dedupCategory: DEDUP_CATEGORIES.A1C_GOAL,
                        priority,
                        message: `HbA1c ${ctx.hba1c.toFixed(1)}% 高於個人化目標 ${goalInfo.range}`,
                        detail: `依據病患特性（${goalInfo.reason}），建議目標 ${goalInfo.range}`
                    });
                    triggeredCategories.add(DEDUP_CATEGORIES.A1C_GOAL);
                }
            }
            // HbA1c 過低風險（使用高風險藥物時）
            else if (ctx.hba1c < 6.5 && (ctx.isOnInsulin || ctx.isOnSU) && ctx.isElderly) {
                results.push({
                    id: '6.5',
                    dedupCategory: DEDUP_CATEGORIES.A1C_GOAL,
                    priority: PRIORITY.HIGH,
                    message: `HbA1c ${ctx.hba1c.toFixed(1)}% 偏低，老年人使用胰島素/SU 需警惕低血糖`,
                    detail: '老年糖尿病患者使用高低血糖風險藥物，建議適度放寬血糖目標'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.A1C_GOAL);
                triggeredCategories.add(DEDUP_CATEGORIES.HYPOGLYCEMIA_RISK); // 同時標記低血糖已處理
            }
        }

        // ========================================
        // 2. 低血糖風險評估 (6.6, 6.14 - 僅在未被 A1C 目標覆蓋時)
        // ========================================
        if (!triggeredCategories.has(DEDUP_CATEGORIES.HYPOGLYCEMIA_RISK)) {
            if ((ctx.isOnInsulin || ctx.isOnSU) && (ctx.isElderly || ctx.hasCKD || ctx.hasFrailtyIndicators)) {
                results.push({
                    id: '6.6',
                    dedupCategory: DEDUP_CATEGORIES.HYPOGLYCEMIA_RISK,
                    priority: PRIORITY.MEDIUM,
                    message: '使用胰島素/SU 且為低血糖高風險族群',
                    detail: '建議評估是否減弱治療強度或轉換為低血糖風險較低的藥物類別'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.HYPOGLYCEMIA_RISK);
            }
        }

        // ========================================
        // 3. ASCVD 藥物治療 (合併 9.7, 10.40a)
        // ========================================
        if (ctx.hasASCVD && !ctx.isOnSGLT2i && !ctx.isOnGLP1RA && !triggeredCategories.has(DEDUP_CATEGORIES.ASCVD_THERAPY)) {
            results.push({
                id: '9.7',
                dedupCategory: DEDUP_CATEGORIES.ASCVD_THERAPY,
                priority: PRIORITY.HIGH,
                message: '有 ASCVD，建議加用 SGLT2i 或 GLP-1 RA',
                detail: '已證實可減少心血管事件，不論 HbA1c 水準皆建議使用'
            });
            triggeredCategories.add(DEDUP_CATEGORIES.ASCVD_THERAPY);
        }

        // ========================================
        // 4. 心衰竭治療 (合併 9.8, 9.9a, 9.9b)
        // ========================================
        if (ctx.hasHF && !triggeredCategories.has(DEDUP_CATEGORIES.HF_THERAPY)) {
            if (!ctx.isOnSGLT2i) {
                let message = '有心衰竭，建議使用 SGLT2i';
                let detail = '可減少心衰竭住院風險，不論 HbA1c 或射出分率';

                // HFpEF + 肥胖額外建議 GLP-1 RA
                if (ctx.hasHFpEF && ctx.hasObesity && !ctx.isOnGLP1RA) {
                    message = '有 HFpEF + 肥胖，建議 SGLT2i 及/或 GLP-1 RA';
                    detail = 'SGLT2i 減少住院；GLP-1 RA 改善心衰竭相關症狀';
                }

                results.push({
                    id: '9.8',
                    dedupCategory: DEDUP_CATEGORIES.HF_THERAPY,
                    priority: PRIORITY.HIGH,
                    message,
                    detail
                });
                triggeredCategories.add(DEDUP_CATEGORIES.HF_THERAPY);
            }
        }

        // ========================================
        // 5. CKD 治療 (合併 9.10, 9.11, 11.1a, 11.1b)
        // ========================================
        if (ctx.hasCKD && !triggeredCategories.has(DEDUP_CATEGORIES.CKD_THERAPY)) {
            // 進階 CKD (eGFR < 30)
            if (ctx.egfr !== null && ctx.egfr < 30) {
                if (!ctx.isOnGLP1RA) {
                    results.push({
                        id: '9.11',
                        dedupCategory: DEDUP_CATEGORIES.CKD_THERAPY,
                        priority: PRIORITY.HIGH,
                        message: `eGFR ${ctx.egfr.toFixed(0)} mL/min (<30)，進階 CKD 首選 GLP-1 RA`,
                        detail: '可降低心血管事件風險且低血糖風險較低'
                    });
                    triggeredCategories.add(DEDUP_CATEGORIES.CKD_THERAPY);
                }
            }
            // 中度 CKD (eGFR 20-60)
            else if (ctx.egfr >= 20 && ctx.egfr < 60 && !ctx.isOnSGLT2i && !ctx.isOnGLP1RA) {
                results.push({
                    id: '9.10',
                    dedupCategory: DEDUP_CATEGORIES.CKD_THERAPY,
                    priority: PRIORITY.HIGH,
                    message: `eGFR ${ctx.egfr.toFixed(0)} mL/min，CKD 患者建議 SGLT2i 或 GLP-1 RA`,
                    detail: '可減緩 CKD 進展並降低心血管事件風險'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.CKD_THERAPY);
            }
        }

        // ========================================
        // 6. 肥胖/過重治療 (合併 8.16, 8.18)
        // ========================================
        if (!triggeredCategories.has(DEDUP_CATEGORIES.OBESITY_THERAPY)) {
            if (ctx.hasObesity && !ctx.isOnGLP1RA) {
                results.push({
                    id: '8.18',
                    dedupCategory: DEDUP_CATEGORIES.OBESITY_THERAPY,
                    priority: PRIORITY.MEDIUM,
                    message: `BMI ${ctx.bmi?.toFixed(1)} (肥胖)，首選 GLP-1 RA 或 GIP/GLP-1 RA`,
                    detail: '具有較佳減重效果及額外心血管代謝效益'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.OBESITY_THERAPY);
            } else if (ctx.hasOverweight && !ctx.hasObesity && !ctx.isOnGLP1RA) {
                // 過重但未達肥胖，僅低優先度提醒
                results.push({
                    id: '8.16',
                    dedupCategory: DEDUP_CATEGORIES.OBESITY_THERAPY,
                    priority: PRIORITY.LOW,
                    message: `BMI ${ctx.bmi?.toFixed(1)} (過重)，建議優先選擇對體重有益的藥物`,
                    detail: '選擇降血糖藥物時可考慮體重效益'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.OBESITY_THERAPY);
            }
        }

        // ========================================
        // 7. MASLD 治療 (合併 4.22a, 4.26, 4.27a)
        // ========================================
        if (!triggeredCategories.has(DEDUP_CATEGORIES.MASLD_THERAPY)) {
            // FIB-4 篩檢
            if (ctx.fib4 !== null && ctx.fib4 >= 1.3) {
                results.push({
                    id: '4.22a',
                    dedupCategory: DEDUP_CATEGORIES.MASLD_THERAPY,
                    priority: PRIORITY.MEDIUM,
                    message: `FIB-4 ${ctx.fib4.toFixed(2)} ≥1.3，建議進一步評估肝纖維化風險`,
                    detail: '即使肝酵素正常，仍建議評估 MASH 相關肝硬化風險'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.MASLD_THERAPY);
            }
            // MASLD + 過重/肥胖
            else if (ctx.hasMASLD && ctx.hasOverweight && !ctx.isOnGLP1RA) {
                // 心衰竭患者的 MASLD 治療需特別注意：避免 Pioglitazone
                let detail = '對 MASH 有潛在益處，可作為減重介入的輔助治療';
                if (ctx.hasHF) {
                    detail += '。⚠️ 注意：因合併心衰竭，Pioglitazone 為禁忌，僅建議 GLP-1 RA';
                }
                results.push({
                    id: '4.26',
                    dedupCategory: DEDUP_CATEGORIES.MASLD_THERAPY,
                    priority: PRIORITY.MEDIUM,
                    message: 'MASLD + 過重/肥胖，建議 GLP-1 RA 用於血糖管理',
                    detail
                });
                triggeredCategories.add(DEDUP_CATEGORIES.MASLD_THERAPY);
            }
        }

        // ========================================
        // 7b. MASLD + HF + TZD 衝突警告 (跨指引衝突檢測)
        // ========================================
        if (ctx.hasMASLD && ctx.hasHF && ctx.isOnTZD) {
            results.push({
                id: '4.27a-HF-CONFLICT',
                priority: PRIORITY.HIGH,
                message: '⚠️ MASLD + 心衰竭 + TZD 用藥衝突',
                detail: 'Pioglitazone 雖對 MASH 有益 (ADA 4.27a)，但心衰竭患者禁用 TZD (ESC HF5.1)。建議改用 GLP-1 RA',
                category: 'cross_guideline_conflict'
            });
        }

        // ========================================
        // 8. 血壓控制 (合併 10.4, 10.7)
        // ========================================
        if (ctx.sbp !== null && ctx.dbp !== null && !triggeredCategories.has(DEDUP_CATEGORIES.BP_CONTROL)) {
            if (ctx.sbp >= 150 || ctx.dbp >= 90) {
                results.push({
                    id: '10.7',
                    dedupCategory: DEDUP_CATEGORIES.BP_CONTROL,
                    priority: PRIORITY.HIGH,
                    message: `血壓 ${ctx.sbp}/${ctx.dbp} mmHg ≥150/90，建議雙藥物治療`,
                    detail: '嚴重高血壓需積極控制以降低心血管風險'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.BP_CONTROL);
            } else if (ctx.sbp >= 130 || ctx.dbp >= 80) {
                results.push({
                    id: '10.4',
                    dedupCategory: DEDUP_CATEGORIES.BP_CONTROL,
                    priority: PRIORITY.MEDIUM,
                    message: `血壓 ${ctx.sbp}/${ctx.dbp} mmHg，目標 <130/80`,
                    detail: '糖尿病患者血壓目標較一般人嚴格'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.BP_CONTROL);
            }
        }

        // ========================================
        // 9. RAAS 治療 (合併 10.8, 10.10)
        // ========================================
        if (!triggeredCategories.has(DEDUP_CATEGORIES.RAAS_THERAPY)) {
            // ACEi + ARB 併用警告（最高優先）
            if (ctx.isOnACEi && ctx.isOnARB) {
                results.push({
                    id: '10.9',
                    dedupCategory: DEDUP_CATEGORIES.RAAS_THERAPY,
                    priority: PRIORITY.HIGH,
                    message: '⚠️ 避免 ACEi + ARB 併用 (雙重 RAAS 阻斷)',
                    detail: '增加高血鉀和急性腎損傷風險，不建議併用'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.RAAS_THERAPY);
            }
            // 需要 ACEi/ARB
            else if ((ctx.hasAlbuminuria || ctx.hasASCVD) && !ctx.isOnACEi && !ctx.isOnARB) {
                let message = ctx.hasAlbuminuria
                    ? `蛋白尿 (ACR ${ctx.acr?.toFixed(0)} mg/g)，建議 ACEi 或 ARB`
                    : 'ASCVD 患者建議 ACEi 或 ARB';
                results.push({
                    id: '10.8',
                    dedupCategory: DEDUP_CATEGORIES.RAAS_THERAPY,
                    priority: PRIORITY.HIGH,
                    message,
                    detail: '可減少蛋白尿進展及心血管事件'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.RAAS_THERAPY);
            }
        }

        // ========================================
        // 10. Statin 治療 (合併 10.18, 10.20)
        // ========================================
        if (!ctx.isOnStatin && ctx.age >= 40 && ctx.age <= 75 && !triggeredCategories.has(DEDUP_CATEGORIES.STATIN_THERAPY)) {
            if (ctx.hasASCVD) {
                results.push({
                    id: '10.20',
                    dedupCategory: DEDUP_CATEGORIES.STATIN_THERAPY,
                    priority: PRIORITY.HIGH,
                    message: '40-75 歲有 ASCVD，建議高強度 Statin',
                    detail: '次級預防需要積極降低 LDL-C'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.STATIN_THERAPY);
            } else {
                results.push({
                    id: '10.18',
                    dedupCategory: DEDUP_CATEGORIES.STATIN_THERAPY,
                    priority: PRIORITY.MEDIUM,
                    message: '40-75 歲糖尿病，建議中強度 Statin',
                    detail: '初級預防降低心血管風險'
                });
                triggeredCategories.add(DEDUP_CATEGORIES.STATIN_THERAPY);
            }
        }

        // ========================================
        // 11. LDL 目標 (10.27) - 獨立規則
        // ========================================
        if (ctx.hasASCVD && ctx.ldl !== null && ctx.ldl >= 55) {
            results.push({
                id: '10.27',
                priority: PRIORITY.HIGH,
                message: `LDL ${ctx.ldl.toFixed(0)} mg/dL，ASCVD 患者目標 <55`,
                detail: '考慮強化降脂治療以達到目標'
            });
        }

        // ========================================
        // 12. 三酸甘油酯 (10.29) - 獨立規則
        // ========================================
        if (ctx.tg !== null && ctx.tg >= 500) {
            results.push({
                id: '10.29',
                priority: PRIORITY.HIGH,
                message: `TG ${ctx.tg.toFixed(0)} mg/dL ≥500，需評估胰臟炎風險`,
                detail: '嚴重高三酸甘油酯血症需積極治療'
            });
        }

        // ========================================
        // 13. Aspirin 次級預防 (10.33) - 獨立規則
        // ========================================
        if (ctx.hasASCVD && !ctx.isOnAspirin) {
            results.push({
                id: '10.33',
                priority: PRIORITY.MEDIUM,
                message: 'ASCVD 患者建議 Aspirin 75-162 mg/day',
                detail: '次級預防，除非有禁忌症'
            });
        }

        // ========================================
        // 14. 蛋白尿目標 (11.2) - 僅在有嚴重蛋白尿時
        // ========================================
        if (ctx.hasSevereAlbuminuria && !triggeredCategories.has(DEDUP_CATEGORIES.ALBUMINURIA)) {
            results.push({
                id: '11.2',
                dedupCategory: DEDUP_CATEGORIES.ALBUMINURIA,
                priority: PRIORITY.MEDIUM,
                message: `ACR ${ctx.acr?.toFixed(0)} mg/g ≥300，目標減少 ≥30%`,
                detail: '嚴重蛋白尿需積極治療以延緩腎病進展'
            });
            triggeredCategories.add(DEDUP_CATEGORIES.ALBUMINURIA);
        }

        // ========================================
        // 15. MRA 考慮 (10.42) - 獨立規則
        // ========================================
        if (ctx.hasCKD && ctx.hasAlbuminuria && (ctx.isOnACEi || ctx.isOnARB) && !ctx.isOnMRA) {
            results.push({
                id: '10.42',
                priority: PRIORITY.LOW,
                message: 'CKD + 蛋白尿 + ACEi/ARB，可考慮非類固醇 MRA',
                detail: '如 Finerenone，可額外降低心腎風險'
            });
        }

        // ========================================
        // 16. DPP4i + GLP-1 RA 併用警告 (9.18)
        // ========================================
        if (ctx.isOnDPP4i && ctx.isOnGLP1RA) {
            results.push({
                id: '9.18',
                priority: PRIORITY.HIGH,
                message: '⚠️ DPP4i + GLP-1 RA 併用無額外效益',
                detail: '建議停用 DPP4i，因 GLP-1 RA 已作用於相同路徑'
            });
        }

        // ========================================
        // 17. 嚴重高血糖 (9.20, 9.21)
        // ========================================
        if (ctx.hba1c !== null) {
            if (ctx.hba1c > 10 || (ctx.glucose !== null && ctx.glucose >= 300)) {
                if (!ctx.isOnInsulin) {
                    results.push({
                        id: '9.20',
                        priority: PRIORITY.HIGH,
                        message: `嚴重高血糖 (HbA1c ${ctx.hba1c?.toFixed(1) || '-'}%)，考慮啟動胰島素`,
                        detail: '有高血糖症狀或 HbA1c >10% 或血糖 ≥300 mg/dL'
                    });
                }
            } else if (ctx.isOnInsulin && !ctx.isOnGLP1RA && ctx.hba1c <= 10) {
                results.push({
                    id: '9.21',
                    priority: PRIORITY.MEDIUM,
                    message: '非嚴重高血糖且使用胰島素，可考慮加用 GLP-1 RA',
                    detail: '可改善血糖控制、減少體重及低血糖風險'
                });
            }
        }

        // ========================================
        // 18. B12 監測 (3.10)
        // ========================================
        if (ctx.isOnMetformin && ctx.hasNeuropathy) {
            results.push({
                id: '3.10',
                priority: PRIORITY.LOW,
                message: '長期 Metformin + 神經病變，建議監測 B12',
                detail: 'Metformin 可能影響 B12 吸收'
            });
        }

        // ========================================
        // 19. RAAS 監測提醒 (11.6b)
        // ========================================
        if ((ctx.isOnACEi || ctx.isOnARB || ctx.isOnMRA) && ctx.hasCKD) {
            results.push({
                id: '11.6b',
                priority: PRIORITY.INFO,
                message: '使用 ACEi/ARB/MRA + CKD，定期監測腎功能及血鉀',
                detail: '開始或調整劑量後 2-4 週內監測'
            });
        }

        // ========================================
        // 20. 微血管併發症血糖優化 (12.20)
        // ========================================
        if ((ctx.hasNeuropathy || ctx.hasRetinopathy || ctx.hasNephropathy) &&
            ctx.hba1c !== null && ctx.hba1c > 7 &&
            !triggeredCategories.has(DEDUP_CATEGORIES.A1C_GOAL)) {
            results.push({
                id: '12.20',
                priority: PRIORITY.MEDIUM,
                message: '有微血管併發症，應優化血糖控制',
                detail: '良好血糖控制可減緩併發症進展'
            });
        }

        return results;
    }

    /**
     * Evaluate all rules and return recommendations
     */
    async function evaluate() {
        const rules = await loadRules();
        if (!rules) return [];

        await fetchAdditionalData();
        const ctx = getPatientContext();

        // Get deduplicated recommendations
        const recommendations = evaluateAllRules(ctx);

        // Add evidence levels from original rules
        const allRules = rules.sections.flatMap(section => section.recommendations);
        const ruleMap = new Map(allRules.map(r => [r.id, r]));

        recommendations.forEach(rec => {
            const originalRule = ruleMap.get(rec.id);
            if (originalRule) {
                rec.text_zh = originalRule.text_zh;
                rec.evidence_level = originalRule.evidence_level;
                rec.category = originalRule.category;
            }
        });

        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);

        return recommendations;
    }

    /**
     * Render recommendations HTML
     */
    function renderRecommendations(recommendations) {
        // Only show HIGH priority recommendations
        const high = recommendations.filter(r => r.priority === PRIORITY.HIGH);

        if (high.length === 0) {
            return '<div class="cds-empty">目前無需關注的建議</div>';
        }

        // Render without section header, just the items directly
        return `
            <div class="cds-priority-group cds-high">
                ${high.map(r => renderRecommendationItem(r)).join('')}
            </div>
        `;
    }

    function renderRecommendationItem(rec) {
        const evidence = Array.isArray(rec.evidence_level)
            ? rec.evidence_level.join('/')
            : (rec.evidence_level || '-');

        return `
            <div class="cds-item">
                <div class="cds-item-header">
                    <span class="cds-item-id">[${rec.id}]</span>
                    <span class="cds-item-evidence">Evidence: ${evidence}</span>
                </div>
                <div class="cds-item-message">${rec.message}</div>
                <div class="cds-item-detail">${rec.detail || ''}</div>
            </div>
        `;
    }

    // =====================================================
    // LIPID CDS FUNCTIONS (ESC/EAS 2025)
    // =====================================================

    /**
     * Determine CV risk level for lipid management based on ESC/EAS 2025
     * Returns: 'very_high', 'high', 'moderate', 'low'
     */
    function getCVRiskLevelForLipid(ctx) {
        // Very high risk criteria
        if (ctx.hasASCVD) {
            return { level: 'very_high', reason: '已確診動脈粥狀硬化性心血管疾病 (ASCVD)' };
        }
        if (ctx.hasSevereCKD) {
            return { level: 'very_high', reason: `嚴重慢性腎臟病 (eGFR ${ctx.egfr ? ctx.egfr.toFixed(0) : '<30'})` };
        }
        if (ctx.hasDM && (ctx.hasNephropathy || ctx.hasRetinopathy || ctx.hasNeuropathy)) {
            const complications = [];
            if (ctx.hasNephropathy) complications.push('腎病變');
            if (ctx.hasRetinopathy) complications.push('視網膜病變');
            if (ctx.hasNeuropathy) complications.push('神經病變');
            return { level: 'very_high', reason: `糖尿病合併靶器官損傷 (${complications.join('、')})` };
        }
        if (ctx.hasFH && ctx.hasASCVD) {
            return { level: 'very_high', reason: '家族性高膽固醇血症合併 ASCVD' };
        }

        // High risk criteria
        if (ctx.ldl !== null && ctx.ldl > 190) {
            return { level: 'high', reason: `LDL-C 明顯升高 (${ctx.ldl.toFixed(0)} mg/dL >190)` };
        }
        if (ctx.tc !== null && ctx.tc > 310) {
            return { level: 'high', reason: `總膽固醇明顯升高 (${ctx.tc.toFixed(0)} mg/dL >310)` };
        }
        if (ctx.sbp !== null && ctx.dbp !== null && (ctx.sbp >= 180 || ctx.dbp >= 110)) {
            return { level: 'high', reason: `嚴重高血壓 (${ctx.sbp}/${ctx.dbp} mmHg)` };
        }
        if (ctx.hasFH) {
            return { level: 'high', reason: '家族性高膽固醇血症' };
        }
        if (ctx.hasModerateCKD) {
            return { level: 'high', reason: `中度慢性腎臟病 (eGFR ${ctx.egfr ? ctx.egfr.toFixed(0) : '30-59'})` };
        }
        // Note: DM alone without target organ damage, duration ≥10y, or additional risk factors
        // is NOT automatically high risk per ESC/EAS 2025. Removed age-based DM classification.

        // Moderate risk criteria
        if (ctx.hasHyperlipidemia) {
            return { level: 'moderate', reason: '高血脂症' };
        }
        if (ctx.hasOverweight || ctx.hasObesity) {
            return { level: 'moderate', reason: '過重或肥胖' };
        }

        // Default: low risk
        return { level: 'low', reason: '無明顯心血管風險因子' };
    }

    /**
     * Get LDL-C target based on CV risk level (ESC/EAS 2025)
     */
    function getLDLTargetByRisk(riskLevel) {
        const targets = {
            'very_high': { target: 55, note: '且需較基線降低 ≥50%', ruleId: 'L1.1' },
            'high': { target: 70, note: '且需較基線降低 ≥50%', ruleId: 'L1.2' },
            'moderate': { target: 100, note: '', ruleId: 'L1.3' },
            'low': { target: 116, note: '', ruleId: 'L1.4' }
        };
        return targets[riskLevel] || targets['moderate'];
    }

    /**
     * Evaluate lipid-specific CDS rules (ESC/EAS 2025)
     */
    function evaluateLipidRules(ctx) {
        const results = [];

        // Determine CV risk level and LDL target
        const riskInfo = getCVRiskLevelForLipid(ctx);
        const riskLevel = riskInfo.level;
        const ldlGoal = getLDLTargetByRisk(riskLevel);

        const riskLabels = {
            'very_high': '極高風險',
            'high': '高風險',
            'moderate': '中等風險',
            'low': '低風險'
        };

        // ========================================
        // 1. LDL-C 目標評估
        // ========================================
        if (ctx.ldl !== null) {
            if (ctx.ldl >= ldlGoal.target) {
                const gap = ctx.ldl - ldlGoal.target;
                const priority = gap > 30 ? PRIORITY.HIGH : PRIORITY.MEDIUM;

                results.push({
                    id: ldlGoal.ruleId,
                    priority,
                    message: `LDL-C ${ctx.ldl.toFixed(0)} mg/dL，未達${riskLabels[riskLevel]}目標 <${ldlGoal.target} mg/dL`,
                    detail: `依據 ESC/EAS 2025 指南，${riskLabels[riskLevel]}患者 LDL-C 目標 <${ldlGoal.target} mg/dL${ldlGoal.note ? ' ' + ldlGoal.note : ''}`,
                    evidence_level: riskLevel === 'very_high' || riskLevel === 'high' ? 'A' : 'B',
                    category: 'ldl_target',
                    riskLevel
                });
            }
        }

        // ========================================
        // 2. Statin 治療建議
        // ========================================
        if (!ctx.isOnStatin && ctx.ldl !== null) {
            // High/Very high risk without statin
            if (riskLevel === 'very_high' || riskLevel === 'high') {
                results.push({
                    id: 'L2.1',
                    priority: PRIORITY.HIGH,
                    message: `${riskLabels[riskLevel]}患者未使用 Statin，建議起始高強度 Statin`,
                    detail: '高強度 Statin (如 Atorvastatin 40-80mg 或 Rosuvastatin 20-40mg) 可降低 LDL-C 約 50%',
                    evidence_level: 'A',
                    category: 'statin_therapy'
                });
            }
            // Moderate risk with elevated LDL
            else if (riskLevel === 'moderate' && ctx.ldl >= 100) {
                results.push({
                    id: 'L2.1',
                    priority: PRIORITY.MEDIUM,
                    message: '中等風險且 LDL-C ≥100 mg/dL，建議起始 Statin 治療',
                    detail: '中強度 Statin 可降低 LDL-C 約 30%',
                    evidence_level: 'A',
                    category: 'statin_therapy'
                });
            }
        }

        // ========================================
        // 3. Ezetimibe 加藥建議
        // ========================================
        if (ctx.isOnStatin && !ctx.isOnEzetimibe && ctx.ldl !== null && ctx.ldl >= ldlGoal.target) {
            results.push({
                id: 'L2.2',
                priority: PRIORITY.MEDIUM,
                message: `使用 Statin 但 LDL-C ${ctx.ldl.toFixed(0)} mg/dL 仍未達標，建議加用 Ezetimibe`,
                detail: 'Ezetimibe 可額外降低 LDL-C 約 20%，合併 Statin 可降低約 60%',
                evidence_level: 'B',
                category: 'combination_therapy'
            });
        }

        // ========================================
        // 4. PCSK9i 建議 (極高風險仍未達標)
        // ========================================
        if (riskLevel === 'very_high' && ctx.isOnStatin && ctx.isOnEzetimibe && !ctx.isOnPCSK9i &&
            ctx.ldl !== null && ctx.ldl >= 55) {
            results.push({
                id: 'L2.3',
                priority: PRIORITY.HIGH,
                message: `極高風險且 Statin + Ezetimibe 仍未達標 (LDL ${ctx.ldl.toFixed(0)} mg/dL)，建議加用 PCSK9 抑制劑`,
                detail: 'PCSK9 抑制劑可額外降低 LDL-C 約 60%，三聯療法可降低約 85%',
                evidence_level: 'A',
                category: 'combination_therapy'
            });
        }

        // ========================================
        // 5. Lp(a) 篩檢建議
        // ========================================
        if (ctx.lpa === null) {
            // No Lp(a) measurement - recommend screening
            results.push({
                id: 'L3.1',
                priority: PRIORITY.LOW,
                message: '建議測量 Lp(a) 至少一次',
                detail: '每位成人一生中應至少測量一次 Lp(a)，以識別高遺傳性心血管風險者',
                evidence_level: 'C',
                category: 'lpa_screening'
            });
        } else if (ctx.lpa > 50) {
            // Elevated Lp(a) - consider as risk enhancer
            const priority = ctx.lpa > 180 ? PRIORITY.HIGH : PRIORITY.MEDIUM;
            results.push({
                id: 'L3.2',
                priority,
                message: `Lp(a) ${ctx.lpa.toFixed(0)} mg/dL (>50)，為心血管風險增強因子`,
                detail: ctx.lpa > 180
                    ? 'Lp(a) >180 mg/dL 終生 ASCVD 風險等同於家族性高膽固醇血症，建議更積極降低 LDL-C'
                    : '建議更積極控制其他可改變的心血管風險因子，並加強 LDL-C 降低治療',
                evidence_level: 'B',
                category: 'lpa_risk'
            });
        }

        return results;
    }

    /**
     * Main function for lipid CDS evaluation
     */
    async function evaluateLipid() {
        const rules = await loadLipidRules();
        if (!rules) {
            console.warn('Lipid rules not loaded, using built-in evaluation');
        }

        await fetchAdditionalData();
        const ctx = getPatientContext();

        // Get lipid-specific recommendations
        const recommendations = evaluateLipidRules(ctx);

        // Add risk level info to context
        const riskInfo = getCVRiskLevelForLipid(ctx);
        const riskLevel = riskInfo.level;
        const ldlGoal = getLDLTargetByRisk(riskLevel);

        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);

        return {
            recommendations,
            context: {
                riskLevel,
                riskLabel: {
                    'very_high': '極高風險',
                    'high': '高風險',
                    'moderate': '中等風險',
                    'low': '低風險'
                }[riskLevel],
                riskReason: riskInfo.reason,
                ldlTarget: ldlGoal.target,
                ldlNote: ldlGoal.note,
                currentLDL: ctx.ldl,
                isAtGoal: ctx.ldl !== null && ctx.ldl < ldlGoal.target,
                currentTherapy: {
                    statin: ctx.isOnStatin,
                    ezetimibe: ctx.isOnEzetimibe,
                    pcsk9i: ctx.isOnPCSK9i
                },
                lpa: ctx.lpa
            }
        };
    }

    // =====================================================
    // AFIB CDS FUNCTIONS (ESC 2024)
    // =====================================================

    /**
     * Calculate CHA2DS2-VA score with partial scoring support
     * Returns: { score, maxPossible, components, unknownComponents }
     */
    function calculateCHA2DS2VA(ctx) {
        const components = [];
        const unknownComponents = [];
        let score = 0;
        let maxPossible = 0;

        // C - Congestive heart failure (1 point)
        if (ctx.hasHF) {
            score += 1;
            components.push({ id: 'C', name: '心衰竭', points: 1 });
        }
        maxPossible += 1;

        // H - Hypertension (1 point)
        if (ctx.hasHTN) {
            score += 1;
            components.push({ id: 'H', name: '高血壓', points: 1 });
        }
        maxPossible += 1;

        // A2 - Age ≥75 (2 points), A - Age 65-74 (1 point)
        if (ctx.age !== null) {
            if (ctx.age >= 75) {
                score += 2;
                components.push({ id: 'A2', name: '年齡 ≥75 歲', points: 2 });
            } else if (ctx.age >= 65) {
                score += 1;
                components.push({ id: 'A', name: '年齡 65-74 歲', points: 1 });
            }
            maxPossible += 2; // max is 2 for age
        } else {
            unknownComponents.push({ id: 'A', name: '年齡', maxPoints: 2 });
            maxPossible += 2;
        }

        // D - Diabetes (1 point)
        if (ctx.hasDM) {
            score += 1;
            components.push({ id: 'D', name: '糖尿病', points: 1 });
        }
        maxPossible += 1;

        // S2 - Stroke/TIA (2 points)
        if (ctx.hasStroke) {
            score += 2;
            components.push({ id: 'S2', name: '中風/TIA 病史', points: 2 });
        }
        maxPossible += 2;

        // V - Vascular disease (1 point)
        if (ctx.hasVascularDisease) {
            score += 1;
            components.push({ id: 'V', name: '血管疾病', points: 1 });
        }
        maxPossible += 1;

        return {
            score,
            maxPossible: 8,
            isComplete: unknownComponents.length === 0,
            components,
            unknownComponents,
            displayText: unknownComponents.length > 0
                ? `至少 ${score} 分`
                : `${score} 分`
        };
    }

    /**
     * Calculate HAS-BLED score with partial scoring support
     * Returns: { score, maxPossible, components, unknownComponents }
     */
    function calculateHASBLED(ctx) {
        const components = [];
        const unknownComponents = [];
        let score = 0;

        // H - Hypertension uncontrolled (SBP >160)
        if (ctx.sbp !== null) {
            if (ctx.sbp > 160) {
                score += 1;
                components.push({ id: 'H', name: '高血壓未控制 (SBP >160)', points: 1 });
            }
        } else {
            unknownComponents.push({ id: 'H', name: '血壓控制狀況', maxPoints: 1 });
        }

        // A - Abnormal renal function
        if (ctx.hasSevereCKD || (ctx.egfr !== null && ctx.egfr < 30)) {
            score += 1;
            components.push({ id: 'A_renal', name: '腎功能異常', points: 1 });
        } else if (ctx.egfr === null && !ctx.hasCKD) {
            unknownComponents.push({ id: 'A_renal', name: '腎功能', maxPoints: 1 });
        }

        // A - Abnormal liver function
        if (ctx.hasLiverDisease) {
            score += 1;
            components.push({ id: 'A_liver', name: '肝功能異常', points: 1 });
        } else if (ctx.alt === null && ctx.ast === null) {
            unknownComponents.push({ id: 'A_liver', name: '肝功能', maxPoints: 1 });
        }

        // S - Stroke history
        if (ctx.hasStroke) {
            score += 1;
            components.push({ id: 'S', name: '中風病史', points: 1 });
        }

        // B - Bleeding history
        if (ctx.hasBleedingHistory) {
            score += 1;
            components.push({ id: 'B', name: '出血病史', points: 1 });
        }

        // L - Labile INR (only if on warfarin)
        if (ctx.isOnWarfarin) {
            unknownComponents.push({ id: 'L', name: 'INR 穩定性 (需追蹤)', maxPoints: 1 });
        }

        // E - Elderly (>65)
        if (ctx.age !== null) {
            if (ctx.age > 65) {
                score += 1;
                components.push({ id: 'E', name: '年齡 >65 歲', points: 1 });
            }
        } else {
            unknownComponents.push({ id: 'E', name: '年齡', maxPoints: 1 });
        }

        // D - Drugs (antiplatelet, NSAIDs)
        if (ctx.isOnAntiplatelet || ctx.isOnNSAID) {
            score += 1;
            const drugs = [];
            if (ctx.isOnAntiplatelet) drugs.push('抗血小板');
            if (ctx.isOnNSAID) drugs.push('NSAIDs');
            components.push({ id: 'D_drugs', name: `藥物 (${drugs.join(', ')})`, points: 1 });
        }

        // D - Alcohol (unknown by default unless documented)
        unknownComponents.push({ id: 'D_alcohol', name: '酒精使用 (需詢問病史)', maxPoints: 1 });

        return {
            score,
            maxPossible: 9,
            isComplete: unknownComponents.length === 0,
            components,
            unknownComponents,
            displayText: unknownComponents.length > 0
                ? `至少 ${score} 分`
                : `${score} 分`,
            riskLevel: score >= 3 ? 'high' : 'low'
        };
    }

    /**
     * Check anticoagulation status
     */
    function checkAnticoagulationStatus(ctx) {
        const status = {
            isOnAnticoagulation: false,
            medications: [],
            type: null
        };

        // Check for NOACs
        const noacKeywords = ['dabigatran', 'pradaxa', '普栓達',
                             'rivaroxaban', 'xarelto', '拜瑞妥',
                             'apixaban', 'eliquis', '艾必克凝',
                             'edoxaban', 'lixiana', '里先安', 'savaysa'];

        // Check for Warfarin
        const warfarinKeywords = ['warfarin', 'coumadin', '可邁丁', '華法林'];

        if (medicationsData && medicationsData.length > 0) {
            medicationsData.forEach(med => {
                if (med.status !== 'active') return;
                const nameLower = med.name.toLowerCase();

                if (noacKeywords.some(kw => nameLower.includes(kw))) {
                    status.isOnAnticoagulation = true;
                    status.type = 'NOAC';
                    status.medications.push(med.name);
                } else if (warfarinKeywords.some(kw => nameLower.includes(kw))) {
                    status.isOnAnticoagulation = true;
                    status.type = status.type === 'NOAC' ? 'both' : 'VKA';
                    status.medications.push(med.name);
                }
            });
        }

        return status;
    }

    /**
     * Get Afib-enhanced patient context
     */
    function getAfibPatientContext(ctx) {
        // Additional flags for Afib
        const hasCondition = ctx.hasCondition;

        return {
            ...ctx,
            // Stroke/TIA history
            hasStroke: hasCondition(['stroke', 'CVA', 'TIA', 'transient ischemic', 'cerebrovascular', '中風', '腦中風', '暫時性腦缺血']),
            // Vascular disease
            hasVascularDisease: ctx.hasASCVD || hasCondition(['myocardial infarction', 'MI', 'peripheral artery', 'PAD', '心肌梗塞', '周邊動脈']),
            // HTN
            hasHTN: hasCondition(['hypertension', 'HTN', '高血壓']),
            // Liver disease
            hasLiverDisease: hasCondition(['cirrhosis', 'liver failure', 'hepatic failure', '肝硬化', '肝衰竭']),
            // Bleeding history
            hasBleedingHistory: hasCondition(['bleeding', 'hemorrhage', 'GI bleed', '出血', '消化道出血', '腦出血']),
            // Medication flags
            isOnWarfarin: ctx.hasMedication(['warfarin', 'coumadin', '可邁丁', '華法林']),
            isOnAntiplatelet: ctx.hasMedication(['aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel', '阿斯匹靈', '保栓通']),
            isOnNSAID: ctx.hasMedication(['ibuprofen', 'naproxen', 'diclofenac', 'celecoxib', 'NSAID'])
        };
    }

    /**
     * Main function for Afib CDS evaluation
     */
    async function evaluateAfib() {
        await loadAfibRules();
        await fetchAdditionalData();

        const baseCtx = getPatientContext();
        const ctx = getAfibPatientContext(baseCtx);

        // Calculate scores
        const cha2ds2va = calculateCHA2DS2VA(ctx);
        const hasbled = calculateHASBLED(ctx);
        const anticoagStatus = checkAnticoagulationStatus(ctx);

        // Determine stroke prevention recommendation
        let strokePreventionRec = null;
        if (cha2ds2va.score === 0 && cha2ds2va.isComplete) {
            strokePreventionRec = {
                action: 'no_anticoagulation',
                class: 'III',
                text_zh: '不需抗凝血治療',
                priority: PRIORITY.LOW
            };
        } else if (cha2ds2va.score === 1) {
            strokePreventionRec = {
                action: 'consider_anticoagulation',
                class: 'IIa',
                text_zh: '應考慮抗凝血治療',
                priority: PRIORITY.MEDIUM
            };
        } else if (cha2ds2va.score >= 2) {
            strokePreventionRec = {
                action: 'recommend_anticoagulation',
                class: 'I',
                text_zh: '建議抗凝血治療',
                priority: PRIORITY.HIGH
            };
        } else {
            // Score is 0 but incomplete
            strokePreventionRec = {
                action: 'incomplete_assessment',
                class: '-',
                text_zh: '需補充資料以完成評估',
                priority: PRIORITY.MEDIUM
            };
        }

        // Check if anticoagulation is needed but not prescribed
        let anticoagulationAlert = null;
        if (cha2ds2va.score >= 1 && !anticoagStatus.isOnAnticoagulation) {
            anticoagulationAlert = {
                type: 'missing_anticoagulation',
                message: cha2ds2va.score >= 2
                    ? '建議使用抗凝血治療但目前未使用'
                    : '可考慮使用抗凝血治療',
                priority: cha2ds2va.score >= 2 ? PRIORITY.HIGH : PRIORITY.MEDIUM
            };
        }

        return {
            cha2ds2va,
            hasbled,
            anticoagulation: anticoagStatus,
            strokePreventionRec,
            anticoagulationAlert,
            context: ctx
        };
    }

    // Cache for evaluated results
    let dmCdsCache = null;
    let lipidCdsCache = null;
    let afibCdsCache = null;
    let cdsPreloaded = false;

    /**
     * Preload all CDS rules and data (call on app init)
     */
    async function preload() {
        if (cdsPreloaded) return;

        console.log('CDS Engine: Preloading rules and data...');
        const startTime = performance.now();

        try {
            // Load rules in parallel
            await Promise.all([
                loadRules(),
                loadLipidRules(),
                loadAfibRules(),
                loadHFRules(),
                loadCKDRules()
            ]);

            // Fetch additional observation data
            await fetchAdditionalData();

            cdsPreloaded = true;
            console.log(`CDS Engine: Preload complete in ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('CDS Engine: Preload error:', error);
        }
    }

    /**
     * Background evaluation - call after patient data is loaded
     */
    async function evaluateBackground() {
        if (!cdsPreloaded) {
            await preload();
        }

        console.log('CDS Engine: Background evaluation started');

        try {
            // Evaluate DM, Lipid, HF, and CKD CDS in parallel
            const [dmResult, lipidResult, hfResult, ckdResult] = await Promise.all([
                (async () => {
                    const ctx = getPatientContext();
                    return { recommendations: evaluateAllRules(ctx), context: ctx };
                })(),
                (async () => {
                    const ctx = getPatientContext();
                    const riskInfo = getCVRiskLevelForLipid(ctx);
                    const riskLevel = riskInfo.level;
                    const ldlGoal = getLDLTargetByRisk(riskLevel);
                    const recommendations = evaluateLipidRules(ctx);
                    recommendations.sort((a, b) => a.priority - b.priority);

                    return {
                        recommendations,
                        context: {
                            riskLevel,
                            riskLabel: {
                                'very_high': '極高風險',
                                'high': '高風險',
                                'moderate': '中等風險',
                                'low': '低風險'
                            }[riskLevel],
                            riskReason: riskInfo.reason,
                            ldlTarget: ldlGoal.target,
                            ldlNote: ldlGoal.note,
                            currentLDL: ctx.ldl,
                            isAtGoal: ctx.ldl !== null && ctx.ldl < ldlGoal.target,
                            currentTherapy: {
                                statin: ctx.isOnStatin,
                                ezetimibe: ctx.isOnEzetimibe,
                                pcsk9i: ctx.isOnPCSK9i
                            },
                            lpa: ctx.lpa
                        }
                    };
                })(),
                (async () => {
                    const baseCtx = getPatientContext();
                    const ctx = getHFPatientContext(baseCtx);
                    const recommendations = evaluateHFRules(ctx);
                    recommendations.sort((a, b) => a.priority - b.priority);

                    return {
                        recommendations,
                        context: {
                            hfClassification: ctx.hfClassification,
                            lvef: ctx.lvef,
                            hr: ctx.hr,
                            potassium: ctx.potassium,
                            gdmtStatus: {
                                arniOrACEiARB: ctx.hasRAASBlocker,
                                betaBlocker: ctx.isOnBetaBlocker,
                                mra: ctx.isOnMRA,
                                sglt2i: ctx.isOnSGLT2i,
                                complete: ctx.hasRAASBlocker && ctx.isOnBetaBlocker && ctx.isOnMRA && ctx.isOnSGLT2i
                            },
                            harmfulMeds: {
                                nsaid: ctx.isOnNSAID,
                                nonDhpCcb: ctx.isOnNonDHPCCB,
                                tzd: ctx.isOnTZD
                            },
                            ivabradine: {
                                isOn: ctx.isOnIvabradine,
                                eligible: ctx.lvef !== null && ctx.lvef <= 35 && ctx.hr !== null && ctx.hr >= 70 && ctx.hasSinusRhythm && ctx.isOnBetaBlocker
                            }
                        }
                    };
                })(),
                (async () => {
                    const baseCtx = getPatientContext();
                    const ctx = getCKDPatientContext(baseCtx);
                    const recommendations = evaluateCKDRules(ctx);
                    recommendations.sort((a, b) => a.priority - b.priority);

                    return {
                        recommendations,
                        context: {
                            egfr: ctx.egfr,
                            acr: ctx.acr,
                            stageInfo: ctx.stageInfo,
                            potassium: ctx.potassium,
                            sbp: ctx.sbp,
                            hasDM: ctx.hasDM,
                            hasHTN: ctx.hasHTN,
                            medications: {
                                sglt2i: ctx.isOnSGLT2i,
                                aceiOrArb: ctx.hasRASi,
                                finerenone: ctx.isOnFinerenone,
                                statin: ctx.isOnStatin,
                                metformin: ctx.isOnMetformin,
                                nsaid: ctx.isOnNSAID
                            },
                            isOnDialysis: ctx.isOnDialysis,
                            hasKidneyTransplant: ctx.hasKidneyTransplant
                        }
                    };
                })()
            ]);

            dmCdsCache = dmResult;
            lipidCdsCache = lipidResult;
            hfCdsCache = hfResult;
            ckdCdsCache = ckdResult;

            console.log('CDS Engine: Background evaluation complete');
        } catch (error) {
            console.error('CDS Engine: Background evaluation error:', error);
        }
    }

    /**
     * Get cached DM CDS result (fast)
     */
    function getCachedDM() {
        return dmCdsCache;
    }

    /**
     * Get cached Lipid CDS result (fast)
     */
    function getCachedLipid() {
        return lipidCdsCache;
    }

    /**
     * Clear cache (call when patient data changes)
     */
    function clearCache() {
        dmCdsCache = null;
        lipidCdsCache = null;
        afibCdsCache = null;
        hfCdsCache = null;
        ckdCdsCache = null;
    }

    /**
     * Get cached Afib CDS result (fast)
     */
    function getCachedAfib() {
        return afibCdsCache;
    }

    // =====================================================
    // HF CDS FUNCTIONS (ESC 2021/2023)
    // =====================================================

    /**
     * Determine HF classification based on LVEF
     */
    function getHFClassification(lvef) {
        if (lvef === null || lvef === undefined) {
            return { type: 'unknown', label: '未分類', description: '需心臟超音波檢查確認' };
        }
        if (lvef <= 40) {
            return { type: 'HFrEF', label: 'HFrEF (心射出分率降低)', description: 'LVEF ≤40%，需四大支柱藥物' };
        }
        if (lvef <= 49) {
            return { type: 'HFmrEF', label: 'HFmrEF (心射出分率輕度降低)', description: 'LVEF 41-49%，建議 SGLT2i' };
        }
        return { type: 'HFpEF', label: 'HFpEF (心射出分率保留)', description: 'LVEF ≥50%，建議 SGLT2i' };
    }

    /**
     * Get HF-enhanced patient context
     */
    function getHFPatientContext(baseCtx) {
        const hasCondition = baseCtx.hasCondition;
        const hasMedication = baseCtx.hasMedication;

        // ========================================
        // 1. Get LVEF from multiple LOINC codes
        // ========================================
        let lvef = null;
        let lvefSource = null;
        const lvefCodes = [
            { code: LOINC.LVEF, name: 'Echo' },
            { code: LOINC.LVEF_ECHO, name: 'Echo' },
            { code: LOINC.LVEF_NUCLEAR, name: 'Nuclear' },
            { code: LOINC.LVEF_VENTRICULOGRAM, name: 'Ventriculogram' },
            { code: LOINC.LVEF_MRI, name: 'MRI' },
            { code: LOINC.LVEF_ANGIO, name: 'Angio' }
        ];

        for (const { code, name } of lvefCodes) {
            if (code) {
                const obs = observationsCache[code];
                if (obs?.valueQuantity?.value != null) {
                    lvef = obs.valueQuantity.value;
                    lvefSource = name;
                    break; // Use first available LVEF
                }
            }
        }

        // ========================================
        // 2. Check HF subtype from diagnosis codes
        // ========================================
        let hfSubtypeFromDx = null;
        const hfRegistry = typeof DiseaseRegistry !== 'undefined' ? DiseaseRegistry.hf : null;

        if (hfRegistry?.hfSubtypes && typeof conditionsData !== 'undefined') {
            // Check each HF subtype
            for (const [subtype, codes] of Object.entries(hfRegistry.hfSubtypes)) {
                // Check SNOMED codes
                const snomedMatch = conditionsData.some(cond => {
                    const condCodes = cond.code?.coding || [];
                    return condCodes.some(coding =>
                        codes.snomed?.includes(coding.code)
                    );
                });

                // Check ICD-10 codes
                const icdMatch = conditionsData.some(cond => {
                    const condCodes = cond.code?.coding || [];
                    return condCodes.some(coding =>
                        codes.icd10?.some(icd => coding.code?.startsWith(icd))
                    );
                });

                // Check keywords in condition display text
                const keywordMatch = conditionsData.some(cond => {
                    const text = (cond.code?.text || '').toLowerCase();
                    return codes.keywords?.some(kw => text.includes(kw.toLowerCase()));
                });

                if (snomedMatch || icdMatch || keywordMatch) {
                    hfSubtypeFromDx = subtype;
                    break;
                }
            }
        }

        // ========================================
        // 3. Get other observations
        // ========================================
        const hrObs = observationsCache[LOINC.HEART_RATE];
        const hr = hrObs?.valueQuantity?.value ?? null;
        const potassium = observationsCache['2823-3']?.valueQuantity?.value ?? null; // Potassium

        // GDMT pillars check
        const isOnARNI = hasMedication(['sacubitril', 'entresto', '健安心']);
        const isOnACEiOrARB = baseCtx.isOnACEi || baseCtx.isOnARB;
        const isOnBetaBlocker = hasMedication(['carvedilol', 'metoprolol', 'bisoprolol', 'nebivolol', '康肯', '達利全']);
        const isOnMRA = baseCtx.isOnMRA || hasMedication(['spironolactone', 'eplerenone', '安達通', '愛普樂']);
        const isOnSGLT2i = baseCtx.isOnSGLT2i;

        // Medications to avoid
        const isOnNSAID = hasMedication(['ibuprofen', 'naproxen', 'diclofenac', 'celecoxib', 'meloxicam', 'indomethacin', 'ketorolac', '布洛芬', '乃普生']);
        const isOnNonDHPCCB = hasMedication(['diltiazem', 'verapamil', '合必爽', '心舒平']);
        const isOnTZD = baseCtx.isOnTZD || hasMedication(['pioglitazone', 'rosiglitazone', '愛妥糖']);

        // Ivabradine check
        const isOnIvabradine = hasMedication(['ivabradine', 'coralan', '康立來']);

        // Sinus rhythm (assume true if not documented AF)
        const hasAF = hasCondition(['atrial fibrillation', 'AF', 'Afib', '心房顫動', '心房纖維顫動']);

        // ========================================
        // 4. Determine HF classification (LVEF takes priority, then diagnosis)
        // ========================================
        let hfClassification;
        if (lvef !== null) {
            // LVEF-based classification (most accurate)
            hfClassification = getHFClassification(lvef);
            hfClassification.source = `LVEF ${lvef}% (${lvefSource})`;
        } else if (hfSubtypeFromDx) {
            // Diagnosis-based classification (fallback)
            const labels = {
                HFrEF: { type: 'HFrEF', label: 'HFrEF (心射出分率降低)', description: '根據診斷代碼判定，建議進行心臟超音波確認 LVEF' },
                HFmrEF: { type: 'HFmrEF', label: 'HFmrEF (心射出分率輕度降低)', description: '根據診斷代碼判定，建議進行心臟超音波確認 LVEF' },
                HFpEF: { type: 'HFpEF', label: 'HFpEF (心射出分率保留)', description: '根據診斷代碼判定，建議進行心臟超音波確認 LVEF' }
            };
            hfClassification = labels[hfSubtypeFromDx] || getHFClassification(null);
            hfClassification.source = '診斷代碼';
            hfClassification.needsConfirmation = true;
        } else {
            // Unknown classification
            hfClassification = getHFClassification(null);
            hfClassification.source = null;
        }

        return {
            ...baseCtx,
            lvef,
            lvefSource,
            hfSubtypeFromDx,
            hr,
            potassium,
            hfClassification,
            // GDMT status
            isOnARNI,
            isOnACEiOrARB,
            hasRAASBlocker: isOnARNI || isOnACEiOrARB,
            isOnBetaBlocker,
            isOnMRA,
            isOnSGLT2i,
            isOnIvabradine,
            // Harmful medications
            isOnNSAID,
            isOnNonDHPCCB,
            isOnTZD,
            // Rhythm
            hasAF,
            hasSinusRhythm: !hasAF
        };
    }

    /**
     * Evaluate HF-specific CDS rules (ESC 2021/2023)
     */
    function evaluateHFRules(ctx) {
        const results = [];
        const hfClass = ctx.hfClassification;

        // ========================================
        // 1. GDMT 缺藥提醒 (HFrEF and HFmrEF per ESC 2023)
        // ========================================
        if (hfClass.type === 'HFrEF' || hfClass.type === 'HFmrEF') {
            const missingPillars = [];

            if (!ctx.hasRAASBlocker) {
                missingPillars.push('ARNI/ACEi/ARB');
            }
            if (!ctx.isOnBetaBlocker) {
                missingPillars.push('β阻斷劑');
            }
            if (!ctx.isOnMRA) {
                missingPillars.push('MRA');
            }
            if (!ctx.isOnSGLT2i) {
                missingPillars.push('SGLT2i');
            }

            if (missingPillars.length > 0) {
                // HFrEF: HIGH priority (Class I); HFmrEF: MEDIUM priority (Class IIb)
                const priority = hfClass.type === 'HFrEF' ? PRIORITY.HIGH : PRIORITY.MEDIUM;
                const evidenceLevel = hfClass.type === 'HFrEF' ? 'A' : 'C';
                const recommendation = hfClass.type === 'HFrEF'
                    ? 'ESC 2021 建議 HFrEF 患者使用四大支柱藥物 (ARNI/ACEi/ARB + β阻斷劑 + MRA + SGLT2i) 以降低死亡率及住院風險'
                    : 'ESC 2023 建議 HFmrEF 患者可考慮使用 GDMT 藥物，特別是 SGLT2i (Class I) 及 ACEi/ARB、β阻斷劑、MRA (Class IIb)';

                results.push({
                    id: 'HF1.1',
                    priority,
                    message: `${hfClass.type} 患者缺少 GDMT 支柱藥物: ${missingPillars.join('、')}`,
                    detail: recommendation,
                    evidence_level: evidenceLevel,
                    category: 'gdmt',
                    missingPillars
                });
            }
        }

        // ========================================
        // 2. SGLT2i 建議 (All HF types)
        // ========================================
        if (!ctx.isOnSGLT2i && hfClass.type !== 'unknown') {
            const priority = hfClass.type === 'HFrEF' ? PRIORITY.HIGH : PRIORITY.MEDIUM;
            results.push({
                id: 'HF1.2',
                priority,
                message: `${hfClass.label} 患者未使用 SGLT2i`,
                detail: 'ESC 2023 建議所有心衰竭患者 (不論 EF 或糖尿病狀態) 使用 SGLT2i (dapagliflozin 或 empagliflozin)',
                evidence_level: 'A',
                category: 'sglt2i'
            });
        }

        // ========================================
        // 3. 腎功能/K+ 警示
        // ========================================
        // High potassium warning
        if (ctx.potassium !== null && ctx.potassium >= 5.0) {
            if (ctx.potassium >= 5.5) {
                results.push({
                    id: 'HF2.1',
                    priority: PRIORITY.HIGH,
                    message: `血鉀 ${ctx.potassium.toFixed(1)} mmol/L ≥5.5，需立即處理`,
                    detail: '高血鉀可能危及生命，需評估是否暫停或減量 MRA/ACEi/ARB',
                    evidence_level: 'C',
                    category: 'monitoring'
                });
            } else {
                results.push({
                    id: 'HF2.1',
                    priority: PRIORITY.MEDIUM,
                    message: `血鉀 ${ctx.potassium.toFixed(1)} mmol/L 偏高 (5.0-5.5)`,
                    detail: '建議密切監測，評估是否需要調整 MRA/ACEi/ARB 劑量',
                    evidence_level: 'C',
                    category: 'monitoring'
                });
            }
        }

        // Low eGFR warning (especially on RAAS inhibitors)
        if (ctx.egfr !== null && ctx.egfr < 30 && (ctx.hasRAASBlocker || ctx.isOnMRA)) {
            results.push({
                id: 'HF2.1',
                priority: PRIORITY.MEDIUM,
                message: `eGFR ${ctx.egfr.toFixed(0)} mL/min (<30) 且使用 RAAS 抑制劑`,
                detail: '嚴重腎功能不全需密切監測腎功能及血鉀，可能需調整藥物劑量',
                evidence_level: 'C',
                category: 'monitoring'
            });
        }

        // ========================================
        // 4. 裝置評估提醒 (LVEF ≤35%)
        // ========================================
        if (ctx.lvef !== null && ctx.lvef <= 35) {
            results.push({
                id: 'HF3.1',
                priority: PRIORITY.MEDIUM,
                message: `LVEF ${ctx.lvef.toFixed(0)}% (≤35%)，建議評估 ICD/CRT 適應症`,
                detail: 'ESC 指南建議 LVEF ≤35% 且經過至少3個月最佳藥物治療後，評估植入式心臟去顫器 (ICD) 以降低猝死風險',
                evidence_level: 'A',
                category: 'device'
            });
        }

        // ========================================
        // 5. Ivabradine 考慮
        // ========================================
        if (ctx.lvef !== null && ctx.lvef <= 35 &&
            ctx.hr !== null && ctx.hr >= 70 &&
            ctx.hasSinusRhythm &&
            ctx.isOnBetaBlocker &&
            !ctx.isOnIvabradine) {
            results.push({
                id: 'HF4.1',
                priority: PRIORITY.MEDIUM,
                message: `HFrEF + 竇性心律 + HR ${ctx.hr.toFixed(0)} bpm (≥70)，可考慮 Ivabradine`,
                detail: '已使用 β阻斷劑但心率仍 ≥70 bpm 的 HFrEF 患者，加用 Ivabradine 可降低心衰竭住院風險',
                evidence_level: 'B',
                category: 'ivabradine'
            });
        }

        // ========================================
        // 6. 應避免藥物警示
        // ========================================
        const harmfulMeds = [];

        if (ctx.isOnNSAID) {
            harmfulMeds.push({
                class: 'NSAIDs',
                reason: '造成水分滯留、惡化心衰竭、損害腎功能'
            });
        }

        if (ctx.isOnNonDHPCCB && (hfClass.type === 'HFrEF' || hfClass.type === 'HFmrEF')) {
            harmfulMeds.push({
                class: '非二氫吡啶類 CCB (Diltiazem/Verapamil)',
                reason: '負性肌力作用，可能惡化 HFrEF/HFmrEF'
            });
        }

        if (ctx.isOnTZD) {
            harmfulMeds.push({
                class: 'TZD 類降血糖藥 (Pioglitazone)',
                reason: '造成水分滯留，增加心衰竭住院風險'
            });
        }

        if (harmfulMeds.length > 0) {
            results.push({
                id: 'HF5.1',
                priority: PRIORITY.HIGH,
                message: `⚠️ 使用心衰竭患者應避免的藥物: ${harmfulMeds.map(m => m.class).join('、')}`,
                detail: harmfulMeds.map(m => `${m.class}: ${m.reason}`).join('; '),
                evidence_level: 'B',
                category: 'avoid_medications',
                harmfulMeds
            });
        }

        return results;
    }

    /**
     * Main function for HF CDS evaluation
     */
    async function evaluateHF() {
        await loadHFRules();
        await fetchAdditionalData();

        // Fetch additional HF-specific data
        if (client) {
            try {
                // Fetch LVEF, HR, Potassium if not in cache
                const additionalCodes = [LOINC.LVEF, LOINC.HEART_RATE, '2823-3']; // Potassium = 2823-3
                const missingCodes = additionalCodes.filter(code => !observationsCache[code]);

                if (missingCodes.length > 0) {
                    const response = await client.request(
                        `Observation?patient=${client.patient.id}&code=${missingCodes.join(',')}&_sort=-date&_count=20`
                    );
                    const observations = response.entry?.map(e => e.resource) || [];
                    observations.forEach(obs => {
                        const code = obs.code?.coding?.[0]?.code;
                        if (code && !observationsCache[code]) {
                            observationsCache[code] = obs;
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching HF-specific data:', error);
            }
        }

        const baseCtx = getPatientContext();
        const ctx = getHFPatientContext(baseCtx);

        // Evaluate HF rules
        const recommendations = evaluateHFRules(ctx);

        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);

        return {
            recommendations,
            context: {
                hfClassification: ctx.hfClassification,
                lvef: ctx.lvef,
                hr: ctx.hr,
                potassium: ctx.potassium,
                gdmtStatus: {
                    arniOrACEiARB: ctx.hasRAASBlocker,
                    betaBlocker: ctx.isOnBetaBlocker,
                    mra: ctx.isOnMRA,
                    sglt2i: ctx.isOnSGLT2i,
                    complete: ctx.hasRAASBlocker && ctx.isOnBetaBlocker && ctx.isOnMRA && ctx.isOnSGLT2i
                },
                harmfulMeds: {
                    nsaid: ctx.isOnNSAID,
                    nonDhpCcb: ctx.isOnNonDHPCCB,
                    tzd: ctx.isOnTZD
                },
                ivabradine: {
                    isOn: ctx.isOnIvabradine,
                    eligible: ctx.lvef !== null && ctx.lvef <= 35 && ctx.hr !== null && ctx.hr >= 70 && ctx.hasSinusRhythm && ctx.isOnBetaBlocker
                }
            }
        };
    }

    // HF CDS cache
    let hfCdsCache = null;

    /**
     * Get cached HF CDS result (fast)
     */
    function getCachedHF() {
        return hfCdsCache;
    }

    // =====================================================
    // CKD CDS FUNCTIONS (KDIGO 2024)
    // =====================================================

    /**
     * Get CKD stage information
     */
    function getCKDStageInfo(egfr, acr) {
        let gfrStage = { stage: '-', description: '無資料', class: 'neutral' };
        let acrStage = { stage: '-', description: '無資料', class: 'neutral' };

        if (egfr !== null && egfr !== undefined) {
            if (egfr >= 90) gfrStage = { stage: 'G1', description: '正常或偏高', class: 'good' };
            else if (egfr >= 60) gfrStage = { stage: 'G2', description: '輕度降低', class: 'good' };
            else if (egfr >= 45) gfrStage = { stage: 'G3a', description: '輕中度降低', class: 'warning' };
            else if (egfr >= 30) gfrStage = { stage: 'G3b', description: '中重度降低', class: 'warning' };
            else if (egfr >= 15) gfrStage = { stage: 'G4', description: '重度降低', class: 'danger' };
            else gfrStage = { stage: 'G5', description: '腎衰竭', class: 'danger' };
        }

        if (acr !== null && acr !== undefined) {
            if (acr < 30) acrStage = { stage: 'A1', description: '正常至輕度增加', class: 'good' };
            else if (acr < 300) acrStage = { stage: 'A2', description: '中度增加', class: 'warning' };
            else acrStage = { stage: 'A3', description: '重度增加', class: 'danger' };
        }

        return { gfrStage, acrStage };
    }

    /**
     * Get CKD-enhanced patient context
     */
    function getCKDPatientContext(baseCtx) {
        const hasCondition = baseCtx.hasCondition;
        const hasMedication = baseCtx.hasMedication;

        const egfr = baseCtx.egfr;
        const acr = baseCtx.acr;
        const potassium = observationsCache[LOINC.POTASSIUM]?.valueQuantity?.value ?? null;
        const sbp = baseCtx.sbp;

        // CKD staging
        const stageInfo = getCKDStageInfo(egfr, acr);

        // Medication checks
        const isOnACEi = baseCtx.isOnACEi;
        const isOnARB = baseCtx.isOnARB;
        const isOnSGLT2i = baseCtx.isOnSGLT2i;
        const isOnStatin = baseCtx.isOnStatin;
        const isOnMetformin = baseCtx.isOnMetformin;
        const isOnSU = baseCtx.isOnSU;
        const isOnFinerenone = hasMedication(['finerenone', 'kerendia', '可申達']);
        const isOnNSAID = hasMedication(['ibuprofen', 'naproxen', 'diclofenac', 'celecoxib', 'meloxicam', 'indomethacin', 'ketorolac']);

        // Condition checks
        const hasDM = baseCtx.hasDM;
        const hasHTN = hasCondition(['hypertension', 'HTN', '高血壓']);
        const isOnDialysis = hasCondition(['dialysis', 'hemodialysis', 'peritoneal dialysis', '透析', '洗腎', '血液透析', '腹膜透析']);
        const hasKidneyTransplant = hasCondition(['kidney transplant', 'renal transplant', '腎臟移植', '腎移植']);

        return {
            ...baseCtx,
            egfr,
            acr,
            potassium,
            sbp,
            stageInfo,
            // CKD-specific flags (KDIGO definition)
            hasCKD: (egfr !== null && egfr < 60) ||
                    (acr !== null && acr >= 30) ||
                    hasCondition(['chronic kidney disease', 'ckd', '慢性腎臟病', '慢性腎病']) ||
                    detectedDiseases?.includes('ckd'),
            hasCKDByEGFR: egfr !== null && egfr < 60,
            hasSevereCKD: egfr !== null && egfr < 30,
            hasModerateCKD: egfr !== null && egfr >= 30 && egfr < 60,
            hasAlbuminuria: acr !== null && acr >= 30,
            hasSevereAlbuminuria: acr !== null && acr >= 300,
            hasModerateAlbuminuria: acr !== null && acr >= 30 && acr < 300,
            // Conditions
            hasDM,
            hasHTN,
            isOnDialysis,
            hasKidneyTransplant,
            // Medications
            isOnACEi,
            isOnARB,
            hasRASi: isOnACEi || isOnARB,
            isOnSGLT2i,
            isOnStatin,
            isOnMetformin,
            isOnSU,
            isOnFinerenone,
            isOnNSAID,
            // Derived
            potassiumNormal: potassium !== null && potassium < 5.0,
            potassiumHigh: potassium !== null && potassium >= 5.0
        };
    }

    /**
     * Evaluate CKD-specific CDS rules (KDIGO 2024)
     */
    function evaluateCKDRules(ctx) {
        const results = [];

        // Skip if on dialysis or transplant
        if (ctx.isOnDialysis || ctx.hasKidneyTransplant) {
            return results;
        }

        // ========================================
        // 1. SGLT2i 建議
        // ========================================
        if (!ctx.isOnSGLT2i && ctx.egfr !== null && ctx.egfr >= 20) {
            if (ctx.hasDM) {
                // CKD3.7.1 - T2D + CKD
                results.push({
                    id: 'CKD3.7.1',
                    priority: PRIORITY.HIGH,
                    message: '糖尿病合併 CKD，建議使用 SGLT2i',
                    detail: `eGFR ${ctx.egfr.toFixed(0)} mL/min (≥20)，KDIGO 2024 建議 T2D + CKD 患者使用 SGLT2i 以延緩腎功能惡化`,
                    evidence_level: 'A',
                    category: 'sglt2i'
                });
            } else if (ctx.hasCKD) {
                // CKD3.7.2 - CKD without DM
                results.push({
                    id: 'CKD3.7.2',
                    priority: PRIORITY.MEDIUM,
                    message: 'CKD 患者可考慮使用 SGLT2i',
                    detail: `eGFR ${ctx.egfr.toFixed(0)} mL/min (≥20)，KDIGO 2024 建議 CKD (即使無糖尿病) 可使用 SGLT2i`,
                    evidence_level: 'B',
                    category: 'sglt2i'
                });
            }
        }

        // ========================================
        // 2. RASi (ACEi/ARB) 建議
        // ========================================
        if (!ctx.hasRASi && ctx.hasHTN) {
            if (ctx.hasSevereAlbuminuria) {
                // CKD3.6.1 - Severe albuminuria
                results.push({
                    id: 'CKD3.6.1',
                    priority: PRIORITY.HIGH,
                    message: `嚴重蛋白尿 (ACR ${ctx.acr?.toFixed(0)} ≥300 mg/g)，建議使用 ACEi 或 ARB`,
                    detail: 'KDIGO 2024 建議高血壓合併嚴重蛋白尿的 CKD 患者使用 ACEi 或 ARB 以減緩腎病進展',
                    evidence_level: 'A',
                    category: 'rasi'
                });
            } else if (ctx.hasModerateAlbuminuria) {
                // CKD3.6.2 - Moderate albuminuria
                results.push({
                    id: 'CKD3.6.2',
                    priority: PRIORITY.MEDIUM,
                    message: `中度蛋白尿 (ACR ${ctx.acr?.toFixed(0)} mg/g)，建議考慮 ACEi 或 ARB`,
                    detail: 'KDIGO 2024 建議高血壓合併中度蛋白尿的 CKD 患者考慮使用 ACEi 或 ARB',
                    evidence_level: 'C',
                    category: 'rasi'
                });
            }
        }

        // ========================================
        // 3. Finerenone 建議
        // ========================================
        if (ctx.hasDM && ctx.hasRASi && !ctx.isOnFinerenone &&
            ctx.egfr !== null && ctx.egfr >= 25 &&
            ctx.hasAlbuminuria && ctx.potassiumNormal) {
            // CKD3.8.1 - Finerenone for T2D + CKD + proteinuria
            results.push({
                id: 'CKD3.8.1',
                priority: PRIORITY.MEDIUM,
                message: '糖尿病 + CKD + 蛋白尿，可考慮加用 Finerenone',
                detail: 'eGFR ≥25、血鉀正常且已使用 ACEi/ARB 的 T2D + CKD 患者，KDIGO 2024 建議加用 Finerenone 以降低心腎風險',
                evidence_level: 'A',
                category: 'finerenone'
            });
        }

        // ========================================
        // 4. 血壓控制
        // ========================================
        if (ctx.hasHTN && ctx.sbp !== null && ctx.sbp >= 120) {
            const priority = ctx.sbp >= 140 ? PRIORITY.HIGH : PRIORITY.MEDIUM;
            results.push({
                id: 'CKD3.4.1',
                priority,
                message: `血壓 ${ctx.sbp} mmHg，CKD 患者目標 <120 mmHg`,
                detail: 'KDIGO 2024 建議 CKD 合併高血壓患者，若可耐受應將收縮壓控制在 120 mmHg 以下',
                evidence_level: 'B',
                category: 'blood_pressure'
            });
        }

        // ========================================
        // 5. Statin 建議
        // ========================================
        if (!ctx.isOnStatin && ctx.age !== null && ctx.age >= 50 &&
            ctx.egfr !== null && ctx.egfr < 60 && !ctx.isOnDialysis) {
            results.push({
                id: 'CKD3.15.1',
                priority: PRIORITY.MEDIUM,
                message: '年齡 ≥50 歲且 eGFR <60，建議使用 Statin',
                detail: 'KDIGO 2024 建議 50 歲以上 CKD 患者使用 Statin 或 Statin/Ezetimibe 降低心血管風險',
                evidence_level: 'A',
                category: 'statin'
            });
        }

        // ========================================
        // 6. 藥物調整 - Metformin
        // ========================================
        if (ctx.isOnMetformin && ctx.egfr !== null) {
            if (ctx.egfr < 30) {
                results.push({
                    id: 'CKD5.1.1',
                    priority: PRIORITY.HIGH,
                    message: `eGFR ${ctx.egfr.toFixed(0)} mL/min (<30)，應停用 Metformin`,
                    detail: 'KDIGO 2024 建議 eGFR <30 mL/min 時停用 Metformin，以避免乳酸中毒風險',
                    evidence_level: 'B',
                    category: 'medication_adjustment'
                });
            } else if (ctx.egfr < 45) {
                results.push({
                    id: 'CKD5.1.1',
                    priority: PRIORITY.MEDIUM,
                    message: `eGFR ${ctx.egfr.toFixed(0)} mL/min (<45)，Metformin 應減量`,
                    detail: 'KDIGO 2024 建議 eGFR 30-45 mL/min 時應將 Metformin 劑量減半',
                    evidence_level: 'B',
                    category: 'medication_adjustment'
                });
            }
        }

        // ========================================
        // 7. 藥物安全 - NSAIDs
        // ========================================
        if (ctx.isOnNSAID) {
            const priority = ctx.egfr !== null && ctx.egfr < 30 ? PRIORITY.HIGH : PRIORITY.MEDIUM;
            results.push({
                id: 'CKD4.2.1',
                priority,
                message: '⚠️ CKD 患者使用 NSAIDs，可能加速腎功能惡化',
                detail: 'KDIGO 2024 建議 CKD 患者避免使用 NSAIDs，尤其是 eGFR <30 mL/min 的患者',
                evidence_level: 'B',
                category: 'medication_safety'
            });
        }

        // ========================================
        // 8. 高血鉀警示
        // ========================================
        if (ctx.potassiumHigh) {
            const priority = ctx.potassium >= 5.5 ? PRIORITY.HIGH : PRIORITY.MEDIUM;
            results.push({
                id: 'CKD4.1.2',
                priority,
                message: `血鉀 ${ctx.potassium?.toFixed(1)} mmol/L ${ctx.potassium >= 5.5 ? '(≥5.5) 需立即處理' : '(5.0-5.5) 偏高'}`,
                detail: '使用 ACEi/ARB/MRA 的 CKD 患者需密切監測血鉀，必要時調整藥物劑量',
                evidence_level: 'C',
                category: 'monitoring'
            });
        }

        // ========================================
        // 9. 腎臟科轉介
        // ========================================
        if (ctx.egfr !== null && ctx.egfr < 30) {
            results.push({
                id: 'CKD6.1.1',
                priority: PRIORITY.MEDIUM,
                message: `eGFR ${ctx.egfr.toFixed(0)} mL/min (<30)，建議轉介腎臟科`,
                detail: 'KDIGO 2024 建議 eGFR <30 mL/min (G4-G5) 患者應轉介腎臟科評估及管理',
                evidence_level: 'C',
                category: 'referral'
            });
        } else if (ctx.hasSevereAlbuminuria) {
            results.push({
                id: 'CKD6.1.1',
                priority: PRIORITY.MEDIUM,
                message: `嚴重蛋白尿 (ACR ≥300)，建議轉介腎臟科`,
                detail: 'KDIGO 2024 建議持續嚴重蛋白尿患者應轉介腎臟科評估',
                evidence_level: 'C',
                category: 'referral'
            });
        }

        return results;
    }

    /**
     * Main function for CKD CDS evaluation
     */
    async function evaluateCKD() {
        await loadCKDRules();
        await fetchAdditionalData();

        // Fetch additional CKD-specific data
        if (client) {
            try {
                const additionalCodes = [LOINC.POTASSIUM, LOINC.ACR, LOINC.ACR_ALT, LOINC.BP_SYSTOLIC];
                const missingCodes = additionalCodes.filter(code => !observationsCache[code]);

                if (missingCodes.length > 0) {
                    const response = await client.request(
                        `Observation?patient=${client.patient.id}&code=${missingCodes.join(',')}&_sort=-date&_count=20`
                    );
                    const observations = response.entry?.map(e => e.resource) || [];
                    observations.forEach(obs => {
                        const code = obs.code?.coding?.[0]?.code;
                        if (code && !observationsCache[code]) {
                            observationsCache[code] = obs;
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching CKD-specific data:', error);
            }
        }

        const baseCtx = getPatientContext();
        const ctx = getCKDPatientContext(baseCtx);

        // Evaluate CKD rules
        const recommendations = evaluateCKDRules(ctx);

        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);

        return {
            recommendations,
            context: {
                egfr: ctx.egfr,
                acr: ctx.acr,
                stageInfo: ctx.stageInfo,
                potassium: ctx.potassium,
                sbp: ctx.sbp,
                hasDM: ctx.hasDM,
                hasHTN: ctx.hasHTN,
                medications: {
                    sglt2i: ctx.isOnSGLT2i,
                    aceiOrArb: ctx.hasRASi,
                    finerenone: ctx.isOnFinerenone,
                    statin: ctx.isOnStatin,
                    metformin: ctx.isOnMetformin,
                    nsaid: ctx.isOnNSAID
                },
                isOnDialysis: ctx.isOnDialysis,
                hasKidneyTransplant: ctx.hasKidneyTransplant
            }
        };
    }

    // CKD CDS cache
    let ckdCdsCache = null;

    /**
     * Get cached CKD CDS result (fast)
     */
    function getCachedCKD() {
        return ckdCdsCache;
    }

    // ========================================
    // HTN CDS (Taiwan 2022 Guidelines)
    // ========================================

    /**
     * Get HTN-enhanced patient context
     */
    function getHTNPatientContext(baseCtx) {
        const hasCondition = baseCtx.hasCondition;
        const hasMedication = baseCtx.hasMedication;

        const sbp = baseCtx.sbp;
        const dbp = baseCtx.dbp;
        const age = baseCtx.age;
        const bmi = baseCtx.bmi;
        const egfr = baseCtx.egfr;

        // Comorbidity checks
        const hasDM = baseCtx.hasDM;
        const hasCKD = baseCtx.hasCKD;
        const hasHF = baseCtx.hasHF;
        const hasASCVD = baseCtx.hasASCVD;
        const hasCHD = hasCondition(['coronary heart disease', 'coronary artery disease', 'angina', 'myocardial infarction', '冠心病', '冠狀動脈疾病', '心絞痛', '心肌梗塞']);
        const hasStroke = hasCondition(['stroke', 'cerebrovascular', 'tia', 'transient ischemic', '中風', '腦中風', '腦血管']);
        const hasRecentStroke = hasCondition(['recent stroke', 'acute stroke', '急性中風']); // Within 72h-convalescence

        // Medication checks - 5 major classes
        const isOnACEi = baseCtx.isOnACEi;
        const isOnARB = baseCtx.isOnARB;
        const isOnBetaBlocker = hasMedication(['metoprolol', 'atenolol', 'bisoprolol', 'carvedilol', 'propranolol', 'nebivolol', 'labetalol']);
        const isOnCCB = hasMedication(['amlodipine', 'nifedipine', 'diltiazem', 'verapamil', 'felodipine', 'lercanidipine', 'nicardipine']);
        const isOnThiazide = hasMedication(['hydrochlorothiazide', 'chlorthalidone', 'indapamide', 'metolazone']);
        const isOnDRI = hasMedication(['aliskiren', 'tekturna', '瑞素坦']);
        const isOnMRA = baseCtx.isOnMRA;

        // Risk factor count for treatment threshold determination
        const riskFactors = [
            age !== null && age >= 65,
            baseCtx.gender === 'male',
            hasMedication(['smoking', 'nicotine']) || hasCondition(['smoking', 'smoker', '吸菸']),
            baseCtx.hasHyperlipidemia || (baseCtx.ldl !== null && baseCtx.ldl > 130),
            hasDM,
            hasCondition(['family history', 'familial', '家族史'])
        ].filter(Boolean).length;

        // HMOD (Hypertension-mediated organ damage)
        const hasHMOD = hasCKD || hasCondition(['left ventricular hypertrophy', 'lvh', '左心室肥厚']) ||
                        hasCondition(['retinopathy', '視網膜病變']) ||
                        hasCondition(['microalbuminuria', 'proteinuria', '蛋白尿']);

        // BP control status
        const bpControlled = sbp !== null && dbp !== null && sbp < 130 && dbp < 80;
        const bpSeverelyElevated = sbp !== null && sbp >= 180 || dbp !== null && dbp >= 110;
        const bpUncontrolled = sbp !== null && sbp >= 140 || dbp !== null && dbp >= 90;

        return {
            ...baseCtx,
            sbp,
            dbp,
            age,
            bmi,
            egfr,
            // Comorbidities
            hasDM,
            hasCKD,
            hasHF,
            hasASCVD,
            hasCHD,
            hasStroke,
            hasRecentStroke,
            hasHMOD,
            // Risk assessment
            riskFactors,
            isLowRisk: !hasASCVD && !hasHMOD && riskFactors < 3,
            isHighRisk: hasASCVD || hasHMOD || riskFactors >= 3,
            // Medications
            isOnACEi,
            isOnARB,
            isOnBetaBlocker,
            isOnCCB,
            isOnThiazide,
            isOnDRI,
            isOnMRA,
            hasRASi: isOnACEi || isOnARB,
            // Dangerous combinations
            hasDangerousCombination: (isOnDRI && isOnACEi) || (isOnDRI && isOnARB) || (isOnACEi && isOnARB),
            // BP status
            bpControlled,
            bpUncontrolled,
            bpSeverelyElevated,
            // Elderly
            isElderly: age !== null && age >= 65
        };
    }

    /**
     * Get individualized BP target based on patient conditions
     * Returns the most appropriate (usually strictest applicable) target
     */
    function getBPTargetForPatient(ctx) {
        // Priority: Pick the most specific condition-based target
        // All these targets are <130/80, but we label by the primary indication

        // CKD - can go to <120 if tolerable
        if (ctx.hasCKD) {
            if (ctx.hasASCVD || ctx.isHighRisk) {
                return {
                    ruleId: 'HTN14.2',
                    target: '< 120 mmHg (SBP)',
                    targetSbp: 120,
                    targetDbp: null,
                    indication: 'CKD + 高心血管風險',
                    note: '如可耐受',
                    cor: 'IIb',
                    loe: 'B'
                };
            }
            return {
                ruleId: 'HTN14.1',
                target: '< 130 mmHg (SBP)',
                targetSbp: 130,
                targetDbp: null,
                indication: '慢性腎臟病',
                note: '',
                cor: 'I',
                loe: 'B'
            };
        }

        // Heart Failure
        if (ctx.hasHF) {
            return {
                ruleId: 'HTN15.2',
                target: '< 130 mmHg (SBP)',
                targetSbp: 130,
                targetDbp: null,
                indication: '心衰竭',
                note: '',
                cor: 'I',
                loe: 'C'
            };
        }

        // Stroke - different for acute vs chronic
        if (ctx.hasStroke) {
            if (ctx.hasRecentStroke) {
                return {
                    ruleId: 'HTN13.2',
                    target: '< 140/90 mmHg',
                    targetSbp: 140,
                    targetDbp: 90,
                    indication: '中風恢復期',
                    note: '穩定後可進一步降低',
                    cor: 'I',
                    loe: 'B'
                };
            }
            return {
                ruleId: 'HTN13.1',
                target: '< 130/80 mmHg',
                targetSbp: 130,
                targetDbp: 80,
                indication: '慢性期中風',
                note: '',
                cor: 'IIa',
                loe: 'A'
            };
        }

        // CHD
        if (ctx.hasCHD) {
            return {
                ruleId: 'HTN12.1',
                target: '< 130/80 mmHg',
                targetSbp: 130,
                targetDbp: 80,
                indication: '冠心病',
                note: '',
                cor: 'I',
                loe: 'A'
            };
        }

        // Diabetes
        if (ctx.hasDM) {
            return {
                ruleId: 'HTN11.1',
                target: '< 130/80 mmHg',
                targetSbp: 130,
                targetDbp: 80,
                indication: '糖尿病',
                note: '',
                cor: 'I',
                loe: 'B'
            };
        }

        // ASCVD or high CV risk - can aim for <120
        if (ctx.hasASCVD || ctx.isHighRisk) {
            return {
                ruleId: 'HTN6.2',
                target: '< 120 mmHg (SBP)',
                targetSbp: 120,
                targetDbp: null,
                indication: 'ASCVD 或高心血管風險',
                note: '如可耐受',
                cor: 'IIa',
                loe: 'B'
            };
        }

        // Elderly
        if (ctx.isElderly) {
            return {
                ruleId: 'HTN17.2',
                target: '< 130 mmHg (SBP)',
                targetSbp: 130,
                targetDbp: null,
                indication: '≥65 歲',
                note: '',
                cor: 'I',
                loe: 'B'
            };
        }

        // General target
        return {
            ruleId: 'HTN6.1',
            target: '< 130/80 mmHg',
            targetSbp: 130,
            targetDbp: 80,
            indication: '一般高血壓',
            note: '',
            cor: 'I',
            loe: 'A'
        };
    }

    /**
     * Get treatment threshold based on patient risk
     */
    function getTreatmentThreshold(ctx) {
        if (ctx.isLowRisk) {
            return {
                ruleId: 'HTN6.3',
                threshold: '≥ 140/90 mmHg',
                thresholdSbp: 140,
                thresholdDbp: 90,
                reason: '低風險患者'
            };
        }
        return {
            ruleId: 'HTN6.4',
            threshold: '≥ 130/80 mmHg',
            thresholdSbp: 130,
            thresholdDbp: 80,
            reason: '非低風險患者'
        };
    }

    /**
     * Evaluate HTN-specific CDS rules (Taiwan 2022)
     */
    function evaluateHTNRules(ctx) {
        const results = [];
        const triggeredCategories = new Set();

        // ========================================
        // 1. BP 目標建議 (只顯示一個最適合的目標)
        // ========================================
        const bpTarget = getBPTargetForPatient(ctx);

        if (ctx.sbp !== null) {
            const isAboveTarget = ctx.sbp >= bpTarget.targetSbp ||
                                  (bpTarget.targetDbp !== null && ctx.dbp !== null && ctx.dbp >= bpTarget.targetDbp);

            if (isAboveTarget) {
                const priority = ctx.sbp >= 160 ? PRIORITY.HIGH : PRIORITY.MEDIUM;
                results.push({
                    id: bpTarget.ruleId,
                    priority,
                    category: 'bp_target',
                    message: `血壓 ${ctx.sbp}/${ctx.dbp || '-'} mmHg，目標 ${bpTarget.target}`,
                    detail: `${bpTarget.indication}患者血壓目標為 ${bpTarget.target}${bpTarget.note ? ' (' + bpTarget.note + ')' : ''}`,
                    evidence_level: bpTarget.loe,
                    cor: bpTarget.cor
                });
                triggeredCategories.add('bp_target');
            }
        }

        // ========================================
        // 2. 藥物禁忌 - DRI + ACEi/ARB 組合
        // ========================================
        if (ctx.hasDangerousCombination) {
            results.push({
                id: 'HTN8.8',
                priority: PRIORITY.HIGH,
                category: 'contraindication',
                message: '⚠️ 禁忌藥物組合：DRI + ACEi/ARB',
                detail: '台灣高血壓指引明確禁止 Direct Renin Inhibitor 與 ACEi 或 ARB 合併使用',
                evidence_level: 'A',
                cor: 'III'
            });
        }

        // ========================================
        // 3. CKD 患者首選 RASi
        // ========================================
        if (ctx.hasCKD && !ctx.hasRASi && !triggeredCategories.has('rasi_ckd')) {
            results.push({
                id: 'HTN14.4',
                priority: PRIORITY.HIGH,
                category: 'rasi_ckd',
                message: 'CKD 患者建議使用 ACEi 或 ARB',
                detail: '台灣高血壓指引建議 CKD 患者（不論有無糖尿病）首選 RAS 抑制劑',
                evidence_level: 'A',
                cor: 'I'
            });
            triggeredCategories.add('rasi_ckd');
        }

        // ========================================
        // 4. 第二線藥物建議 - Spironolactone
        // ========================================
        // Only suggest if BP uncontrolled on 3+ drugs (resistant HTN indicator)
        const antihtnCount = [ctx.isOnACEi, ctx.isOnARB, ctx.isOnBetaBlocker, ctx.isOnCCB, ctx.isOnThiazide].filter(Boolean).length;
        if (ctx.bpUncontrolled && antihtnCount >= 3 && !ctx.isOnMRA) {
            results.push({
                id: 'HTN8.2',
                priority: PRIORITY.MEDIUM,
                category: 'second_line',
                message: '血壓控制不佳，可考慮加用 Spironolactone',
                detail: '台灣高血壓指引建議 Spironolactone 為第二線降壓藥物，適用於頑固型高血壓',
                evidence_level: 'A',
                cor: 'I'
            });
        }

        // ========================================
        // 5. 生活型態建議 (只在血壓偏高時顯示相關項目)
        // ========================================
        if (ctx.sbp !== null && ctx.sbp >= 130) {
            // BMI 建議
            if (ctx.bmi !== null && ctx.bmi >= 25) {
                results.push({
                    id: 'HTN7.7',
                    priority: PRIORITY.MEDIUM,
                    category: 'lifestyle_weight',
                    message: `BMI ${ctx.bmi.toFixed(1)} kg/m²，建議減重至 20-24.9`,
                    detail: '維持理想體重可改善血壓控制並降低死亡風險',
                    evidence_level: 'A',
                    cor: 'I'
                });
            }

            // 未控制高血壓避免高強度運動
            if (ctx.sbp >= 160) {
                results.push({
                    id: 'HTN7.12',
                    priority: PRIORITY.MEDIUM,
                    category: 'lifestyle_exercise',
                    message: 'SBP > 160 mmHg，不建議高強度運動',
                    detail: '未控制高血壓患者應避免高強度運動，待血壓控制後再進行',
                    evidence_level: 'C',
                    cor: 'III'
                });
            }
        }

        // ========================================
        // 6. 跨指引衝突檢測 - CCB + HF
        // ========================================
        // 檢查是否使用 non-DHP CCB 且有心衰竭
        const isOnNonDHPCCB = ctx.hasMedication(['diltiazem', 'verapamil', '合必爽', '心舒平']);
        if (ctx.hasHF && isOnNonDHPCCB) {
            results.push({
                id: 'HTN8.1-HF-CONFLICT',
                priority: PRIORITY.HIGH,
                category: 'cross_guideline_conflict',
                message: '⚠️ 心衰竭 + Non-DHP CCB 用藥衝突',
                detail: 'HTN 指引雖列 CCB 為第一線藥物，但心衰竭患者應避免 non-DHP CCB (Diltiazem/Verapamil)，因具負性肌力作用 (ESC HF5.1)。建議改用 DHP 類 CCB (如 Amlodipine)',
                evidence_level: 'B',
                cor: 'III'
            });
        }

        // 心衰竭患者使用 CCB 的提醒 (即使是 DHP 類型也提醒注意)
        if (ctx.hasHF && ctx.isOnCCB && !isOnNonDHPCCB) {
            results.push({
                id: 'HTN8.1-HF-NOTE',
                priority: PRIORITY.LOW,
                category: 'cross_guideline_note',
                message: '心衰竭患者使用 CCB 注意事項',
                detail: '目前使用 DHP 類 CCB，HF 患者可使用但需注意 non-DHP CCB (Diltiazem/Verapamil) 為禁忌',
                evidence_level: 'B',
                cor: 'I'
            });
        }

        return results;
    }

    /**
     * Main function for HTN CDS evaluation
     */
    async function evaluateHTN() {
        await loadHTNRules();
        await fetchAdditionalData();

        const baseCtx = getPatientContext();
        const ctx = getHTNPatientContext(baseCtx);

        // Evaluate HTN rules
        const recommendations = evaluateHTNRules(ctx);

        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);

        // Get BP target info
        const bpTarget = getBPTargetForPatient(ctx);
        const treatmentThreshold = getTreatmentThreshold(ctx);

        // Cache the result
        htnCdsCache = {
            recommendations,
            context: {
                sbp: ctx.sbp,
                dbp: ctx.dbp,
                bpTarget,
                treatmentThreshold,
                bpControlled: ctx.bpControlled,
                isLowRisk: ctx.isLowRisk,
                isHighRisk: ctx.isHighRisk,
                riskFactors: ctx.riskFactors,
                comorbidities: {
                    dm: ctx.hasDM,
                    ckd: ctx.hasCKD,
                    hf: ctx.hasHF,
                    chd: ctx.hasCHD,
                    stroke: ctx.hasStroke,
                    ascvd: ctx.hasASCVD
                },
                medications: {
                    acei: ctx.isOnACEi,
                    arb: ctx.isOnARB,
                    betaBlocker: ctx.isOnBetaBlocker,
                    ccb: ctx.isOnCCB,
                    thiazide: ctx.isOnThiazide,
                    mra: ctx.isOnMRA,
                    dri: ctx.isOnDRI
                },
                hasDangerousCombination: ctx.hasDangerousCombination
            }
        };

        return htnCdsCache;
    }

    // HTN CDS cache
    let htnCdsCache = null;

    /**
     * Get cached HTN CDS result (fast)
     */
    function getCachedHTN() {
        return htnCdsCache;
    }

    // Public API
    return {
        loadRules,
        evaluate,
        renderRecommendations,
        PRIORITY,
        // Lipid CDS
        loadLipidRules,
        evaluateLipid,
        getCVRiskLevelForLipid,
        getLDLTargetByRisk,
        // Afib CDS
        loadAfibRules,
        evaluateAfib,
        calculateCHA2DS2VA,
        calculateHASBLED,
        getCachedAfib,
        // HF CDS
        loadHFRules,
        evaluateHF,
        getHFClassification,
        getCachedHF,
        // CKD CDS
        loadCKDRules,
        evaluateCKD,
        getCKDStageInfo,
        getCachedCKD,
        // HTN CDS
        loadHTNRules,
        evaluateHTN,
        getBPTargetForPatient,
        getCachedHTN,
        // Optimization
        preload,
        evaluateBackground,
        getCachedDM,
        getCachedLipid,
        clearCache
    };
})();
