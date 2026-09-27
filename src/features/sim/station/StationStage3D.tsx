import type { ReactNode } from 'react'
import type { Pt } from '../../../anatomy/geometry'
import type { Exposure } from '../../../anatomy/types'
import type { PulseGrade } from '../../../engine/types'
import { PatientStage3D } from '../exam/PatientStage3D'
import type { Effect } from '../exam/Stage'
import { station3dFor } from './scenes3d'
import type { SceneCtx, SceneSpec, Zone } from './types'

/**
 * A station examined on the 3D patient (loaded on demand with three.js). The
 * station's own zones, actions and effects drive it; scenes3d says how the
 * patient is placed, posed, dressed and framed, and where each zone is.
 */
export default function StationStage3D(props: {
  x: SceneCtx
  spec: SceneSpec
  effects: Effect[]
  onZone: (z: Zone, pt: Pt) => void
  onMiss: (pt: Pt) => void
  showZones: boolean
  highlight: string | null
  feel: { at: Pt; grade: PulseGrade; key: number } | null
  reaction: { peak: number; key: number; says?: string }
  compact: boolean
  faceLabel?: string
  onUnavailable: () => void
  children?: ReactNode
}) {
  const { x, spec } = props
  const cfg = station3dFor(x, spec)
  const exposure: Exposure = x.exposed ? 'torso' : 'gowned'
  return (
    <PatientStage3D
      c={x.c}
      staging={cfg.staging}
      exposure={exposure}
      pain={x.pain}
      reaction={props.reaction}
      effects={props.effects}
      zones={cfg.zones}
      onZone={props.onZone}
      onMiss={props.onMiss}
      showZones={props.showZones}
      highlight={props.highlight}
      feel={props.feel}
      onReadyScene={cfg.onReadyScene}
      live={cfg.live}
      cues={cfg.cues}
      cursor={spec.zones.length ? 'pointer' : 'grab'}
      faceInset={cfg.faceInset}
      faceLabel={props.faceLabel}
      compact={props.compact}
      onUnavailable={props.onUnavailable}
    >
      {props.children}
    </PatientStage3D>
  )
}
