import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EncounterState } from '../engine/encounter'
import type { Grade, Result } from '../engine/scoring'
import type { Mode } from '../engine/types'
import { jsonStorage } from '../lib/storage'

export interface AttemptRecord {
  attemptId: string
  caseId: string
  mode: Mode
  at: number
  pct: number
  grade: Grade
  durationSec: number
  domains: { id: string; label: string; pct: number }[]
  criticalMissed: string[]
  violations: string[]
  /** Protocol steps not (fully) done — for weak-area analytics */
  missedSteps: { id: string; label: string }[]
  diagnosisCorrect: boolean
  state: EncounterState
}

interface ProgressStore {
  attempts: AttemptRecord[]
  /** Flashcard/drill confidence by item id */
  drills: Record<string, { seen: number; correct: number; last: number }>
  add: (r: AttemptRecord) => void
  remove: (attemptId: string) => void
  recordDrill: (id: string, correct: boolean) => void
  clear: () => void
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      attempts: [],
      drills: {},
      add: (r) => set({ attempts: [r, ...get().attempts.filter((a) => a.attemptId !== r.attemptId)].slice(0, 60) }),
      remove: (id) => set({ attempts: get().attempts.filter((a) => a.attemptId !== id) }),
      recordDrill: (id, correct) => {
        const d = get().drills[id] ?? { seen: 0, correct: 0, last: 0 }
        set({ drills: { ...get().drills, [id]: { seen: d.seen + 1, correct: d.correct + (correct ? 1 : 0), last: Date.now() } } })
      },
      clear: () => set({ attempts: [], drills: {} }),
    }),
    { name: 'bedside.progress', storage: jsonStorage, version: 1 },
  ),
)

export function toRecord(s: EncounterState, r: Result, correctDx: boolean): AttemptRecord {
  const missed: { id: string; label: string }[] = []
  for (const d of r.domains)
    for (const i of d.items) if ((d.id === 'examination' || d.id === 'communication') && i.max > 0 && i.earned < i.max * 0.99) missed.push({ id: i.id, label: i.label })
  return {
    attemptId: s.attemptId,
    caseId: s.caseId,
    mode: s.mode,
    at: s.finishedAt ?? Date.now(),
    pct: r.pct,
    grade: r.grade,
    durationSec: r.durationSec,
    domains: r.domains.map((d) => ({ id: d.id, label: d.label, pct: d.max ? d.earned / d.max : 0 })),
    criticalMissed: r.criticalMissed,
    violations: r.violations.map((v) => v.message),
    missedSteps: missed,
    diagnosisCorrect: correctDx,
    state: s,
  }
}
