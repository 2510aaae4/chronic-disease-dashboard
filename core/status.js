/**
 * Status Evaluation Library
 * 統一狀態判斷邏輯 - 避免每個模組重複定義閾值
 */

const StatusRanges = {
    // 腎功能
    egfr: [
        { min: 90, status: { text: 'G1 正常', class: 'good' } },
        { min: 60, status: { text: 'G2 輕度↓', class: 'good' } },
        { min: 45, status: { text: 'G3a', class: 'warning' } },
        { min: 30, status: { text: 'G3b', class: 'warning' } },
        { min: 15, status: { text: 'G4', class: 'danger' } },
        { min: 0, status: { text: 'G5', class: 'danger' } }
    ],

    creatinine: [
        { max: 1.2, status: { text: '正常', class: 'good' } },
        { max: 2.0, status: { text: '偏高', class: 'warning' } },
        { max: Infinity, status: { text: '升高', class: 'danger' } }
    ],

    bun: [
        { max: 20, status: { text: '正常', class: 'good' } },
        { max: 40, status: { text: '偏高', class: 'warning' } },
        { max: Infinity, status: { text: '升高', class: 'danger' } }
    ],

    // 蛋白尿
    acr: [
        { max: 30, status: { text: 'A1 正常', class: 'good' } },
        { max: 300, status: { text: 'A2 微量白蛋白尿', class: 'warning' } },
        { max: Infinity, status: { text: 'A3 巨量白蛋白尿', class: 'danger' } }
    ],

    // 血糖
    hba1c: [
        { max: 7, status: { text: '✓ 控制良好', class: 'good' } },
        { max: 8, status: { text: '⚠ 需注意', class: 'warning' } },
        { max: Infinity, status: { text: '✗ 控制不佳', class: 'danger' } }
    ],

    glucose: [
        { max: 70, status: { text: '低血糖', class: 'danger' } },
        { max: 130, status: { text: '正常', class: 'good' } },
        { max: 180, status: { text: '偏高', class: 'warning' } },
        { max: Infinity, status: { text: '高血糖', class: 'danger' } }
    ],

    // 電解質
    potassium: [
        { max: 3.5, status: { text: '低血鉀', class: 'danger' } },
        { max: 5.0, status: { text: '正常', class: 'good' } },
        { max: 5.5, status: { text: '偏高', class: 'warning' } },
        { max: Infinity, status: { text: '高血鉀', class: 'danger' } }
    ],

    sodium: [
        { max: 136, status: { text: '偏低', class: 'warning' } },
        { max: 145, status: { text: '正常', class: 'good' } },
        { max: Infinity, status: { text: '偏高', class: 'warning' } }
    ],

    calcium: [
        { max: 8.5, status: { text: '偏低', class: 'warning' } },
        { max: 10.5, status: { text: '正常', class: 'good' } },
        { max: Infinity, status: { text: '偏高', class: 'warning' } }
    ],

    phosphorus: [
        { max: 2.5, status: { text: '偏低', class: 'warning' } },
        { max: 4.5, status: { text: '正常', class: 'good' } },
        { max: Infinity, status: { text: '偏高', class: 'warning' } }
    ],

    bicarbonate: [
        { max: 22, status: { text: '代謝性酸中毒', class: 'warning' } },
        { max: 28, status: { text: '正常', class: 'good' } },
        { max: Infinity, status: { text: '偏高', class: 'warning' } }
    ],

    // 血液
    hemoglobin: [
        { max: 8, status: { text: '重度貧血', class: 'danger' } },
        { max: 10, status: { text: '中度貧血', class: 'warning' } },
        { max: 12, status: { text: '輕度貧血', class: 'warning' } },
        { max: Infinity, status: { text: '正常', class: 'good' } }
    ],

    // 心率
    heartRate: [
        { max: 60, status: { text: '過緩', class: 'warning' } },
        { max: 100, status: { text: '正常', class: 'good' } },
        { max: Infinity, status: { text: '過快', class: 'warning' } }
    ],

    // 血脂
    ldl: [
        { max: 55, status: { text: '極佳', class: 'good' } },
        { max: 70, status: { text: '良好', class: 'good' } },
        { max: 100, status: { text: '中等', class: 'warning' } },
        { max: Infinity, status: { text: '偏高', class: 'danger' } }
    ],

    totalCholesterol: [
        { max: 200, status: { text: '正常', class: 'good' } },
        { max: 240, status: { text: '偏高', class: 'warning' } },
        { max: Infinity, status: { text: '過高', class: 'danger' } }
    ],

    triglycerides: [
        { max: 150, status: { text: '正常', class: 'good' } },
        { max: 200, status: { text: '偏高', class: 'warning' } },
        { max: Infinity, status: { text: '過高', class: 'danger' } }
    ],

    // 心衰竭
    ntProBnp: [
        { max: 125, status: { text: '正常', class: 'good' } },
        { max: 450, status: { text: '輕度升高', class: 'warning' } },
        { max: 900, status: { text: '中度升高', class: 'warning' } },
        { max: Infinity, status: { text: '顯著升高', class: 'danger' } }
    ],

    bnp: [
        { max: 100, status: { text: '正常', class: 'good' } },
        { max: 400, status: { text: '輕度升高', class: 'warning' } },
        { max: Infinity, status: { text: '顯著升高', class: 'danger' } }
    ],

    lvef: [
        { max: 40, status: { text: 'HFrEF', class: 'danger' } },
        { max: 50, status: { text: 'HFmrEF', class: 'warning' } },
        { max: Infinity, status: { text: 'HFpEF/正常', class: 'good' } }
    ],

    // 凝血
    inr: [
        { max: 2.0, status: { text: '偏低', class: 'warning' } },
        { max: 3.0, status: { text: '治療範圍', class: 'good' } },
        { max: 4.0, status: { text: '偏高', class: 'warning' } },
        { max: Infinity, status: { text: '過高', class: 'danger' } }
    ],

    // 肺功能 (FEV1 % predicted)
    fev1Percent: [
        { max: 30, status: { text: 'GOLD 4 非常重度', class: 'danger' } },
        { max: 50, status: { text: 'GOLD 3 重度', class: 'danger' } },
        { max: 80, status: { text: 'GOLD 2 中度', class: 'warning' } },
        { max: Infinity, status: { text: 'GOLD 1 輕度', class: 'good' } }
    ],

    spo2: [
        { max: 88, status: { text: '嚴重低血氧', class: 'danger' } },
        { max: 92, status: { text: '低血氧', class: 'warning' } },
        { max: Infinity, status: { text: '正常', class: 'good' } }
    ],

    // 肝功能
    ast: [
        { max: 40, status: { text: '正常', class: 'good' } },
        { max: 120, status: { text: '輕度升高', class: 'warning' } },
        { max: Infinity, status: { text: '顯著升高', class: 'danger' } }
    ],

    alt: [
        { max: 41, status: { text: '正常', class: 'good' } },
        { max: 120, status: { text: '輕度升高', class: 'warning' } },
        { max: Infinity, status: { text: '顯著升高', class: 'danger' } }
    ]
};

/**
 * 評估數值狀態
 * @param {string} type - 指標類型 (如 'egfr', 'hba1c')
 * @param {number} value - 數值
 * @returns {object|null} - { text, class } 或 null
 */
function evaluateStatus(type, value) {
    if (value === null || value === undefined || isNaN(value)) {
        return null;
    }

    const ranges = StatusRanges[type];
    if (!ranges) {
        console.warn(`Unknown status type: ${type}`);
        return null;
    }

    // 對於使用 min 的範圍 (如 eGFR，值越高越好)
    if (ranges[0].min !== undefined) {
        for (const range of ranges) {
            if (value >= range.min) {
                return { ...range.status };
            }
        }
    }

    // 對於使用 max 的範圍 (如 HbA1c，值越低越好)
    for (const range of ranges) {
        if (value <= range.max) {
            return { ...range.status };
        }
    }

    return null;
}

/**
 * 取得狀態 CSS class
 */
function getStatusClass(type, value) {
    const status = evaluateStatus(type, value);
    return status ? status.class : 'neutral';
}

/**
 * 取得狀態文字
 */
function getStatusText(type, value) {
    const status = evaluateStatus(type, value);
    return status ? status.text : '-';
}

/**
 * 血壓狀態評估 (特殊處理，需要兩個值)
 */
function evaluateBPStatus(systolic, diastolic) {
    if (systolic === null || diastolic === null) return null;

    const sys = parseFloat(systolic);
    const dia = parseFloat(diastolic);

    if (sys < 120 && dia < 80) return { text: '正常', class: 'good' };
    if (sys < 130 && dia < 80) return { text: '偏高', class: 'good' };
    if (sys < 140 || dia < 90) return { text: '高血壓前期', class: 'warning' };
    if (sys < 160 || dia < 100) return { text: '第一期高血壓', class: 'warning' };
    return { text: '第二期高血壓', class: 'danger' };
}

/**
 * CKD 分期
 */
function getCKDStage(egfr, acr) {
    const gfrStage = egfr !== null ? evaluateStatus('egfr', egfr) : null;
    const acrStage = acr !== null ? evaluateStatus('acr', acr) : null;

    return { gfrStage, acrStage };
}

/**
 * 根據共病決定血壓目標
 */
function getBPTarget(hasDM, hasCKD, hasHF, isElderly) {
    if (isElderly) {
        return { target: '< 140/90', note: '老年虛弱患者' };
    }
    if (hasDM || hasCKD || hasHF) {
        return { target: '< 130/80', note: '合併糖尿病、慢性腎臟病或心衰竭' };
    }
    return { target: '< 140/90', note: '一般高血壓患者' };
}

/**
 * LDL 目標 (根據風險分層)
 */
function getLDLTarget(riskLevel) {
    const targets = {
        'very-high': { target: '< 55', note: '極高風險 (ASCVD)' },
        'high': { target: '< 70', note: '高風險' },
        'moderate': { target: '< 100', note: '中風險' },
        'low': { target: '< 116', note: '低風險' }
    };
    return targets[riskLevel] || targets['moderate'];
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StatusRanges,
        evaluateStatus,
        getStatusClass,
        getStatusText,
        evaluateBPStatus,
        getCKDStage,
        getBPTarget,
        getLDLTarget
    };
}
