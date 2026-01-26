# 慢性病照護儀表板 - 規格設計書

## 一、各慢性病觀察指標

---

### 1. 糖尿病 (Diabetes Mellitus, DM) ✅ 已完成

| 觀察項目 | FHIR Resource | LOINC Code | 參考值 | 臨床意義 |
|----------|---------------|------------|--------|----------|
| HbA1c | Observation | 4548-4 | <7% 良好 | 血糖控制指標 |
| 空腹血糖 | Observation | 2339-0 | 80-130 mg/dL | 血糖控制 |
| ACR | Observation | 14959-1 | <30 mg/g | 腎病變篩檢 |
| eGFR | Observation | 33914-3 | >60 | 腎功能 |
| 眼底檢查 | Condition | - | - | 視網膜病變 |

**相關藥物**：Metformin, Sulfonylureas, DPP4i, SGLT2i, GLP1-RA, Insulin

**共病關注**：CKD, HF, CAD, 視網膜病變, 神經病變

---

### 2. 高血壓 (Hypertension, HTN)

| 觀察項目 | FHIR Resource | LOINC Code | 參考值 | 臨床意義 |
|----------|---------------|------------|--------|----------|
| 收縮壓 | Observation | 8480-6 | <130 mmHg | 血壓控制 |
| 舒張壓 | Observation | 8462-4 | <80 mmHg | 血壓控制 |
| 心率 | Observation | 8867-4 | 60-100 bpm | 心臟功能 |
| 鉀離子 | Observation | 6298-4 | 3.5-5.0 mEq/L | 電解質(用藥監測) |
| 鈉離子 | Observation | 2947-0 | 136-145 mEq/L | 電解質 |
| Creatinine | Observation | 2160-0 | 0.7-1.3 mg/dL | 腎功能 |
| eGFR | Observation | 33914-3 | >60 | 腎功能 |
| ACR | Observation | 14959-1 | <30 mg/g | 標靶器官損傷 |

**相關藥物**：
- ACEi (Lisinopril, Enalapril, Ramipril)
- ARB (Losartan, Valsartan, Irbesartan, Telmisartan)
- CCB (Amlodipine, Nifedipine, Diltiazem)
- Beta-blocker (Metoprolol, Atenolol, Bisoprolol)
- Diuretics (HCTZ, Furosemide, Indapamide)

**共病關注**：CKD, HF, CAD, Stroke, DM

**控制目標**：
- 一般：<130/80 mmHg
- 高風險/DM/CKD：<130/80 mmHg
- 老年虛弱：<140/90 mmHg

---

### 3. 心衰竭 (Heart Failure, HF)

| 觀察項目 | FHIR Resource | LOINC Code | 參考值 | 臨床意義 |
|----------|---------------|------------|--------|----------|
| NT-proBNP | Observation | 33762-6 | <125 pg/mL | HF 指標 |
| BNP | Observation | 42637-9 | <100 pg/mL | HF 指標 |
| 體重 | Observation | 29463-7 | 穩定 | 體液狀態 |
| 收縮壓 | Observation | 8480-6 | - | 血壓監測 |
| 心率 | Observation | 8867-4 | - | 心率控制 |
| eGFR | Observation | 33914-3 | - | 腎功能 |
| 鉀離子 | Observation | 6298-4 | 3.5-5.0 | 電解質 |
| 鈉離子 | Observation | 2947-0 | >135 | 低血鈉預後差 |
| Hemoglobin | Observation | 718-7 | >12 g/dL | 貧血檢查 |
| LVEF | Observation | 10230-1 | >40% | 心臟功能 |

**相關藥物**：
- ACEi/ARB/ARNI (Sacubitril/Valsartan)
- Beta-blocker (Carvedilol, Metoprolol Succinate, Bisoprolol)
- MRA (Spironolactone, Eplerenone)
- SGLT2i (Dapagliflozin, Empagliflozin)
- Diuretics (Furosemide, Bumetanide)
- Digoxin

**NYHA 分級**：I, II, III, IV

**HF 分類**：
- HFrEF (EF ≤40%)
- HFmrEF (EF 41-49%)
- HFpEF (EF ≥50%)

**共病關注**：AF, CKD, DM, HTN, CAD, 貧血

---

### 4. 高血脂 (Hyperlipidemia)

| 觀察項目 | FHIR Resource | LOINC Code | 參考值 | 臨床意義 |
|----------|---------------|------------|--------|----------|
| Total Cholesterol | Observation | 2093-3 | <200 mg/dL | 總膽固醇 |
| LDL-C | Observation | 18262-6 | 依風險分層 | 主要治療目標 |
| HDL-C | Observation | 2085-9 | >40(男)/>50(女) | 保護因子 |
| Triglycerides | Observation | 2571-8 | <150 mg/dL | 三酸甘油酯 |
| Non-HDL-C | 計算值 | - | LDL+30 | 次要目標 |
| AST | Observation | 1920-8 | <40 U/L | 肝功能監測 |
| ALT | Observation | 1742-6 | <41 U/L | 肝功能監測 |
| CK | Observation | 2157-6 | <200 U/L | 肌肉副作用 |

**相關藥物**：
- Statins (Atorvastatin, Rosuvastatin, Simvastatin, Pravastatin)
- Ezetimibe
- PCSK9i (Evolocumab, Alirocumab)
- Fibrates (Fenofibrate)
- Omega-3 FA

**LDL 目標**：
- 極高風險 (ASCVD)：<55 mg/dL
- 高風險：<70 mg/dL
- 中風險：<100 mg/dL
- 低風險：<116 mg/dL

**共病關注**：CAD, DM, HTN, CKD

---

### 5. 慢性腎臟病 (Chronic Kidney Disease, CKD)

| 觀察項目 | FHIR Resource | LOINC Code | 參考值 | 臨床意義 |
|----------|---------------|------------|--------|----------|
| eGFR | Observation | 33914-3 | >60 | 腎功能分期 |
| Creatinine | Observation | 2160-0 | 0.7-1.3 mg/dL | 腎功能 |
| BUN | Observation | 6299-2 | 7-20 mg/dL | 腎功能 |
| ACR | Observation | 14959-1 | <30 mg/g | 蛋白尿分期 |
| 鉀離子 | Observation | 6298-4 | 3.5-5.0 | 高血鉀風險 |
| 磷 | Observation | 2777-1 | 2.5-4.5 mg/dL | 骨病變 |
| �ite | Observation | 17861-6 | 8.5-10.5 mg/dL | 骨病變 |
| Bicarbonate | Observation | 1963-8 | 22-29 mEq/L | 代謝性酸中毒 |
| Hemoglobin | Observation | 718-7 | >10 g/dL | 腎性貧血 |
| PTH | Observation | 2731-8 | 依 CKD 分期 | 次發性副甲狀腺亢進 |
| Uric Acid | Observation | 3084-1 | <7 mg/dL | 痛風風險 |

**相關藥物**：
- ACEi/ARB (腎臟保護)
- SGLT2i (Dapagliflozin, Empagliflozin)
- Phosphate binders
- ESA (Erythropoietin)
- Vitamin D analogs
- Sodium bicarbonate

**CKD 分期 (eGFR)**：
- G1: ≥90 (正常或高)
- G2: 60-89 (輕度下降)
- G3a: 45-59 (輕中度)
- G3b: 30-44 (中重度)
- G4: 15-29 (重度)
- G5: <15 (腎衰竭)

**蛋白尿分期 (ACR)**：
- A1: <30 mg/g (正常)
- A2: 30-300 mg/g (中度增加)
- A3: >300 mg/g (嚴重增加)

**共病關注**：DM, HTN, HF, 貧血, 骨病變

---

### 6. 心房顫動 (Atrial Fibrillation, AF)

| 觀察項目 | FHIR Resource | LOINC Code | 參考值 | 臨床意義 |
|----------|---------------|------------|--------|----------|
| 心率 | Observation | 8867-4 | <110 bpm | 心率控制 |
| INR | Observation | 6301-6 | 2.0-3.0 | Warfarin 監測 |
| Creatinine | Observation | 2160-0 | - | DOAC 劑量調整 |
| eGFR | Observation | 33914-3 | - | DOAC 劑量調整 |
| TSH | Observation | 3016-3 | 0.4-4.0 mIU/L | 甲狀腺功能 |
| Hemoglobin | Observation | 718-7 | - | 出血監測 |

**相關藥物**：
- 心率控制：Beta-blocker, CCB (Diltiazem, Verapamil), Digoxin
- 節律控制：Amiodarone, Flecainide, Propafenone, Sotalol
- 抗凝血：Warfarin, Apixaban, Rivaroxaban, Dabigatran, Edoxaban

**風險評估**：
- CHA₂DS₂-VASc (中風風險)：
  - C: CHF (+1)
  - H: HTN (+1)
  - A₂: Age ≥75 (+2)
  - D: DM (+1)
  - S₂: Stroke/TIA (+2)
  - V: Vascular disease (+1)
  - A: Age 65-74 (+1)
  - Sc: Sex female (+1)

- HAS-BLED (出血風險)：
  - H: HTN
  - A: Abnormal liver/renal
  - S: Stroke
  - B: Bleeding
  - L: Labile INR
  - E: Elderly >65
  - D: Drugs/Alcohol

**共病關注**：HF, HTN, DM, Stroke, CAD

---

### 7. 慢性阻塞性肺病 (COPD)

| 觀察項目 | FHIR Resource | LOINC Code | 參考值 | 臨床意義 |
|----------|---------------|------------|--------|----------|
| FEV1 | Observation | 20150-9 | 依 GOLD 分級 | 肺功能 |
| FVC | Observation | 19868-9 | - | 肺功能 |
| FEV1/FVC | Observation | 19926-5 | <0.7 診斷 | 阻塞程度 |
| SpO2 | Observation | 59408-5 | >92% | 氧合狀態 |
| Eosinophils | Observation | 26449-9 | - | ICS 適應症 |
| pCO2 | Observation | 2019-8 | 35-45 mmHg | 換氣功能 |

**相關藥物**：
- SABA (Salbutamol)
- SAMA (Ipratropium)
- LABA (Salmeterol, Formoterol, Indacaterol)
- LAMA (Tiotropium, Umeclidinium)
- ICS (Fluticasone, Budesonide)
- LABA+LAMA combinations
- ICS+LABA combinations
- Triple therapy (ICS+LABA+LAMA)
- PDE4i (Roflumilast)

**GOLD 分級 (FEV1)**：
- GOLD 1 (輕度): ≥80%
- GOLD 2 (中度): 50-79%
- GOLD 3 (重度): 30-49%
- GOLD 4 (非常重度): <30%

**GOLD ABCD 分組**：依症狀與急性惡化史

**共病關注**：HF, CAD, 骨質疏鬆, 肺癌, 焦慮/憂鬱

---

## 二、跨疾病共用指標

以下指標會影響多個慢性病，應統一顯示並標註相關疾病：

| 指標 | 相關疾病 |
|------|----------|
| eGFR | DM, HTN, HF, CKD, AF |
| Creatinine | DM, HTN, HF, CKD, AF |
| ACR | DM, HTN, CKD |
| 鉀離子 | HTN, HF, CKD |
| 血壓 | DM, HTN, HF, CKD |
| 心率 | HTN, HF, AF |
| Hemoglobin | HF, CKD, AF |
| 體重 | DM, HF |

---

## 三、App 架構設計

### 方案：病患總覽 + 疾病卡片 + 詳細頁面

```
┌─────────────────────────────────────────────────────────┐
│                   慢性病照護儀表板                        │
│                  Chronic Disease Dashboard               │
├─────────────────────────────────────────────────────────┤
│  [病患資訊]  姓名：王大明  性別：男  年齡：68歲           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  🩸 糖尿病   │  │  💓 高血壓   │  │  ❤️ 心衰竭   │     │
│  │  HbA1c: 6.8%│  │  BP:138/85  │  │ NT-proBNP:  │     │
│  │  ✅ 控制中   │  │  ⚠️ 偏高    │  │  856 pg/mL  │     │
│  │  [詳細 →]   │  │  [詳細 →]   │  │  [詳細 →]   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  🫀 心房顫動 │  │  🫁 COPD    │  │  🔬 高血脂   │     │
│  │  HR: 78 bpm │  │ FEV1: 62%  │  │ LDL: 95    │     │
│  │  INR: 2.3   │  │  GOLD 2    │  │  ✅ 達標    │     │
│  │  [詳細 →]   │  │  [詳細 →]   │  │  [詳細 →]   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐                                       │
│  │  🫘 慢性腎病 │   ← 只顯示病患有診斷的疾病              │
│  │  eGFR: 45   │                                       │
│  │  G3b / A2   │                                       │
│  │  [詳細 →]   │                                       │
│  └─────────────┘                                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [共用指標摘要]                                          │
│  ┌────────┬────────┬────────┬────────┬────────┐        │
│  │ eGFR   │ K+     │ Hb     │ 體重   │ BP     │        │
│  │ 45     │ 4.2    │ 11.2   │ 72kg   │138/85  │        │
│  │ ⚠️     │ ✅     │ ⚠️     │ ↑2kg   │ ⚠️     │        │
│  └────────┴────────┴────────┴────────┴────────┘        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [目前用藥] 12 種藥物                                    │
│  💊 Metformin 1000mg BID  💊 Lisinopril 10mg QD        │
│  💊 Atorvastatin 20mg QD  💊 Apixaban 5mg BID  ...     │
│  [查看全部 →]                                           │
└─────────────────────────────────────────────────────────┘
```

### 詳細頁面結構（以糖尿病為例）

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回    糖尿病 (Diabetes Mellitus)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [血糖控制]                                              │
│  ┌─────────────────────────────────────────────┐       │
│  │     HbA1c 趨勢圖                              │       │
│  │     ████████████ 6.8%                        │       │
│  │     目標 <7%  ✅ 達標                         │       │
│  │     ─────────────────────────                │       │
│  │     6.2  6.5  6.8  7.1  (%)                  │       │
│  │     2023 2024 2024 2024                      │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  [最近血糖] 最近 5 次                                    │
│  ┌────────┬────────┬────────┬────────┬────────┐        │
│  │ 01/12  │ 01/05  │ 12/28  │ 12/21  │ 12/14  │        │
│  │ 142    │ 128    │ 156    │ 134    │ 118    │        │
│  │ ⚠️偏高 │ ✅正常 │ ⚠️偏高 │ ✅正常 │ ✅正常 │        │
│  └────────┴────────┴────────┴────────┴────────┘        │
│                                                         │
│  [併發症監測]                                            │
│  ┌─────────────────┬─────────────────┐                 │
│  │ 🔬 腎病變        │ 👁️ 視網膜病變    │                 │
│  │ ACR: 45 mg/g   │ 輕度 NPDR       │                 │
│  │ A2 微量白蛋白尿  │ 上次檢查: 2024/06│                │
│  │ eGFR: 68 (G2)  │ 建議追蹤: 每年   │                 │
│  └─────────────────┴─────────────────┘                 │
│                                                         │
│  [相關藥物]                                              │
│  ┌─────────────────────────────────────────────┐       │
│  │ 💊 Metformin 1000mg BID     - 使用中         │       │
│  │ 💊 Empagliflozin 10mg QD    - 使用中         │       │
│  │ 💊 Sitagliptin 100mg QD     - 使用中         │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  [共病狀態]                                              │
│  CKD: G2/A2 ⚠️  │  HF: 無 ✅  │  CAD: 有 ⚠️            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 四、UI 元件設計

### 1. 疾病卡片 (Disease Card)
- 疾病圖示 + 名稱
- 關鍵指標 1-2 個
- 控制狀態 (良好/注意/不佳)
- 點擊進入詳細頁

### 2. 指標顯示
- 數值 + 單位
- 趨勢箭頭 (↑↓→)
- 狀態標籤 (綠/黃/紅)
- 參考範圍

### 3. 狀態標籤
- ✅ 良好 (綠色)
- ⚠️ 注意 (黃色)
- ❌ 不佳 (紅色)
- ➖ 無資料 (灰色)

### 4. 藥物標籤
- 💊 使用中藥物
- 依疾病分類顯示
- 劑量 + 頻次

---

## 五、導航結構

```
首頁 (Dashboard)
├── 病患資訊
├── 疾病卡片列表 (依診斷動態顯示)
│   ├── 糖尿病 → 糖尿病詳細頁
│   ├── 高血壓 → 高血壓詳細頁
│   ├── 心衰竭 → 心衰竭詳細頁
│   ├── 高血脂 → 高血脂詳細頁
│   ├── 慢性腎病 → CKD 詳細頁
│   ├── 心房顫動 → AF 詳細頁
│   └── COPD → COPD 詳細頁
├── 共用指標摘要
└── 用藥總覽 → 完整用藥列表
```

---

## 六、技術實作重點

### FHIR Query 策略
1. 首先查詢 Condition 取得所有診斷
2. 根據診斷動態決定要查詢哪些 Observation
3. 使用 $everything 或批次查詢減少 API 呼叫

### 狀態判斷邏輯
- 各指標依臨床指引設定閾值
- 考慮個人化目標 (年齡、共病等)
- 顯示最近一次數值 + 趨勢

### 藥物分類
- 維護藥物-疾病對應表
- 依 RxNorm 或藥名關鍵字分類
- 支援多疾病共用藥物標示
