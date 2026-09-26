import type { Guarding, LabValue, Note, RegionFinding, Tender } from '../../engine/types'

/** Region finding shorthand: r(light, deep, guarding, extras) */
export function r(light: Tender, deep: Tender, guarding: Guarding = 'none', extra: Partial<RegionFinding> = {}): RegionFinding {
  return { light, deep, guarding, rebound: false, percussionTender: false, note: 'tympanic', ...extra }
}

/** Percussion-only override */
export function note(n: Note, extra: Partial<RegionFinding> = {}): RegionFinding {
  return { light: 0, deep: 0, guarding: 'none', rebound: false, percussionTender: false, note: n, ...extra }
}

/** Lab value shorthand */
export function lab(name: string, value: string | number, unit: string, range: string, flag?: LabValue['flag']): LabValue {
  return { name, value: String(value), unit, range, flag }
}

export const FBC = (hb: number, wcc: number, neut: number, plt: number, mcv = 88, sex: 'male' | 'female' = 'male'): LabValue[] => [
  lab('Haemoglobin', hb, 'g/L', sex === 'male' ? '130–170' : '115–155', hb < (sex === 'male' ? 130 : 115) ? 'L' : undefined),
  lab('White cells', wcc, '×10⁹/L', '4.0–11.0', wcc > 11 ? 'H' : wcc < 4 ? 'L' : undefined),
  lab('Neutrophils', neut, '×10⁹/L', '2.0–7.5', neut > 7.5 ? 'H' : neut < 2 ? 'L' : undefined),
  lab('Platelets', plt, '×10⁹/L', '150–400', plt > 400 ? 'H' : plt < 150 ? 'L' : undefined),
  lab('MCV', mcv, 'fL', '80–100', mcv > 100 ? 'H' : mcv < 80 ? 'L' : undefined),
]

export const UE = (na: number, k: number, urea: number, creat: number, egfr: string, sex: 'male' | 'female' = 'male'): LabValue[] => [
  lab('Sodium', na, 'mmol/L', '135–145', na < 135 ? 'L' : na > 145 ? 'H' : undefined),
  lab('Potassium', k, 'mmol/L', '3.5–5.3', k < 3.5 ? 'L' : k > 5.3 ? 'H' : undefined),
  lab('Urea', urea, 'mmol/L', '2.5–7.8', urea > 7.8 ? 'H' : undefined),
  lab('Creatinine', creat, 'µmol/L', sex === 'male' ? '60–110' : '45–90', creat > (sex === 'male' ? 110 : 90) ? 'H' : undefined),
  lab('eGFR', egfr, 'mL/min/1.73m²', '> 90', /^[0-8]\d?$/.test(egfr) ? 'L' : undefined),
]

export const LFT = (bili: number, alt: number, alp: number, ggt: number, alb: number): LabValue[] => [
  lab('Bilirubin', bili, 'µmol/L', '< 21', bili > 21 ? 'H' : undefined),
  lab('ALT', alt, 'U/L', '< 40', alt > 40 ? 'H' : undefined),
  lab('ALP', alp, 'U/L', '30–130', alp > 130 ? 'H' : undefined),
  lab('GGT', ggt, 'U/L', '< 60', ggt > 60 ? 'H' : undefined),
  lab('Albumin', alb, 'g/L', '35–50', alb < 35 ? 'L' : undefined),
]

export const CRP = (v: number): LabValue[] => [lab('CRP', v, 'mg/L', '< 5', v > 5 ? 'H' : undefined)]

export const VBG = (ph: number, hco3: number, be: number, lactate: number, k?: number, glucose?: number): LabValue[] =>
  [
    lab('pH', ph.toFixed(2), '', '7.35–7.45', ph < 7.35 ? 'L' : ph > 7.45 ? 'H' : undefined),
    lab('HCO₃⁻', hco3, 'mmol/L', '22–29', hco3 < 22 ? 'L' : hco3 > 29 ? 'H' : undefined),
    lab('Base excess', be, 'mmol/L', '−2 to +2', be < -2 ? 'L' : be > 2 ? 'H' : undefined),
    lab('Lactate', lactate, 'mmol/L', '0.5–2.0', lactate > 2 ? 'H' : undefined),
    k !== undefined ? lab('K⁺', k, 'mmol/L', '3.5–5.3', k < 3.5 ? 'L' : k > 5.3 ? 'H' : undefined) : null,
    glucose !== undefined ? lab('Glucose', glucose, 'mmol/L', '4.0–7.8', glucose > 7.8 ? 'H' : undefined) : null,
  ].filter(Boolean) as LabValue[]

export const COAG = (pt: number, inr: number, aptt: number): LabValue[] => [
  lab('PT', pt, 's', '10–13', pt > 13 ? 'H' : undefined),
  lab('INR', inr, '', '0.8–1.2', inr > 1.2 ? 'H' : undefined),
  lab('APTT', aptt, 's', '25–35', aptt > 35 ? 'H' : undefined),
]
