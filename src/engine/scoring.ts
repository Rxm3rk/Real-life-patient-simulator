import { DIAG_BY_ID } from '../content/diagnoses'
import { INTENT_BY_ID } from '../content/intents'
import { INV_BY_ID } from '../content/investigations'
import { MGMT_BY_ID } from '../content/management'
import { abdoFindings } from './abdo'
import type { EncounterState } from './encounter'
import { protocolFor } from './protocols'
import type { CaseDef } from './types'

export interface ScoreItem {
  id: string
  label: string
  earned: number
  max: number
  note?: string
  critical?: boolean
  section?: string
}

export interface Domain {
  id: 'communication' | 'history' | 'examination' | 'investigations' | 'diagnosis' | 'management' | 'viva'
  label: string
  earned: number
  max: number
  items: ScoreItem[]
}

export interface Violation {
  id: string
  message: string
  penalty: number
}

export type Grade = 'Excellent' | 'Good pass' | 'Pass' | 'Borderline' | 'Fail'

export interface Result {
  pct: number
  grade: Grade
  domains: Domain[]
  violations: Violation[]
  criticalMissed: string[]
  strengths: string[]
  improvements: string[]
  durationSec: number
}

const WEIGHTS: Record<Domain['id'], number> = {
  communication: 0.14,
  history: 0.22,
  examination: 0.3,
  investigations: 0.1,
  diagnosis: 0.14,
  management: 0.1,
  viva: 0,
}

const intentLabel = (id: string) => INTENT_BY_ID[id]?.q ?? id

export function scoreHistory(c: CaseDef, s: EncounterState): { history: Domain; comm: ScoreItem[]; critical: string[] } {
  const asked = new Set(s.asked)
  const items: ScoreItem[] = []
  const comm: ScoreItem[] = []

  comm.push({ id: 'hx.intro', label: 'Introduced self (name & role)', earned: asked.has('comm.intro') ? 1 : 0, max: 1 })
  comm.push({ id: 'hx.identity', label: 'Confirmed patient identity', earned: asked.has('comm.identity') ? 1 : 0, max: 1 })
  comm.push({ id: 'hx.consent', label: 'Gained consent to take a history', earned: asked.has('comm.consent') ? 0.5 : 0, max: 0.5 })
  const firstClinical = s.asked.find((a) => !a.startsWith('comm.') || a === 'comm.open')
  comm.push({
    id: 'hx.open',
    label: 'Started with an open question',
    earned: firstClinical === 'comm.open' ? 1 : asked.has('comm.open') ? 0.5 : 0,
    max: 1,
    note: firstClinical && firstClinical !== 'comm.open' ? 'Begin with “What’s brought you in today?” and let the patient talk before closed questions.' : undefined,
  })
  const ice = ['ice.ideas', 'ice.concerns', 'ice.expectations'].filter((i) => asked.has(i)).length
  comm.push({ id: 'hx.ice', label: 'Explored ideas, concerns and expectations', earned: ice >= 2 ? 1 : ice === 1 ? 0.5 : 0, max: 1 })
  if ((c.vitals.pain ?? 0) >= 5)
    comm.push({
      id: 'hx.analgesia',
      label: 'Offered analgesia to a patient in pain',
      earned: asked.has('comm.analgesia') || s.analgesia ? 1 : 0,
      max: 1,
    })
  if (['anxious', 'distressed'].includes(c.patient.persona.mood))
    comm.push({ id: 'hx.empathy', label: 'Acknowledged distress with empathy', earned: asked.has('comm.empathy') ? 0.5 : 0, max: 0.5 })
  comm.push({ id: 'hx.summary', label: 'Summarised back to the patient', earned: asked.has('comm.summary') ? 1 : 0, max: 1 })
  comm.push({ id: 'hx.questions', label: 'Invited questions', earned: asked.has('comm.questions') ? 0.5 : 0, max: 0.5 })

  const critical = new Set(c.history.critical ?? [])
  for (const k of c.history.key) {
    items.push({ id: k, label: intentLabel(k), earned: asked.has(k) ? 1 : 0, max: 1, critical: critical.has(k) })
  }
  for (const k of critical) if (!c.history.key.includes(k)) items.push({ id: k, label: intentLabel(k), earned: asked.has(k) ? 1 : 0, max: 1, critical: true })

  const criticalMissed = [...critical].filter((k) => !asked.has(k)).map((k) => `History: ${intentLabel(k)}`)
  return {
    history: { id: 'history', label: 'History taking', earned: sum(items, 'earned'), max: sum(items, 'max'), items },
    comm,
    critical: criticalMissed,
  }
}

export function scoreExam(c: CaseDef, s: EncounterState): { exam: Domain; prep: ScoreItem[]; violations: Violation[]; critical: string[] } {
  const f = abdoFindings(c)
  const proto = protocolFor(c.exam)
  const x = { c, f, log: s.log, asked: new Set(s.asked), ordered: new Set(s.ordered) }
  const crit = new Set(c.criticalSteps ?? [])
  const prep: ScoreItem[] = []
  const items: ScoreItem[] = []
  for (const st of proto.steps) {
    if (st.applies && !st.applies(x)) continue
    const d = st.done(x)
    const frac = typeof d === 'number' ? Math.max(0, Math.min(1, d)) : d ? 1 : 0
    const it: ScoreItem = { id: st.id, label: st.label, earned: Math.round(frac * st.marks * 100) / 100, max: st.marks, critical: crit.has(st.id), section: st.section, note: frac < 1 ? st.why : undefined }
    if (st.section === 'Preparation' || st.id === 'end.thank' || st.id === 'end.wash') prep.push(it)
    else items.push(it)
  }
  // pulse counting accuracy (only when the student counted it themselves)
  if (s.pulseEstimate !== undefined) {
    const err = Math.abs(s.pulseEstimate - c.vitals.hr) / c.vitals.hr
    items.push({
      id: 'pulse.accuracy',
      label: `Pulse count accurate (you: ${s.pulseEstimate}, actual: ${c.vitals.hr})`,
      earned: err <= 0.1 ? 1 : err <= 0.2 ? 0.5 : 0,
      max: 1,
      section: 'Hands & arms',
    })
  }
  const violations = proto.rules.filter((r) => r.violated(x)).map((r) => ({ id: r.id, message: r.message, penalty: r.penalty }))
  const penalty = violations.reduce((a, v) => a + v.penalty, 0)
  const earned = Math.max(0, sum(items, 'earned') - penalty * 0.5)
  const critical = [...items, ...prep].filter((i) => i.critical && i.earned < i.max * 0.99).map((i) => `Examination: ${i.label}`)
  return {
    exam: { id: 'examination', label: 'Examination', earned, max: sum(items, 'max'), items },
    prep,
    violations,
    critical,
  }
}

export function scoreInvestigations(c: CaseDef, s: EncounterState): { d: Domain; critical: string[] } {
  const ordered = new Set(s.ordered)
  const items: ScoreItem[] = []
  const r = c.investigationRubric
  for (const e of r.essential) items.push({ id: e.id, label: INV_BY_ID[e.id]?.name ?? e.id, earned: ordered.has(e.id) ? 2 : 0, max: 2, note: e.why, critical: true })
  for (const h of r.helpful ?? []) items.push({ id: h.id, label: INV_BY_ID[h.id]?.name ?? h.id, earned: ordered.has(h.id) ? 1 : 0, max: 1, note: h.why })
  for (const a of r.avoid ?? [])
    if (ordered.has(a.id)) items.push({ id: a.id, label: `Avoid: ${INV_BY_ID[a.id]?.name ?? a.id}`, earned: -2, max: 0, note: a.why })
  const critical = r.essential.filter((e) => !ordered.has(e.id) && e.why?.startsWith('!')).map((e) => `Investigations: ${INV_BY_ID[e.id]?.name ?? e.id}`)
  return { d: { id: 'investigations', label: 'Investigations', earned: Math.max(0, sum(items, 'earned')), max: sum(items, 'max'), items }, critical }
}

export function scoreDiagnosis(c: CaseDef, s: EncounterState): Domain {
  const items: ScoreItem[] = []
  const correct = [c.diagnosis.correct, ...(c.diagnosis.accept ?? [])]
  const primaryOk = !!s.diagnosis && correct.includes(s.diagnosis)
  const primaryIsDiff = !!s.diagnosis && c.diagnosis.differentials.includes(s.diagnosis)
  items.push({
    id: 'dx.primary',
    label: `Working diagnosis: ${DIAG_BY_ID[c.diagnosis.correct]?.name ?? c.diagnosis.correct}`,
    earned: primaryOk ? 4 : primaryIsDiff ? 1 : 0,
    max: 4,
    note: s.diagnosis && !primaryOk ? `You chose: ${DIAG_BY_ID[s.diagnosis]?.name ?? s.diagnosis}` : undefined,
  })
  const diffs = new Set([...s.differentials, ...(s.diagnosis ? [s.diagnosis] : [])])
  const key = c.diagnosis.differentials.slice(0, 4)
  for (const d of key) items.push({ id: `dx.${d}`, label: `Differential: ${DIAG_BY_ID[d]?.name ?? d}`, earned: diffs.has(d) ? 0.75 : 0, max: 0.75 })
  return { id: 'diagnosis', label: 'Diagnosis & reasoning', earned: sum(items, 'earned'), max: sum(items, 'max'), items }
}

export function scoreManagement(c: CaseDef, s: EncounterState): { d: Domain; critical: string[] } {
  const chosen = new Set(s.management)
  const items: ScoreItem[] = []
  for (const e of c.management.essential) items.push({ id: e.id, label: MGMT_BY_ID[e.id]?.label ?? e.id, earned: chosen.has(e.id) ? 2 : 0, max: 2, note: e.why, critical: e.why?.startsWith('!') })
  for (const h of c.management.helpful ?? []) items.push({ id: h.id, label: MGMT_BY_ID[h.id]?.label ?? h.id, earned: chosen.has(h.id) ? 1 : 0, max: 1, note: h.why })
  for (const a of c.management.avoid ?? [])
    if (chosen.has(a.id)) items.push({ id: a.id, label: `Avoid: ${MGMT_BY_ID[a.id]?.label ?? a.id}`, earned: -2, max: 0, note: a.why })
  const critical = c.management.essential.filter((e) => e.why?.startsWith('!') && !chosen.has(e.id)).map((e) => `Management: ${MGMT_BY_ID[e.id]?.label ?? e.id}`)
  return { d: { id: 'management', label: 'Management', earned: Math.max(0, sum(items, 'earned')), max: sum(items, 'max'), items }, critical }
}

export function scoreViva(c: CaseDef, s: EncounterState): Domain {
  const items: ScoreItem[] = c.viva.map((q) => {
    const a = s.viva[q.id]
    let earned = 0
    if (q.options && q.correct !== undefined) earned = a?.choice === q.correct ? 1 : 0
    else earned = a?.self ?? 0
    return { id: q.id, label: q.q, earned, max: 1 }
  })
  return { id: 'viva', label: 'Viva', earned: sum(items, 'earned'), max: sum(items, 'max'), items }
}

export function computeResult(c: CaseDef, s: EncounterState): Result {
  const domains: Domain[] = []
  const critical: string[] = []
  const comps = new Set(s.components)
  let violations: Violation[] = []
  const commItems: ScoreItem[] = []

  if (comps.has('history')) {
    const h = scoreHistory(c, s)
    domains.push(h.history)
    commItems.push(...h.comm)
    critical.push(...h.critical)
  }
  if (comps.has('exam')) {
    const e = scoreExam(c, s)
    domains.push(e.exam)
    commItems.push(...e.prep)
    violations = e.violations
    critical.push(...e.critical)
  }
  if (commItems.length) {
    domains.unshift({ id: 'communication', label: 'Communication & professionalism', earned: sum(commItems, 'earned'), max: sum(commItems, 'max'), items: commItems })
  }
  if (comps.has('investigations')) {
    const i = scoreInvestigations(c, s)
    domains.push(i.d)
    critical.push(...i.critical)
  }
  if (comps.has('diagnosis')) {
    domains.push(scoreDiagnosis(c, s))
    const m = scoreManagement(c, s)
    domains.push(m.d)
    critical.push(...m.critical)
  }
  if (comps.has('viva') && c.viva.length) domains.push(scoreViva(c, s))

  let wsum = 0
  let acc = 0
  for (const d of domains) {
    const w = WEIGHTS[d.id]
    if (!w || d.max <= 0) continue
    wsum += w
    acc += w * Math.max(0, Math.min(1, d.earned / d.max))
  }
  const pct = wsum ? acc / wsum : 0
  let grade: Grade = pct >= 0.85 ? 'Excellent' : pct >= 0.72 ? 'Good pass' : pct >= 0.6 ? 'Pass' : pct >= 0.48 ? 'Borderline' : 'Fail'
  if (critical.length && (grade === 'Excellent' || grade === 'Good pass' || grade === 'Pass')) grade = 'Borderline'

  const strengths: string[] = []
  const improvements: string[] = []
  for (const d of domains) {
    const r = d.max ? d.earned / d.max : 1
    if (r >= 0.85) strengths.push(`${d.label}: ${Math.round(r * 100)}%`)
    else if (r < 0.6) improvements.push(`${d.label}: ${Math.round(r * 100)}%`)
  }

  return {
    pct,
    grade,
    domains,
    violations,
    criticalMissed: critical,
    strengths,
    improvements,
    durationSec: Math.round(((s.finishedAt ?? Date.now()) - s.startedAt) / 1000),
  }
}

function sum(items: ScoreItem[], k: 'earned' | 'max') {
  return Math.round(items.reduce((a, i) => a + i[k], 0) * 100) / 100
}
