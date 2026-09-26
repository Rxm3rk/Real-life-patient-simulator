import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Grade } from '../engine/scoring'
import { jsonStorage } from '../lib/storage'
import { uid } from '../lib/utils'

export interface CircuitStation {
  caseId: string
  attemptId?: string
  pct?: number
  grade?: Grade
}

export interface Circuit {
  id: string
  createdAt: number
  /** Seconds per station */
  seconds: number
  stations: CircuitStation[]
  index: number
  finishedAt?: number
  /** Started from a friend’s challenge link */
  challenge?: boolean
  /** Which parts of each case form the station */
  type: 'exam' | 'history' | 'mixed'
}

interface OsceStore {
  circuit: Circuit | null
  history: Circuit[]
  create: (caseIds: string[], seconds: number, type: Circuit['type'], challenge?: boolean) => Circuit
  /** The current station has been entered (its encounter started) */
  attach: (attemptId: string) => void
  /** Record the result of a station’s attempt (idempotent) */
  complete: (attemptId: string, pct: number, grade: Grade) => void
  /** Move to the next station, or finish the circuit */
  advance: () => void
  abandon: () => void
  removeHistory: (id: string) => void
}

export const useOsce = create<OsceStore>()(
  persist(
    (set, get) => ({
      circuit: null,
      history: [],

      create: (caseIds, seconds, type, challenge) => {
        const circuit: Circuit = { id: uid('c'), createdAt: Date.now(), seconds, type, stations: caseIds.map((caseId) => ({ caseId })), index: 0, challenge }
        set({ circuit })
        return circuit
      },

      attach: (attemptId) => {
        const c = get().circuit
        if (!c) return
        const stations = c.stations.map((s, i) => (i === c.index ? { ...s, attemptId, pct: undefined, grade: undefined } : s))
        set({ circuit: { ...c, stations } })
      },

      complete: (attemptId, pct, grade) => {
        const c = get().circuit
        if (!c) return
        const i = c.stations.findIndex((s) => s.attemptId === attemptId)
        if (i < 0 || c.stations[i].pct !== undefined) return
        const stations = c.stations.map((s, k) => (k === i ? { ...s, pct, grade } : s))
        set({ circuit: { ...c, stations } })
      },

      advance: () => {
        const c = get().circuit
        if (!c) return
        if (c.index + 1 < c.stations.length) {
          set({ circuit: { ...c, index: c.index + 1 } })
          return
        }
        const done: Circuit = { ...c, finishedAt: Date.now() }
        set({ circuit: null, history: [done, ...get().history.filter((h) => h.id !== done.id)].slice(0, 20) })
      },

      abandon: () => set({ circuit: null }),
      removeHistory: (id) => set({ history: get().history.filter((h) => h.id !== id) }),
    }),
    { name: 'bedside.osce', storage: jsonStorage, version: 1 },
  ),
)

/** Stations passed = grade of Pass or better. */
export const passed = (g?: Grade) => g === 'Pass' || g === 'Good pass' || g === 'Excellent'

/** Shareable challenge link for a set of stations. */
export function challengeLink(caseIds: string[], seconds: number): string {
  return `${location.origin}${location.pathname}#/osce?c=${caseIds.join(',')}&t=${seconds}`
}
