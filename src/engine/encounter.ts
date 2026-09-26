import type { Exposure } from '../anatomy/types'
import type { ChatTurn, Component, ExamEvent, Mode, Phase } from './types'

export interface VivaAnswer {
  choice?: number
  text?: string
  /** Self-assessment for open questions */
  self?: 0 | 0.5 | 1
}

/** Everything the student does in one attempt. Serializable. */
export interface EncounterState {
  attemptId: string
  caseId: string
  mode: Mode
  components: Component[]
  startedAt: number
  finishedAt?: number
  phase: Phase
  /** Seconds allowed (OSCE mode) */
  timeLimit?: number

  chat: ChatTurn[]
  asked: string[]
  hints: number

  log: ExamEvent[]
  exposure: Exposure
  analgesia: boolean
  pulseEstimate?: number
  crtEstimate?: number

  ordered: string[]
  viewedResults: string[]

  diagnosis?: string
  differentials: string[]
  management: string[]
  presentation: string

  viva: Record<string, VivaAnswer>
}

export function newEncounter(caseId: string, mode: Mode, components: Component[], timeLimit?: number): EncounterState {
  const first: Phase = components.includes('history') ? 'history' : components.includes('exam') ? 'exam' : 'investigations'
  return {
    attemptId: `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    caseId,
    mode,
    components,
    startedAt: Date.now(),
    phase: first,
    timeLimit,
    chat: [],
    asked: [],
    hints: 0,
    log: [],
    exposure: 'gowned',
    analgesia: false,
    ordered: [],
    viewedResults: [],
    differentials: [],
    management: [],
    presentation: '',
    viva: {},
  }
}
