import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * One WebGL canvas with soft studio lighting (a procedural room environment, no
 * downloads), a shadow-casting key light, orbit/pinch camera controls and an
 * on-demand render loop that sleeps when nothing moves.
 */
/** Touch-first or low-memory devices, where the GPU and memory are tight. */
export function isLiteDevice(): boolean {
  try {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    return coarse || (mem !== undefined && mem <= 4)
  } catch {
    return false
  }
}

export interface StageOptions {
  /** Scene colour, or null for a transparent canvas (portraits) */
  background?: THREE.ColorRepresentation | null
  /** Max device pixel ratio (phones render at up to 2×) */
  maxDpr?: number
  controls?: boolean
}

/** Return true while animating, 'idle' for gentle ambient motion (rendered at ~20 fps). */
export type FrameFn = (dt: number, t: number) => boolean | 'idle' | void

/** A second view drawn into part of the same canvas (picture in picture). */
export interface Viewport {
  camera: THREE.PerspectiveCamera
  /** Where to draw it, in CSS pixels from the canvas's top-left; null skips it this frame */
  rect(): { x: number; y: number; w: number; h: number } | null
  /** Update the camera just before drawing */
  before?(): void
}

const liveStages = new Set<Stage3D>()
/** Re-render every live canvas (e.g. when a texture finishes loading). */
export function invalidateStages() {
  for (const s of liveStages) s.invalidate()
}

export class Stage3D {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200)
  readonly controls: OrbitControls | null
  readonly key: THREE.DirectionalLight
  readonly rim: THREE.DirectionalLight
  private readonly maxDpr: number
  /** Running on a phone, tablet or low-memory machine: no shadows or multisampling */
  readonly lite: boolean
  private readonly frameFns = new Set<FrameFn>()
  private readonly viewports = new Set<Viewport>()
  private readonly afterFns = new Set<() => void>()
  private raf = 0
  private last = 0
  private lastRender = 0
  private alive = true
  private dirty = true
  private readonly ro: ResizeObserver
  private readonly env: THREE.Texture

  readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, opts: StageOptions = {}) {
    this.canvas = canvas
    const transparent = opts.background === null
    // phones, tablets and low-memory machines get a lighter renderer: no shadow maps (half the
    // shader programs to compile), no multisampling, fewer pixels
    this.lite = isLiteDevice()
    const dense = (window.devicePixelRatio || 1) >= 2
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lite && !dense, alpha: transparent, powerPreference: this.lite ? 'default' : 'high-performance', preserveDrawingBuffer: false })
    if (transparent) this.renderer.setClearColor(0x000000, 0)
    // checking each shader for errors makes the page wait for every compile (slow on Windows); development only
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV
    this.maxDpr = Math.min(opts.maxDpr ?? 2, this.lite ? 1.5 : 2)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.shadowMap.enabled = !this.lite
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // the shadow map is redrawn when something moves, not on every idle breath
    this.renderer.shadowMap.autoUpdate = false

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.scene.environment = this.env
    this.scene.environmentIntensity = 0.68
    this.scene.background = transparent ? null : new THREE.Color(opts.background ?? '#0b1220')

    // Key light from above-front-left of the patient, soft shadows
    this.key = new THREE.DirectionalLight('#fff4ea', 1.85)
    this.key.position.set(-6, 14, 12)
    this.key.castShadow = true
    this.key.shadow.mapSize.set(1024, 1024)
    this.key.shadow.bias = -0.0004
    this.key.shadow.normalBias = 0.02
    this.key.shadow.radius = 4
    const cam = this.key.shadow.camera
    cam.left = -12
    cam.right = 12
    cam.top = 12
    cam.bottom = -12
    cam.near = 1
    cam.far = 60
    this.scene.add(this.key, this.key.target)
    // Cool rim light from behind to separate the silhouette from the background
    this.rim = new THREE.DirectionalLight('#cfe0ff', 0.9)
    this.rim.position.set(8, 10, -14)
    this.scene.add(this.rim)
    this.scene.add(new THREE.HemisphereLight('#f4f1ea', '#3b3a38', 0.42))

    this.controls = opts.controls === false ? null : new OrbitControls(this.camera, canvas)
    if (this.controls) {
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.09
      this.controls.enablePan = false
      this.controls.rotateSpeed = 0.7
      this.controls.zoomSpeed = 0.8
      this.controls.addEventListener('change', () => this.invalidate())
    }

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
    liveStages.add(this)
  }

  /**
   * Pixels per CSS pixel: the screen's density, but never more than about two
   * million pixels in all (a high-density laptop screen would otherwise draw four
   * or five million every frame), scaled down further if frames run slow.
   */
  private pixelRatio(w: number, h: number) {
    const budget = this.lite ? 1.1e6 : 2.1e6
    const fit = Math.sqrt(budget / Math.max(1, w * h))
    return Math.max(0.75, Math.min(this.maxDpr, window.devicePixelRatio || 1, fit) * this.dprScale)
  }

  resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    const dpr = this.pixelRatio(w, h)
    if (dpr !== this.renderer.getPixelRatio()) this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.invalidate()
  }

  /** Request a render on the next frame. */
  invalidate() {
    this.dirty = true
  }

  /** Called every frame while registered; return true to keep the loop awake. */
  onFrame(fn: FrameFn) {
    this.frameFns.add(fn)
    this.invalidate()
    return () => this.frameFns.delete(fn)
  }

  /** Draw an extra view into part of the canvas after each render. */
  addViewport(v: Viewport) {
    this.viewports.add(v)
    this.invalidate()
    return () => {
      this.viewports.delete(v)
      this.invalidate()
    }
  }

  /** Called after each rendered frame (e.g. to move HTML labels with the camera). */
  onAfterRender(fn: () => void) {
    this.afterFns.add(fn)
    return () => this.afterFns.delete(fn)
  }

  private loop(now: number) {
    if (!this.alive) return
    // cap long gaps (a background tab) but keep animations in real time on a slow device
    const dt = Math.min(0.12, (now - (this.last || now)) / 1000)
    this.last = now
    let busy = false
    let idle = false
    for (const fn of this.frameFns) {
      const r = fn(dt, now / 1000)
      if (r === true) busy = true
      else if (r === 'idle') idle = true
    }
    if (this.controls?.update()) busy = true
    if (busy || this.dirty || (idle && now - this.lastRender > 50)) {
      if (busy) this.adapt(now)
      // shadows follow every real movement, and only every third idle frame
      this.renderer.shadowMap.needsUpdate = busy || this.dirty || this.idleFrames++ % 3 === 0
      this.renderer.render(this.scene, this.camera)
      if (this.viewports.size) this.renderViewports()
      this.dirty = false
      this.lastRender = now
      for (const fn of this.afterFns) fn()
    }
    this.raf = requestAnimationFrame(this.loop)
  }

  /**
   * Adaptive resolution: if continuous animation runs well below 60 fps (an older
   * phone), render fewer pixels; step back up when there's headroom again.
   */
  private frameTimes: number[] = []
  private lastBusy = 0
  private dprScale = 1
  private idleFrames = 0
  private adapt(now: number) {
    if (this.lastBusy && now - this.lastBusy < 250) this.frameTimes.push(now - this.lastBusy)
    this.lastBusy = now
    if (this.frameTimes.length < 40) return
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    this.frameTimes = []
    const next = avg > 30 ? Math.max(0.5, this.dprScale - 0.2) : avg < 18 ? Math.min(1, this.dprScale + 0.1) : this.dprScale
    if (next !== this.dprScale) {
      this.dprScale = next
      this.resize()
    }
  }

  private renderViewports() {
    const r = this.renderer
    const W = this.canvas.clientWidth
    const H = this.canvas.clientHeight
    // the shadow map from the main render is still valid
    r.shadowMap.needsUpdate = false
    r.setScissorTest(true)
    for (const vp of this.viewports) {
      const rect = vp.rect()
      if (!rect || rect.w < 2 || rect.h < 2) continue
      vp.before?.()
      vp.camera.aspect = rect.w / rect.h
      vp.camera.updateProjectionMatrix()
      const y = H - rect.y - rect.h
      r.setViewport(rect.x, y, rect.w, rect.h)
      r.setScissor(rect.x, y, rect.w, rect.h)
      r.render(this.scene, vp.camera)
    }
    r.setScissorTest(false)
    r.setViewport(0, 0, W, H)
  }

  /**
   * Compile every shader the scene uses now, off the main thread where the browser
   * allows, then draw one frame to build the shadow variants. Done before the scene
   * is shown, so no later change of view or prop stalls the page on a compile.
   */
  async compileAll() {
    try {
      await this.renderer.compileAsync(this.scene, this.camera)
    } catch {
      /* compiles on first use instead */
    }
    if (!this.alive) return
    this.renderer.shadowMap.needsUpdate = true
    this.renderer.render(this.scene, this.camera)
    this.invalidate()
  }

  dispose() {
    liveStages.delete(this)
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.controls?.dispose()
    this.env.dispose()
    this.renderer.dispose()
    // give the context back once the canvas has left the page (browsers only allow a handful at once);
    // a canvas that stays, e.g. React re-running an effect, keeps it for the next renderer
    const renderer = this.renderer
    const canvas = this.canvas
    window.setTimeout(() => {
      if (!canvas.isConnected) renderer.forceContextLoss()
    }, 0)
  }
}
