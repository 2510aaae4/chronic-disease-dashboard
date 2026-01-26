/**
 * CareDash - Chronic Disease Dashboard
 * New UI Application Logic - Redesigned Layout
 * Left: 6 diseases | Center: Medications/Disease details | Right: Key metrics
 */

// ============================================
// Global State
// ============================================
let client = null;
let patientData = null;
let conditionsData = [];
let observationsCache = {};
let medicationsData = [];
let normalizedMedicationsData = [];
let detectedDiseases = [];
let currentSelectedDisease = null;

// Disease Modules registry
const DiseaseModules = {};

// ============================================
// LOINC Codes
// ============================================
const LOINC = {
    // Vital Signs
    BP_SYSTOLIC: '8480-6',
    BP_DIASTOLIC: '8462-4',
    HEART_RATE: '8867-4',
    WEIGHT: '29463-7',
    BMI: '39156-5',
    // Kidney
    EGFR: '33914-3',
    CREATININE: '2160-0',
    CREATININE_ALT: '38483-4',
    BUN: '3094-0',
    ACR: '9318-7',
    ACR_ALT: '14959-1',
    // Electrolytes
    POTASSIUM: '2823-3',
    SODIUM: '2951-2',
    CALCIUM: '17861-6',
    PHOSPHORUS: '2777-1',
    BICARBONATE: '1963-8',
    // Diabetes
    HBA1C: '4548-4',
    GLUCOSE: '2345-7',
    GLUCOSE_ALT: '2339-0',
    // Lipids
    TOTAL_CHOLESTEROL: '2093-3',
    LDL: '2089-1',
    LDL_ALT: '13457-7',
    HDL: '2085-9',
    TRIGLYCERIDES: '2571-8',
    LPA: '43583-4',
    // Heart
    BNP: '42637-9',
    NT_PROBNP: '33762-6',
    LVEF: '10230-1',
    LVEF_ECHO: '10230-1',
    LVEF_NUCLEAR: '8806-2',
    LVEF_VENTRICULOGRAM: '18043-0',
    LVEF_MRI: '77889-4',
    LVEF_ANGIO: '8807-0',
    // Other
    HEMOGLOBIN: '718-7',
    INR: '6301-6'
};

// ============================================
// Disease Registry
// ============================================
const DiseaseRegistry = {
    dm: {
        name: '糖尿病',
        icon: '📊',
        color: '#6366f1',
        snomedCodes: ['44054006', '73211009', '46635009', '105401000119101', '314772004', '314893005', '713702000', '359642000', '81531005', '237599002'],
        keywords: ['diabetes', 'diabetic', '糖尿病']
    },
    htn: {
        name: '高血壓',
        icon: '💓',
        color: '#ef4444',
        snomedCodes: ['38341003', '59621000'],
        keywords: ['hypertension', 'hypertensive', '高血壓']
    },
    lipid: {
        name: '高血脂',
        icon: '🔬',
        color: '#f59e0b',
        snomedCodes: ['55822004', '13644009', '398036000'],
        keywords: ['hyperlipidemia', 'hypercholesterolemia', 'dyslipidemia', '高血脂', '高膽固醇']
    },
    ckd: {
        name: '慢性腎臟病',
        icon: '🫘',
        color: '#8b5cf6',
        snomedCodes: ['709044004', '431855005', '431856006', '433144002', '433146000', '90688005', '46177005'],
        keywords: ['chronic kidney disease', 'chronic renal', 'CKD', '慢性腎臟病', '慢性腎病']
    },
    hf: {
        name: '心衰竭',
        icon: '❤️',
        color: '#ec4899',
        snomedCodes: ['84114007', '42343007', '85232009', '88805009', '15629591000119103', '120861000119102'],
        keywords: ['heart failure', 'cardiac failure', '心衰竭', '心臟衰竭']
    },
    af: {
        name: '心房顫動',
        icon: '💗',
        color: '#06b6d4',
        snomedCodes: ['49436004', '314208002', '312442005', '440028005', '706923002'],
        keywords: ['atrial fibrillation', 'atrial flutter', '心房顫動', '心房撲動']
    }
};

// ============================================
// Initialization
// ============================================
async function init() {
    try {
        updateCurrentDate();

        // Initialize FHIR client
        client = await FHIR.oauth2.ready();
        console.log('FHIR client ready');

        // Load all data in parallel
        await Promise.all([
            loadPatientInfo(),
            loadConditions(),
            loadSharedObservations(),
            loadMedications()
        ]);

        // Detect chronic diseases
        detectChronicDiseases();

        // Update UI
        updatePatientHeader();
        updateDiseaseCards();
        updateRightColumnMetrics();
        showMedicationsView();

        // Start background tasks
        normalizeMedicationsAsync();

        // Hide loading
        hideLoading();

    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message);
    }
}

// ============================================
// Data Loading Functions
// ============================================
async function loadPatientInfo() {
    patientData = await client.patient.read();
    console.log('Patient loaded:', patientData.id);
}

async function loadConditions() {
    const response = await client.request(`Condition?patient=${client.patient.id}&_count=200`);
    conditionsData = (response.entry || []).map(e => ({
        code: e.resource.code?.coding?.[0]?.code,
        system: e.resource.code?.coding?.[0]?.system,
        display: e.resource.code?.coding?.[0]?.display || e.resource.code?.text,
        status: e.resource.clinicalStatus?.coding?.[0]?.code,
        text: e.resource.code?.text
    }));
    console.log('Conditions loaded:', conditionsData.length);
}

async function loadSharedObservations() {
    const codes = Object.values(LOINC);
    const uniqueCodes = [...new Set(codes)];
    const promises = uniqueCodes.map(code => loadObservationsByCode(code));
    await Promise.all(promises);
    console.log('Observations loaded');
}

async function loadObservationsByCode(loincCode) {
    try {
        const response = await client.request(
            `Observation?patient=${client.patient.id}&code=${loincCode}&_sort=-date&_count=20`
        );
        // Store raw FHIR resources for compatibility with disease modules
        const resources = (response.entry || [])
            .map(e => e.resource)
            .filter(r => r.valueQuantity?.value != null);
        observationsCache[loincCode] = resources;
    } catch (error) {
        observationsCache[loincCode] = [];
    }
}

async function loadMedications() {
    try {
        const response = await client.request(
            `MedicationRequest?patient=${client.patient.id}&status=active&_count=100`
        );
        medicationsData = (response.entry || []).map(e => {
            const resource = e.resource;
            return {
                name: resource.medicationCodeableConcept?.text ||
                    resource.medicationCodeableConcept?.coding?.[0]?.display ||
                    'Unknown',
                status: resource.status,
                dosage: resource.dosageInstruction?.[0]?.text,
                categories: []
            };
        });
        console.log('Medications loaded:', medicationsData.length);
    } catch (error) {
        console.error('Error loading medications:', error);
        medicationsData = [];
    }
}

// ============================================
// Disease Detection
// ============================================
function detectChronicDiseases() {
    detectedDiseases = [];

    for (const [diseaseId, config] of Object.entries(DiseaseRegistry)) {
        const hasDisease = conditionsData.some(condition => {
            if (config.snomedCodes.includes(condition.code)) {
                return true;
            }
            const displayText = (condition.display || '').toLowerCase() + ' ' + (condition.text || '').toLowerCase();
            return config.keywords.some(kw => displayText.includes(kw.toLowerCase()));
        });

        if (hasDisease) {
            detectedDiseases.push(diseaseId);
        }
    }

    console.log('Detected diseases:', detectedDiseases);
}

// ============================================
// UI Update Functions
// ============================================
function updateCurrentDate() {
    const now = new Date();
    const formatted = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const el = document.getElementById('current-date');
    if (el) el.textContent = formatted;
}

function updatePatientHeader() {
    if (!patientData) return;

    const name = patientData.name?.[0];
    const displayName = name ?
        `${name.family || ''}${name.given?.join('') || ''}` :
        patientData.id;

    const birthDate = patientData.birthDate ? new Date(patientData.birthDate) : null;
    const age = birthDate ? Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000)) : '--';
    const gender = patientData.gender === 'male' ? '男' : patientData.gender === 'female' ? '女' : '--';

    document.getElementById('patient-name').textContent = displayName;
    document.getElementById('patient-meta').textContent = `${age} 歲 · ${gender} · ${detectedDiseases.length} 項慢性病`;
}

function updateDiseaseCards() {
    const diseaseList = document.getElementById('disease-list');
    if (!diseaseList) return;

    // Update each disease card
    for (const [diseaseId, config] of Object.entries(DiseaseRegistry)) {
        const card = document.getElementById(`disease-${diseaseId}`);
        if (!card) continue;

        const hasDiagnosis = detectedDiseases.includes(diseaseId);
        const valueEl = document.getElementById(`${diseaseId}-value`);
        const statusEl = document.getElementById(`${diseaseId}-status`);

        // Update card styling
        if (hasDiagnosis) {
            card.classList.remove('no-diagnosis');
        } else {
            card.classList.add('no-diagnosis');
        }

        // Update value display based on disease type
        const valueInfo = getDiseaseQuickValue(diseaseId);
        if (valueEl) valueEl.textContent = valueInfo.text;
        if (statusEl && valueInfo.status) {
            statusEl.textContent = valueInfo.status.text;
            statusEl.className = `disease-status ${valueInfo.status.class}`;
        }

        // Add click handler
        card.onclick = () => selectDisease(diseaseId);
    }
}

// Helper to get value from raw FHIR resource
function getObsValue(code) {
    return observationsCache[code]?.[0]?.valueQuantity?.value;
}

function getDiseaseQuickValue(diseaseId) {
    switch (diseaseId) {
        case 'dm': {
            const hba1c = getObsValue(LOINC.HBA1C);
            if (hba1c) {
                return {
                    text: `HbA1c ${hba1c.toFixed(1)}%`,
                    status: hba1c < 7 ? { text: '達標', class: 'good' } :
                           hba1c < 8 ? { text: '偏高', class: 'warning' } :
                           { text: '未達標', class: 'danger' }
                };
            }
            return { text: '無 HbA1c 資料' };
        }
        case 'htn': {
            const sys = getObsValue(LOINC.BP_SYSTOLIC);
            const dia = getObsValue(LOINC.BP_DIASTOLIC);
            if (sys && dia) {
                return {
                    text: `${Math.round(sys)}/${Math.round(dia)} mmHg`,
                    status: sys < 130 && dia < 80 ? { text: '達標', class: 'good' } :
                           sys < 140 && dia < 90 ? { text: '偏高', class: 'warning' } :
                           { text: '未達標', class: 'danger' }
                };
            }
            return { text: '無血壓資料' };
        }
        case 'lipid': {
            const ldl = getObsValue(LOINC.LDL) || getObsValue(LOINC.LDL_ALT);
            if (ldl) {
                return {
                    text: `LDL ${Math.round(ldl)} mg/dL`,
                    status: ldl < 70 ? { text: '達標', class: 'good' } :
                           ldl < 100 ? { text: '可接受', class: 'warning' } :
                           { text: '偏高', class: 'danger' }
                };
            }
            return { text: '無 LDL 資料' };
        }
        case 'ckd': {
            const egfr = getObsValue(LOINC.EGFR);
            if (egfr) {
                const stage = egfr >= 90 ? 'G1' : egfr >= 60 ? 'G2' : egfr >= 45 ? 'G3a' : egfr >= 30 ? 'G3b' : egfr >= 15 ? 'G4' : 'G5';
                return {
                    text: `eGFR ${Math.round(egfr)} (${stage})`,
                    status: egfr >= 60 ? { text: '正常', class: 'good' } :
                           egfr >= 30 ? { text: '中度', class: 'warning' } :
                           { text: '嚴重', class: 'danger' }
                };
            }
            return { text: '無 eGFR 資料' };
        }
        case 'hf': {
            const bnp = getObsValue(LOINC.NT_PROBNP) || getObsValue(LOINC.BNP);
            const lvef = getObsValue(LOINC.LVEF);
            if (lvef) {
                return {
                    text: `LVEF ${Math.round(lvef)}%`,
                    status: lvef >= 50 ? { text: 'HFpEF', class: 'good' } :
                           lvef >= 40 ? { text: 'HFmrEF', class: 'warning' } :
                           { text: 'HFrEF', class: 'danger' }
                };
            }
            if (bnp) {
                return { text: `BNP ${Math.round(bnp)} pg/mL` };
            }
            return { text: '無心功能資料' };
        }
        case 'af': {
            const hr = getObsValue(LOINC.HEART_RATE);
            if (hr) {
                return {
                    text: `心率 ${Math.round(hr)} bpm`,
                    status: hr < 100 ? { text: '控制中', class: 'good' } :
                           { text: '偏快', class: 'warning' }
                };
            }
            return { text: '無心率資料' };
        }
        default:
            return { text: '--' };
    }
}

function updateRightColumnMetrics() {
    // HbA1c
    const hba1c = getObsValue(LOINC.HBA1C);
    if (hba1c) document.getElementById('metric-hba1c').textContent = hba1c.toFixed(1);

    // BP
    const sys = getObsValue(LOINC.BP_SYSTOLIC);
    const dia = getObsValue(LOINC.BP_DIASTOLIC);
    if (sys && dia) document.getElementById('metric-bp').textContent = `${Math.round(sys)}/${Math.round(dia)}`;

    // LDL
    const ldl = getObsValue(LOINC.LDL) || getObsValue(LOINC.LDL_ALT);
    if (ldl) document.getElementById('metric-ldl').textContent = Math.round(ldl);

    // eGFR
    const egfr = getObsValue(LOINC.EGFR);
    if (egfr) document.getElementById('metric-egfr').textContent = Math.round(egfr);

    // Labs
    const k = getObsValue(LOINC.POTASSIUM);
    if (k) document.getElementById('lab-k').textContent = k.toFixed(1);

    const hb = getObsValue(LOINC.HEMOGLOBIN);
    if (hb) document.getElementById('lab-hb').textContent = hb.toFixed(1);

    const cr = getObsValue(LOINC.CREATININE);
    if (cr) document.getElementById('lab-cr').textContent = cr.toFixed(2);

    const acr = getObsValue(LOINC.ACR);
    if (acr) document.getElementById('lab-acr').textContent = Math.round(acr);

    const tg = getObsValue(LOINC.TRIGLYCERIDES);
    if (tg) document.getElementById('lab-tg').textContent = Math.round(tg);

    const hdl = getObsValue(LOINC.HDL);
    if (hdl) document.getElementById('lab-hdl').textContent = Math.round(hdl);
}

// ============================================
// View Switching Functions
// ============================================
function showMedicationsView() {
    currentSelectedDisease = null;

    // Update header
    document.getElementById('center-title').textContent = '目前用藥';
    document.getElementById('center-subtitle').textContent = '';

    // Show medications view, hide disease view
    document.getElementById('medications-view').classList.add('active');
    document.getElementById('disease-view').classList.remove('active');

    // Update disease cards to remove active state
    document.querySelectorAll('.disease-card').forEach(card => {
        card.classList.remove('active');
    });

    // Render medications
    renderMedicationsList();
}

function renderMedicationsList() {
    const countEl = document.getElementById('med-count');
    const listEl = document.getElementById('medications-list');

    if (!listEl) return;

    const medsToShow = normalizedMedicationsData.length > 0 ? normalizedMedicationsData : medicationsData;

    if (countEl) countEl.textContent = medsToShow.length;

    if (medsToShow.length === 0) {
        listEl.innerHTML = '<div class="loading-placeholder">無用藥紀錄</div>';
        return;
    }

    listEl.innerHTML = medsToShow.map(med => {
        const name = med.generic || med.name;
        const dose = med.dose || med.dosage || '';
        const drugClass = med.class || '';

        return `
            <div class="med-item">
                <span class="med-item-icon">💊</span>
                <div class="med-item-info">
                    <div class="med-item-name">${name}</div>
                    ${dose ? `<div class="med-item-dose">${dose}</div>` : ''}
                </div>
                ${drugClass ? `<span class="med-item-class">${drugClass}</span>` : ''}
            </div>
        `;
    }).join('');
}

function selectDisease(diseaseId) {
    // 方案 A: 再次點擊同一疾病可以返回主頁
    if (currentSelectedDisease === diseaseId) {
        showMedicationsView();
        return;
    }

    currentSelectedDisease = diseaseId;

    const config = DiseaseRegistry[diseaseId];
    const hasDiagnosis = detectedDiseases.includes(diseaseId);

    // Update header
    document.getElementById('center-title').textContent = config.name;
    document.getElementById('center-subtitle').textContent = hasDiagnosis ? '' : '(無此診斷)';

    // Switch views
    document.getElementById('medications-view').classList.remove('active');
    document.getElementById('disease-view').classList.add('active');

    // Update disease card active states
    document.querySelectorAll('.disease-card').forEach(card => {
        card.classList.remove('active');
    });
    document.getElementById(`disease-${diseaseId}`).classList.add('active');

    // Load disease detail content
    loadDiseaseDetail(diseaseId, hasDiagnosis);
}

// 方案 B: 返回主頁顯示用藥
function showMedicationsView() {
    currentSelectedDisease = null;

    // Update header
    document.getElementById('center-title').textContent = '目前用藥';
    document.getElementById('center-subtitle').textContent = '';

    // Switch views
    document.getElementById('disease-view').classList.remove('active');
    document.getElementById('medications-view').classList.add('active');

    // Remove all active states from disease cards
    document.querySelectorAll('.disease-card').forEach(card => {
        card.classList.remove('active');
    });
}

// Make function globally available
window.showMedicationsView = showMedicationsView;

async function loadDiseaseDetail(diseaseId, hasDiagnosis) {
    const detailEl = document.getElementById('disease-detail');
    if (!detailEl) return;

    // Show loading
    detailEl.innerHTML = '<div class="loading-placeholder">載入中...</div>';

    // 方案 B: 返回按鈕
    let html = `
        <button class="back-to-main-btn" onclick="showMedicationsView()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            返回用藥列表
        </button>
    `;

    // Show no diagnosis banner if applicable
    if (!hasDiagnosis) {
        html += `
            <div class="no-diagnosis-banner">
                <span class="banner-icon">ℹ️</span>
                <span class="banner-text">病患目前無${DiseaseRegistry[diseaseId].name}診斷，以下顯示相關檢驗數值</span>
            </div>
        `;
    }

    // Try to get content from disease module
    if (DiseaseModules[diseaseId]) {
        try {
            const moduleContent = await DiseaseModules[diseaseId].getDetailContent();

            // If no diagnosis, filter out CDS section
            if (!hasDiagnosis) {
                // Simple approach: wrap and later hide CDS via CSS or just show metrics
                html += buildSimpleDiseaseView(diseaseId);
            } else {
                html += moduleContent;
            }
        } catch (error) {
            console.error(`Error loading ${diseaseId} module:`, error);
            html += buildSimpleDiseaseView(diseaseId);
        }
    } else {
        html += buildSimpleDiseaseView(diseaseId);
    }

    detailEl.innerHTML = html;
}

function buildSimpleDiseaseView(diseaseId) {
    // Build a simple view with just the metrics for this disease
    switch (diseaseId) {
        case 'dm':
            return buildDMSimpleView();
        case 'htn':
            return buildHTNSimpleView();
        case 'lipid':
            return buildLipidSimpleView();
        case 'ckd':
            return buildCKDSimpleView();
        case 'hf':
            return buildHFSimpleView();
        case 'af':
            return buildAFSimpleView();
        default:
            return '<div class="loading-placeholder">無資料</div>';
    }
}

function buildDMSimpleView() {
    const hba1c = getObsValue(LOINC.HBA1C);
    const glucose = getObsValue(LOINC.GLUCOSE);
    const acr = getObsValue(LOINC.ACR);
    const egfr = getObsValue(LOINC.EGFR);

    return `
        <div class="detail-section">
            <div class="detail-section-title">血糖指標</div>
            <div class="metrics-row">
                ${buildMetricBox('HbA1c', hba1c, '%', getHbA1cClass(hba1c))}
                ${buildMetricBox('空腹血糖', glucose, 'mg/dL', getGlucoseClass(glucose))}
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">腎臟篩檢</div>
            <div class="metrics-row">
                ${buildMetricBox('ACR', acr, 'mg/g', getACRClass(acr))}
                ${buildMetricBox('eGFR', egfr, 'mL/min', getEGFRClass(egfr))}
            </div>
        </div>
    `;
}

function buildHTNSimpleView() {
    const sys = getObsValue(LOINC.BP_SYSTOLIC);
    const dia = getObsValue(LOINC.BP_DIASTOLIC);
    const hr = getObsValue(LOINC.HEART_RATE);

    return `
        <div class="detail-section">
            <div class="detail-section-title">血壓監測</div>
            <div class="metrics-row">
                ${buildMetricBox('收縮壓', sys, 'mmHg', getBPClass(sys, 'sys'))}
                ${buildMetricBox('舒張壓', dia, 'mmHg', getBPClass(dia, 'dia'))}
                ${buildMetricBox('心率', hr, 'bpm', '')}
            </div>
        </div>
    `;
}

function buildLipidSimpleView() {
    const tc = getObsValue(LOINC.TOTAL_CHOLESTEROL);
    const ldl = getObsValue(LOINC.LDL) || getObsValue(LOINC.LDL_ALT);
    const hdl = getObsValue(LOINC.HDL);
    const tg = getObsValue(LOINC.TRIGLYCERIDES);

    return `
        <div class="detail-section">
            <div class="detail-section-title">血脂檢驗</div>
            <div class="metrics-row">
                ${buildMetricBox('總膽固醇', tc, 'mg/dL', '')}
                ${buildMetricBox('LDL-C', ldl, 'mg/dL', getLDLClass(ldl))}
                ${buildMetricBox('HDL-C', hdl, 'mg/dL', '')}
                ${buildMetricBox('三酸甘油酯', tg, 'mg/dL', getTGClass(tg))}
            </div>
        </div>
    `;
}

function buildCKDSimpleView() {
    const egfr = getObsValue(LOINC.EGFR);
    const cr = getObsValue(LOINC.CREATININE);
    const acr = getObsValue(LOINC.ACR);
    const bun = getObsValue(LOINC.BUN);
    const sys = getObsValue(LOINC.BP_SYSTOLIC);
    const dia = getObsValue(LOINC.BP_DIASTOLIC);

    // BP target logic
    const hasDM = detectedDiseases.includes('dm');
    const bpTarget = hasDM ? '<130/80 mmHg (CKD+DM)' : '<120 mmHg (單純CKD)';

    return `
        <div class="detail-section">
            <div class="detail-section-title">腎功能指標</div>
            <div class="metrics-row">
                ${buildMetricBox('eGFR', egfr, 'mL/min', getEGFRClass(egfr))}
                ${buildMetricBox('Creatinine', cr, 'mg/dL', '')}
                ${buildMetricBox('BUN', bun, 'mg/dL', '')}
                ${buildMetricBox('ACR', acr, 'mg/g', getACRClass(acr))}
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">血壓監測</div>
            <div class="metrics-row">
                ${buildMetricBox('血壓', sys && dia ? `${Math.round(sys)}/${Math.round(dia)}` : '--', 'mmHg', '')}
            </div>
            <p style="font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 8px;">目標: ${bpTarget}</p>
        </div>
    `;
}

function buildHFSimpleView() {
    const bnp = getObsValue(LOINC.NT_PROBNP) || getObsValue(LOINC.BNP);
    const lvef = getObsValue(LOINC.LVEF);
    const weight = getObsValue(LOINC.WEIGHT);

    let hfType = '未分類';
    if (lvef) {
        if (lvef <= 40) hfType = 'HFrEF';
        else if (lvef <= 49) hfType = 'HFmrEF';
        else hfType = 'HFpEF';
    }

    return `
        <div class="detail-section">
            <div class="detail-section-title">心臟功能</div>
            <div class="metrics-row">
                ${buildMetricBox('LVEF', lvef, '%', getLVEFClass(lvef))}
                ${buildMetricBox('NT-proBNP', bnp, 'pg/mL', '')}
                ${buildMetricBox('體重', weight, 'kg', '')}
            </div>
            ${lvef ? `<p style="font-size: 0.875rem; margin-top: 8px;"><strong>分類:</strong> ${hfType}</p>` : ''}
        </div>
    `;
}

function buildAFSimpleView() {
    const hr = getObsValue(LOINC.HEART_RATE);
    const inr = getObsValue(LOINC.INR);

    return `
        <div class="detail-section">
            <div class="detail-section-title">心律監測</div>
            <div class="metrics-row">
                ${buildMetricBox('心率', hr, 'bpm', '')}
                ${inr ? buildMetricBox('INR', inr.toFixed(2), '', getINRClass(inr)) : ''}
            </div>
        </div>
    `;
}

// ============================================
// Helper Functions
// ============================================
function buildMetricBox(label, value, unit, statusClass) {
    const displayValue = value != null ? (typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value) : '--';
    return `
        <div class="metric-box ${statusClass}">
            <div class="metric-box-label">${label}</div>
            <div class="metric-box-value">${displayValue}</div>
            <div class="metric-box-unit">${unit}</div>
        </div>
    `;
}

function getHbA1cClass(v) { return v == null ? '' : v < 7 ? 'good' : v < 8 ? 'warning' : 'danger'; }
function getGlucoseClass(v) { return v == null ? '' : v < 100 ? 'good' : v < 126 ? 'warning' : 'danger'; }
function getACRClass(v) { return v == null ? '' : v < 30 ? 'good' : v < 300 ? 'warning' : 'danger'; }
function getEGFRClass(v) { return v == null ? '' : v >= 60 ? 'good' : v >= 30 ? 'warning' : 'danger'; }
function getBPClass(v, type) {
    if (v == null) return '';
    if (type === 'sys') return v < 130 ? 'good' : v < 140 ? 'warning' : 'danger';
    return v < 80 ? 'good' : v < 90 ? 'warning' : 'danger';
}
function getLDLClass(v) { return v == null ? '' : v < 70 ? 'good' : v < 100 ? 'warning' : 'danger'; }
function getTGClass(v) { return v == null ? '' : v < 150 ? 'good' : v < 200 ? 'warning' : 'danger'; }
function getLVEFClass(v) { return v == null ? '' : v >= 50 ? 'good' : v >= 40 ? 'warning' : 'danger'; }
function getINRClass(v) { return v == null ? '' : (v >= 2 && v <= 3) ? 'good' : 'warning'; }

// ============================================
// Async Background Tasks
// ============================================
async function normalizeMedicationsAsync() {
    if (!window.MedicationNormalizer || medicationsData.length === 0) return;

    try {
        const medNames = medicationsData.map(m => m.name);
        normalizedMedicationsData = await MedicationNormalizer.normalize(medNames);

        // Update medications view if currently showing
        if (!currentSelectedDisease) {
            renderMedicationsList();
        }
    } catch (error) {
        console.error('Medication normalization error:', error);
    }
}

// ============================================
// Modal Functions
// ============================================
function openIntegratedCDS() {
    const modal = document.getElementById('disease-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    if (!modal) return;

    title.textContent = 'AI 綜合建議報告';
    body.innerHTML = '<div class="loading-placeholder">載入中...</div>';
    modal.style.display = 'flex';

    if (window.IntegratedCDS) {
        IntegratedCDS.evaluate().then(result => {
            body.innerHTML = IntegratedCDS.renderIntegratedCDS(result);
        }).catch(err => {
            body.innerHTML = '<p>載入失敗：' + err.message + '</p>';
        });
    } else {
        body.innerHTML = '<p>AI 功能未啟用</p>';
    }
}

function closeModal() {
    const modal = document.getElementById('disease-modal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ============================================
// Loading/Error States
// ============================================
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

function showError(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorOverlay = document.getElementById('error-overlay');
    const errorMessage = document.getElementById('error-message');

    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (errorOverlay) errorOverlay.style.display = 'flex';
    if (errorMessage) errorMessage.textContent = message;
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', init);

// Global exports
window.openIntegratedCDS = openIntegratedCDS;
window.closeModal = closeModal;
window.showMedicationsView = showMedicationsView;
window.selectDisease = selectDisease;

// Compatibility exports for disease modules
window.fetchObservations = async function(codes, count = 10) {
    const codeArray = Array.isArray(codes) ? codes : [codes];
    let results = [];
    for (const code of codeArray) {
        // observationsCache now stores raw FHIR resources directly
        const resources = observationsCache[code] || [];
        results = results.concat(resources.slice(0, count));
    }
    return results.slice(0, count);
};

window.formatDate = function(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

window.evaluateStatus = function(type, value) {
    if (value == null) return null;

    const statusMap = {
        hba1c: () => value < 7 ? { text: '達標', class: 'good' } : value < 8 ? { text: '偏高', class: 'warning' } : { text: '未達標', class: 'danger' },
        egfr: () => value >= 60 ? { text: '正常', class: 'good' } : value >= 30 ? { text: '中度', class: 'warning' } : { text: '嚴重', class: 'danger' },
        ldl: () => value < 70 ? { text: '達標', class: 'good' } : value < 100 ? { text: '可接受', class: 'warning' } : { text: '偏高', class: 'danger' },
        acr: () => value < 30 ? { text: '正常', class: 'good' } : value < 300 ? { text: '中度', class: 'warning' } : { text: '重度', class: 'danger' },
        inr: () => (value >= 2 && value <= 3) ? { text: '達標', class: 'good' } : { text: '需調整', class: 'warning' },
        creatinine: () => value <= 1.2 ? { text: '正常', class: 'good' } : value <= 2 ? { text: '偏高', class: 'warning' } : { text: '異常', class: 'danger' },
        potassium: () => (value >= 3.5 && value <= 5) ? { text: '正常', class: 'good' } : { text: '異常', class: 'warning' },
        hemoglobin: () => value >= 12 ? { text: '正常', class: 'good' } : value >= 10 ? { text: '輕度貧血', class: 'warning' } : { text: '貧血', class: 'danger' },
        lvef: () => value >= 50 ? { text: 'HFpEF', class: 'good' } : value >= 40 ? { text: 'HFmrEF', class: 'warning' } : { text: 'HFrEF', class: 'danger' },
        ntProBnp: () => value < 300 ? { text: '正常', class: 'good' } : value < 900 ? { text: '偏高', class: 'warning' } : { text: '升高', class: 'danger' },
        bnp: () => value < 100 ? { text: '正常', class: 'good' } : value < 400 ? { text: '偏高', class: 'warning' } : { text: '升高', class: 'danger' }
    };

    return statusMap[type] ? statusMap[type]() : null;
};

// Export global variables for disease modules
window.LOINC = LOINC;
window.DiseaseRegistry = DiseaseRegistry;
window.DiseaseModules = DiseaseModules;

// Calculate age from birth date
window.calculateAge = function(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

// Getters for mutable state (so modules always get current values)
Object.defineProperty(window, 'client', { get: () => client });
Object.defineProperty(window, 'patientData', { get: () => patientData });
Object.defineProperty(window, 'conditionsData', { get: () => conditionsData });
Object.defineProperty(window, 'observationsCache', { get: () => observationsCache });
Object.defineProperty(window, 'medicationsData', { get: () => medicationsData });
Object.defineProperty(window, 'normalizedMedicationsData', { get: () => normalizedMedicationsData });
Object.defineProperty(window, 'detectedDiseases', { get: () => detectedDiseases });
