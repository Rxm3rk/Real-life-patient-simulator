import * as THREE from 'three'
import type { Appearance } from '../anatomy/types'
import { loadBase, loadBody, type HumanBase } from './assets'
import { createGarments, type GarmentName, type Garments } from './garments'
import { createHair, type HairModel } from './hair'
import { createHuman, type GpuMorph, type HumanModel } from './human'
import { createMaterials, type PatientMaterials } from './materials'
import { buildPose, Poser, type PoseSpec } from './poses'
import { buildBlanket, createRoom, createSet, type ExamSet, type SetKind } from './sets'
import { Stage3D } from './stage'

/**
 * Everything the examination screens need from the 3D patient: placing them
 * on a bed, couch or the clinic floor, poses, clothing, expressions, a living
 * idle (breathing, blinking, eyes that follow you), camera shots and picking.
 */

export interface ClothingState {
  briefs?: boolean
  gownTop?: boolean
  chestBand?: boolean
  gownSkirt?: boolean
  /** Blanket over a lying patient from `from` (0 = head end, 1 = feet) to the feet; null = none */
  blanketFrom?: number | null
}

export interface ExpressionState {
  /** 0..1 baseline pain */
  pain?: number
  /** 0..1 transient wince */
  wince?: number
  eyesClosed?: boolean
  mouthOpen?: number
  tongueOut?: number
  /** upper lid retraction (thyrotoxicosis) 0..1 */
  lidRetraction?: number
  lookAt?: 'camera' | 'up' | 'down' | 'none'
  speaking?: boolean
}

export interface Shot {
  /** Landmark or point the camera looks at (world space) */
  target: THREE.Vector3
  /** Direction from target to camera (world space) */
  dir: THREE.Vector3
  dist: number
  fov?: number
}

export interface Pick {
  /** world-space hit */
  point: THREE.Vector3
  /** the same point on the rest-pose body (decimetres), for regions and zones */
  rest: THREE.Vector3
  normal: THREE.Vector3
}

export class PatientScene {
  readonly stage: Stage3D
  readonly anchor = new THREE.Group()
  readonly ready: Promise<void>
  human: HumanModel | null = null
  base: HumanBase | null = null
  mats: PatientMaterials | null = null
  hair: HairModel | null = null
  clothes: Garments | null = null
  poser: Poser | null = null
  set: ExamSet
  private blanket: { object: THREE.Object3D; dispose(): void } | null = null
  private blanketFrom: number | null = null
  private pose: PoseSpec = { posture: 'supine' }
  private expr: Required<Omit<ExpressionState, 'lookAt'>> & { lookAt: ExpressionState['lookAt'] } = {
    pain: 0,
    wince: 0,
    eyesClosed: false,
    mouthOpen: 0,
    tongueOut: 0,
    lidRetraction: 0,
    lookAt: 'camera',
    speaking: false,
  }
  private morphNow = new Map<GpuMorph, number>()
  private camTween: { from: THREE.Vector3; fromT: THREE.Vector3; to: THREE.Vector3; toT: THREE.Vector3; t: number; fovFrom: number; fovTo: number } | null = null
  private nextBlink = 2
  private blink = 0
  private breathe = 0
  /** respiratory excursion of the abdomen (0 in peritonitis: "doesn't move with respiration") */
  breathDepth = 1
  private readonly appearance: Appearance
  private disposed = false

  constructor(canvas: HTMLCanvasElement, opts: { appearance: Appearance; set: SetKind; background: string; dark: boolean }) {
    this.appearance = opts.appearance
    this.stage = new Stage3D(canvas, { background: opts.background })
    this.stage.scene.add(createRoom(opts.dark))
    this.set = createSet(opts.set)
    this.stage.scene.add(this.set.group)
    this.stage.scene.add(this.anchor)
    this.stage.camera.position.set(-20, 18, 10)
    this.ready = this.load()
    this.stage.onFrame((dt, t) => this.tick(dt, t))
  }

  private async load() {
    const [base, body] = await Promise.all([loadBase(), loadBody(this.appearance)])
    if (this.disposed) return
    const a = this.appearance
    this.base = base
    this.mats = createMaterials(a)
    const human = createHuman(base, body, {
      materials: this.mats.parts,
      eyeMaterial: this.mats.eye,
      distension: a.distension ? [0, 0.35, 0.65, 1][a.distension] : 0,
      navel: a.umbilicus === 'everted' ? 'out' : a.umbilicus === 'deep' ? 'in' : undefined,
    })
    this.human = human
    this.hair = createHair(human, base, a)
    if (this.hair) human.root.add(this.hair.object)
    this.clothes = createGarments(human, base, a)
    this.anchor.add(human.root)
    this.poser = new Poser(human)
    this.applyPose(true)
    this.stage.invalidate()
  }

  /* ------------------------------------------------------------ placement */

  private place() {
    const h = this.human
    if (!h) return
    const r = h.rest
    const pelvisY = r.pelvis.head.y
    const top = r.head.tail.y
    // how far the back of the torso sits behind the body's origin plane
    let backZ = 0
    for (let c = 0; c < h.positions.length / 3; c++) {
      const y = h.positions[c * 3 + 1]
      if (y > r.thigh_l.head.y && y < r.neck_01.head.y) backZ = Math.min(backZ, h.positions[c * 3 + 2])
    }
    const p = this.pose
    this.anchor.rotation.set(0, 0, 0)
    if (p.posture === 'supine') {
      this.set.setBackrest(0)
      this.anchor.position.set(0, this.set.surfaceY - (pelvisY + backZ) - 0.12, this.set.headZ + 1.6 - (pelvisY - top))
    } else if (p.posture === 'recline45') {
      this.set.setBackrest(45)
      const hingeZ = this.set.headZ + (this.set.kind === 'bed' ? 7.95 : 7)
      // hip joint just in front of the hinge, a hand's breadth above the seat
      this.anchor.position.set(0, this.set.surfaceY + 0.95 - pelvisY, hingeZ + 0.55)
    } else if (p.posture === 'sitEdge' || p.posture === 'sitUp') {
      this.set.setBackrest(0)
      // sit on the near (patient's-right-side) edge facing the examiner
      this.anchor.rotation.y = -Math.PI / 2
      this.anchor.position.set(-(this.set.kind === 'bed' ? 3.2 : 2.2), this.set.surfaceY + 0.95 - pelvisY, 0.5)
    } else {
      this.anchor.position.set(0, 0, 0)
    }
  }

  private applyPose(instant = false) {
    const h = this.human
    if (!h || !this.poser) return
    this.place()
    this.poser.set(buildPose(h, this.pose), { instant, speed: 3.2 })
    this.refreshBlanket()
  }

  setPose(spec: PoseSpec, instant = false) {
    this.pose = spec
    this.applyPose(instant)
    this.stage.invalidate()
  }

  getPose() {
    return this.pose
  }

  /* -------------------------------------------------------------- clothing */

  setClothing(c: ClothingState) {
    if (!this.clothes) return
    const show: Partial<Record<GarmentName, boolean>> = {}
    for (const k of ['briefs', 'gownTop', 'chestBand', 'gownSkirt'] as const) if (c[k] !== undefined) show[k] = c[k]
    this.clothes.show(show)
    if (c.blanketFrom !== undefined && c.blanketFrom !== this.blanketFrom) {
      this.blanketFrom = c.blanketFrom
      this.refreshBlanket()
    }
    this.stage.invalidate()
  }

  private refreshBlanket() {
    this.blanket?.object.removeFromParent()
    this.blanket?.dispose()
    this.blanket = null
    const h = this.human
    if (!h || this.blanketFrom == null || this.pose.posture !== 'supine') return
    // wait for the pose to settle before draping the blanket over it
    this.poser?.update(10)
    const len = 20
    const from = this.set.headZ + this.blanketFrom * len
    this.blanket = buildBlanket(h, { surfaceY: this.set.surfaceY, fromZ: from, toZ: this.set.headZ + len, width: this.set.kind === 'bed' ? 8.6 : 6.4, parent: this.stage.scene })
    this.stage.scene.add(this.blanket.object)
  }

  /* ------------------------------------------------------------ expression */

  setExpression(e: ExpressionState) {
    Object.assign(this.expr, e)
    this.stage.invalidate()
  }

  /** Skin tints that change during an encounter (e.g. pallor as a patient shocks). */
  setSkin(values: Partial<{ jaundice: number; pallor: number; flush: number; cyanosis: number; sweat: number; mottle: number; legHair: number }>) {
    const u = this.mats?.skin
    if (!u) return
    const map = { jaundice: u.uJaundice, pallor: u.uPallor, flush: u.uFlush, cyanosis: u.uCyanosis, sweat: u.uSweat, mottle: u.uMottle, legHair: u.uLegHair } as const
    for (const [k, v] of Object.entries(values)) if (v !== undefined) map[k as keyof typeof map].value = v
    this.stage.invalidate()
  }

  /* --------------------------------------------------------------- camera */

  shot(s: Shot, instant = false) {
    const cam = this.stage.camera
    const to = s.target.clone().add(s.dir.clone().normalize().multiplyScalar(s.dist))
    const controls = this.stage.controls
    if (instant || !controls) {
      cam.position.copy(to)
      if (s.fov) cam.fov = s.fov
      cam.updateProjectionMatrix()
      controls?.target.copy(s.target)
      controls?.update()
      this.camTween = null
    } else {
      this.camTween = { from: cam.position.clone(), fromT: controls.target.clone(), to, toT: s.target.clone(), t: 0, fovFrom: cam.fov, fovTo: s.fov ?? cam.fov }
    }
    if (controls) {
      controls.minDistance = s.dist * 0.45
      controls.maxDistance = Math.max(s.dist * 2.2, 12)
    }
    this.stage.invalidate()
  }

  /** World position of a baked landmark (follows the current pose). */
  landmark(name: string, out = new THREE.Vector3()) {
    const h = this.human
    const base = this.base
    if (!h || !base) return out.set(0, 0, 0)
    const c = (base.meta.landmarks as Record<string, number>)[name]
    return this.restToWorld(new THREE.Vector3(h.positions[c * 3], h.positions[c * 3 + 1], h.positions[c * 3 + 2]), out, c)
  }

  /** A rest-pose point → world, skinned by the vertex nearest it (or a given compact vertex). */
  restToWorld(rest: THREE.Vector3, out = new THREE.Vector3(), compact?: number) {
    const h = this.human
    if (!h) return out.copy(rest)
    const c = compact ?? this.nearestCompact(rest)
    // any render vertex of that compact vertex carries its skin weights
    const r = Math.max(0, h.compactToRender[c])
    const v = new THREE.Vector3().fromBufferAttribute(h.geometry.attributes.position, r)
    const offset = rest.clone().sub(v)
    h.mesh.applyBoneTransform(r, v)
    // carry the offset along the same bone transform (rotation only)
    const q = new THREE.Quaternion()
    h.mesh.skeleton.bones[h.geometry.attributes.skinIndex.getX(r)].getWorldQuaternion(q)
    out.copy(v).applyMatrix4(h.mesh.matrixWorld).add(offset.applyQuaternion(q))
    return out
  }

  private nearestCompact(p: THREE.Vector3) {
    const pos = this.human!.positions
    let best = 0
    let bd = Infinity
    for (let c = 0; c < pos.length / 3; c++) {
      const d = (pos[c * 3] - p.x) ** 2 + (pos[c * 3 + 1] - p.y) ** 2 + (pos[c * 3 + 2] - p.z) ** 2
      if (d < bd) {
        bd = d
        best = c
      }
    }
    return best
  }

  /** Screen position (CSS pixels within the canvas) of a world point. */
  project(world: THREE.Vector3) {
    const v = world.clone().project(this.stage.camera)
    const c = this.stage.canvas
    return { x: ((v.x + 1) / 2) * c.clientWidth, y: ((1 - v.y) / 2) * c.clientHeight, visible: v.z < 1 }
  }

  /** What's under a point on the canvas (CSS pixels). */
  pick(x: number, y: number): Pick | null {
    const h = this.human
    if (!h) return null
    const c = this.stage.canvas
    const ndc = new THREE.Vector2((x / c.clientWidth) * 2 - 1, -(y / c.clientHeight) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, this.stage.camera)
    const hits = ray.intersectObject(h.mesh, false)
    const hit = hits.find((i) => (i.face?.materialIndex ?? 0) === 0 || (i.face && i.face.materialIndex === undefined))
    if (!hit || !hit.face) return null
    const pos = h.geometry.attributes.position
    const bc = hit.barycoord ?? new THREE.Vector3(1 / 3, 1 / 3, 1 / 3)
    const rest = new THREE.Vector3()
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, hit.face.a), bc.x)
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, hit.face.b), bc.y)
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, hit.face.c), bc.z)
    return { point: hit.point.clone(), rest, normal: hit.face.normal.clone() }
  }

  /* ------------------------------------------------------------ animation */

  private tick(dt: number, t: number) {
    const h = this.human
    if (!h) return false
    let busy = this.poser?.update(dt) ?? false

    // camera tween (ease in-out)
    if (this.camTween) {
      const tw = this.camTween
      tw.t = Math.min(1, tw.t + dt / 0.75)
      const k = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2
      this.stage.camera.position.lerpVectors(tw.from, tw.to, k)
      this.stage.controls?.target.lerpVectors(tw.fromT, tw.toT, k)
      this.stage.camera.fov = THREE.MathUtils.lerp(tw.fovFrom, tw.fovTo, k)
      this.stage.camera.updateProjectionMatrix()
      if (tw.t >= 1) this.camTween = null
      busy = true
    }

    // blinking every few seconds
    this.nextBlink -= dt
    if (this.nextBlink <= 0) {
      this.blink = 1
      this.nextBlink = 2.5 + Math.random() * 4
    }
    this.blink = Math.max(0, this.blink - dt / 0.16)

    // breathing: ~14/min, visible as abdominal excursion
    this.breathe = (Math.sin(t * ((2 * Math.PI) / 4.3)) + 1) / 2
    const e = this.expr
    const pain = e.pain
    const w = e.wince
    const speak = e.speaking ? 0.35 + 0.3 * Math.abs(Math.sin(t * 11)) * Math.abs(Math.sin(t * 3.7)) : 0
    const target: Partial<Record<GpuMorph, number>> = {
      browsDown: Math.min(1, pain * 0.55 + w * 0.9),
      browsInnerUp: pain * 0.35,
      eyesSlit: Math.min(1, pain * 0.45 + w * 0.5),
      eyesClosed: e.eyesClosed ? 1 : Math.max(this.blink > 0 ? Math.sin(this.blink * Math.PI) : 0, w * 0.75),
      eyesWide: e.lidRetraction,
      noseWrinkle: Math.min(1, pain * 0.25 + w * 0.8),
      upperLipRaise: Math.min(1, pain * 0.2 + w * 0.6),
      lipStretch: Math.min(1, pain * 0.3 + w * 0.65),
      mouthOpen: Math.min(1, Math.max(e.mouthOpen, speak, e.tongueOut * 0.85)),
      platysma: w * 0.5,
      lipPress: pain > 0.3 && !e.speaking ? pain * 0.25 : 0.08,
      tongueOut: e.tongueOut,
    }
    for (const [name, value] of Object.entries(target) as [GpuMorph, number][]) {
      const cur = this.morphNow.get(name) ?? 0
      const next = name === 'eyesClosed' && !e.eyesClosed ? value : cur + (value - cur) * (1 - Math.exp(-dt * 12))
      if (Math.abs(next - cur) > 1e-4) busy = true
      this.morphNow.set(name, next)
      h.setMorph(name, next)
    }

    // the abdomen rises with each breath
    const belly = this.breathe * 0.09 * this.breathDepth
    h.setMorph('belly', belly)
    this.clothes?.setBelly(belly)

    // eyes: look at the examiner (the camera), the ceiling, or down
    const look = e.lookAt ?? 'camera'
    for (const pivot of [h.eyes.left, h.eyes.right]) {
      if (look === 'none') continue
      const wp = pivot.getWorldPosition(new THREE.Vector3())
      let dir: THREE.Vector3
      if (look === 'camera') dir = this.stage.camera.position.clone().sub(wp)
      else {
        const headQ = h.bones.head.getWorldQuaternion(new THREE.Quaternion())
        dir = new THREE.Vector3(0, look === 'up' ? 0.25 : -0.45, 1).applyQuaternion(headQ)
      }
      const parentQ = pivot.parent!.getWorldQuaternion(new THREE.Quaternion())
      const local = dir.normalize().applyQuaternion(parentQ.invert())
      // clamp to a natural range of eye movement
      local.x = THREE.MathUtils.clamp(local.x, -0.42, 0.42)
      local.y = THREE.MathUtils.clamp(local.y, -0.3, 0.32)
      local.z = Math.max(0.6, local.z)
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), local.normalize())
      pivot.quaternion.slerp(q, 1 - Math.exp(-dt * 10))
    }
    // breathing and blinking keep the picture alive at a gentler frame rate
    return busy ? true : 'idle'
  }

  dispose() {
    this.disposed = true
    this.blanket?.dispose()
    this.hair?.dispose()
    this.clothes?.dispose()
    this.human?.dispose()
    this.set.dispose()
    this.stage.dispose()
  }
}
