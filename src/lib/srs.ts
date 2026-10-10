/**
 * Spaced repetition for the question bank — a Leitner system, deliberately
 * simple: two answers ("Didn't know" / "Knew it"), six boxes. Each "Knew it"
 * moves a card up a box and pushes its next review further out; "Didn't know"
 * sends it back to the start and brings it round again in a few minutes.
 */

export interface CardState {
  /** 0 = learning; 1–5 = known, reviewed at ever longer intervals */
  box: number
  /** When it is next due (ms since epoch) */
  due: number
  seen: number
  lapses: number
  /** Last review (ms since epoch) */
  last: number
}

const MIN = 60_000
const DAY = 24 * 60 * MIN

/** Days until the next review, by the box a card has just moved into. */
export const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const
export const TOP_BOX = INTERVAL_DAYS.length - 1
/** A card you didn't know comes round again after this long. */
export const RETRY_MINUTES = 10

export function review(prev: CardState | undefined, knew: boolean, now = Date.now()): CardState {
  const seen = (prev?.seen ?? 0) + 1
  if (!knew) return { box: 0, due: now + RETRY_MINUTES * MIN, seen, lapses: (prev?.lapses ?? 0) + (prev ? 1 : 0), last: now }
  const box = Math.min(TOP_BOX, (prev?.box ?? 0) + 1)
  return { box, due: now + INTERVAL_DAYS[box] * DAY, seen, lapses: prev?.lapses ?? 0, last: now }
}

/** Seen before and due again. New cards are never "due" — they're new. */
export const isDue = (s: CardState | undefined, now = Date.now()) => !!s && s.due <= now
/** Answered correctly last time. */
export const isKnown = (s: CardState | undefined) => !!s && s.box >= 1
/** Known across at least three widening gaps (a week or more). */
export const isMastered = (s: CardState | undefined) => !!s && s.box >= 3

export interface DeckStats {
  total: number
  fresh: number
  due: number
  known: number
  mastered: number
}

export function deckStats(ids: readonly string[], cards: Record<string, CardState>, now = Date.now()): DeckStats {
  let fresh = 0
  let due = 0
  let known = 0
  let mastered = 0
  for (const id of ids) {
    const s = cards[id]
    if (!s) fresh++
    else {
      if (isDue(s, now)) due++
      if (isKnown(s)) known++
      if (isMastered(s)) mastered++
    }
  }
  return { total: ids.length, fresh, due, known, mastered }
}

/**
 * The cards for one sitting: what's due first (most overdue first), then new
 * cards in their natural order, then — only if asked, or the deck has nothing
 * else — the weakest of the rest, so "Quiz me" never comes up empty.
 */
export function buildSession(
  ids: readonly string[],
  cards: Record<string, CardState>,
  { limit = 15, now = Date.now(), extra = false }: { limit?: number; now?: number; extra?: boolean } = {},
): string[] {
  const due = ids.filter((id) => isDue(cards[id], now)).sort((a, b) => cards[a].due - cards[b].due)
  const fresh = ids.filter((id) => !cards[id])
  const out = [...due, ...fresh].slice(0, limit)
  if (out.length < limit && (extra || out.length === 0)) {
    const rest = ids
      .filter((id) => cards[id] && !isDue(cards[id], now))
      .sort((a, b) => cards[a].box - cards[b].box || cards[a].last - cards[b].last)
    out.push(...rest.slice(0, limit - out.length))
  }
  return out
}

/** Where a card you didn't know goes back into the queue: a few cards later. */
export function requeue<T>(queue: readonly T[], at: number, item: T, gap = 4): T[] {
  const q = queue.slice()
  q.splice(Math.min(q.length, at + 1 + gap), 0, item)
  return q
}

/** "in 3 days", "tomorrow", "in 10 min" — for the next review of a deck. */
export function untilLabel(ts: number, now = Date.now()): string {
  const d = ts - now
  if (d <= 0) return 'now'
  if (d < 60 * MIN) return `in ${Math.max(1, Math.round(d / MIN))} min`
  if (d < DAY) return `in ${Math.round(d / (60 * MIN))} h`
  const days = Math.round(d / DAY)
  return days <= 1 ? 'tomorrow' : `in ${days} days`
}
