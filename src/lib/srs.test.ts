import { describe, expect, it } from 'vitest'
import { buildSession, deckStats, INTERVAL_DAYS, isDue, isKnown, isMastered, requeue, RETRY_MINUTES, review, TOP_BOX, untilLabel, type CardState } from './srs'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 9, 10, 9)

describe('reviewing a card', () => {
  it('a new card you knew is known and comes back tomorrow', () => {
    const s = review(undefined, true, NOW)
    expect(s.box).toBe(1)
    expect(s.due).toBe(NOW + INTERVAL_DAYS[1] * DAY)
    expect(isKnown(s)).toBe(true)
    expect(isDue(s, NOW)).toBe(false)
  })

  it('each answer you know pushes the next review further out, up to the top box', () => {
    let s: CardState | undefined
    const gaps: number[] = []
    for (let i = 0; i < 8; i++) {
      s = review(s, true, NOW)
      gaps.push(s.due - NOW)
    }
    expect(gaps.slice(0, TOP_BOX)).toEqual(INTERVAL_DAYS.slice(1).map((d) => d * DAY))
    expect(s!.box).toBe(TOP_BOX)
    expect(isMastered(s)).toBe(true)
  })

  it('a card you didn’t know drops to the start and comes round again in minutes', () => {
    const known = review(review(review(undefined, true, NOW), true, NOW), true, NOW)
    const s = review(known, false, NOW)
    expect(s.box).toBe(0)
    expect(s.due).toBe(NOW + RETRY_MINUTES * 60_000)
    expect(s.lapses).toBe(1)
    expect(s.seen).toBe(4)
    expect(isKnown(s)).toBe(false)
    expect(isDue(s, NOW + RETRY_MINUTES * 60_000)).toBe(true)
  })

  it('missing a brand-new card is not a lapse', () => {
    expect(review(undefined, false, NOW).lapses).toBe(0)
  })
})

describe('building a sitting', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']
  const cards: Record<string, CardState> = {
    a: { box: 2, due: NOW - 2 * DAY, seen: 2, lapses: 0, last: NOW - 5 * DAY },
    b: { box: 1, due: NOW + DAY, seen: 1, lapses: 0, last: NOW },
    c: { box: 0, due: NOW - DAY, seen: 3, lapses: 2, last: NOW - DAY },
  }

  it('puts due cards first (most overdue first), then new ones in order', () => {
    expect(buildSession(ids, cards, { now: NOW })).toEqual(['a', 'c', 'd', 'e'])
  })

  it('respects the limit', () => {
    expect(buildSession(ids, cards, { now: NOW, limit: 3 })).toEqual(['a', 'c', 'd'])
  })

  it('tops up with the weakest of the rest when asked', () => {
    expect(buildSession(ids, cards, { now: NOW, extra: true })).toEqual(['a', 'c', 'd', 'e', 'b'])
  })

  it('never comes up empty for a deck you have seen all of', () => {
    const done: Record<string, CardState> = Object.fromEntries(ids.map((id, i) => [id, { box: 1 + (i % 2), due: NOW + DAY, seen: 1, lapses: 0, last: NOW - i }]))
    expect(buildSession(ids, done, { now: NOW, limit: 2 })).toHaveLength(2)
  })

  it('counts a deck', () => {
    expect(deckStats(ids, cards, NOW)).toEqual({ total: 5, fresh: 2, due: 2, known: 2, mastered: 0 })
  })
})

describe('helpers', () => {
  it('requeues a missed card a few places later', () => {
    expect(requeue(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 0, 'a')).toEqual(['a', 'b', 'c', 'd', 'e', 'a', 'f', 'g'])
    expect(requeue(['a', 'b'], 1, 'b')).toEqual(['a', 'b', 'b'])
  })

  it('says when the next review is', () => {
    expect(untilLabel(NOW + 10 * 60_000, NOW)).toBe('in 10 min')
    expect(untilLabel(NOW + DAY, NOW)).toBe('tomorrow')
    expect(untilLabel(NOW + 3 * DAY, NOW)).toBe('in 3 days')
    expect(untilLabel(NOW - 1, NOW)).toBe('now')
  })
})
