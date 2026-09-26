import type { ReactNode } from 'react'
import type { Pt } from '../../../anatomy/geometry'
import type { StationCue, StationDef } from '../../../engine/stations'
import type { CaseDef, ExamEvent, PulseGrade } from '../../../engine/types'
import type { ShotRect } from '../exam/camera'

/** A tappable area on the stage. Tapping performs the first action not yet done. */
export interface Zone {
  id: string
  actions: string[]
  at: Pt
  r: number
  label: string
}

export interface CueState {
  kind: StationCue | null
  key: number
}

export interface SceneCtx {
  c: CaseDef
  def: StationDef
  view: string
  log: ExamEvent[]
  /** The patient is exposed for examination */
  exposed: boolean
  cue: CueState
  /** Baseline pain 0..1 and a transient wince */
  pain: number
  wince: number
  learn: boolean
  compact: boolean
  /** Transient per-station state driven by tasks */
  extra: SceneExtra
}

export interface SceneExtra {
  buerger?: { angle: number; dependent: boolean; pallor: number; rubor: number }
  /** Varicose vein filling 0..1 (tourniquet test) */
  veinFill?: number
  /** Tourniquet on the thigh */
  tourniquet?: boolean
  /** Scrotal see-through anatomy */
  anatomy?: boolean
  /** Pulse being felt at a point */
  feel?: { at: Pt; grade: PulseGrade; key: number }
  /** Doppler probe position */
  probe?: Pt
}

export interface SceneSpec {
  content: ReactNode
  rect: ShotRect
  zones: Zone[]
  /** Accessible description of what is shown */
  aria: string
  /** Scale of touch effects relative to body units (close-ups are larger) */
  effectScale?: number
  /** Hide the face cam (face already on screen) */
  faceVisible?: boolean
}

export const lastIndex = (log: ExamEvent[], ids: string[]) => {
  for (let i = log.length - 1; i >= 0; i--) if (ids.includes(log[i].action)) return i
  return -1
}

export const didAction = (log: ExamEvent[], id: string) => log.some((e) => e.action === id)
