import type { Landmarks } from '../../anatomy/bodyModel'
import type { Pt } from '../../anatomy/geometry'
import type { OrderRule, ProtocolStep, StepCtx } from '../protocols/abdominal'
import type { Exposure } from '../../anatomy/types'
import type { ExamKind, KeyedFinding } from '../types'

/** Visual/behavioural cue the station stage should play when an action runs. */
export type StationCue =
  | 'cough'
  | 'stand'
  | 'lie'
  | 'swallow'
  | 'tongue'
  | 'transilluminate'
  | 'arms-side'
  | 'hands-hips'
  | 'arms-up'
  | 'elevate'
  | 'dependent'
  | 'doppler'
  | 'tourniquet'
  | 'reduce'
  | 'deep-ring'
  | 'measure'
  | 'press'
  | 'tremor'
  | 'lid-lag'
  | 'eyes'
  | 'pemberton'
  | 'expose'
  | 'turn'

export interface StationView {
  id: string
  label: string
  /** Camera target in body units (for body views) */
  shot?: { cx: number; cy: number; w: number; h: number }
  /** Special close-up component instead of the body */
  closeup?: 'hands' | 'neck' | 'scrotum' | 'buerger'
}

export interface StationAction {
  id: string
  label: string
  short: string
  view: string
  group: string
  contact: boolean
  intimate?: boolean
  cue?: StationCue
  /** Optional tap point on the stage (body units) for hands-on performance */
  hotspot?: (lm: Landmarks) => Pt
  /** Only for patients of this sex */
  sex?: 'male' | 'female'
}

export interface StationDef {
  kind: ExamKind
  title: string
  /** e.g. “Examine this patient’s groin” */
  task: string
  views: StationView[]
  actions: StationAction[]
  steps: ProtocolStep[]
  rules: OrderRule[]
  /** Normal findings for every examination action */
  normal: Record<string, KeyedFinding>
  /** What “explain & consent” says for this station */
  consentText: string
  /** Narration for “position the patient” */
  positionText: string
  /** Narration for “expose” */
  exposeText: string
  /** Exposure state once the student exposes the patient */
  exposure: Exposure
  /** Intimate examination (chaperone is mandatory to offer) */
  intimate?: boolean
}

export type { OrderRule, ProtocolStep, StepCtx }
