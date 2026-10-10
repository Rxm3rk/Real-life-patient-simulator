import type { CaseDef } from '../engine/types'
import { isDue, type CardState } from '../lib/srs'
import { CASES } from './cases'
import { GENERAL_QA, sessionsOn, TOPIC_BY_ID, TOPICS, type TopicId } from './curriculum'

/**
 * The question bank as flashcards: every ward-round question in the twelve
 * session guides, the general examination questions, and the examiner’s viva
 * questions from each case. Ids match the ones search and stars already use.
 */
export interface QuizCard {
  id: string
  q: string
  a: string
  /** Where it comes from, e.g. “Acute abdomen” or “Viva · Right iliac fossa pain” */
  source: string
  topic?: TopicId
  caseId?: string
  /** Multiple choice (viva questions only) */
  options?: string[]
  correct?: number
}

export type DeckId = 'due' | 'today' | 'all' | 'starred' | 'general' | 'viva' | `topic:${TopicId}`

export const topicCardIds = (id: TopicId) => TOPIC_BY_ID[id].qa.map((_, i) => `${id}:qa:${i}`)
export const GENERAL_IDS = GENERAL_QA.map((_, i) => `general:qa:${i}`)
export const todayTopics = (day: number) => sessionsOn(day).map((s) => s.topic)
export const todayCardIds = (day: number) => todayTopics(day).flatMap(topicCardIds)

export function topicCards(id: TopicId): QuizCard[] {
  const t = TOPIC_BY_ID[id]
  return t.qa.map((x, i) => ({ id: `${id}:qa:${i}`, q: x.q, a: x.a, source: t.title, topic: id }))
}

export const GENERAL_CARDS: QuizCard[] = GENERAL_QA.map((x, i) => ({ id: GENERAL_IDS[i], q: x.q, a: x.a, source: 'Examination & signs' }))

export function vivaCards(defs: Record<string, CaseDef>): QuizCard[] {
  const out: QuizCard[] = []
  for (const m of CASES) {
    const c = defs[m.id]
    if (!c) continue
    for (const v of c.viva) out.push({ id: `viva:${c.id}:${v.id}`, q: v.q, a: v.answer, source: `Viva · ${m.presenting}`, caseId: c.id, options: v.options, correct: v.correct })
  }
  return out
}

/** Does building this deck need the case files (for their viva questions)? */
export const deckNeedsCases = (id: DeckId) => id === 'viva' || id === 'due' || id === 'all' || id === 'starred'

export interface Deck {
  id: DeckId
  title: string
  cards: QuizCard[]
}

export function buildDeck(
  id: DeckId,
  { day, starred, cards, defs, now = Date.now() }: { day: number; starred: string[]; cards: Record<string, CardState>; defs: Record<string, CaseDef>; now?: number },
): Deck | null {
  const curriculum = () => [...TOPICS.flatMap((t) => topicCards(t.id)), ...GENERAL_CARDS]
  if (id.startsWith('topic:')) {
    const t = TOPIC_BY_ID[id.slice(6) as TopicId]
    return t ? { id, title: t.title, cards: topicCards(t.id) } : null
  }
  switch (id) {
    case 'today':
      return { id, title: `Day ${day} sessions`, cards: todayTopics(day).flatMap(topicCards) }
    case 'general':
      return { id, title: 'Examination & signs', cards: GENERAL_CARDS }
    case 'viva':
      return { id, title: 'Examiner viva questions', cards: vivaCards(defs) }
    case 'all':
      return { id, title: 'Everything', cards: [...curriculum(), ...vivaCards(defs)] }
    case 'starred': {
      const set = new Set(starred)
      return { id, title: 'Starred questions', cards: [...curriculum(), ...vivaCards(defs)].filter((c) => set.has(c.id)) }
    }
    case 'due':
      return { id, title: 'Due for review', cards: [...curriculum(), ...vivaCards(defs)].filter((c) => isDue(cards[c.id], now)) }
    default:
      return null
  }
}

/** How many reviews are due right now, across everything the student has seen. */
export function dueCount(cards: Record<string, CardState>, now = Date.now()) {
  let n = 0
  for (const s of Object.values(cards)) if (isDue(s, now)) n++
  return n
}
