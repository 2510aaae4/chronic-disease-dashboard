/**
 * UI Components Library v2.0
 * 統一 UI 元件庫 - 卡片式設計重構版
 */

const UI = {
    // ==================== 指標卡片 ====================

    /**
     * 指標卡片 - 帶狀態顏色和目標值
     */
    metricCard({ label, value, unit, status, target, date, trend, size = 'normal' }) {
        const displayValue = value != null
            ? (typeof value === 'number' ? value.toFixed(1) : value)
            : '--';

        const statusClass = status?.class || 'neutral';
        const sizeClass = size === 'small' ? 'metric-card--small' : '';

        return `
            <div class="metric-card ${sizeClass} metric-card--${statusClass}">
                <div class="metric-card__header">
                    <span class="metric-card__label">${label}</span>
                    ${status ? `<span class="metric-card__badge metric-card__badge--${statusClass}">${status.text}</span>` : ''}
                </div>
                <div class="metric-card__body">
                    <span class="metric-card__value">${displayValue}</span>
                    ${unit ? `<span class="metric-card__unit">${unit}</span>` : ''}
                    ${trend ? `<span class="metric-card__trend metric-card__trend--${trend}">${trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>` : ''}
                </div>
                <div class="metric-card__footer">
                    ${target ? `<span class="metric-card__target">目標: ${target}</span>` : ''}
                    ${date ? `<span class="metric-card__date">${formatDate(date)}</span>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * 指標網格容器
     */
    metricsGrid(metrics, columns = 2) {
        return `
            <div class="metrics-grid metrics-grid--${columns}col">
                ${Array.isArray(metrics) ? metrics.join('') : metrics}
            </div>
        `;
    },

    // ==================== 目標卡片 ====================

    /**
     * 個人化目標卡片
     */
    targetCard({ icon, title, target, value, indication, reason, evidence, note }) {
        // Support both 'target' and 'value' parameters
        const displayValue = target || value || '';

        return `
            <div class="target-card">
                <div class="target-card__header">
                    ${icon ? `<span class="target-card__icon">${icon}</span>` : ''}
                    <span class="target-card__title">${title}</span>
                </div>
                <div class="target-card__value">${displayValue}</div>
                ${indication ? `<div class="target-card__indication">${indication}</div>` : ''}
                ${reason ? `<div class="target-card__reason">${reason}</div>` : ''}
                ${evidence ? `<div class="target-card__evidence">${evidence}</div>` : ''}
                ${note ? `<div class="target-card__note">${note}</div>` : ''}
            </div>
        `;
    },

    // ==================== 藥物狀態 Pills ====================

    /**
     * 藥物狀態 Pills 組
     */
    drugStatusPills(drugs) {
        const pills = drugs.map(drug => {
            let statusClass = 'off';
            let icon = '○';

            if (drug.status === 'active') {
                statusClass = 'on';
                icon = '✓';
            } else if (drug.status === 'recommended') {
                statusClass = 'recommended';
                icon = '⚠';
            }

            return `
                <div class="drug-pill drug-pill--${statusClass}" title="${drug.tooltip || ''}">
                    <span class="drug-pill__icon">${icon}</span>
                    <span class="drug-pill__name">${drug.name}</span>
                    ${drug.detail ? `<span class="drug-pill__detail">${drug.detail}</span>` : ''}
                </div>
            `;
        }).join('');

        return `<div class="drug-pills">${pills}</div>`;
    },

    /**
     * GDMT 四大支柱 (心衰竭專用)
     */
    gdmtPillars(pillars) {
        const total = pillars.length;
        const active = pillars.filter(p => p.status === 'active').length;
        const percentage = Math.round((active / total) * 100);

        const pillarCards = pillars.map(p => {
            let statusClass = 'off';
            let statusText = '未使用';

            if (p.status === 'active') {
                statusClass = 'on';
                statusText = '使用中';
            } else if (p.status === 'recommended') {
                statusClass = 'recommended';
                statusText = '建議使用';
            }

            return `
                <div class="gdmt-pillar gdmt-pillar--${statusClass}">
                    <div class="gdmt-pillar__name">${p.name}</div>
                    <div class="gdmt-pillar__status">${statusText}</div>
                    ${p.drug ? `<div class="gdmt-pillar__drug">${p.drug}</div>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="gdmt-container">
                <div class="gdmt-pillars">${pillarCards}</div>
                <div class="gdmt-progress">
                    <div class="gdmt-progress__bar">
                        <div class="gdmt-progress__fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="gdmt-progress__text">GDMT 完成度: ${active}/${total} (${percentage}%)</div>
                </div>
            </div>
        `;
    },

    // ==================== CDS 建議卡片 ====================

    /**
     * CDS 建議卡片
     * 支持兩種參數命名: title/description/source 或 message/detail/sources
     */
    cdsCard({ priority, title, message, description, detail, source, sources, evidence, category }) {
        const priorityConfig = {
            urgent: { class: 'urgent', label: '緊急', icon: '🔴' },
            warning: { class: 'warning', label: '注意', icon: '🟡' },
            suggestion: { class: 'suggestion', label: '建議', icon: '🟡' },
            good: { class: 'good', label: '良好', icon: '🟢' },
            info: { class: 'info', label: '資訊', icon: '🔵' }
        };

        const config = priorityConfig[priority] || priorityConfig.info;

        // Support both naming conventions
        const cardTitle = title || message || '';
        const cardDescription = description || detail || '';
        const cardSource = source || (Array.isArray(sources) ? sources.join(', ') : sources) || '';

        return `
            <div class="cds-card cds-card--${config.class}">
                <div class="cds-card__header">
                    <span class="cds-card__priority">${config.icon} ${config.label}</span>
                    ${category ? `<span class="cds-card__category">${category}</span>` : ''}
                </div>
                <div class="cds-card__title">${cardTitle}</div>
                ${cardDescription ? `<div class="cds-card__description">${cardDescription}</div>` : ''}
                <div class="cds-card__footer">
                    ${cardSource ? `<span class="cds-card__source">📚 ${cardSource}</span>` : ''}
                    ${evidence ? `<span class="cds-card__evidence">${evidence}</span>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * CDS 建議列表容器
     */
    cdsSection(title, cards, source) {
        return `
            <div class="cds-section">
                <div class="cds-section__header">
                    <span class="cds-section__icon">💡</span>
                    <span class="cds-section__title">${title}</span>
                </div>
                <div class="cds-section__cards">
                    ${Array.isArray(cards) ? cards.join('') : cards}
                </div>
                ${source ? `<div class="cds-section__source">${source}</div>` : ''}
            </div>
        `;
    },

    // ==================== 風險評分 ====================

    /**
     * 風險評分卡片 (CHA2DS2-VASc, HAS-BLED 等)
     */
    scoreCard({ name, score, maxScore, riskLevel, riskClass, recommendation, factors }) {
        return `
            <div class="score-card score-card--${riskClass || 'neutral'}">
                <div class="score-card__name">${name}</div>
                <div class="score-card__score">
                    <span class="score-card__number">${score}</span>
                    ${maxScore ? `<span class="score-card__max">/ ${maxScore}</span>` : ''}
                    <span class="score-card__unit">分</span>
                </div>
                <div class="score-card__risk">${riskLevel}</div>
                ${recommendation ? `<div class="score-card__recommendation">${recommendation}</div>` : ''}
            </div>
        `;
    },

    /**
     * 風險因子明細
     */
    riskFactors({ title, factors }) {
        const items = factors.map(f => `
            <span class="risk-factor risk-factor--${f.active ? 'active' : 'inactive'}">
                ${f.active ? '✓' : '○'} ${f.name} ${f.points ? `(+${f.points})` : ''}
            </span>
        `).join('');

        return `
            <div class="risk-factors">
                <div class="risk-factors__title">${title}</div>
                <div class="risk-factors__list">${items}</div>
            </div>
        `;
    },

    // ==================== KDIGO 風險矩陣 ====================

    /**
     * KDIGO 風險矩陣
     */
    kdigoMatrix({ gfrStage, acrStage }) {
        const gfrLabels = ['G1', 'G2', 'G3a', 'G3b', 'G4', 'G5'];
        const acrLabels = ['A1', 'A2', 'A3'];
        const acrHeaders = ['<30', '30-300', '>300'];

        // Risk levels: 1=low(green), 2=moderate(yellow), 3=high(orange), 4=very high(red)
        const riskMatrix = [
            [1, 1, 2],  // G1
            [1, 2, 3],  // G2
            [2, 3, 3],  // G3a
            [3, 3, 4],  // G3b
            [4, 4, 4],  // G4
            [4, 4, 4]   // G5
        ];

        const riskColors = {
            1: 'low',
            2: 'moderate',
            3: 'high',
            4: 'very-high'
        };

        const gfrIndex = gfrLabels.indexOf(gfrStage);
        const acrIndex = acrLabels.indexOf(acrStage);

        let rows = '';
        for (let i = 0; i < gfrLabels.length; i++) {
            let cells = '';
            for (let j = 0; j < acrLabels.length; j++) {
                const risk = riskMatrix[i][j];
                const isActive = (i === gfrIndex && j === acrIndex);
                cells += `
                    <td class="kdigo-cell kdigo-cell--${riskColors[risk]} ${isActive ? 'kdigo-cell--active' : ''}">
                        ${isActive ? '●' : ''}
                    </td>
                `;
            }
            rows += `
                <tr>
                    <th class="kdigo-row-header">${gfrLabels[i]}</th>
                    ${cells}
                </tr>
            `;
        }

        return `
            <div class="kdigo-matrix">
                <table class="kdigo-table">
                    <thead>
                        <tr>
                            <th></th>
                            ${acrHeaders.map((h, i) => `<th class="kdigo-col-header">${acrLabels[i]}<br><small>${h}</small></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="kdigo-legend">
                    <span class="kdigo-legend__item kdigo-legend__item--low">低風險</span>
                    <span class="kdigo-legend__item kdigo-legend__item--moderate">中風險</span>
                    <span class="kdigo-legend__item kdigo-legend__item--high">高風險</span>
                    <span class="kdigo-legend__item kdigo-legend__item--very-high">極高風險</span>
                </div>
            </div>
        `;
    },

    // ==================== 併發症狀態 ====================

    /**
     * 併發症狀態列表
     */
    complicationsList(complications) {
        const items = complications.map(c => `
            <div class="complication-item complication-item--${c.status ? 'has' : 'none'}">
                <span class="complication-item__icon">${c.status ? '⚠️' : '✅'}</span>
                <span class="complication-item__name">${c.name}</span>
                <span class="complication-item__status">${c.status ? '有' : '無'}</span>
                ${c.note ? `<span class="complication-item__note">${c.note}</span>` : ''}
            </div>
        `).join('');

        return `<div class="complications-list">${items}</div>`;
    },

    // ==================== 共病標籤 ====================

    /**
     * 共病標籤組
     */
    comorbidityPills(conditions) {
        const pills = conditions.map(c => `
            <span class="comorbidity-pill">${c}</span>
        `).join('');

        return `
            <div class="comorbidity-pills">
                <span class="comorbidity-pills__label">相關共病:</span>
                ${pills}
            </div>
        `;
    },

    // ==================== 進度條 ====================

    /**
     * 進度條 (LDL 達標、GDMT 完成度等)
     */
    progressBar({ current, target, unit, label, showDiff = true }) {
        const percentage = Math.min(100, Math.max(0, (current / target) * 100));
        const diff = current - target;
        const isAchieved = current <= target;

        return `
            <div class="progress-display">
                <div class="progress-display__header">
                    <span class="progress-display__label">${label}</span>
                    <span class="progress-display__status ${isAchieved ? 'achieved' : 'not-achieved'}">
                        ${isAchieved ? '✓ 達標' : '✗ 未達標'}
                    </span>
                </div>
                <div class="progress-display__values">
                    <div class="progress-display__current">
                        <span class="progress-display__number">${current}</span>
                        <span class="progress-display__unit">${unit}</span>
                        <span class="progress-display__label-small">目前</span>
                    </div>
                    <div class="progress-display__arrow">→</div>
                    <div class="progress-display__target">
                        <span class="progress-display__number">${target}</span>
                        <span class="progress-display__unit">${unit}</span>
                        <span class="progress-display__label-small">目標</span>
                    </div>
                    ${showDiff ? `
                        <div class="progress-display__diff ${isAchieved ? 'positive' : 'negative'}">
                            <span class="progress-display__number">${diff > 0 ? '+' : ''}${diff}</span>
                            <span class="progress-display__unit">${unit}</span>
                            <span class="progress-display__label-small">差距</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // ==================== 降脂藥物階梯 ====================

    /**
     * 藥物階梯圖 (Lipid 專用)
     */
    drugLadder(steps) {
        const stepCards = steps.map((step, index) => {
            let statusClass = 'off';
            let statusText = '未使用';

            if (step.status === 'active') {
                statusClass = 'on';
                statusText = '使用中';
            } else if (step.status === 'recommended') {
                statusClass = 'recommended';
                statusText = '建議';
            }

            return `
                <div class="drug-ladder__step drug-ladder__step--${statusClass}">
                    <div class="drug-ladder__step-number">Step ${index + 1}</div>
                    <div class="drug-ladder__drug">${step.name}</div>
                    <div class="drug-ladder__status">${statusText}</div>
                </div>
                ${index < steps.length - 1 ? '<div class="drug-ladder__arrow">→</div>' : ''}
            `;
        }).join('');

        return `<div class="drug-ladder">${stepCards}</div>`;
    },

    // ==================== CV 風險等級 ====================

    /**
     * CV 風險等級顯示 (Lipid 專用)
     */
    cvRiskLevel({ level, factors }) {
        const levelConfig = {
            'very-high': { label: '極高風險', class: 'very-high' },
            'high': { label: '高風險', class: 'high' },
            'moderate': { label: '中風險', class: 'moderate' },
            'low': { label: '低風險', class: 'low' }
        };

        const config = levelConfig[level] || levelConfig['moderate'];

        return `
            <div class="cv-risk cv-risk--${config.class}">
                <div class="cv-risk__level">${config.label}</div>
                ${factors ? `<div class="cv-risk__factors">風險因子: ${factors}</div>` : ''}
            </div>
        `;
    },

    // ==================== 區塊標題 ====================

    /**
     * Section 區塊
     */
    section(title, content, icon) {
        return `
            <div class="detail-section">
                <div class="detail-section__header">
                    ${icon ? `<span class="detail-section__icon">${icon}</span>` : ''}
                    <h3 class="detail-section__title">${title}</h3>
                </div>
                <div class="detail-section__content">
                    ${content}
                </div>
            </div>
        `;
    },

    // ==================== 警告訊息 ====================

    /**
     * 警告/提示訊息
     */
    alert(message, type = 'info') {
        const icons = {
            danger: '🚨',
            warning: '⚠️',
            info: 'ℹ️',
            success: '✅'
        };

        return `
            <div class="alert-box alert-box--${type}">
                <span class="alert-box__icon">${icons[type] || icons.info}</span>
                <span class="alert-box__message">${message}</span>
            </div>
        `;
    },

    // ==================== 電解質面板 ====================

    /**
     * 電解質監測面板
     */
    electrolytesPanel(electrolytes) {
        const items = electrolytes.map(e => {
            const statusClass = e.status?.class || 'neutral';
            return `
                <div class="electrolyte-item electrolyte-item--${statusClass}">
                    <span class="electrolyte-item__label">${e.label}</span>
                    <span class="electrolyte-item__value">${e.value != null ? e.value.toFixed(1) : '--'}</span>
                    <span class="electrolyte-item__unit">${e.unit}</span>
                </div>
            `;
        }).join('');

        return `<div class="electrolytes-panel">${items}</div>`;
    },

    // ==================== 資料表格 ====================

    /**
     * 資料表格
     */
    dataTable({ headers, rows, emptyMessage = '無資料' }) {
        if (!rows || rows.length === 0) {
            return `<div class="empty-state">${emptyMessage}</div>`;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * 藥物表格
     */
    medicationTable(meds, typeClassifier = null) {
        if (!meds || meds.length === 0) {
            return '<div class="empty-state">無相關用藥</div>';
        }

        const rows = meds.map(med => {
            const medType = typeClassifier ? typeClassifier(med.name) : (med.class || '-');
            return `
                <tr>
                    <td class="med-name">
                        <span class="med-icon">💊</span>
                        ${med.name}
                    </td>
                    <td><span class="med-type-badge">${medType}</span></td>
                    <td>${med.dosage || med.dose || '-'}</td>
                </tr>
            `;
        }).join('');

        return `
            <table class="medication-table">
                <thead>
                    <tr><th>藥物</th><th>分類</th><th>劑量</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    // ==================== 狀態徽章 ====================

    /**
     * 狀態徽章
     */
    statusBadge(text, className = 'neutral') {
        return `<span class="status-badge status-badge--${className}">${text}</span>`;
    },

    // ==================== Dashboard 卡片 ====================

    /**
     * Dashboard 疾病卡片內容
     */
    cardContent({ label, value, unit, status }) {
        const displayValue = value != null
            ? (typeof value === 'number' ? value.toFixed(1) : value)
            : '--';

        return `
            <div class="disease-card__metric-label">${label}</div>
            <div class="disease-card__metric">
                <span class="disease-card__value">${displayValue}</span>
                <span class="disease-card__unit">${unit}</span>
            </div>
            ${status ? `<div class="disease-card__status">${status}</div>` : ''}
        `;
    },

    // ==================== HF 分類顯示 ====================

    /**
     * HF 分類卡片
     */
    hfClassification({ type, lvef, nyha, source }) {
        const typeLabels = {
            'HFrEF': '收縮功能不全',
            'HFmrEF': '輕度收縮功能不全',
            'HFpEF': '舒張功能不全',
            'unknown': '未分類'
        };

        return `
            <div class="hf-classification">
                <div class="hf-classification__type">${type}</div>
                <div class="hf-classification__label">${typeLabels[type] || ''}</div>
                <div class="hf-classification__details">
                    ${lvef ? `<span class="hf-classification__lvef">LVEF ${lvef}%</span>` : ''}
                    ${nyha ? `<span class="hf-classification__nyha">NYHA Class ${nyha}</span>` : ''}
                </div>
                ${source ? `<div class="hf-classification__source">${source}</div>` : ''}
            </div>
        `;
    },

    // ==================== 抗凝血治療建議 ====================

    /**
     * 抗凝血建議卡片 (AF 專用)
     */
    anticoagulationCard({ recommendation, preferredDrug, currentDrug, drugs }) {
        const drugPills = drugs.map(d => `
            <span class="ac-drug ac-drug--${d.status}">${d.status === 'active' ? '✓' : '○'} ${d.name}</span>
        `).join('');

        return `
            <div class="anticoagulation-card">
                <div class="anticoagulation-card__recommendation">${recommendation}</div>
                ${preferredDrug ? `<div class="anticoagulation-card__preferred">首選: ${preferredDrug}</div>` : ''}
                <div class="anticoagulation-card__drugs">${drugPills}</div>
            </div>
        `;
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
