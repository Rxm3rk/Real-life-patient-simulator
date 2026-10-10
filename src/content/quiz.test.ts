import { describe, expect, it } from 'vitest'
import type { CaseDef } from '../engine/types'
import { review } from '../lib/srs'
import { CASES } from './cases'
import { GENERAL_QA, TOPICS } from './curriculum'
import { buildDeck, dueCount, GENERAL_CARDS, todayCardIds, topicCardIds, topicCards, vivaCards } from './quiz'

async function allCases() {
  const defs: Record<string, CaseDef> = {}
  for (const m of CASES) defs[m.id] = await m.load()
  return defs
}

describe('the question bank as flashcards', () => {
  it('has a card for every ward-round question, with the ids search and stars use', () => {
    for (const t of TOPICS) {
      expect(topicCards(t.id).map((c) => c.id)).toEqual(topicCardIds(t.id))
      expect(topicCardIds(t.id)).toHaveLength(t.qa.length)
      expect(topicCardIds(t.id)[0]).toBe(`${t.id}:qa:0`)
    }
    expect(GENERAL_CARDS).toHaveLength(GENERAL_QA.length)
  })

  it('every card has a question and an answer, and ids never collide', async () => {
    const defs = await allCases()
    const all = [...TOPICS.flatMap((t) => topicCards(t.id)), ...GENERAL_CARDS, ...vivaCards(defs)]
    for (const c of all) {
      expect(c.q.trim().length, c.id).toBeGreaterThan(5)
      expect(c.a.trim().length, c.id).toBeGreaterThan(5)
      if (c.options) expect(c.options[c.correct ?? -1], c.id).toBeDefined()
    }
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length)
  })

  it('today’s deck is the two sessions of the day', () => {
    const deck = buildDeck('today', { day: 1, starred: [], cards: {}, defs: {} })!
    expect(deck.cards.map((c) => c.id)).toEqual(todayCardIds(1))
    expect(new Set(deck.cards.map((c) => c.topic))).toEqual(new Set(['bariatric', 'complicated-hernia']))
  })

  it('the due deck holds only what is due, from any source', async () => {
    const defs = await allCases()
    const now = Date.now()
    const viva = vivaCards(defs)[0].id
    const cards = {
      'acute-abdomen:qa:0': review(undefined, false, now - 3_600_000), // missed an hour ago → due
      'acute-abdomen:qa:1': review(undefined, true, now), // known → tomorrow
      [viva]: review(undefined, false, now - 3_600_000),
    }
    const deck = buildDeck('due', { day: 1, starred: [], cards, defs, now })!
    expect(deck.cards.map((c) => c.id).sort()).toEqual(['acute-abdomen:qa:0', viva].sort())
    expect(dueCount(cards, now)).toBe(2)
  })

  it('the starred deck collects starred questions, and unknown decks are refused', () => {
    const deck = buildDeck('starred', { day: 1, starred: ['general:qa:2', 'perianal:qa:0'], cards: {}, defs: {} })!
    expect(deck.cards.map((c) => c.id).sort()).toEqual(['general:qa:2', 'perianal:qa:0'])
    expect(buildDeck('topic:nope' as never, { day: 1, starred: [], cards: {}, defs: {} })).toBeNull()
  })
})
