import type { Vitals } from './types'

export interface News2 {
  score: number
  risk: 'low' | 'low–medium' | 'medium' | 'high'
  parts: Record<'rr' | 'spo2' | 'o2' | 'sbp' | 'hr' | 'avpu' | 'temp', number>
  notes: string[]
}

/** National Early Warning Score 2 (Royal College of Physicians, 2017), SpO₂ scale 1. */
export function news2(v: Vitals): News2 {
  const rr = v.rr <= 8 ? 3 : v.rr <= 11 ? 1 : v.rr <= 20 ? 0 : v.rr <= 24 ? 2 : 3
  const spo2 = v.spo2 <= 91 ? 3 : v.spo2 <= 93 ? 2 : v.spo2 <= 95 ? 1 : 0
  const o2 = v.o2 && !/air/i.test(v.o2) ? 2 : 0
  const sbp = v.sbp <= 90 ? 3 : v.sbp <= 100 ? 2 : v.sbp <= 110 ? 1 : v.sbp <= 219 ? 0 : 3
  const hr = v.hr <= 40 ? 3 : v.hr <= 50 ? 1 : v.hr <= 90 ? 0 : v.hr <= 110 ? 1 : v.hr <= 130 ? 2 : 3
  const avpu = !v.avpu || v.avpu === 'A' ? 0 : 3
  const temp = v.temp <= 35 ? 3 : v.temp <= 36 ? 1 : v.temp <= 38 ? 0 : v.temp <= 39 ? 1 : 2
  const parts = { rr, spo2, o2, sbp, hr, avpu, temp }
  const score = rr + spo2 + o2 + sbp + hr + avpu + temp
  const anyThree = Object.values(parts).some((p) => p === 3)
  const risk = score >= 7 ? 'high' : score >= 5 ? 'medium' : anyThree ? 'low–medium' : 'low'
  const notes: string[] = []
  if (risk === 'high') notes.push('Emergency response: immediate senior/critical-care review.')
  else if (risk === 'medium') notes.push('Urgent response: prompt review by a clinician with competence in acute illness.')
  else if (risk === 'low–medium') notes.push('A single parameter scoring 3 needs urgent ward-based review.')
  if (v.hr > v.sbp) notes.push('Shock index > 1 (HR > systolic BP) — think hypovolaemia or sepsis.')
  return { score, risk, parts, notes }
}
