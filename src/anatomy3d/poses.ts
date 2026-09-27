import * as THREE from 'three'
import type { HumanModel } from './human'

/**
 * Poses as local bone rotations. The skeleton's rest frames are world-aligned,
 * so a local rotation is a rotation about an axis in rest-pose coordinates, and
 * anatomical axes (elbow hinge, hip flexion…) are computed from each patient's
 * own rest skeleton. The Poser blends smoothly between targets.
 */

export type Posture = 'stand' | 'supine' | 'recline45' | 'sitUp' | 'sitEdge'
export type Arms = 'sides' | 'hips' | 'up' | 'forward' | 'forwardPalmsUp' | 'relaxed'

export interface PoseSpec {
  posture: Posture
  arms?: Arms
  /** Head: flexion (+ chin down) / extension (−), turn (+ to patient's left), degrees */
  headFlex?: number
  headTurn?: number
  /** Hip flexion with straight knees (Buerger's), degrees, per leg */
  legRaise?: { left?: number; right?: number }
  /** 0..1: brief trunk flexion of a cough */
  cough?: number
  /** Standing: turn around to show the back */
  turned?: boolean
}

export interface PoseTarget {
  bones: Record<string, THREE.Quaternion>
  rootQ: THREE.Quaternion
  /** Where the body's origin (between the feet, on the floor) sits relative to the scene anchor */
  rootP: THREE.Vector3
}

const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)
const rad = THREE.MathUtils.degToRad
const q = (axis: THREE.Vector3, deg: number) => new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), rad(deg))
const dirOf = (h: HumanModel, bone: string) => h.rest[bone].tail.clone().sub(h.rest[bone].head).normalize()

function mul(bones: Record<string, THREE.Quaternion>, name: string, r: THREE.Quaternion) {
  bones[name] = r.clone().multiply(bones[name] ?? new THREE.Quaternion())
}

interface ArmSpec {
  /** upper-arm direction (patient's left arm; mirrored for the right) */
  upper: [number, number, number]
  /** direction the forearm folds towards when the elbow bends */
  fold: [number, number, number]
  /** elbow flexion, degrees */
  flex: number
  /** forearm rotation, degrees: + turns the palm forwards/up (supination) */
  supinate: number
}

const ARMS: Record<Arms, ArmSpec> = {
  sides: { upper: [0.13, -1, -0.03], fold: [0, 0, 1], flex: 8, supinate: 0 },
  relaxed: { upper: [0.2, -1, 0.03], fold: [0, 0.2, 1], flex: 14, supinate: -10 },
  hips: { upper: [0.72, -0.62, -0.32], fold: [-0.82, -0.2, 0.55], flex: 104, supinate: -40 },
  up: { upper: [0.28, 1, -0.12], fold: [-0.62, 0.15, -0.45], flex: 112, supinate: 0 },
  forward: { upper: [0.12, -0.04, 1], fold: [0, 1, 0], flex: 4, supinate: -85 },
  forwardPalmsUp: { upper: [0.12, -0.04, 1], fold: [0, 1, 0], flex: 4, supinate: 95 },
}

function armPose(h: HumanModel, side: 'l' | 'r', arms: Arms, bones: Record<string, THREE.Quaternion>) {
  const s = side === 'l' ? 1 : -1
  const up = `upperarm_${side}`
  const lo = `lowerarm_${side}`
  const hand = `hand_${side}`
  const spec = ARMS[arms]
  const U = dirOf(h, up)
  const V = dirOf(h, lo)
  const T = new THREE.Vector3(spec.upper[0] * s, spec.upper[1], spec.upper[2]).normalize()
  const F = new THREE.Vector3(spec.fold[0] * s, spec.fold[1], spec.fold[2])

  // 1. point the upper arm, then roll it so the elbow folds towards F
  const upperQ = new THREE.Quaternion().setFromUnitVectors(U, T)
  const restFold = V.clone().sub(U.clone().multiplyScalar(V.dot(U))).normalize().applyQuaternion(upperQ)
  const wantFold = F.clone().sub(T.clone().multiplyScalar(F.dot(T))).normalize()
  const roll = Math.atan2(new THREE.Vector3().crossVectors(restFold, wantFold).dot(T), restFold.dot(wantFold))
  bones[up] = new THREE.Quaternion().setFromAxisAngle(T, roll).multiply(upperQ)

  // 2. elbow: from the rest flexion to the pose's, about this skeleton's own hinge
  const n = new THREE.Vector3().crossVectors(U, V).normalize()
  const restFlex = THREE.MathUtils.radToDeg(U.angleTo(V))
  const elbowQ = q(n, spec.flex - restFlex)
  const foreAxis = V.clone().applyQuaternion(elbowQ)
  bones[lo] = q(foreAxis, spec.supinate * s).multiply(elbowQ)

  // 3. keep the wrist roughly in line with the forearm
  bones[hand] = new THREE.Quaternion().setFromUnitVectors(dirOf(h, hand), V).slerp(new THREE.Quaternion(), 0.3)
}

export function buildPose(h: HumanModel, spec: PoseSpec): PoseTarget {
  const bones: Record<string, THREE.Quaternion> = {}
  const arms = spec.arms ?? (spec.posture === 'supine' ? 'relaxed' : 'sides')
  armPose(h, 'l', arms, bones)
  armPose(h, 'r', arms, bones)

  // legs: close the A-pose stance a little; relaxed feet
  for (const side of ['l', 'r'] as const) {
    const s = side === 'l' ? 1 : -1
    bones[`thigh_${side}`] = q(Z, -s * 3.5) // adduct: close the A-pose stance
    bones[`foot_${side}`] = q(X, spec.posture === 'supine' ? 16 : 4)
    if (spec.posture === 'supine') mul(bones, `thigh_${side}`, q(Y, s * 8)) // feet fall outwards when lying
  }

  const rootQ = new THREE.Quaternion()
  const rootP = new THREE.Vector3()
  const pelvisY = h.rest.pelvis.head.y
  let hipFlex = 0
  let kneeFlex = 0
  let neckFlex = 0
  switch (spec.posture) {
    case 'stand':
      if (spec.turned) rootQ.setFromAxisAngle(Y, Math.PI)
      break
    case 'supine':
      rootQ.setFromAxisAngle(X, -Math.PI / 2)
      neckFlex = 14 // head on a pillow
      break
    case 'recline45':
      // back rest at 45°, legs along the couch: rotate about the hips
      rootQ.setFromAxisAngle(X, -Math.PI / 4)
      hipFlex = 45
      neckFlex = 8
      break
    case 'sitUp':
      hipFlex = 88
      break
    case 'sitEdge':
      hipFlex = 88
      kneeFlex = 88
      break
  }
  if (hipFlex)
    for (const side of ['l', 'r'] as const) {
      mul(bones, `thigh_${side}`, q(X, -hipFlex))
      if (kneeFlex) mul(bones, `calf_${side}`, q(X, kneeFlex))
    }
  // Buerger's: straight-leg raise of one or both legs (supine)
  for (const [side, deg] of [['l', spec.legRaise?.left], ['r', spec.legRaise?.right]] as const) if (deg) mul(bones, `thigh_${side}`, q(X, -deg))

  const cough = spec.cough ?? 0
  mul(bones, 'spine_02', q(X, 7 * cough))
  mul(bones, 'spine_03', q(X, 5 * cough))
  mul(bones, 'neck_01', q(X, neckFlex * 0.6 + 8 * cough))
  mul(bones, 'head', q(X, (spec.headFlex ?? 0) + neckFlex * 0.4 + 6 * cough).multiply(q(Y, spec.headTurn ?? 0)))

  // root placement: rotations about the hip joint so the pelvis stays put
  const hip = new THREE.Vector3(0, pelvisY, 0)
  rootP.copy(hip).sub(hip.clone().applyQuaternion(rootQ))
  return { bones, rootQ, rootP }
}

/** Blends the skeleton towards a target pose with critically damped easing. */
export class Poser {
  private target: PoseTarget | null = null
  private readonly restQ: Record<string, THREE.Quaternion> = {}
  private speed = 5

  private readonly h: HumanModel

  constructor(h: HumanModel) {
    this.h = h
    for (const [n, b] of Object.entries(h.bones)) this.restQ[n] = b.quaternion.clone()
  }

  /** Set a new target; `instant` snaps (first frame of a scene). */
  set(t: PoseTarget, opts: { instant?: boolean; speed?: number } = {}) {
    this.target = t
    this.speed = opts.speed ?? 5
    if (opts.instant) this.update(10)
  }

  /** Advance the blend; returns true while still moving. */
  update(dt: number): boolean {
    const t = this.target
    if (!t) return false
    const k = 1 - Math.exp(-this.speed * dt)
    let moving = false
    for (const [n, b] of Object.entries(this.h.bones)) {
      const goal = t.bones[n] ?? this.restQ[n]
      if (b.quaternion.angleTo(goal) > 1e-4) {
        b.quaternion.slerp(goal, k)
        moving = true
      }
    }
    const root = this.h.root
    if (root.quaternion.angleTo(t.rootQ) > 1e-4 || root.position.distanceTo(t.rootP) > 1e-4) {
      root.quaternion.slerp(t.rootQ, k)
      root.position.lerp(t.rootP, k)
      moving = true
    }
    return moving
  }
}
