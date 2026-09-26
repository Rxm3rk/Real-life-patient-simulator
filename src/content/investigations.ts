import type { CaseDef, InvestigationResult, LabValue } from '../engine/types'

export type InvCategory = 'Bedside' | 'Bloods' | 'Imaging' | 'Endoscopy & tissue'

export interface InvDef {
  id: string
  name: string
  short?: string
  cat: InvCategory
  /** Minutes until the result would be available on a real ward */
  tat: number
  sex?: 'female' | 'male'
  /** Generates a normal result when the case doesn't specify one */
  normal: (c: CaseDef) => InvestigationResult
}

const v = (name: string, value: string, unit: string, range: string, flag?: LabValue['flag']): LabValue => ({ name, value, unit, range, flag })

export const INVESTIGATIONS: InvDef[] = [
  /* Bedside */
  {
    id: 'urine-dip',
    name: 'Urine dipstick',
    cat: 'Bedside',
    tat: 2,
    normal: () => ({ report: 'Blood −, Leucocytes −, Nitrites −, Protein −, Glucose −, Ketones −.', interpretation: 'Normal urinalysis.' }),
  },
  {
    id: 'urine-hcg',
    name: 'Urine β-hCG (pregnancy test)',
    short: 'Urine β-hCG',
    cat: 'Bedside',
    tat: 5,
    sex: 'female',
    normal: () => ({ report: 'Negative.', interpretation: 'Not pregnant.' }),
  },
  { id: 'bm', name: 'Capillary blood glucose', short: 'CBG', cat: 'Bedside', tat: 1, normal: () => ({ report: '5.8 mmol/L', interpretation: 'Normal.' }) },
  {
    id: 'ecg',
    name: '12-lead ECG',
    short: 'ECG',
    cat: 'Bedside',
    tat: 5,
    normal: (c) => ({ report: `Sinus ${c.vitals.hr > 100 ? 'tachycardia' : 'rhythm'}, rate ${c.vitals.hr}. Normal axis. No acute ST-segment changes.`, interpretation: c.vitals.hr > 100 ? 'Sinus tachycardia.' : 'Normal ECG.' }),
  },
  {
    id: 'vbg',
    name: 'Venous blood gas (with lactate)',
    short: 'VBG',
    cat: 'Bedside',
    tat: 5,
    normal: () => ({
      values: [v('pH', '7.38', '', '7.35–7.45'), v('pCO₂', '5.9', 'kPa', '5.5–6.8'), v('HCO₃⁻', '25', 'mmol/L', '22–29'), v('Base excess', '0.4', 'mmol/L', '−2 to +2'), v('Lactate', '1.1', 'mmol/L', '0.5–2.0'), v('K⁺', '4.1', 'mmol/L', '3.5–5.3'), v('Glucose', '5.9', 'mmol/L', '4.0–7.8')],
      interpretation: 'Normal gas; normal lactate.',
    }),
  },
  {
    id: 'abg',
    name: 'Arterial blood gas',
    short: 'ABG',
    cat: 'Bedside',
    tat: 5,
    normal: () => ({
      values: [v('pH', '7.41', '', '7.35–7.45'), v('pO₂', '12.8', 'kPa', '> 10'), v('pCO₂', '5.1', 'kPa', '4.7–6.0'), v('HCO₃⁻', '24', 'mmol/L', '22–26'), v('Lactate', '1.0', 'mmol/L', '0.5–2.0')],
      interpretation: 'Normal ABG.',
    }),
  },

  /* Bloods */
  {
    id: 'fbc',
    name: 'Full blood count',
    short: 'FBC',
    cat: 'Bloods',
    tat: 60,
    normal: (c) => ({
      values: [
        v('Haemoglobin', c.patient.sex === 'male' ? '146' : '132', 'g/L', c.patient.sex === 'male' ? '130–170' : '115–155'),
        v('White cells', '7.2', '×10⁹/L', '4.0–11.0'),
        v('Neutrophils', '4.4', '×10⁹/L', '2.0–7.5'),
        v('Platelets', '262', '×10⁹/L', '150–400'),
        v('MCV', '88', 'fL', '80–100'),
      ],
      interpretation: 'Normal FBC.',
    }),
  },
  {
    id: 'ue',
    name: 'Urea & electrolytes',
    short: 'U&E',
    cat: 'Bloods',
    tat: 60,
    normal: (c) => ({
      values: [
        v('Sodium', '139', 'mmol/L', '135–145'),
        v('Potassium', '4.2', 'mmol/L', '3.5–5.3'),
        v('Urea', '5.1', 'mmol/L', '2.5–7.8'),
        v('Creatinine', c.patient.sex === 'male' ? '84' : '68', 'µmol/L', c.patient.sex === 'male' ? '60–110' : '45–90'),
        v('eGFR', '> 90', 'mL/min/1.73m²', '> 90'),
      ],
      interpretation: 'Normal renal function.',
    }),
  },
  {
    id: 'lft',
    name: 'Liver function tests',
    short: 'LFTs',
    cat: 'Bloods',
    tat: 60,
    normal: () => ({
      values: [v('Bilirubin', '11', 'µmol/L', '< 21'), v('ALT', '24', 'U/L', '< 40'), v('ALP', '78', 'U/L', '30–130'), v('GGT', '28', 'U/L', '< 60'), v('Albumin', '41', 'g/L', '35–50')],
      interpretation: 'Normal LFTs.',
    }),
  },
  { id: 'crp', name: 'C-reactive protein', short: 'CRP', cat: 'Bloods', tat: 60, normal: () => ({ values: [v('CRP', '3', 'mg/L', '< 5')], interpretation: 'No inflammatory response.' }) },
  { id: 'amylase', name: 'Serum amylase / lipase', short: 'Amylase', cat: 'Bloods', tat: 60, normal: () => ({ values: [v('Amylase', '64', 'U/L', '30–110'), v('Lipase', '38', 'U/L', '< 60')], interpretation: 'Normal.' }) },
  {
    id: 'coag',
    name: 'Clotting screen',
    short: 'Clotting',
    cat: 'Bloods',
    tat: 60,
    normal: () => ({ values: [v('PT', '11.8', 's', '10–13'), v('INR', '1.0', '', '0.8–1.2'), v('APTT', '29', 's', '25–35'), v('Fibrinogen', '3.1', 'g/L', '1.5–4.0')], interpretation: 'Normal coagulation.' }),
  },
  { id: 'gs', name: 'Group & save', short: 'G&S', cat: 'Bloods', tat: 45, normal: () => ({ report: 'Group A RhD positive. Antibody screen negative. Sample valid for 72 hours.' }) },
  { id: 'xm', name: 'Crossmatch (4 units)', short: 'Crossmatch', cat: 'Bloods', tat: 45, normal: () => ({ report: '4 units of red cells crossmatched and available in the blood bank.' }) },
  { id: 'lactate', name: 'Serum lactate', short: 'Lactate', cat: 'Bloods', tat: 10, normal: () => ({ values: [v('Lactate', '1.2', 'mmol/L', '0.5–2.0')], interpretation: 'Normal lactate.' }) },
  { id: 'cultures', name: 'Blood cultures', short: 'Cultures', cat: 'Bloods', tat: 2880, normal: () => ({ report: 'Sent. No growth reported at 48 hours.' }) },
  { id: 'calcium', name: 'Bone profile (adjusted calcium)', short: 'Calcium', cat: 'Bloods', tat: 60, normal: () => ({ values: [v('Adjusted calcium', '2.36', 'mmol/L', '2.20–2.60'), v('Phosphate', '1.1', 'mmol/L', '0.8–1.5')], interpretation: 'Normal.' }) },
  { id: 'glucose', name: 'Serum glucose', short: 'Glucose', cat: 'Bloods', tat: 60, normal: () => ({ values: [v('Glucose (random)', '6.1', 'mmol/L', '4.0–7.8')], interpretation: 'Normal.' }) },
  { id: 'lipids', name: 'Lipid profile & HbA1c', short: 'Lipids/HbA1c', cat: 'Bloods', tat: 120, normal: () => ({ values: [v('Total cholesterol', '4.6', 'mmol/L', '< 5.0'), v('LDL', '2.7', 'mmol/L', '< 3.0'), v('HbA1c', '38', 'mmol/mol', '< 42')], interpretation: 'Normal.' }) },
  {
    id: 'tft',
    name: 'Thyroid function tests',
    short: 'TFTs',
    cat: 'Bloods',
    tat: 120,
    normal: () => ({ values: [v('TSH', '1.8', 'mU/L', '0.3–4.2'), v('Free T4', '15.2', 'pmol/L', '12–22'), v('Free T3', '4.6', 'pmol/L', '3.1–6.8')], interpretation: 'Euthyroid.' }),
  },
  { id: 'troponin', name: 'High-sensitivity troponin', short: 'Troponin', cat: 'Bloods', tat: 60, normal: () => ({ values: [v('hs-Troponin T', '6', 'ng/L', '< 14')], interpretation: 'Normal.' }) },
  { id: 'ca199', name: 'CA 19-9', cat: 'Bloods', tat: 1440, normal: () => ({ values: [v('CA 19-9', '14', 'U/mL', '< 37')], interpretation: 'Normal.' }) },
  { id: 'cea', name: 'Carcinoembryonic antigen (CEA)', short: 'CEA', cat: 'Bloods', tat: 1440, normal: () => ({ values: [v('CEA', '2.1', 'µg/L', '< 5')], interpretation: 'Normal.' }) },
  {
    id: 'testis-markers',
    name: 'Testicular tumour markers (AFP, β-hCG, LDH)',
    short: 'AFP/β-hCG/LDH',
    cat: 'Bloods',
    tat: 1440,
    sex: 'male',
    normal: () => ({ values: [v('AFP', '3', 'kU/L', '< 10'), v('β-hCG', '< 2', 'IU/L', '< 5'), v('LDH', '168', 'U/L', '135–225')], interpretation: 'Normal markers.' }),
  },
  { id: 'bhcg-serum', name: 'Serum β-hCG', cat: 'Bloods', tat: 60, sex: 'female', normal: () => ({ values: [v('β-hCG', '< 2', 'IU/L', '< 5 (non-pregnant)')], interpretation: 'Not pregnant.' }) },

  /* Imaging */
  { id: 'cxr-erect', name: 'Erect chest X-ray', short: 'Erect CXR', cat: 'Imaging', tat: 30, normal: () => ({ report: 'Clear lung fields. No free gas under the diaphragm. Normal cardiac silhouette.', interpretation: 'No pneumoperitoneum.', image: 'cxr-normal' }) },
  { id: 'axr', name: 'Abdominal X-ray (supine)', short: 'AXR', cat: 'Imaging', tat: 30, normal: () => ({ report: 'Normal bowel gas pattern. No dilated loops. No abnormal calcification.', interpretation: 'Normal AXR.', image: 'axr-normal' }) },
  { id: 'us-abdo', name: 'Ultrasound abdomen', short: 'US abdomen', cat: 'Imaging', tat: 240, normal: () => ({ report: 'Normal liver echotexture. Thin-walled gallbladder without calculi. CBD 4 mm. Pancreas partly obscured by bowel gas. Kidneys normal. No free fluid.', interpretation: 'Normal abdominal ultrasound.' }) },
  { id: 'us-pelvis', name: 'Pelvic ultrasound (transvaginal)', short: 'Pelvic US', cat: 'Imaging', tat: 240, sex: 'female', normal: () => ({ report: 'Normal uterus and ovaries. No adnexal mass. No free fluid.', interpretation: 'Normal pelvic ultrasound.' }) },
  { id: 'us-groin', name: 'Ultrasound of the groin', short: 'US groin', cat: 'Imaging', tat: 1440, normal: () => ({ report: 'No hernia demonstrated at rest or on Valsalva.', interpretation: 'No hernia.' }) },
  { id: 'us-neck', name: 'Ultrasound thyroid / neck', short: 'US neck', cat: 'Imaging', tat: 1440, normal: () => ({ report: 'Normal-sized thyroid with homogeneous echotexture. No nodules. No cervical lymphadenopathy.', interpretation: 'Normal.' }) },
  { id: 'us-breast', name: 'Breast ultrasound', short: 'US breast', cat: 'Imaging', tat: 60, sex: 'female', normal: () => ({ report: 'No focal abnormality. Axilla normal.', interpretation: 'Normal (U1).' }) },
  { id: 'mammo', name: 'Mammogram', cat: 'Imaging', tat: 60, sex: 'female', normal: () => ({ report: 'No mass, suspicious calcification or architectural distortion.', interpretation: 'Normal (M1).' }) },
  { id: 'us-scrotal', name: 'Scrotal ultrasound with Doppler', short: 'US scrotum', cat: 'Imaging', tat: 240, sex: 'male', normal: () => ({ report: 'Both testes normal in size and echotexture with normal colour Doppler flow. Epididymes normal. No hydrocele.', interpretation: 'Normal.' }) },
  { id: 'duplex-art', name: 'Arterial duplex (lower limb)', short: 'Arterial duplex', cat: 'Imaging', tat: 1440, normal: () => ({ report: 'Triphasic waveforms throughout. No significant stenosis.', interpretation: 'Normal arterial duplex.' }) },
  { id: 'duplex-venous', name: 'Venous duplex (lower limb)', short: 'Venous duplex', cat: 'Imaging', tat: 1440, normal: () => ({ report: 'Deep veins patent and compressible. Competent saphenofemoral and saphenopopliteal junctions. No reflux.', interpretation: 'Normal venous duplex.' }) },
  { id: 'abpi', name: 'Ankle–brachial pressure index', short: 'ABPI', cat: 'Bedside', tat: 20, normal: () => ({ report: 'ABPI right 1.05, left 1.02.', interpretation: 'Normal (0.9–1.3).' }) },
  { id: 'ct-ap', name: 'CT abdomen & pelvis (IV contrast)', short: 'CT A/P', cat: 'Imaging', tat: 120, normal: () => ({ report: 'No acute intra-abdominal pathology.', interpretation: 'Normal CT.' }) },
  { id: 'cta', name: 'CT angiogram (aorta / mesenteric)', short: 'CT angiogram', cat: 'Imaging', tat: 90, normal: () => ({ report: 'Normal-calibre aorta. Patent coeliac, SMA and IMA. No aneurysm or dissection.', interpretation: 'Normal CTA.' }) },
  { id: 'ct-kub', name: 'CT KUB (non-contrast)', short: 'CT KUB', cat: 'Imaging', tat: 120, normal: () => ({ report: 'No urinary tract calculi. No hydronephrosis.', interpretation: 'Normal CT KUB.' }) },
  { id: 'ct-cap', name: 'CT chest, abdomen & pelvis (staging)', short: 'CT CAP', cat: 'Imaging', tat: 1440, normal: () => ({ report: 'No evidence of metastatic disease.', interpretation: 'Normal staging CT.' }) },
  { id: 'mrcp', name: 'MRCP', cat: 'Imaging', tat: 1440, normal: () => ({ report: 'Normal-calibre biliary tree. No filling defect in the common bile duct.', interpretation: 'Normal MRCP.' }) },

  /* Endoscopy & tissue */
  { id: 'ogd', name: 'Upper GI endoscopy (OGD)', short: 'OGD', cat: 'Endoscopy & tissue', tat: 1440, normal: () => ({ report: 'Normal oesophagus, stomach and duodenum.', interpretation: 'Normal OGD.' }) },
  { id: 'colonoscopy', name: 'Colonoscopy', cat: 'Endoscopy & tissue', tat: 2880, normal: () => ({ report: 'Complete colonoscopy to the caecum. Normal mucosa.', interpretation: 'Normal colonoscopy.' }) },
  { id: 'flexi', name: 'Flexible sigmoidoscopy', short: 'Flexi sig', cat: 'Endoscopy & tissue', tat: 1440, normal: () => ({ report: 'Normal to the splenic flexure.', interpretation: 'Normal.' }) },
  { id: 'ercp', name: 'ERCP', cat: 'Endoscopy & tissue', tat: 1440, normal: () => ({ report: 'Normal cholangiogram.', interpretation: 'Normal.' }) },
  { id: 'fna', name: 'Fine-needle aspiration (cytology)', short: 'FNA', cat: 'Endoscopy & tissue', tat: 4320, normal: () => ({ report: 'Benign cytology.', interpretation: 'Benign.' }) },
  { id: 'core', name: 'Image-guided core biopsy', short: 'Core biopsy', cat: 'Endoscopy & tissue', tat: 4320, normal: () => ({ report: 'Benign tissue.', interpretation: 'Benign (B2).' }) },
]

export const INV_BY_ID: Record<string, InvDef> = Object.fromEntries(INVESTIGATIONS.map((i) => [i.id, i]))

export function resultFor(id: string, c: CaseDef): InvestigationResult {
  return c.investigations[id] ?? INV_BY_ID[id]?.normal(c) ?? { report: 'Result unavailable.' }
}

export function formatTat(min: number): string {
  if (min < 60) return `${min} min`
  if (min < 1440) return `${Math.round(min / 60)} h`
  return `${Math.round(min / 1440)} d`
}
