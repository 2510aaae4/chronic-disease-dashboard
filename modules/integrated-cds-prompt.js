/**
 * Integrated CDS - Gemini AI Prompt Templates
 * 統合臨床決策支援 - AI Prompt 模板
 *
 * v1.1 - Refined prompt for CKM specialist
 */

const IntegratedCDSPrompts = (function() {

    /**
     * System prompt for Gemini AI
     * 定義 AI 的角色和任務
     */
    const SYSTEM_PROMPT = `你是一位專業內科醫師，專精於心腎代謝症候群 (Cardiovascular-Kidney-Metabolic Syndrome, CKM)。你需要根據我提供的臨床指引建議以及病患資料，整合出一份統一、優先排序的臨床決策建議。

## 背景說明
病患可能同時患有多種慢性病（糖尿病、高血壓、高血脂、心衰竭、慢性腎臟病、心房顫動），各疾病的臨床指引可能會產生重複或相互影響的建議。你的任務是：
1. 整合重複的建議（如多個指引都建議 SGLT2i，合併說明其多重效益）
2. 識別藥物衝突或需要注意的交互作用
3. 依臨床急迫性排序建議
4. 提供具體可執行的行動建議

## 輸出格式要求
請使用以下 JSON 格式回覆：
{
  "summary": "一句話總結此病人目前最需關注的事項",
  "medication_summary": {
    "current_assessment": "目前用藥整體評估",
    "recommendations": [
      {
        "type": "add|adjust|monitor|stop",
        "drug": "藥物名稱或類別",
        "reason": "建議理由",
        "sources": ["來源指引"]
      }
    ],
    "alerts": [
      {
        "type": "conflict|caution|optimization",
        "description": "警示內容",
        "affected_drugs": ["藥物1", "藥物2"]
      }
    ]
  },
  "monitoring_plan": [
    {
      "item": "監測項目",
      "current_value": "目前數值",
      "target": "目標值",
      "status": "達標|未達標|接近目標",
      "frequency": "建議監測頻率"
    }
  ],
  "priority_actions": [
    {
      "priority": 1,
      "action": "具體行動建議",
      "rationale": "簡短說明理由",
      "urgency": "urgent|routine|optional"
    }
  ],
  "lifestyle_recommendations": ["生活型態建議（如有需要）"]
}

## 重要規則
1. 只使用我提供的臨床資料和建議，不要假設或推測未提供的資訊
2. 如果資料不足以做出判斷，請明確說明
3. 對於同一類藥物被多個指引建議的情況，合併為一條建議並說明多重效益
4. 優先處理高風險警示（用藥衝突、器官損傷風險）
5. 使用繁體中文回覆
6. 建議要具體可執行，避免過於籠統
7. monitoring_plan 中的 status 請根據目前數值與目標比較判斷`;

    /**
     * Build the user prompt with patient context and recommendations
     * 建構包含患者資料和各指引建議的 user prompt
     */
    function buildUserPrompt(patientContext, cdsResults) {
        let prompt = `## 病人基本資料

- 年齡: ${patientContext.age ?? '未知'}歲
- 性別: ${patientContext.gender === 'male' ? '男' : patientContext.gender === 'female' ? '女' : '未知'}

### 診斷
${patientContext.conditions.length > 0 ? patientContext.conditions.map(c => `- ${c}`).join('\n') : '- 無特定診斷記錄'}

### 目前用藥
${patientContext.medications.length > 0 ? patientContext.medications.map(m => `- ${m}`).join('\n') : '- 無用藥記錄'}

### 檢驗數值
`;

        // Add lab values in a clean format
        const labItems = [];
        if (patientContext.labs.hba1c !== null) labItems.push(`- HbA1c: ${patientContext.labs.hba1c.toFixed(1)}%`);
        if (patientContext.labs.egfr !== null) labItems.push(`- eGFR: ${patientContext.labs.egfr.toFixed(0)} mL/min/1.73m²`);
        if (patientContext.labs.acr !== null) labItems.push(`- ACR: ${patientContext.labs.acr.toFixed(0)} mg/g`);
        if (patientContext.labs.ldl !== null) labItems.push(`- LDL-C: ${patientContext.labs.ldl.toFixed(0)} mg/dL`);
        if (patientContext.labs.sbp !== null && patientContext.labs.dbp !== null) {
            labItems.push(`- 血壓: ${patientContext.labs.sbp.toFixed(0)}/${patientContext.labs.dbp.toFixed(0)} mmHg`);
        }
        if (patientContext.labs.bmi !== null) labItems.push(`- BMI: ${patientContext.labs.bmi.toFixed(1)} kg/m²`);
        if (patientContext.labs.lvef !== null) labItems.push(`- LVEF: ${patientContext.labs.lvef.toFixed(0)}%`);
        if (patientContext.labs.potassium !== null) labItems.push(`- K+: ${patientContext.labs.potassium.toFixed(1)} mEq/L`);
        if (patientContext.labs.hr !== null) labItems.push(`- 心率: ${patientContext.labs.hr.toFixed(0)} bpm`);

        prompt += labItems.length > 0 ? labItems.join('\n') : '- 無檢驗資料';

        // Add CDS recommendations from each module
        prompt += `\n\n---\n\n## 各指引產生的建議\n`;

        let hasAnyRecommendations = false;

        // DM CDS
        if (cdsResults.dm?.recommendations?.length > 0) {
            hasAnyRecommendations = true;
            prompt += `\n### 糖尿病 (ADA 2026)\n`;
            cdsResults.dm.recommendations.forEach(rec => {
                prompt += `- [${getPriorityLabel(rec.priority)}] ${rec.message}`;
                if (rec.detail) prompt += ` — ${rec.detail}`;
                prompt += '\n';
            });
        }

        // HTN CDS
        if (cdsResults.htn?.recommendations?.length > 0) {
            hasAnyRecommendations = true;
            prompt += `\n### 高血壓 (台灣高血壓指引 2022)\n`;
            if (cdsResults.htn.context?.bpTarget) {
                prompt += `血壓目標: ${cdsResults.htn.context.bpTarget.target} (${cdsResults.htn.context.bpTarget.indication})\n`;
            }
            cdsResults.htn.recommendations.forEach(rec => {
                prompt += `- [${getPriorityLabel(rec.priority)}] ${rec.message}`;
                if (rec.detail) prompt += ` — ${rec.detail}`;
                prompt += '\n';
            });
        }

        // Lipid CDS
        if (cdsResults.lipid?.recommendations?.length > 0) {
            hasAnyRecommendations = true;
            prompt += `\n### 血脂 (ESC/EAS 2025)\n`;
            if (cdsResults.lipid.context?.ldlTarget) {
                prompt += `LDL 目標: ${cdsResults.lipid.context.ldlTarget}\n`;
            }
            cdsResults.lipid.recommendations.forEach(rec => {
                prompt += `- [${getPriorityLabel(rec.priority)}] ${rec.message}`;
                if (rec.detail) prompt += ` — ${rec.detail}`;
                prompt += '\n';
            });
        }

        // HF CDS
        if (cdsResults.hf?.recommendations?.length > 0) {
            hasAnyRecommendations = true;
            prompt += `\n### 心衰竭 (ESC 2021/2023)\n`;
            if (cdsResults.hf.context?.hfClassification) {
                prompt += `分類: ${cdsResults.hf.context.hfClassification.type} (LVEF ${cdsResults.hf.context.lvef ?? '未知'}%)\n`;
            }
            cdsResults.hf.recommendations.forEach(rec => {
                prompt += `- [${getPriorityLabel(rec.priority)}] ${rec.message}`;
                if (rec.detail) prompt += ` — ${rec.detail}`;
                prompt += '\n';
            });
        }

        // CKD CDS
        if (cdsResults.ckd?.recommendations?.length > 0) {
            hasAnyRecommendations = true;
            prompt += `\n### 慢性腎臟病 (KDIGO 2024)\n`;
            cdsResults.ckd.recommendations.forEach(rec => {
                prompt += `- [${getPriorityLabel(rec.priority)}] ${rec.message}`;
                if (rec.detail) prompt += ` — ${rec.detail}`;
                prompt += '\n';
            });
        }

        // Afib CDS
        if (cdsResults.afib?.recommendations?.length > 0) {
            hasAnyRecommendations = true;
            prompt += `\n### 心房顫動 (ESC 2024)\n`;
            if (cdsResults.afib.context?.cha2ds2va !== undefined) {
                prompt += `CHA₂DS₂-VA: ${cdsResults.afib.context.cha2ds2va}`;
                if (cdsResults.afib.context?.hasbled !== undefined) {
                    prompt += `, HAS-BLED: ${cdsResults.afib.context.hasbled}`;
                }
                prompt += '\n';
            }
            cdsResults.afib.recommendations.forEach(rec => {
                prompt += `- [${getPriorityLabel(rec.priority)}] ${rec.message}`;
                if (rec.detail) prompt += ` — ${rec.detail}`;
                prompt += '\n';
            });
        }

        if (!hasAnyRecommendations) {
            prompt += '\n（目前無任何指引產生建議）\n';
        }

        prompt += `\n---\n\n請根據以上資料，整合出統一的臨床決策建議。請以 JSON 格式輸出。`;

        return prompt;
    }

    /**
     * Get priority label from numeric priority
     */
    function getPriorityLabel(priority) {
        switch (priority) {
            case 1: return '高';
            case 2: return '中';
            case 3: return '低';
            default: return '一般';
        }
    }

    /**
     * Parse Gemini response to ensure valid JSON
     */
    function parseGeminiResponse(responseText) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No JSON found in response');
        } catch (error) {
            console.error('Failed to parse Gemini response:', error);
            return {
                summary: '無法解析 AI 回應',
                medication_summary: { current_assessment: '', recommendations: [], alerts: [] },
                monitoring_plan: [],
                priority_actions: [],
                lifestyle_recommendations: [],
                error: true
            };
        }
    }

    /**
     * Validate and sanitize the parsed response
     */
    function validateResponse(parsed) {
        const validated = {
            summary: parsed.summary || '無法取得摘要',
            medication_summary: {
                current_assessment: parsed.medication_summary?.current_assessment || '',
                recommendations: Array.isArray(parsed.medication_summary?.recommendations)
                    ? parsed.medication_summary.recommendations : [],
                alerts: Array.isArray(parsed.medication_summary?.alerts)
                    ? parsed.medication_summary.alerts : []
            },
            monitoring_plan: Array.isArray(parsed.monitoring_plan) ? parsed.monitoring_plan : [],
            priority_actions: Array.isArray(parsed.priority_actions) ? parsed.priority_actions : [],
            lifestyle_recommendations: Array.isArray(parsed.lifestyle_recommendations)
                ? parsed.lifestyle_recommendations : [],
            error: parsed.error || false
        };

        // Ensure priority_actions have required fields
        validated.priority_actions = validated.priority_actions.map((action, idx) => ({
            priority: action.priority || (idx + 1),
            action: action.action || '未指定行動',
            rationale: action.rationale || '',
            urgency: action.urgency || 'routine'
        }));

        // Ensure monitoring_plan items have required fields
        validated.monitoring_plan = validated.monitoring_plan.map(item => ({
            item: item.item || '未指定項目',
            current_value: item.current_value || '-',
            target: item.target || '-',
            status: item.status || '未知',
            frequency: item.frequency || '-'
        }));

        return validated;
    }

    // Public API
    return {
        SYSTEM_PROMPT,
        buildUserPrompt,
        parseGeminiResponse,
        validateResponse,
        getPriorityLabel
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.IntegratedCDSPrompts = IntegratedCDSPrompts;
}
