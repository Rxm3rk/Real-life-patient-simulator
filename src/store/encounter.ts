import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RegionId } from '../anatomy/bodyModel'
import type { Exposure } from '../anatomy/types'
import { cachedCase, loadCase } from '../content/cases'
import { answerFor, INTENT_BY_ID } from '../content/intents'
import { abdoFindings } from '../engine/abdo'
import { observe } from '../engine/abdoActions'
import { newEncounter, type EncounterState, type VivaAnswer } from '../engine/encounter'
import { interpret } from '../engine/matcher'
import { computeResult, type Result } from '../engine/scoring'
import type { Answer, CaseDef, ChatTurn, Component, Mode, Observation, Phase } from '../engine/types'
import { jsonStorage } from '../lib/storage'
import { toRecord, useProgress } from './progress'

const text = (a: Answer) => (typeof a === 'string' ? a : a.text)
const cue = (a: Answer) => (typeof a === 'string' ? undefined : a.cue)
let turnSeq = 0
const turnId = () => `t${Date.now().toString(36)}${(turnSeq++).toString(36)}`

export interface AskResult {
  matched: string[]
  suggestions: string[]
}

interface EncounterStore {
  s: EncounterState | null
  /** Last completed attempt's result, for the debrief screen */
  lastResult: Result | null
  start: (caseId: string, mode: Mode, components: Component[], timeLimit?: number) => void
  abandon: () => void
  setPhase: (p: Phase) => void
  ask: (q: string) => AskResult
  askIntent: (id: string) => void
  perform: (action: string, opts?: { region?: RegionId; detail?: string; seconds?: number }) => Observation | null
  setExposure: (e: Exposure) => void
  setPulseEstimate: (bpm: number) => void
  toggleOrder: (inv: string) => void
  viewResult: (inv: string) => void
  setDiagnosis: (id: string) => void
  toggleDifferential: (id: string) => void
  toggleManagement: (id: string) => void
  setPresentation: (t: string) => void
  answerViva: (id: string, a: VivaAnswer) => void
  useHint: () => void
  finish: () => Result | null
}

function patientReply(c: CaseDef, s: EncounterState, ids: string[]): ChatTurn[] {
  const parts: string[] = []
  const cues: string[] = []
  for (const id of ids) {
    const a = answerFor(id, c)
    let t = text(a)
    if (s.asked.includes(id) && !id.startsWith('comm.')) t = `Like I said — ${t[0].toLowerCase()}${t.slice(1)}`
    parts.push(t)
    const cu = cue(a)
    if (cu) cues.push(cu)
  }
  return [{ id: turnId(), role: 'patient', text: parts.join(' '), cue: cues.join('; ') || undefined, intents: ids, t: Date.now() }]
}

export const useEncounter = create<EncounterStore>()(
  persist(
    (set, get) => ({
      s: null,
      lastResult: null,

      start: (caseId, mode, components, timeLimit) => {
        set({ s: newEncounter(caseId, mode, components, timeLimit), lastResult: null })
      },

      abandon: () => set({ s: null }),

      setPhase: (phase) => {
        const s = get().s
        if (!s) return
        set({ s: { ...s, phase } })
      },

      ask: (q) => {
        const s = get().s
        const c = s && cachedCase(s.caseId)
        if (!s || !c) return { matched: [], suggestions: [] }
        const r = interpret(q)
        const student: ChatTurn = { id: turnId(), role: 'student', text: q, intents: r.matched, t: Date.now() }
        let replies: ChatTurn[]
        if (r.matched.length) replies = patientReply(c, s, r.matched)
        else
          replies = [
            {
              id: turnId(),
              role: 'patient',
              text: ['Sorry, I’m not sure what you mean?', 'Sorry doctor — could you ask that another way?', 'I don’t quite follow, sorry.'][s.chat.length % 3],
              t: Date.now(),
            },
          ]
        const asked = [...s.asked, ...r.matched.filter((m) => !s.asked.includes(m))]
        const analgesia = s.analgesia || r.matched.includes('comm.analgesia')
        set({ s: { ...s, chat: [...s.chat, student, ...replies], asked, analgesia } })
        return { matched: r.matched, suggestions: r.suggestions }
      },

      askIntent: (id) => {
        const s = get().s
        const c = s && cachedCase(s.caseId)
        if (!s || !c) return
        const intent = INTENT_BY_ID[id]
        const student: ChatTurn = { id: turnId(), role: 'student', text: intent?.q ?? id, intents: [id], t: Date.now() }
        const replies = patientReply(c, s, [id])
        const asked = s.asked.includes(id) ? s.asked : [...s.asked, id]
        set({ s: { ...s, chat: [...s.chat, student, ...replies], asked, analgesia: s.analgesia || id === 'comm.analgesia' } })
      },

      perform: (action, opts = {}) => {
        const s = get().s
        const c = s && cachedCase(s.caseId)
        if (!s || !c) return null
        const f = abdoFindings(c)
        const obs = observe(action, opts.region, { c, f, analgesia: s.analgesia, detail: opts.detail, seconds: opts.seconds })
        let exposure = s.exposure
        if (action === 'comm.expose') exposure = 'abdomen'
        if (action === 'groin.expose') exposure = 'groin'
        if (action === 'comm.thank') exposure = 'gowned'
        const analgesia = s.analgesia || action === 'comm.analgesia'
        const asked =
          action === 'comm.intro' || action === 'comm.identity'
            ? s.asked.includes(action)
              ? s.asked
              : [...s.asked, action]
            : s.asked
        set({
          s: {
            ...s,
            log: [...s.log, { action, t: Date.now(), region: opts.region, detail: opts.detail, obs }],
            exposure,
            analgesia,
            asked,
          },
        })
        return obs
      },

      setExposure: (exposure) => {
        const s = get().s
        if (s) set({ s: { ...s, exposure } })
      },

      setPulseEstimate: (bpm) => {
        const s = get().s
        if (s) set({ s: { ...s, pulseEstimate: bpm } })
      },

      toggleOrder: (inv) => {
        const s = get().s
        if (!s) return
        const ordered = s.ordered.includes(inv) ? s.ordered.filter((x) => x !== inv) : [...s.ordered, inv]
        set({ s: { ...s, ordered } })
      },

      viewResult: (inv) => {
        const s = get().s
        if (!s || s.viewedResults.includes(inv)) return
        set({ s: { ...s, viewedResults: [...s.viewedResults, inv] } })
      },

      setDiagnosis: (id) => {
        const s = get().s
        if (s) set({ s: { ...s, diagnosis: id, differentials: s.differentials.filter((d) => d !== id) } })
      },

      toggleDifferential: (id) => {
        const s = get().s
        if (!s) return
        const differentials = s.differentials.includes(id) ? s.differentials.filter((d) => d !== id) : [...s.differentials, id].slice(0, 5)
        set({ s: { ...s, differentials } })
      },

      toggleManagement: (id) => {
        const s = get().s
        if (!s) return
        const management = s.management.includes(id) ? s.management.filter((d) => d !== id) : [...s.management, id]
        set({ s: { ...s, management } })
      },

      setPresentation: (presentation) => {
        const s = get().s
        if (s) set({ s: { ...s, presentation } })
      },

      answerViva: (id, a) => {
        const s = get().s
        if (s) set({ s: { ...s, viva: { ...s.viva, [id]: { ...s.viva[id], ...a } } } })
      },

      useHint: () => {
        const s = get().s
        if (s) set({ s: { ...s, hints: s.hints + 1 } })
      },

      finish: () => {
        const s = get().s
        const c = s && cachedCase(s.caseId)
        if (!s || !c) return null
        const done: EncounterState = { ...s, finishedAt: Date.now(), phase: 'debrief' }
        const result = computeResult(c, done)
        const correctDx = !!done.diagnosis && [c.diagnosis.correct, ...(c.diagnosis.accept ?? [])].includes(done.diagnosis)
        useProgress.getState().add(toRecord(done, result, correctDx))
        set({ s: done, lastResult: result })
        return result
      },
    }),
    {
      name: 'bedside.encounter',
      storage: jsonStorage,
      version: 1,
      partialize: (st) => ({ s: st.s }) as unknown as EncounterStore,
    },
  ),
)

/** Ensure the case for the active encounter is loaded (after a reload). */
export async function ensureCaseLoaded(): Promise<CaseDef | null> {
  const s = useEncounter.getState().s
  if (!s) return null
  return loadCase(s.caseId)
}
