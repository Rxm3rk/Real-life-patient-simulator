import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * One WebGL canvas with soft studio lighting (a procedural room environment, no
 * downloads), a shadow-casting key light, orbit/pinch camera controls and an
 * on-demand render loop that sleeps when nothing moves.
 */
export interface StageOptions {
  background?: THREE.ColorRepresentation
  /** Max device pixel ratio (phones render at up to 2×) */
  maxDpr?: number
  controls?: boolean
}

/** Return true while animating, 'idle' for gentle ambient motion (rendered at ~30 fps). */
export type FrameFn = (dt: number, t: number) => boolean | 'idle' | void

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
  private readonly frameFns = new Set<FrameFn>()
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
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false })
    this.renderer.setPixelRatio(Math.min(opts.maxDpr ?? 2, window.devicePixelRatio || 1))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.scene.environment = this.env
    this.scene.environmentIntensity = 0.55
    this.scene.background = new THREE.Color(opts.background ?? '#0b1220')

    // Key light from above-front-left of the patient, soft shadows
    this.key = new THREE.DirectionalLight('#fff4ea', 2.1)
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
    this.scene.add(new THREE.HemisphereLight('#f4f1ea', '#3b3a38', 0.35))

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

  resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
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

  private loop(now: number) {
    if (!this.alive) return
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000)
    this.last = now
    let busy = false
    let idle = false
    for (const fn of this.frameFns) {
      const r = fn(dt, now / 1000)
      if (r === true) busy = true
      else if (r === 'idle') idle = true
    }
    if (this.controls?.update()) busy = true
    if (busy || this.dirty || (idle && now - this.lastRender > 32)) {
      this.renderer.render(this.scene, this.camera)
      this.dirty = false
      this.lastRender = now
    }
    this.raf = requestAnimationFrame(this.loop)
  }

  dispose() {
    liveStages.delete(this)
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.controls?.dispose()
    this.env.dispose()
    this.renderer.dispose()
  }
}
