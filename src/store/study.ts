import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { review, type CardState } from '../lib/srs'
import { jsonStorage } from '../lib/storage'

/** What the student is studying: the session day they’re on, searches, starred questions, quiz memory. */
export interface StudyState {
  /** Day of the clinical-session schedule (1–6) */
  day: number
  /** Recent searches, newest first */
  recent: string[]
  /** Starred question ids (topic:qa:index) */
  starred: string[]
  /** Hide answers in topic question lists (self-test) */
  hideAnswers: boolean
  /** Spaced-repetition memory by question id (topic:qa:i, general:qa:i, viva:case:q) */
  cards: Record<string, CardState>
  setDay: (day: number) => void
  addRecent: (q: string) => void
  clearRecent: () => void
  toggleStar: (id: string) => void
  setHideAnswers: (v: boolean) => void
  /** Record a quiz answer and schedule the card’s next review */
  review: (id: string, knew: boolean) => void
}

export const useStudy = create<StudyState>()(
  persist(
    (set, get) => ({
      day: 1,
      recent: [],
      starred: [],
      hideAnswers: false,
      cards: {},
      setDay: (day) => set({ day }),
      addRecent: (q) => {
        const t = q.trim()
        if (t.length < 3) return
        set({ recent: [t, ...get().recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8) })
      },
      clearRecent: () => set({ recent: [] }),
      toggleStar: (id) => {
        const s = get().starred
        set({ starred: s.includes(id) ? s.filter((x) => x !== id) : [id, ...s] })
      },
      setHideAnswers: (hideAnswers) => set({ hideAnswers }),
      review: (id, knew) => set({ cards: { ...get().cards, [id]: review(get().cards[id], knew) } }),
    }),
    { name: 'bedside.study', storage: jsonStorage, version: 1 },
  ),
)
