import { useMemo } from 'react'
import * as THREE from 'three'
import { SCAR_INFO } from '../../anatomy/Scars'
import type { ScarId } from '../../anatomy/types'
import { ATLAS_APPEARANCES } from '../../anatomy3d/atlasBodies'
import type { PatientScene } from '../../anatomy3d/patientScene'
import { scarAnchor, scarSegments } from '../../anatomy3d/signs'
import Viewer3D, { type ViewerMarker } from './Viewer3D'

const ALL = Object.keys(SCAR_INFO) as ScarId[]

/** The scar atlas on a 3D torso: the chosen incision on the skin, a marker for every other one. */
export default function ScarTorso3D({ shown, explore, onPick, onUnavailable, className }: { shown: ScarId; explore: boolean; onPick: (id: ScarId) => void; onUnavailable: () => void; className?: string }) {
  const markers: ViewerMarker[] = useMemo(
    () => (explore ? ALL.map((id) => ({ id, label: SCAR_INFO[id].name, active: id === shown, rest: (scene: PatientScene) => scarAnchor(id, scene.anatomy!) })) : []),
    [explore, shown],
  )
  return (
    <Viewer3D
      appearance={ATLAS_APPEARANCES.torso}
      label={`A torso with ${explore ? 'a' : 'an unnamed'} surgical scar`}
      className={className}
      markers={markers}
      onPick={(id) => onPick(id as ScarId)}
      onUnavailable={onUnavailable}
      setupKey={`${shown}:${explore}`}
      setup={(scene, first) => {
        const A = scene.anatomy!
        if (first) {
          scene.setPose({ posture: 'stand', arms: 'sides' }, true)
          // a towel over the genitals rather than briefs, so low scars (Pfannenstiel, inguinal) are in view
          scene.setClothing({ briefs: false, drape: true })
          scene.setExpression({ lookAt: 'none' })
        }
        scene.setExtraSigns({ segments: scarSegments([shown], A) })
        const mid = scene.landmark('sternalNotch').lerp(scene.landmark('pubis'), 0.55)
        if (explore) scene.shot({ target: mid, dir: new THREE.Vector3(0.22, 0.05, 1), dist: 15, fov: 30 }, first)
        else {
          // the quiz: look at the scar, from where it faces
          const s = scene.surfaceAt(scarAnchor(shown, A))
          scene.shot({ target: s.point.lerp(mid, 0.35), dir: s.normal.clone().add(new THREE.Vector3(0, 0.15, 0.5)).normalize(), dist: 12, fov: 30 }, first)
        }
      }}
    />
  )
}
