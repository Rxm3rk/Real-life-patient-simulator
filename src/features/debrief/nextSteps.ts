import { topicsForCase, type Topic } from '../../content/curriculum'
import { DIAG_BY_ID } from '../../content/diagnoses'
import type { EncounterState } from '../../engine/encounter'
import type { Domain, Result } from '../../engine/scoring'
import type { CaseDef } from '../../engine/types'
import { ROUTINE_BY_KIND } from '../learn/routines'

export interface NextStep {
  id: string
  kind: 'diagnosis' | 'examination' | 'history' | 'investigations' | 'management' | 'sequence' | 'quiz'
  title: string
  /** The specific things missed, in the student's own attempt */
  detail?: string
  to: string
  cta: string
}

/** Below this a domain earns a "work on this" step. */
const WEAK = 0.7

const pct = (d?: Domain) => (d && d.max > 0 ? d.earned / d.max : 1)
const missed = (d: Domain | undefined, n = 3) =>
  (d?.items ?? [])
    .filter((i) => i.max > 0 && i.earned < i.max * 0.99)
    .sort((a, b) => Number(!!b.critical) - Number(!!a.critical) || b.max - a.max)
    .slice(0, n)
    .map((i) => i.label.replace(/^(Differential|Working diagnosis): /, ''))
const list = (xs: string[]) => (xs.length ? xs.join(' · ') : undefined)

/** The guide section for a part of the case, falling back to the guide itself. */
function guide(topic: Topic | undefined, key: string): string | null {
  if (!topic) return null
  const sec = topic.sections.find((s) => s.id === key) ?? topic.sections.find((s) => s.id.startsWith(key))
  return sec ? `/topic/${topic.id}?s=${sec.id}` : `/topic/${topic.id}`
}

/**
 * The three or four most useful things to do after this attempt, weakest first,
 * each pointing at the page that fixes it.
 */
export function nextSteps(c: CaseDef, r: Result, s: EncounterState, limit = 4): NextStep[] {
  const topic = topicsForCase(c.id)[0]
  const by = Object.fromEntries(r.domains.map((d) => [d.id, d])) as Partial<Record<Domain['id'], Domain>>
  const routine = ROUTINE_BY_KIND[c.exam]
  const out: (NextStep & { weight: number })[] = []

  // the diagnosis comes first when it was wrong — everything else follows from it
  if (s.components.includes('diagnosis')) {
    const ok = !!s.diagnosis && [c.diagnosis.correct, ...(c.diagnosis.accept ?? [])].includes(s.diagnosis)
    if (!ok)
      out.push({
        id: 'dx',
        kind: 'diagnosis',
        weight: 2,
        title: `Learn the picture of ${DIAG_BY_ID[c.diagnosis.correct]?.name ?? c.title}`,
        detail: c.teaching.keyFindings.slice(0, 3).join(' · '),
        to: topic ? `/topic/${topic.id}/case/${c.id}` : `/learn/routine/${c.exam}`,
        cta: topic ? 'Case card' : 'Routine',
      })
  }

  const exam = by.examination
  if (exam && pct(exam) < WEAK)
    out.push({
      id: 'exam',
      kind: 'examination',
      weight: 1 - pct(exam) + 0.15,
      title: `Revise the ${routine?.title.toLowerCase() ?? 'examination'}`,
      detail: list(missed(exam)),
      to: `/learn/routine/${c.exam}`,
      cta: 'Routine',
    })

  if (r.violations.length)
    out.push({
      id: 'seq',
      kind: 'sequence',
      weight: 0.5 + r.violations.length * 0.1,
      title: 'Get the order right',
      detail: r.violations[0].message,
      to: `/learn/drill/${c.exam}`,
      cta: 'Drill it',
    })

  const hx = by.history
  if (hx && pct(hx) < WEAK)
    out.push({
      id: 'hx',
      kind: 'history',
      weight: 1 - pct(hx),
      title: 'Ask the questions that matter',
      detail: list(missed(hx)),
      to: guide(topic, 'history') ?? '/ask',
      cta: 'History guide',
    })

  const inv = by.investigations
  if (inv && pct(inv) < WEAK)
    out.push({
      id: 'inv',
      kind: 'investigations',
      weight: 0.9 - pct(inv),
      title: 'Choose the tests that decide it',
      detail: list(missed(inv)),
      to: guide(topic, 'investigations') ?? `/topic/${topic?.id ?? ''}`,
      cta: 'Investigations',
    })

  const mx = by.management
  if (mx && pct(mx) < WEAK)
    out.push({
      id: 'mx',
      kind: 'management',
      weight: 0.9 - pct(mx),
      title: 'Plan the management',
      detail: list(missed(mx)),
      to: guide(topic, 'management') ?? (topic ? `/topic/${topic.id}/case/${c.id}` : '/learn'),
      cta: 'Management',
    })

  const steps = out.sort((a, b) => b.weight - a.weight).slice(0, limit - (topic ? 1 : 0))
  // and always: lock it in with the topic's questions
  if (topic) steps.push({ id: 'quiz', kind: 'quiz', weight: 0, title: `Quiz yourself on ${topic.title.toLowerCase()}`, detail: `${topic.qa.length} ward-round questions`, to: `/quiz?deck=topic:${topic.id}`, cta: 'Quiz me' })
  return steps.map((x) => ({ id: x.id, kind: x.kind, title: x.title, detail: x.detail, to: x.to, cta: x.cta }))
}
