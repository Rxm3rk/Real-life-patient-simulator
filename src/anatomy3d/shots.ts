import * as THREE from 'three'
import type { PatientScene, Shot } from './patientScene'

/**
 * Named camera shots, aimed at anatomical landmarks so they frame every body
 * shape. Lying patients are seen from their right side (where the examiner
 * stands); standing and sitting patients from the front.
 */
export type ShotName = 'overview' | 'face' | 'neck' | 'chest' | 'abdomen' | 'groin' | 'legs' | 'feet' | 'hands' | 'back' | 'thyroidBehind'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

export function shotFor(scene: PatientScene, name: ShotName): Shot {
  const p = scene.getPose()
  const lm = (n: string) => scene.landmark(n)
  const mid = (a: THREE.Vector3, b: THREE.Vector3, t = 0.5) => a.clone().lerp(b, t)
  const lying = p.posture === 'supine'
  const reclined = p.posture === 'recline45'
  const sitting = p.posture === 'sitEdge' || p.posture === 'sitUp'
  const face = lm('noseTip')
  const navel = lm('navel')
  const pubis = lm('pubis')
  const knee = lm('kneeL')
  const ankle = lm('medialMalleolusL')

  if (lying) {
    switch (name) {
      case 'overview':
        return { target: mid(navel, lm('xiphoid'), 0.2).add(v(0, -0.5, 0.6)), dir: v(-0.62, 0.72, 0.3), dist: 27, fov: 32 }
      case 'face':
        return { target: face.clone().add(v(0, -0.25, 0.15)), dir: v(-0.35, 1, 0.45), dist: 6.2, fov: 30 }
      case 'neck':
        return { target: lm('thyroidCartilage'), dir: v(-0.45, 1, 0.5), dist: 6.5, fov: 30 }
      case 'chest':
        return { target: mid(lm('xiphoid'), lm('sternalNotch'), 0.45), dir: v(-0.5, 1, 0.35), dist: 11, fov: 30 }
      case 'abdomen':
        return { target: mid(navel, lm('xiphoid'), 0.2), dir: v(-0.45, 1, 0.22), dist: 11.5, fov: 30 }
      case 'groin':
        return { target: pubis.clone().add(v(0, 0, -0.9)), dir: v(-0.38, 1, 0.45), dist: 9.5, fov: 30 }
      case 'legs':
        return { target: mid(knee, ankle, 0.3).setX(0), dir: v(-0.62, 0.78, 0.22), dist: 17, fov: 32 }
      case 'feet':
        return { target: ankle.clone().setX(0).add(v(0, 0, 1.2)), dir: v(-0.35, 0.72, 0.6), dist: 9, fov: 30 }
      case 'hands':
        return { target: mid(navel, pubis).add(v(0, 2.2, 0)), dir: v(-0.5, 1, 0.5), dist: 13, fov: 32 }
      default:
        return shotFor(scene, 'overview')
    }
  }

  // reclined, sitting or standing: the patient faces the examiner
  const forward = reclined ? v(0, 0.55, 0.85) : sitting ? v(-1, 0.12, 0).normalize() : v(0, 0.08, 1)
  switch (name) {
    case 'overview':
      return sitting || reclined
        ? { target: mid(face, pubis, 0.55), dir: forward.clone().add(v(sitting ? 0 : -0.3, 0.12, sitting ? 0.25 : 0)), dist: 24, fov: 32 }
        : { target: mid(face, ankle, 0.5), dir: v(-0.08, 0.1, 1), dist: 36, fov: 32 }
    case 'face':
      return { target: face.clone().add(v(0, 0.2, 0)), dir: forward, dist: 6.5, fov: 30 }
    case 'neck':
      return { target: lm('thyroidCartilage'), dir: forward.clone().add(v(0, -0.12, 0)), dist: 6.8, fov: 30 }
    case 'thyroidBehind': {
      const back = forward.clone().multiplyScalar(-1).add(v(0, 0.55, 0))
      return { target: lm('thyroidCartilage').add(v(0, 0.3, 0)), dir: back, dist: 9, fov: 32 }
    }
    case 'chest':
      return { target: mid(lm('nippleL'), lm('nippleR')), dir: forward, dist: 12, fov: 30 }
    case 'abdomen':
      return { target: navel, dir: forward, dist: 12, fov: 30 }
    case 'groin':
      return { target: pubis.clone().add(v(0, 0.35, 0)), dir: v(0, 0.02, 1), dist: 10, fov: 30 }
    case 'legs':
      return { target: mid(knee, ankle, 0.35).setX(0), dir: v(0, 0.05, 1), dist: 19, fov: 32 }
    case 'feet':
      return { target: ankle.clone().setX(0).add(v(0, -0.2, 0.6)), dir: v(0, 0.5, 1), dist: 9, fov: 30 }
    case 'back':
      return { target: mid(face, ankle, 0.52), dir: v(0.08, 0.1, -1), dist: 36, fov: 32 }
    case 'hands':
      return { target: mid(navel, face, 0.25).add(forward.clone().multiplyScalar(4)), dir: forward, dist: 12, fov: 32 }
    default:
      return shotFor(scene, 'overview')
  }
}
