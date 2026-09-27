import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { HerniaPhase } from '../../../anatomy/Body'
import { bodyDims, landmarks, REGION_ORDER, REGION_SHORT, type RegionId } from '../../../anatomy/bodyModel'
import type { Pt } from '../../../anatomy/geometry'
import type { Exposure } from '../../../anatomy/types'
import { abdoRegionAt, regionCentre } from '../../../anatomy3d/anatomy'
import { PatientScene, type ClothingState, type ExpressionState, type Shot as Shot3 } from '../../../anatomy3d/patientScene'
import type { Arms, PoseSpec, Posture } from '../../../anatomy3d/poses'
import type { SetKind } from '../../../anatomy3d/sets'
import { shotFor, type ShotName } from '../../../anatomy3d/shots'
import { bodyWarp, type BodyWarp } from '../../../anatomy3d/warp'
import { isClinic } from '../../../engine/setting'
import type { CaseDef, PulseGrade } from '../../../engine/types'
import { cn } from '../../../lib/utils'
import type { Zone } from '../station/types'
import type { Effect } from './Stage'

/**
 * The examination stage with a 3D patient. It speaks the same language as the
 * 2D stages (body-model points, regions, zones, effects), so the examination
 * logic is shared: taps on the body map back to body-model points (with the
 * region under the finger) or to the station's zones, and each effect is played
 * out on the patient: your hand pressing in, the percussing finger, the
 * stethoscope on the skin, fingertips feeling a pulse.
 */

export type View3D = 'bed' | 'hands' | 'face' | 'neck' | 'chest' | 'abdomen' | 'groin' | 'legs'

export interface StageHit {
  region: RegionId | null
  rest: THREE.Vector3
}

export interface PatientStageApi {
  /** Body-model point under a screen position (null off the body) */
  toBody(clientX: number, clientY: number): Pt | null
}

/** Where the patient is, how they're posed and dressed, and where the camera looks. */
export interface Staging {
  set: SetKind
  pose: PoseSpec
  clothing: ClothingState
  shot: ShotName | ((scene: PatientScene) => Shot3)
  expression?: ExpressionState
  herniaPhase?: HerniaPhase
}

/** A station zone on the 3D body: from a body-model point (through the warp) or placed directly. */
export interface Zone3D {
  zone: Zone
  rest?: (scene: PatientScene, warp: BodyWarp) => THREE.Vector3
  /** radius in decimetres (default: the 2D radius converted from body units) */
  r?: number
}

export interface PatientStage3DProps {
  c: CaseDef
  /** Abdominal examination views (ignored when `staging` is given) */
  view?: View3D
  staging?: Staging
  exposure: Exposure
  pain: number
  /** A change of `key` makes the patient wince (strength `peak`) and say `says` */
  reaction?: { peak: number; key: number; says?: string }
  herniaPhase?: HerniaPhase
  effects: Effect[]
  showRegions?: boolean
  showLandmarks?: boolean
  regionState?: Partial<Record<RegionId, 'light' | 'deep'>>
  onPoint?: (pt: Pt, hit: StageHit | null) => void
  /** Station zones: a tap picks the nearest one */
  zones?: Zone3D[]
  onZone?: (z: Zone, pt: Pt) => void
  onMiss?: (pt: Pt) => void
  showZones?: boolean
  highlight?: string | null
  /** Fingertips on a pulse: throbs at the heart rate, as strong as the grade */
  feel?: { at: Pt; grade: PulseGrade; key: number } | null
  /** Set up this station's signs once the patient has loaded */
  onReadyScene?: (scene: PatientScene, warp: BodyWarp) => void
  /** Station visuals that change (leg colour in Buerger's test, vein filling, tremor…) */
  live?: (scene: PatientScene) => void
  /** Changing keys play a cough or a swallow */
  cues?: { cough?: number; swallow?: number }
  cursor?: string
  /** Show the patient's face in a corner while examining elsewhere */
  faceInset?: boolean
  faceLabel?: string
  /** Hands view: backs, palms, or arms outstretched with the wrists cocked back */
  handView?: 'dorsal' | 'palms' | 'outstretched'
  /** 0..1: the flap of asterixis */
  flap?: number
  mouthOpen?: number
  tongueOut?: number
  lookAt?: 'camera' | 'up' | 'down'
  compact?: boolean
  onApi?: (api: PatientStageApi | null) => void
  /** WebGL failed (or the context was lost): the caller falls back to the 2D stage */
  onUnavailable?: (reason: string) => void
  children?: ReactNode
}

const SHOT_OF: Record<View3D, ShotName> = { bed: 'overview', hands: 'hands', face: 'face', neck: 'neck', chest: 'chest', abdomen: 'abdomen', groin: 'groin', legs: 'legs' }
/** Body-model units per decimetre (1 cm ≈ 4.35 units) */
const UNITS_PER_DM = 43.5

function postureFor(view: View3D, prev: Posture): Posture {
  if (view === 'abdomen' || view === 'groin' || view === 'legs') return 'supine'
  if (view === 'bed') return prev
  return 'recline45'
}

export function clothingFor(exposure: Exposure, female: boolean): ClothingState {
  const none = { gownTop: false, gownUp: false, gownSkirt: false, chestBand: false, briefs: false, drape: false }
  switch (exposure) {
    case 'abdomen':
      return { ...none, chestBand: female, briefs: true, blanketFrom: 'thighs' }
    case 'groin':
      // the abdominal examination's hernial orifices: the gown already off (a woman's chest covered)
      return { ...none, chestBand: female, drape: true, blanketFrom: 'midThigh' }
    case 'standing-groin':
      return { ...none, gownUp: true, drape: true, blanketFrom: null }
    case 'torso':
      return { ...none, briefs: true, blanketFrom: 'waist' }
    case 'legs':
      return { ...none, gownTop: true, briefs: true, blanketFrom: null }
    default:
      return { ...none, gownTop: true, gownSkirt: true, briefs: true, blanketFrom: 'waist' }
  }
}

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

interface Label {
  id: string
  rest: THREE.Vector3
  text: string
  kind: 'landmark' | 'region' | 'note' | 'zone' | 'hot' | 'pulse'
  grade?: PulseGrade
}

export function PatientStage3D(props: PatientStage3DProps) {
  const { c, view = 'bed', staging, exposure, pain, reaction, herniaPhase = 'rest', effects, showRegions = false, showLandmarks = false, regionState, cursor, faceInset, faceLabel, handView, flap = 0, mouthOpen = 0, tongueOut = 0, lookAt = 'camera', compact, zones, showZones, highlight, feel, live, cues } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const faceRef = useRef<HTMLDivElement>(null)
  const labelEls = useRef(new Map<string, HTMLDivElement>())
  const sceneRef = useRef<PatientScene | null>(null)
  const warpRef = useRef<BodyWarp | null>(null)
  const postureRef = useRef<Posture>('recline45')
  const lastTap = useRef<{ pt: Pt; rest: THREE.Vector3 } | null>(null)
  const seenFx = useRef(new Set<number>())
  const listenKey = useRef('')
  const propsRef = useRef(props)
  propsRef.current = props
  const [ready, setReady] = useState(false)
  const [notes, setNotes] = useState<Label[]>([])
  const [bubble, setBubble] = useState<string | undefined>()
  const a = c.patient.appearance
  const female = a.sex === 'female'
  const lm2 = useMemo(() => landmarks(a, bodyDims(a)), [a])

  // frame the shot for this canvas shape: portrait screens need to stand further back
  const fit = (s: Shot3): Shot3 => {
    const canvas = canvasRef.current
    const aspect = canvas && canvas.clientHeight ? canvas.clientWidth / canvas.clientHeight : 1.4
    const k = aspect < 1.1 ? Math.min(2.1, 1.25 / Math.max(0.45, aspect)) : 1
    return { ...s, dist: s.dist * k }
  }
  const shotOf = (scene: PatientScene) => {
    const st = propsRef.current.staging
    const sh = st ? st.shot : SHOT_OF[propsRef.current.view ?? 'bed']
    return fit(typeof sh === 'function' ? sh(scene) : shotFor(scene, sh))
  }

  /* --------------------------------------------------------- the scene */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: PatientScene
    try {
      const set = propsRef.current.staging?.set ?? (isClinic(c.setting) ? 'couch' : 'bed')
      scene = new PatientScene(canvas, { appearance: a, set, background: cssVar('--stage', '#0b1220'), dark: true })
    } catch (e) {
      propsRef.current.onUnavailable?.(String(e))
      return
    }
    sceneRef.current = scene
    if (import.meta.env.DEV) (window as unknown as { __stage3d?: PatientScene }).__stage3d = scene
    let alive = true
    const lost = (e: Event) => {
      e.preventDefault()
      propsRef.current.onUnavailable?.('WebGL context lost')
    }
    canvas.addEventListener('webglcontextlost', lost)
    scene.setVitals({ hr: c.vitals.hr, rr: c.vitals.rr })
    scene.ready
      .then(() => {
        if (!alive) return
        const A = scene.anatomy!
        const warp = bodyWarp(lm2, A, {
          vertexY: scene.restLandmark('vertex').y,
          chinY: scene.restLandmark('chin').y,
          knee: scene.restLandmark('kneeL'),
          ankle: scene.restLandmark('medialMalleolusL'),
        })
        warpRef.current = warp
        const p = propsRef.current
        if (p.staging) {
          scene.setPose(p.staging.pose, true)
          scene.setClothing(p.staging.clothing)
        } else {
          postureRef.current = postureFor(p.view ?? 'bed', 'recline45')
          scene.setPose({ posture: postureRef.current }, true)
          scene.setClothing(clothingFor(p.exposure, female))
        }
        // the drip, catheter bag, vomit bowl… around the bed
        scene.setBedside({ ...c.bedside, drip: !!(c.bedside?.drip || a.lines?.drip) })
        p.onReadyScene?.(scene, warp)
        scene.shot(shotOf(scene), true)
        setReady(true)
        propsRef.current.onApi?.({
          toBody(clientX, clientY) {
            const r = canvas.getBoundingClientRect()
            const hit = scene.pick(clientX - r.left, clientY - r.top)
            return hit && warpRef.current ? warpRef.current.to2(hit.rest) : null
          },
        })
      })
      .catch((e) => propsRef.current.onUnavailable?.(String(e)))

    // follow the light/dark theme
    const paint = () => scene.setBackground(cssVar('--stage', '#0b1220'))
    const mo = new MutationObserver(paint)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    mq?.addEventListener('change', paint)

    // HTML labels ride along with the camera
    const offAfter = scene.stage.onAfterRender(() => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      for (const el of labelEls.current.values()) {
        const rest = el.dataset.rest?.split(',').map(Number)
        if (!rest || !scene.human) continue
        const world = scene.restToWorld(new THREE.Vector3(rest[0], rest[1], rest[2]), new THREE.Vector3(), +(el.dataset.c ?? 0))
        const s = scene.project(world)
        const on = s.visible && s.x > -40 && s.y > -40 && s.x < w + 40 && s.y < h + 40
        el.style.opacity = on ? '' : '0'
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`
      }
    })

    return () => {
      alive = false
      offAfter()
      mo.disconnect()
      mq?.removeEventListener('change', paint)
      canvas.removeEventListener('webglcontextlost', lost)
      propsRef.current.onApi?.(null)
      sceneRef.current = null
      warpRef.current = null
      scene.dispose()
    }
    // one scene per patient
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id])

  /* --------------------------------------------------- pose and camera */

  // abdominal views
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !ready || staging) return
    const posture = postureFor(view, postureRef.current)
    postureRef.current = posture
    const arms: Arms | undefined = view === 'hands' ? (handView === 'palms' ? 'forwardPalmsUp' : 'forward') : undefined
    // "hold your arms out, cock your wrists back and spread your fingers"
    const out = view === 'hands' && handView === 'outstretched'
    scene.setPose({ posture, arms, wrists: out ? -55 : undefined, spread: out })
    scene.shot(() => shotOf(scene))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, handView, ready, !!staging])

  useEffect(() => {
    if (ready && !staging) sceneRef.current?.setClothing(clothingFor(exposure, female))
  }, [exposure, female, ready, staging])

  // station staging: a new place, pose, clothes or shot
  const stagingKey = staging ? JSON.stringify({ set: staging.set, pose: staging.pose, clothing: staging.clothing, shot: typeof staging.shot === 'string' ? staging.shot : 'fn' }) : ''
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !ready || !staging) return
    const moved = staging.set !== scene.set.kind
    scene.setSet(staging.set)
    scene.setPose(staging.pose, moved)
    scene.setClothing(staging.clothing)
    scene.shot(() => shotOf(scene), moved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagingKey, ready])

  useEffect(() => {
    if (ready) sceneRef.current?.setHerniaPhase(staging?.herniaPhase ?? herniaPhase)
  }, [herniaPhase, staging?.herniaPhase, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ready) sceneRef.current?.setGrid(!staging && showRegions && view === 'abdomen' && (exposure === 'abdomen' || exposure === 'groin'), regionState ?? {})
  }, [showRegions, view, exposure, regionState, ready, staging])

  const exprKey = JSON.stringify(staging?.expression ?? null)
  useEffect(() => {
    if (ready) sceneRef.current?.setExpression({ pain, mouthOpen, tongueOut, lookAt, ...staging?.expression })
  }, [pain, mouthOpen, tongueOut, lookAt, ready, exprKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ready) sceneRef.current?.setFlap(flap)
  }, [flap, ready])

  useEffect(() => {
    const scene = sceneRef.current
    if (ready && scene && live) live(scene)
  }, [live, ready])

  useEffect(() => {
    if (ready && cues?.cough) sceneRef.current?.cough()
  }, [cues?.cough, ready])
  useEffect(() => {
    if (ready && cues?.swallow) sceneRef.current?.swallow()
  }, [cues?.swallow, ready])

  // winces and what the patient says
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !reaction?.key) return
    if (reaction.peak > 0) scene.wince(reaction.peak)
    if (reaction.says) {
      setBubble(reaction.says)
      scene.setExpression({ speaking: true })
      const id = window.setTimeout(() => {
        setBubble(undefined)
        sceneRef.current?.setExpression({ speaking: false })
      }, 2600)
      return () => window.clearTimeout(id)
    }
  }, [reaction?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // the face in the corner
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !ready || !faceInset) return
    return scene.faceView(() => {
      const el = faceRef.current
      const cv = canvasRef.current
      if (!el || !cv) return null
      const a2 = el.getBoundingClientRect()
      const b = cv.getBoundingClientRect()
      return { x: a2.left - b.left, y: a2.top - b.top, w: a2.width, h: a2.height }
    })
  }, [faceInset, ready])

  /* ------------------------------------------------------------- zones */

  const zoneRest = useMemo(() => {
    const scene = sceneRef.current
    const warp = warpRef.current
    const m = new Map<string, { zone: Zone; rest: THREE.Vector3; r: number }>()
    if (!ready || !scene || !warp || !zones) return m
    for (const z of zones) m.set(z.zone.id, { zone: z.zone, rest: z.rest ? z.rest(scene, warp) : warp.to3(z.zone.at), r: z.r ?? z.zone.r / UNITS_PER_DM })
    return m
  }, [zones, ready])

  /* ----------------------------------------------------------- effects */

  useEffect(() => {
    const scene = sceneRef.current
    const warp = warpRef.current
    if (!scene || !warp || !ready) return
    const restOf = (at: Pt) => {
      const t = lastTap.current
      if (t && t.pt[0] === at[0] && t.pt[1] === at[1]) return t.rest
      for (const z of zoneRest.values()) if (z.zone.at[0] === at[0] && z.zone.at[1] === at[1]) return z.rest
      return warp.to3(at)
    }
    for (const ef of effects) {
      if (ef.id < 0 || seenFx.current.has(ef.id)) continue
      seenFx.current.add(ef.id)
      const rest = restOf(ef.at)
      switch (ef.kind) {
        case 'light':
        case 'deep':
          scene.touchAt(rest, ef.kind)
          scene.signs.ripple(rest, '#ffffff', ef.kind === 'deep' ? 0.6 : 0.5)
          break
        case 'percuss':
          scene.touchAt(rest, 'percuss')
          scene.signs.ripple(rest, '#ffffff', 0.35)
          window.setTimeout(() => sceneRef.current?.signs.ripple(rest, '#ffffff', 0.35), 260)
          if (ef.label) addNote(rest, ef.label)
          break
        case 'tender':
          scene.signs.ripple(rest, '#ff5a6e', 0.7)
          window.setTimeout(() => sceneRef.current?.signs.ripple(rest, '#ff5a6e', 0.55), 180)
          break
        case 'press':
          scene.touchAt(rest, view === 'legs' ? 'pit' : 'press')
          scene.signs.ripple(rest, '#ffffff', 0.3)
          break
        default:
          scene.signs.ripple(rest, '#ffffff', 0.35)
      }
    }
    // the stethoscope stays on the skin while you listen
    const listen = effects.find((e) => e.kind === 'listen')
    const key = listen ? `${listen.at[0]},${listen.at[1]}` : ''
    if (key !== listenKey.current) {
      listenKey.current = key
      scene.listen(listen ? restOf(listen.at) : null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effects, ready, zoneRest])

  // fingertips resting on a pulse
  const feelRest = useMemo(() => {
    if (!feel || !ready) return null
    for (const z of zoneRest.values()) if (z.zone.at[0] === feel.at[0] && z.zone.at[1] === feel.at[1]) return z.rest
    return warpRef.current?.to3(feel.at) ?? null
  }, [feel, ready, zoneRest])
  useEffect(() => {
    if (feelRest) sceneRef.current?.touchAt(feelRest, 'feel')
  }, [feelRest, feel?.key])

  const addNote = (rest: THREE.Vector3, text: string) => {
    const id = `note${Date.now()}${Math.random()}`
    setNotes((n) => [...n, { id, rest, text, kind: 'note' }])
    window.setTimeout(() => setNotes((n) => n.filter((x) => x.id !== id)), 1500)
  }

  /* -------------------------------------------------------------- taps */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pointers = new Set<number>()
    let down: { x: number; y: number; t: number; id: number } | null = null
    const onDown = (e: PointerEvent) => {
      pointers.add(e.pointerId)
      down = pointers.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      const d = down
      down = null
      if (!d || d.id !== e.pointerId) return
      // a drag or a long press turns the camera; a quick tap examines
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 650) return
      tap(e.clientX, e.clientY)
    }
    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      down = null
    }
    const tap = (clientX: number, clientY: number) => {
      const scene = sceneRef.current
      const warp = warpRef.current
      const p = propsRef.current
      if (!scene || !warp || !scene.anatomy) return
      const r = canvas.getBoundingClientRect()
      const x = clientX - r.left
      const y = clientY - r.top
      if (p.onPoint && scene.pickChart(x, y)) return p.onPoint([118, 842], null)
      const hit = scene.pick(x, y)
      if (p.onZone) {
        // stations: the nearest zone to the finger, with generous targets on phones
        const zs = zoneRestRef.current
        if (!hit) return
        let best: { zone: Zone; d: number } | null = null
        for (const z of zs.values()) {
          const d = z.rest.distanceTo(hit.rest)
          if (d < z.r * 1.3 && (!best || d < best.d)) best = { zone: z.zone, d }
        }
        const pt = warp.to2(hit.rest)
        lastTap.current = { pt, rest: hit.rest }
        if (best) p.onZone(best.zone, best.zone.at)
        else p.onMiss?.(pt)
        return
      }
      if (!p.onPoint) return
      // off the patient: only the bedside view reacts (a look from the end of the bed)
      if (!hit) return (p.view ?? 'bed') === 'bed' ? p.onPoint([0, -600], null) : undefined
      const pt = warp.to2(hit.rest)
      lastTap.current = { pt, rest: hit.rest }
      p.onPoint(pt, { region: abdoRegionAt(hit.rest, scene.anatomy), rest: hit.rest })
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
    }
  }, [])
  const zoneRestRef = useRef(zoneRest)
  zoneRestRef.current = zoneRest

  /* ------------------------------------------------------------ labels */

  const labels: Label[] = useMemo(() => {
    const scene = sceneRef.current
    const warp = warpRef.current
    if (!ready || !scene?.anatomy || !warp) return notes
    const out: Label[] = []
    if (showLandmarks && !staging && (view === 'abdomen' || view === 'groin')) {
      const pts: [Pt, string][] =
        view === 'groin'
          ? [
              [lm2.asisR, 'ASIS'],
              [lm2.pubicTubercleR, 'Pubic tubercle'],
              [lm2.deepRingR, 'Deep ring'],
              [lm2.superficialRingR, 'Superficial ring'],
              [lm2.femoralCanalR, 'Femoral canal'],
              [lm2.midInguinalR, 'Mid-inguinal point'],
            ]
          : [
              [lm2.mcburney, 'McBurney’s point'],
              [lm2.murphy, 'Murphy’s point'],
              [lm2.umbilicus, 'Umbilicus'],
              [lm2.asisR, 'ASIS'],
              [lm2.xiphisternum, 'Xiphisternum'],
            ]
      for (const [p, text] of pts) out.push({ id: `lm-${text}`, rest: warp.to3(p), text, kind: 'landmark' })
    }
    if (!staging && showRegions && view === 'abdomen' && (exposure === 'abdomen' || exposure === 'groin'))
      for (const r of REGION_ORDER) out.push({ id: `rg-${r}`, rest: regionCentre(r, scene.anatomy), text: REGION_SHORT[r], kind: 'region' })
    for (const z of zoneRest.values()) {
      const hot = !!highlight && z.zone.actions.includes(highlight)
      if (showZones || hot) out.push({ id: `zn-${z.zone.id}`, rest: z.rest, text: showZones ? z.zone.label : '', kind: hot ? 'hot' : 'zone' })
    }
    if (feel && feelRest) out.push({ id: `pulse-${feel.key}`, rest: feelRest, text: '', kind: 'pulse', grade: feel.grade })
    return [...out, ...notes]
  }, [ready, showLandmarks, showRegions, view, exposure, lm2, notes, staging, zoneRest, showZones, highlight, feel, feelRest])

  // cache each label's nearest skin vertex so moving it every frame is cheap
  const labelCompact = useMemo(() => {
    const scene = sceneRef.current
    const m = new Map<string, number>()
    if (!scene?.human) return m
    for (const l of labels) m.set(l.id, scene.nearestVertex(l.rest))
    return m
  }, [labels])

  useEffect(() => {
    sceneRef.current?.stage.invalidate()
  }, [labels])

  const beat = 60 / Math.max(30, c.vitals.hr)

  return (
    <div className="absolute inset-0 overflow-hidden bg-stage">
      <canvas
        ref={canvasRef}
        className={cn('block h-full w-full touch-none-select transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')}
        style={{ cursor: cursor ?? 'default', touchAction: 'none' }}
        aria-label={`${c.patient.name}. Drag to look around, pinch or scroll to zoom, tap to examine.`}
        role="img"
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2.5 rounded-full bg-surface-1/85 px-4 py-2 text-[13px] font-medium text-muted shadow-(--shadow-lift) ring-1 ring-line backdrop-blur">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Bringing the patient in…
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 z-10">
        {labels.map((l) => (
          <div
            key={l.id}
            ref={(el) => {
              if (el) labelEls.current.set(l.id, el)
              else labelEls.current.delete(l.id)
            }}
            data-rest={`${l.rest.x},${l.rest.y},${l.rest.z}`}
            data-c={labelCompact.get(l.id) ?? 0}
            className="absolute top-0 left-0 transition-opacity duration-200"
            style={{ opacity: 0 }}
          >
            {l.kind === 'landmark' || l.kind === 'zone' ? (
              <div className="flex -translate-x-[5px] -translate-y-[5px] items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#fbbf3c] ring-2 ring-white" />
                {l.text && <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white backdrop-blur-sm">{l.text}</span>}
              </div>
            ) : l.kind === 'hot' ? (
              <div className="relative -translate-x-1/2 -translate-y-1/2">
                <span className="absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent" style={{ animation: 'bs-ring 1.4s ease-out infinite' }} />
                <span className="block h-3 w-3 rounded-full bg-accent ring-2 ring-white" />
              </div>
            ) : l.kind === 'pulse' ? (
              <div className="relative -translate-x-1/2 -translate-y-1/2">
                {l.grade !== 'absent' &&
                  [0, 0.12].map((d) => (
                    <span
                      key={d}
                      className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ff6b7d]"
                      style={{ animation: `bs-throb ${beat.toFixed(2)}s ${d}s ease-out infinite`, opacity: l.grade === 'weak' ? 0.45 : 0.9 }}
                    />
                  ))}
                <span className={cn('block h-2 w-2 rounded-full', l.grade === 'absent' ? 'bg-white/50' : 'bg-[#ff6b7d]')} />
              </div>
            ) : l.kind === 'region' ? (
              <span className="block -translate-x-1/2 -translate-y-1/2 text-center text-[10.5px] leading-tight font-semibold whitespace-nowrap text-white/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]">{l.text}</span>
            ) : (
              <span className="block -translate-x-1/2 -translate-y-[160%] rounded-full bg-black/65 px-2 py-0.5 text-[12px] font-bold whitespace-nowrap text-white" style={{ animation: 'bs-fade 1.5s ease-out forwards' }}>
                {l.text}
              </span>
            )}
          </div>
        ))}
      </div>
      {faceInset && (
        <div className="pointer-events-none absolute top-2.5 right-2.5 z-20 sm:top-3 sm:right-3">
          <div ref={faceRef} className={cn('relative overflow-hidden rounded-2xl shadow-(--shadow-lift) ring-2 ring-white/70 dark:ring-white/20', compact ? 'h-[86px] w-[86px]' : 'h-[132px] w-[132px]')}>
            {faceLabel && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pt-4 pb-1 text-[10px] font-medium text-white">{faceLabel}</div>}
          </div>
          <AnimatePresence>
            {bubble && (
              <motion.div
                key={bubble}
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="absolute top-1 right-[calc(100%+8px)] z-10 w-max max-w-[210px] rounded-2xl rounded-tr-sm bg-white px-3 py-2 text-[12.5px] leading-snug text-slate-800 shadow-(--shadow-lift)"
              >
                “{bubble}”
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {!faceInset && (
        <AnimatePresence>
          {bubble && (
            <motion.div
              key={bubble}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute top-3 left-1/2 z-20 w-max max-w-[80%] -translate-x-1/2 rounded-2xl bg-white px-3.5 py-2 text-[13px] leading-snug text-slate-800 shadow-(--shadow-lift)"
            >
              “{bubble}”
            </motion.div>
          )}
        </AnimatePresence>
      )}
      {props.children}
    </div>
  )
}
