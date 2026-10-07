import * as THREE from 'three'
import type { HerniaPhase } from '../anatomy/Body'
import type { RegionId } from '../anatomy/bodyModel'
import type { Appearance, HerniaBulge } from '../anatomy/types'
import { anatomyOf, type Anatomy } from './anatomy'
import { loadBase, loadBody, type HumanBase } from './assets'
import { createGarments, type GarmentName, type Garments } from './garments'
import { createHair, type HairModel } from './hair'
import { computeNormals, createHuman, type GpuMorph, type HumanModel } from './human'
import { createMaterials, type PatientMaterials } from './materials'
import { axisRot, buildPose, Poser, wristAxis, type PoseSpec } from './poses'
import type { BedsideItems } from '../anatomy/Scene'
import { attachedItems, bedsideProps, type Attached, type Bedside } from './bedside'
import { createExaminerHand, createObsChart, createStethoscope, type ExaminerHand, type Stethoscope } from './props'
import { blanketMaterial, buildBlanket, createRoom, createSet, type ExamSet, type SetKind } from './sets'
import { appearanceSigns, applyGrid, applyVeins, herniaBulges, herniaSize, SignLayer, type LiveBulge, type Patch, type Segment, type Vein } from './signs'
import { Stage3D } from './stage'

/**
 * Everything the examination screens need from the 3D patient: placing them
 * on a bed, couch or the clinic floor, poses, clothing, expressions, a living
 * idle (breathing, blinking, eyes that follow you), camera shots and picking.
 */

/** Where a blanket over a lying patient starts (it always runs to the feet). */
export type BlanketFrom = 'waist' | 'thighs' | 'midThigh' | 'knees'

export interface ClothingState {
  briefs?: boolean
  /** Modesty towel over the genitals */
  drape?: boolean
  gownTop?: boolean
  /** The gown lifted above the umbilicus (groin examination) */
  gownUp?: boolean
  chestBand?: boolean
  gownSkirt?: boolean
  /** Blanket over a lying patient, from a body landmark or a fraction of the bed (0 = head end, 1 = feet); null = none */
  blanketFrom?: BlanketFrom | number | null
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
  private blanket: { object: THREE.Object3D; material: THREE.Material; dispose(): void } | null = null
  private blanketFrom: BlanketFrom | number | null = null
  /** The blanket is laid once the patient has settled into a new position */
  private blanketPending = false
  private blanketFade = 1
  /** Where the patient is being moved to (bed back rest, body placement) */
  private placeTarget = { pos: new THREE.Vector3(), rotY: 0, backrest: 0 }
  private backrestNow = 0
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
  private camTween: {
    from: THREE.Vector3
    fromT: THREE.Vector3
    to: THREE.Vector3
    toT: THREE.Vector3
    t: number
    fovFrom: number
    fovTo: number
    /** re-aim while the patient is still moving into position */
    follow?: () => Shot
  } | null = null
  private nextBlink = 2
  private blink = 0
  private breathe = 0
  /** respiratory excursion of the abdomen (0 in peritonitis: "doesn't move with respiration") */
  breathDepth = 1
  /** Clinical signs on the skin (scars, hernias, bruising…) and touch feedback */
  readonly signs = new SignLayer()
  /** Surface anatomy of this patient's rest-pose body */
  anatomy: Anatomy | null = null
  private hernias: { id: string; h: HerniaBulge }[] = []
  /** Signs from the patient's appearance, and those a station adds (leg ulcers, a goitre, a breast lump…) */
  private baseSigns: { patches: Patch[]; segments: Segment[]; bulges: LiveBulge[] } = { patches: [], segments: [], bulges: [] }
  /** 0..1 envelope of a swallow in progress (a goitre rises with it) */
  swallowNow = 0
  private swallowT = -1
  /** fine postural tremor of the outstretched hands, 0..1 */
  private tremor = 0
  private eyeRest: THREE.Vector3[] = []
  private herniaPhase: HerniaPhase = 'rest'
  private coughT = -1
  /** a wince that peaks and fades (e.g. when you press on a tender spot) */
  private winceT = -1
  private wincePeak = 0
  /** 0..1: the flap of asterixis (wrists drop, then snap back) */
  private flap = 0
  private vitals = { hr: 80, rr: 14 }
  /** Rest-pose normals (per compact vertex), to orient props on the skin */
  private restNormals: Float32Array | null = null
  private hand: ExaminerHand | null = null
  private steth: Stethoscope | null = null
  private chart: ReturnType<typeof createObsChart> | null = null
  private attached: Attached | null = null
  private cannula: THREE.Object3D | null = null
  private bedside: Bedside | null = null
  private bedsideItems: (BedsideItems & { drip?: boolean }) | null = null
  private lineEnd = new THREE.Vector3(Infinity, 0, 0)
  private touch: { c: number; rest: THREE.Vector3; t: number; depth: number; hold: number; mode: 'palm' | 'fingertips'; taps: number } | null = null
  private listenAt: { c: number; rest: THREE.Vector3 } | null = null
  private readonly appearance: Appearance
  private disposed = false
  /** World matrices (and the skinned mesh's bind inverse) are refreshed at most once per change */
  private matrixEpoch = 0
  private syncedEpoch = -1

  constructor(
    canvas: HTMLCanvasElement,
    opts: {
      appearance: Appearance
      set: SetKind
      /** Scene colour, or null for a transparent canvas */
      background: string | null
      dark: boolean
      /** Just the patient: no room or furniture (portraits) */
      bare?: boolean
      /** Orbit and zoom with the pointer (default on) */
      controls?: boolean
      maxDpr?: number
    },
  ) {
    this.appearance = opts.appearance
    this.stage = new Stage3D(canvas, { background: opts.background, controls: opts.controls, maxDpr: opts.maxDpr })
    if (!opts.bare) this.stage.scene.add(createRoom(opts.dark))
    this.set = createSet(opts.set)
    if (!opts.bare) this.stage.scene.add(this.set.group)
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
    this.mats = createMaterials(a, this.signs.u)
    const human = createHuman(base, body, {
      materials: this.mats.parts,
      eyeMaterial: this.mats.eye,
      distension: a.distension ? [0, 0.35, 0.65, 1][a.distension] : 0,
      navel: a.umbilicus === 'everted' ? 'out' : a.umbilicus === 'deep' ? 'in' : undefined,
    })
    this.human = human
    this.hair = createHair(human, base, a)
    if (this.hair) human.root.add(this.hair.object)
    this.anatomy = anatomyOf(human, base)
    this.set.fitTo?.(human)
    this.clothes = createGarments(human, base, a, this.signs.u, this.anatomy)
    human.geometry.setAttribute('aCover', new THREE.BufferAttribute(this.clothes.cover, 3))
    this.anchor.add(human.root)
    this.poser = new Poser(human)
    this.restNormals = computeNormals(human.positions, base.index, base.renderToCompact, base.meta.compactCount)
    // what's on the patient: a stoma, a cannula, oxygen
    this.attached = attachedItems({
      stoma: a.stoma,
      lines: a.lines,
      A: this.anatomy,
      h: human,
      surface: (rest) => {
        const c = this.nearestCompact(rest)
        const n = this.restNormals!
        const P = human.positions
        return { point: new THREE.Vector3(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]), normal: new THREE.Vector3(n[c * 3], n[c * 3 + 1], n[c * 3 + 2]) }
      },
      noseTip: this.restLandmark('noseTip'),
      chin: this.restLandmark('chin'),
    })
    for (const [bone, o] of this.attached.onBones) {
      o.position.sub(human.rest[bone].head)
      o.traverse((x) => ((x as THREE.Mesh).isMesh ? (x.castShadow = true) : null))
      human.bones[bone].add(o)
      if (bone.startsWith('hand_') || bone.startsWith('lowerarm_')) this.cannula = o
    }
    this.hand = createExaminerHand(human, base)
    this.steth = createStethoscope()
    this.stage.scene.add(this.hand.object, this.steth.object)
    if (this.set.kind === 'bed') {
      // the obs chart hangs on the foot of the bed, facing the examiner
      this.chart = createObsChart()
      this.chart.object.position.set(-2.4, 7.6, 10.3)
      this.chart.object.rotation.set(-0.12, -0.35, 0)
      this.stage.scene.add(this.chart.object)
    }
    this.initSigns()
    this.applyPose(true)
    this.stage.invalidate()
  }

  /* ----------------------------------------------------------------- signs */

  private initSigns() {
    const A = this.anatomy!
    const a = this.appearance
    const fromLook = appearanceSigns(a, A)
    const bulges: LiveBulge[] = []
    herniaBulges(a.hernias ?? [], A).forEach((b) => {
      this.hernias.push({ id: b.id, h: b.hernia })
      bulges.push({ id: b.id, at: b.at, r: b.r, h: b.h, sx: b.sx, sy: b.sy, target: herniaSize(b.hernia, this.herniaPhase) })
    })
    if (a.visiblePulsation) {
      // an expansile epigastric pulsation just above and left of the umbilicus
      const at = A.onSkin(A.navel.clone().lerp(A.xiphoid, 0.3).add(new THREE.Vector3(0.1, 0, 0.3)))
      bulges.push({
        id: 'pulsation',
        at,
        r: 0.38,
        h: 0.05,
        drive: (b, t) => {
          const ph = (t * this.vitals.hr) / 60
          const f = ph - Math.floor(ph)
          b.k = b.target = 0.35 + 0.65 * Math.exp(-(((f - 0.12) / 0.09) ** 2))
        },
      })
    }
    if (a.visiblePeristalsis) {
      // slow waves travelling from the left upper quadrant towards the right iliac fossa
      const from = A.onSkin(new THREE.Vector3(A.mcl * 1.2, A.subcostalY + 0.3, A.navel.z + 0.3))
      const to = A.onSkin(new THREE.Vector3(-A.mcl * 1.1, A.transtubercularY - 0.4, A.navel.z + 0.3))
      bulges.push({
        id: 'peristalsis',
        at: from.clone(),
        r: 0.45,
        h: 0.06,
        sx: 1.5,
        drive: (b, t) => {
          const f = (t / 7) % 1
          b.at.copy(A.onSkin(from.clone().lerp(to, f).add(new THREE.Vector3(0, Math.sin(f * Math.PI) * 0.4, 0))))
          b.k = b.target = Math.sin(f * Math.PI) ** 2
        },
      })
    }
    this.baseSigns = { patches: fromLook.patches, segments: fromLook.segments, bulges }
    this.signs.setStatic(fromLook)
    this.signs.setBulges(bulges)
  }

  /** Add a station's signs to the patient's own (replacing any added before). */
  setExtraSigns(x: { patches?: Patch[]; segments?: Segment[]; bulges?: LiveBulge[]; veins?: Vein[] }) {
    const b = this.baseSigns
    this.signs.setStatic({ patches: [...b.patches, ...(x.patches ?? [])], segments: [...b.segments, ...(x.segments ?? [])] })
    this.signs.setBulges([...b.bulges, ...(x.bulges ?? [])])
    applyVeins(this.signs.u, x.veins ?? [])
    this.stage.invalidate()
  }

  /** Varicose veins fill on standing and empty when the leg is raised or a tourniquet controls them (0..1). */
  setVeinFill(v: number) {
    this.signs.u.uVeinFill.value = v
    this.stage.invalidate()
  }

  /** A swallow: the larynx (and a goitre with it) rises and falls. */
  swallow() {
    this.swallowT = 0
    this.stage.invalidate()
  }

  /** Fine tremor of the outstretched hands (thyrotoxicosis), 0..1. */
  setTremor(v: number) {
    this.tremor = v
    this.stage.invalidate()
  }

  /** Exophthalmos: the eyes sit forward in the orbits, 0..1. */
  setProptosis(v: number) {
    const h = this.human
    if (!h) return
    if (!this.eyeRest.length) this.eyeRest = [h.eyes.left.position.clone(), h.eyes.right.position.clone()]
    ;[h.eyes.left, h.eyes.right].forEach((e, i) => e.position.copy(this.eyeRest[i]).add(new THREE.Vector3(0, 0.02 * v, 0.045 * v)))
    this.stage.invalidate()
  }

  /** What's around the bed: a drip, a catheter bag, a vomit bowl, a walking frame. */
  setBedside(items: (BedsideItems & { drip?: boolean }) | null) {
    this.bedsideItems = items
    this.bedside?.group.removeFromParent()
    this.bedside?.dispose()
    this.bedside = null
    if (!items || this.set.kind !== 'bed') return
    this.bedside = bedsideProps(items, this.set)
    this.set.group.add(this.bedside.group)
    this.lineEnd.set(Infinity, 0, 0)
    this.stage.invalidate()
  }

  /** Move to another place: the couch, the clinic floor, a chair (the patient goes with you, instantly). */
  setSet(kind: SetKind) {
    if (kind === this.set.kind) return
    this.bedside?.dispose()
    this.bedside = null
    this.set.group.removeFromParent()
    this.set.dispose()
    this.set = createSet(kind)
    if (this.bedsideItems) this.setBedside(this.bedsideItems)
    if (this.human) this.set.fitTo?.(this.human)
    this.stage.scene.add(this.set.group)
    if (this.chart) this.chart.object.visible = kind === 'bed'
    this.applyPose(true)
    this.stage.invalidate()
  }

  /** Show the nine abdominal regions on the skin, tinting those already palpated. */
  setGrid(show: boolean, state: Partial<Record<RegionId, 'light' | 'deep'>> = {}) {
    if (!this.anatomy) return
    applyGrid(this.signs.u, this.anatomy, show, state)
    this.stage.invalidate()
  }

  /** Hernias show and swell as in the 2D body: at rest, with a cough, on standing, reduced, deep ring occluded. */
  setHerniaPhase(phase: HerniaPhase) {
    const prev = this.herniaPhase
    this.herniaPhase = phase
    if ((phase === 'cough' || phase === 'ring-cough') && prev !== phase) this.cough()
    else this.applyHerniaSizes()
  }

  private applyHerniaSizes() {
    for (const { id, h } of this.hernias) this.signs.size(id, herniaSize(h, this.herniaPhase))
    this.stage.invalidate()
  }

  /** The patient coughs: a quick breath in, then the trunk and head jerk forward. */
  cough() {
    this.coughT = 0
    this.stage.invalidate()
  }

  /** Keep the eyes open (a still portrait). */
  holdBlink() {
    this.nextBlink = Infinity
    this.blink = 0
  }

  /** A wince that peaks quickly and fades over a second or two. */
  wince(peak: number) {
    this.wincePeak = peak
    this.winceT = 0
    this.stage.invalidate()
  }

  /** The flap of asterixis: 0 wrists held back, 1 dropped forward. */
  setFlap(v: number) {
    this.flap = v
    this.stage.invalidate()
  }

  /** How far the tongue is out right now, 0..1 (a thyroglossal cyst follows it). */
  get tongueNow() {
    return this.morphNow.get('tongueOut') ?? 0
  }

  /** The skin vertex nearest a rest-pose point (for moving labels cheaply every frame). */
  nearestVertex(rest: THREE.Vector3) {
    return this.nearestCompact(rest)
  }

  /** Heart and respiratory rates drive pulsation and breathing. */
  setVitals(v: { hr?: number; rr?: number }) {
    Object.assign(this.vitals, v)
  }

  /* ------------------------------------------------------------ placement */

  private place(instant = false) {
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
    const T = this.placeTarget
    T.rotY = 0
    T.backrest = 0
    if (p.posture === 'supine') {
      T.pos.set(0, this.set.surfaceY - (pelvisY + backZ) - 0.12, this.set.headZ + 1.6 - (pelvisY - top))
    } else if (p.posture === 'recline45') {
      T.backrest = 45
      const hingeZ = this.set.headZ + (this.set.kind === 'bed' ? 7.95 : 7)
      // hip joint just in front of the hinge, a hand's breadth above the seat
      T.pos.set(0, this.set.surfaceY + 0.95 - pelvisY, hingeZ + 0.55)
    } else if (p.posture === 'sitChair') {
      // hips over the back of the seat, facing the examiner
      T.pos.set(0, this.set.surfaceY + 0.9 - pelvisY, -1.6)
    } else if (p.posture === 'sitEdge' || p.posture === 'sitUp') {
      // sit on the near (patient's-right-side) edge facing the examiner
      T.rotY = -Math.PI / 2
      T.pos.set(-(this.set.kind === 'bed' ? 3.2 : 2.2), this.set.surfaceY + 0.95 - pelvisY, 0.5)
    } else {
      T.pos.set(0, 0, 0)
    }
    if (instant) {
      this.anchor.position.copy(T.pos)
      this.anchor.rotation.set(0, T.rotY, 0)
      this.backrestNow = T.backrest
      this.set.setBackrest(T.backrest)
    }
  }

  /** Ease the bed and the patient's placement towards the target; true while moving. */
  private movePlacement(dt: number) {
    const T = this.placeTarget
    const k = 1 - Math.exp(-4.2 * dt)
    const a = this.anchor
    let moving = false
    if (a.position.distanceTo(T.pos) > 4e-3) {
      a.position.lerp(T.pos, k)
      moving = true
    } else a.position.copy(T.pos)
    if (Math.abs(a.rotation.y - T.rotY) > 2e-3) {
      a.rotation.y += (T.rotY - a.rotation.y) * k
      moving = true
    } else a.rotation.y = T.rotY
    if (Math.abs(this.backrestNow - T.backrest) > 0.15) {
      this.backrestNow += (T.backrest - this.backrestNow) * k
      moving = true
    } else this.backrestNow = T.backrest
    this.set.setBackrest(this.backrestNow)
    return moving
  }

  private applyPose(instant = false) {
    const h = this.human
    if (!h || !this.poser) return
    this.matrixEpoch++
    this.place(instant)
    this.poser.set(buildPose(h, this.pose), { instant, speed: 4.2 })
    this.refreshBlanket(instant)
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
    for (const k of ['briefs', 'drape', 'gownTop', 'gownUp', 'chestBand', 'gownSkirt'] as const) if (c[k] !== undefined) show[k] = c[k]
    this.clothes.show(show)
    if (this.mats && this.clothes) {
      const m = this.clothes.meshes
      this.mats.skin.uCoverOn.value.set(m.briefs.visible ? 1 : 0, m.gownTop.visible ? 1 : 0, m.gownUp.visible ? 1 : 0)
    }
    if (c.blanketFrom !== undefined && c.blanketFrom !== this.blanketFrom) {
      this.blanketFrom = c.blanketFrom
      this.refreshBlanket(true)
    }
    this.stage.invalidate()
  }

  /** Take the blanket off; a new one is laid over the patient once they've settled (straight away if `now`). */
  private refreshBlanket(now = false) {
    this.blanket?.object.removeFromParent()
    this.blanket?.dispose()
    this.blanket = null
    const lying = this.pose.posture === 'supine' || this.pose.posture === 'recline45'
    this.blanketPending = this.blanketFrom != null && lying
    if (now && this.blanketPending && !this.placing()) this.layBlanket(false)
  }

  private placing() {
    const T = this.placeTarget
    return this.anchor.position.distanceTo(T.pos) > 4e-3 || Math.abs(this.backrestNow - T.backrest) > 0.15 || (this.poser?.moving ?? false)
  }

  private layBlanket(fade: boolean) {
    const h = this.human
    this.blanketPending = false
    if (!h || this.blanketFrom == null) return
    this.matrixEpoch++
    this.syncMatrices()
    const len = 20
    // a reclining patient's blanket starts at the thighs (it can't climb the back rest)
    const bf = this.pose.posture === 'recline45' && this.blanketFrom === 'waist' ? 'thighs' : this.blanketFrom
    let from: number
    if (typeof bf === 'number') from = this.set.headZ + bf * len
    else {
      // anchored to this patient's own body, whatever their height
      const z = (n: string) => this.anchor.worldToLocal(this.landmark(n)).z
      const pubis = z('pubis')
      from = bf === 'waist' ? (z('navel') + pubis) / 2 : bf === 'thighs' ? pubis + 1.3 : bf === 'midThigh' ? pubis + 2.4 : z('kneeL') - 0.3
      from = this.anchor.localToWorld(new THREE.Vector3(0, 0, from)).z
    }
    const skirt = this.clothes?.meshes.gownSkirt
    this.blanket = buildBlanket(h, {
      surfaceY: this.set.surfaceY,
      fromZ: from,
      toZ: this.set.headZ + len,
      width: this.set.kind === 'bed' ? 8.6 : 6.4,
      parent: this.stage.scene,
      over: skirt?.visible ? [skirt] : [],
      material: this.blanketMaterial(),
    })
    this.stage.scene.add(this.blanket.object)
    this.blanketFade = fade ? 0 : 1
    this.blanket.material.opacity = this.blanketFade
    this.stage.invalidate()
  }

  /* ------------------------------------------------------------ expression */

  setExpression(e: ExpressionState) {
    Object.assign(this.expr, e)
    this.stage.invalidate()
  }

  /** Skin tints that change during an encounter (e.g. pallor as a patient shocks). */
  setSkin(values: Partial<{ jaundice: number; pallor: number; flush: number; cyanosis: number; sweat: number; mottle: number }>) {
    const u = this.mats?.skin
    if (!u) return
    const map = { jaundice: u.uJaundice, pallor: u.uPallor, flush: u.uFlush, cyanosis: u.uCyanosis, sweat: u.uSweat, mottle: u.uMottle } as const
    for (const [k, v] of Object.entries(values)) if (v !== undefined) map[k as keyof typeof map].value = v
    this.stage.invalidate()
  }

  /**
   * One leg below the knee: hair (0 = lost), shiny thin skin, and a colour
   * (pallor, dependent rubor, cyanosis) that deepens towards the foot.
   */
  setLeg(side: 'left' | 'right', v: { hair?: number; shiny?: number; tint?: [number, number, number]; tintAmount?: number }) {
    const u = this.mats?.skin
    const h = this.human
    if (!u || !h) return
    const i = side === 'right' ? 'x' : 'y'
    if (v.hair !== undefined) u.uLegHair.value[i] = v.hair
    if (v.shiny !== undefined) u.uShiny.value[i] = v.shiny
    const t = side === 'right' ? u.uLegTintR.value : u.uLegTintL.value
    if (v.tint !== undefined) t.set(v.tint[0], v.tint[1], v.tint[2], t.w)
    if (v.tintAmount !== undefined) t.w = v.tintAmount
    u.uLegY.value.set(h.rest.calf_l.head.y, this.restLandmark('medialMalleolusL').y)
    this.stage.invalidate()
  }

  /* --------------------------------------------------------------- camera */

  /** Move the camera to a shot. Pass a function to keep aiming at a patient who is still moving (e.g. lying back). */
  shot(shot: Shot | (() => Shot), instant = false) {
    const follow = typeof shot === 'function' ? shot : undefined
    const s = typeof shot === 'function' ? shot() : shot
    const cam = this.stage.camera
    const to = s.target.clone().add(s.dir.clone().normalize().multiplyScalar(s.dist))
    const controls = this.stage.controls
    if (instant || !controls) {
      cam.position.copy(to)
      if (s.fov) cam.fov = s.fov
      cam.updateProjectionMatrix()
      if (controls) {
        controls.target.copy(s.target)
        controls.update()
      } else cam.lookAt(s.target)
      this.camTween = null
    } else {
      this.camTween = { from: cam.position.clone(), fromT: controls.target.clone(), to, toT: s.target.clone(), t: 0, fovFrom: cam.fov, fovTo: s.fov ?? cam.fov, follow }
    }
    if (controls) {
      controls.minDistance = s.dist * 0.45
      controls.maxDistance = Math.max(s.dist * 2.2, 12)
    }
    this.stage.invalidate()
  }

  /** World position of a bone's head (e.g. a hand), following the pose. */
  boneWorld(name: string, out = new THREE.Vector3()) {
    const b = this.human?.bones[name]
    this.syncMatrices()
    return b ? b.getWorldPosition(out) : out.set(0, 0, 0)
  }

  /** A baked landmark on this patient's rest-pose body. */
  restLandmark(name: string) {
    const h = this.human!
    const c = (this.base!.meta.landmarks as Record<string, number>)[name]
    return new THREE.Vector3(h.positions[c * 3], h.positions[c * 3 + 1], h.positions[c * 3 + 2])
  }

  /**
   * A close-up of the face drawn into part of the canvas, so you can watch the
   * patient's face while you examine their abdomen. Returns a function that removes it.
   */
  faceView(rect: () => { x: number; y: number; w: number; h: number } | null) {
    const cam = new THREE.PerspectiveCamera(20, 1, 0.1, 100)
    const q = new THREE.Quaternion()
    return this.stage.addViewport({
      camera: cam,
      rect: () => (this.human ? rect() : null),
      before: () => {
        const h = this.human!
        h.bones.head.getWorldQuaternion(q)
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
        const target = this.landmark('noseTip').addScaledVector(up, 0.2).addScaledVector(fwd, -0.5)
        cam.position.copy(target).addScaledVector(fwd, 6.2).addScaledVector(up, 0.9)
        cam.up.copy(up)
        cam.lookAt(target)
      },
    })
  }

  /** Match the page's light or dark theme. */
  setBackground(color: string) {
    this.stage.scene.background = new THREE.Color(color)
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

  /**
   * Bring world matrices up to date outside the render loop (right after a pose
   * change). SkinnedMesh only refreshes its bind inverse in updateMatrixWorld.
   */
  private syncMatrices() {
    if (this.syncedEpoch === this.matrixEpoch) return
    this.stage.scene.updateMatrixWorld(true)
    this.syncedEpoch = this.matrixEpoch
  }

  /** A rest-pose point → world, skinned by the vertex nearest it (or a given compact vertex). */
  restToWorld(rest: THREE.Vector3, out = new THREE.Vector3(), compact?: number) {
    const h = this.human
    if (!h) return out.copy(rest)
    this.syncMatrices()
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

  /** The skin at a rest-pose point, now: world position and outward normal (following the pose). */
  surfaceAt(rest: THREE.Vector3, compact?: number) {
    const h = this.human!
    const c = compact ?? this.nearestCompact(rest)
    const point = this.restToWorld(rest, new THREE.Vector3(), c)
    const n = this.restNormals!
    const r = Math.max(0, h.compactToRender[c])
    const q = new THREE.Quaternion()
    h.mesh.skeleton.bones[h.geometry.attributes.skinIndex.getX(r)].getWorldQuaternion(q)
    const normal = new THREE.Vector3(n[c * 3], n[c * 3 + 1], n[c * 3 + 2]).applyQuaternion(q).normalize()
    return { point, normal, compact: c }
  }

  /** Towards the patient's head, a little towards their left shoulder (how a palpating hand lies). */
  private headward() {
    const up = this.landmark('sternalNotch').sub(this.landmark('pubis')).normalize()
    const left = this.landmark('asisL').sub(this.landmark('asisR')).normalize()
    return up.addScaledVector(left, 0.35).normalize()
  }

  /**
   * Your hand on the patient: laid flat and pressed in (palpation), fingertips pressed (pitting,
   * nodes), or resting while the other hand's finger taps it (percussion). The skin gives under it.
   */
  touchAt(rest: THREE.Vector3, kind: 'light' | 'deep' | 'percuss' | 'press' | 'pit' | 'feel') {
    if (!this.human) return
    const c = this.nearestCompact(rest)
    const spec = {
      light: { depth: 0.06, r: 0.45, hold: 0.45, mode: 'palm' as const, taps: 0 },
      deep: { depth: 0.15, r: 0.55, hold: 0.7, mode: 'palm' as const, taps: 0 },
      percuss: { depth: 0.015, r: 0.4, hold: 0.55, mode: 'palm' as const, taps: 2 },
      press: { depth: 0.07, r: 0.2, hold: 0.55, mode: 'fingertips' as const, taps: 0 },
      pit: { depth: 0.1, r: 0.2, hold: 1.2, mode: 'fingertips' as const, taps: 0 },
      // fingertips resting on a pulse while you count
      feel: { depth: 0.03, r: 0.18, hold: 2.2, mode: 'fingertips' as const, taps: 0 },
    }[kind]
    this.touch = { c, rest: rest.clone(), t: 0, depth: spec.depth, hold: spec.hold, mode: spec.mode, taps: spec.taps }
    // pitting oedema refills slowly after the thumb lifts
    this.signs.press(rest, { r: spec.r, depth: spec.depth, hold: spec.hold, release: kind === 'pit' ? 2.6 : 0.35 })
    this.stage.invalidate()
  }

  /** Rest the stethoscope on the skin at a rest-pose point (null takes it away). */
  listen(rest: THREE.Vector3 | null) {
    this.listenAt = rest ? { c: this.nearestCompact(rest), rest: rest.clone() } : null
    if (!rest && this.steth) this.steth.object.visible = false
    this.stage.invalidate()
  }

  /** Whether a canvas point (CSS pixels) is over the obs chart. */
  pickChart(x: number, y: number) {
    if (!this.chart) return false
    const c = this.stage.canvas
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2((x / c.clientWidth) * 2 - 1, -(y / c.clientHeight) * 2 + 1), this.stage.camera)
    return ray.intersectObject(this.chart.object, false).length > 0
  }

  private updateProps(dt: number) {
    let busy = false
    const hand = this.hand
    if (hand && this.touch) {
      const tc = this.touch
      tc.t += dt
      const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3
      const down = 0.18
      const up = 0.3
      const lift0 = 0.9
      let lift: number
      if (tc.t < down) lift = lift0 + (-tc.depth - lift0) * ease(tc.t / down)
      else if (tc.t < down + tc.hold) {
        lift = -tc.depth
        // percussion: the other hand's middle finger strikes the resting finger (the skin jolts)
        if (tc.taps) lift += Math.max(0, Math.sin(((tc.t - down) / tc.hold) * Math.PI * tc.taps)) * -0.012
      } else lift = -tc.depth + (lift0 + tc.depth) * ease((tc.t - down - tc.hold) / up)
      if (tc.t > down + tc.hold + up) {
        hand.object.visible = false
        this.touch = null
      } else {
        const s = this.surfaceAt(tc.rest, tc.c)
        const toward = this.headward()
        if (tc.mode === 'fingertips') {
          // finger pads on the point: shift the hand back along the fingers
          const f = toward.clone().addScaledVector(s.normal, -toward.dot(s.normal)).normalize()
          s.point.addScaledVector(f, -hand.tipReach)
        }
        hand.place(s.point, s.normal, toward, lift)
      }
      busy = true
    }
    // the giving set follows the cannula (re-routed only when it has moved)
    if (this.bedside && this.cannula && !busy) {
      const p = this.cannula.getWorldPosition(new THREE.Vector3())
      if (p.distanceTo(this.lineEnd) > 0.05) {
        this.lineEnd.copy(p)
        this.bedside.lineTo(p)
      }
    }
    if (this.steth && this.listenAt) {
      const s = this.surfaceAt(this.listenAt.rest, this.listenAt.c)
      // the tubing runs off towards the examiner on the patient's right
      const right = this.landmark('asisR').sub(this.landmark('asisL')).normalize()
      this.steth.place(s.point, s.normal, right)
      this.listenAt = null // placed; stays until listen(null)
    }
    return busy
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
    this.matrixEpoch++
    let busy = this.poser?.update(dt) ?? false
    if (this.movePlacement(dt)) busy = true
    // lay the blanket once the patient has settled, and let it fade in
    if (this.blanketPending && !busy) this.layBlanket(true)
    if (this.blanket && this.blanketFade < 1) {
      this.blanketFade = Math.min(1, this.blanketFade + dt / 0.35)
      this.blanket.material.opacity = this.blanketFade
      busy = true
    }

    // camera tween (ease in-out), re-aimed while the patient settles
    if (this.camTween) {
      const tw = this.camTween
      const settling = this.placing()
      if (tw.follow && (settling || tw.t < 1)) {
        const s = tw.follow()
        tw.toT.copy(s.target)
        tw.to.copy(s.target).add(s.dir.clone().normalize().multiplyScalar(s.dist))
      }
      tw.t = Math.min(1, tw.t + dt / 0.9)
      const k = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2
      this.stage.camera.position.lerpVectors(tw.from, tw.to, k)
      this.stage.controls?.target.lerpVectors(tw.fromT, tw.toT, k)
      this.stage.camera.fov = THREE.MathUtils.lerp(tw.fovFrom, tw.fovTo, k)
      this.stage.camera.updateProjectionMatrix()
      if (tw.t >= 1 && !(tw.follow && settling)) this.camTween = null
      busy = true
    }

    // blinking every few seconds
    this.nextBlink -= dt
    if (this.nextBlink <= 0) {
      this.blink = 1
      this.nextBlink = 2.5 + Math.random() * 4
    }
    this.blink = Math.max(0, this.blink - dt / 0.16)

    // a cough: in-breath, then the explosive out-breath flexes the trunk; hernias bulge at its height
    let cough = 0
    let coughMouth = 0
    if (this.coughT >= 0) {
      const ct = (this.coughT += dt)
      const was = ct - dt
      if (was < 0.3 && ct >= 0.3) this.applyHerniaSizes()
      cough = ct < 0.24 ? 0 : ct < 0.36 ? (ct - 0.24) / 0.12 : Math.max(0, 1 - (ct - 0.36) / 0.55)
      coughMouth = ct < 0.1 ? ct / 0.1 : ct < 0.5 ? 1 : Math.max(0, 1 - (ct - 0.5) / 0.3)
      if (ct > 1.2) this.coughT = -1
      busy = true
    }
    // a swallow: up in a third of a second, a moment at the top, then down
    if (this.swallowT >= 0) {
      const st = (this.swallowT += dt)
      this.swallowNow = st < 0.35 ? THREE.MathUtils.smoothstep(st, 0, 0.35) : st < 0.6 ? 1 : 1 - THREE.MathUtils.smoothstep(st, 0.6, 1.1)
      if (st > 1.1) {
        this.swallowT = -1
        this.swallowNow = 0
      }
      busy = true
    }
    // a passing wince
    let winceNow = 0
    if (this.winceT >= 0) {
      const wt = (this.winceT += dt)
      winceNow = wt < 0.12 ? this.wincePeak * (wt / 0.12) : this.wincePeak * Math.exp(-(wt - 0.12) * 1.3)
      if (wt > 0.12 && winceNow < 0.02) this.winceT = -1
      busy = true
    }
    if (this.poser) {
      const add = this.poser.additive
      // asterixis (the wrists drop forward) and a fine tremor, about each wrist's own flexion axis
      const shake = this.tremor > 0.01 ? this.tremor * (1.4 * Math.sin(t * 2 * Math.PI * 9.5) + 0.5 * Math.sin(t * 2 * Math.PI * 13.1 + 1.3)) : 0
      for (const side of ['l', 'r'] as const) {
        const name = `hand_${side}`
        const deg = 38 * this.flap + shake
        if (Math.abs(deg) > 0.01) {
          const k = wristAxis(h, side).applyQuaternion(this.poser.current(name))
          add.set(name, new THREE.Quaternion().setFromAxisAngle(k, THREE.MathUtils.degToRad(deg)))
        } else add.delete(name)
      }
      if (this.tremor > 0.01) busy = true
      if (cough > 0) {
        add.set('spine_02', axisRot('x', 7 * cough))
        add.set('spine_03', axisRot('x', 5 * cough))
        add.set('neck_01', axisRot('x', 7 * cough))
        add.set('head', axisRot('x', 6 * cough))
      } else for (const n of ['spine_02', 'spine_03', 'neck_01', 'head']) add.delete(n)
    }

    // breathing, visible as abdominal excursion
    this.breathe = (Math.sin(t * ((2 * Math.PI) / (60 / Math.max(6, this.vitals.rr)))) + 1) / 2
    const e = this.expr
    const pain = e.pain
    const w = Math.max(e.wince, cough * 0.8, winceNow)
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
      mouthOpen: Math.min(1, Math.max(e.mouthOpen, speak, e.tongueOut * 0.85, coughMouth * 0.45)),
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
    const sg = this.signs.update(dt, t)
    if (sg === 'busy') busy = true
    if (this.updateProps(dt)) busy = true
    // breathing and blinking keep the picture alive at a gentler frame rate
    return busy ? true : 'idle'
  }

  /* ------------------------------------------------------------ shaders */

  private blanketMat: THREE.MeshStandardMaterial | null = null
  private blanketMaterial() {
    return (this.blanketMat ??= blanketMaterial())
  }

  /**
   * Compile every shader this patient can need before they are shown: clothes they
   * aren't wearing yet, the examiner's hand, the stethoscope, the obs chart and the
   * blanket. A compile blocks the page (for long on Windows), so they all happen
   * behind the loading screen rather than on the first tap or change of view.
   */
  async precompile(opts: { props?: boolean } = {}) {
    await this.ready
    if (this.disposed || !this.human) return
    if (opts.props === false) return this.stage.compileAll()
    const revealed: THREE.Object3D[] = []
    const reveal = (o?: THREE.Object3D | null) =>
      o?.traverse((x) => {
        if (!x.visible) {
          x.visible = true
          revealed.push(x)
        }
      })
    if (this.clothes) for (const m of Object.values(this.clothes.meshes)) reveal(m)
    reveal(this.hand?.object)
    reveal(this.steth?.object)
    reveal(this.chart?.object)
    const scrap = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), this.blanketMaterial())
    scrap.castShadow = scrap.receiveShadow = true
    scrap.position.set(0, -50, 0)
    this.stage.scene.add(scrap)
    await this.stage.compileAll()
    scrap.removeFromParent()
    scrap.geometry.dispose()
    for (const o of revealed) o.visible = false
    this.stage.invalidate()
  }

  dispose() {
    this.disposed = true
    this.attached?.dispose()
    this.bedside?.dispose()
    this.hand?.dispose()
    this.steth?.dispose()
    this.chart?.dispose()
    this.blanket?.dispose()
    this.blanketMat?.dispose()
    this.hair?.dispose()
    this.clothes?.dispose()
    this.human?.dispose()
    this.set.dispose()
    this.stage.dispose()
  }
}
