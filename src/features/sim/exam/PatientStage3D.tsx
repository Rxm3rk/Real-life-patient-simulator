import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { HerniaPhase } from '../../../anatomy/Body'
import { bodyDims, landmarks, REGION_ORDER, REGION_SHORT, type RegionId } from '../../../anatomy/bodyModel'
import type { Pt } from '../../../anatomy/geometry'
import type { Exposure } from '../../../anatomy/types'
import { abdoRegionAt, regionCentre } from '../../../anatomy3d/anatomy'
import { PatientScene, type ClothingState, type Shot as Shot3 } from '../../../anatomy3d/patientScene'
import type { Arms, Posture } from '../../../anatomy3d/poses'
import { shotFor, type ShotName } from '../../../anatomy3d/shots'
import { bodyWarp, type BodyWarp } from '../../../anatomy3d/warp'
import { isClinic } from '../../../engine/setting'
import type { CaseDef } from '../../../engine/types'
import { cn } from '../../../lib/utils'
import type { Effect } from './Stage'

/**
 * The examination stage with a 3D patient. It speaks the same language as the
 * 2D stage (body-model points, regions, effects), so the examination logic is
 * shared: taps on the body are mapped back to body-model points (with the
 * region under the finger), and each effect is played out on the patient: your
 * hand pressing in, the percussing finger, the stethoscope on the skin.
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

export interface PatientStage3DProps {
  c: CaseDef
  view: View3D
  exposure: Exposure
  pain: number
  /** A change of `key` makes the patient wince (strength `peak`) and say `says` */
  reaction?: { peak: number; key: number; says?: string }
  herniaPhase: HerniaPhase
  effects: Effect[]
  showRegions: boolean
  showLandmarks: boolean
  regionState?: Partial<Record<RegionId, 'light' | 'deep'>>
  onPoint?: (pt: Pt, hit: StageHit | null) => void
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

function postureFor(view: View3D, prev: Posture): Posture {
  if (view === 'abdomen' || view === 'groin' || view === 'legs') return 'supine'
  if (view === 'bed') return prev
  return 'recline45'
}

export function clothingFor(exposure: Exposure, female: boolean): ClothingState {
  switch (exposure) {
    case 'abdomen':
      return { gownTop: false, gownSkirt: false, chestBand: female, briefs: true, drape: false, blanketFrom: 'thighs' }
    case 'groin':
      return { gownTop: false, gownSkirt: false, chestBand: female, briefs: false, drape: true, blanketFrom: 'midThigh' }
    case 'standing-groin':
      return { gownTop: false, gownSkirt: false, chestBand: female, briefs: false, drape: true, blanketFrom: null }
    case 'torso':
      return { gownTop: false, gownSkirt: false, chestBand: false, briefs: true, drape: false, blanketFrom: 'waist' }
    case 'legs':
      return { gownTop: true, gownSkirt: false, chestBand: false, briefs: true, drape: false, blanketFrom: null }
    default:
      return { gownTop: true, gownSkirt: true, chestBand: false, briefs: true, drape: false, blanketFrom: 'waist' }
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
  kind: 'landmark' | 'region' | 'note'
}

export function PatientStage3D(props: PatientStage3DProps) {
  const { c, view, exposure, pain, reaction, herniaPhase, effects, showRegions, showLandmarks, regionState, cursor, faceInset, faceLabel, handView, flap = 0, mouthOpen = 0, tongueOut = 0, lookAt = 'camera', compact } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
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

  /* --------------------------------------------------------- the scene */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: PatientScene
    try {
      scene = new PatientScene(canvas, { appearance: a, set: isClinic(c.setting) ? 'couch' : 'bed', background: cssVar('--stage', '#0b1220'), dark: true })
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
        warpRef.current = bodyWarp(lm2, A, {
          vertexY: scene.restLandmark('vertex').y,
          chinY: scene.restLandmark('chin').y,
          knee: scene.restLandmark('kneeL'),
          ankle: scene.restLandmark('medialMalleolusL'),
        })
        const p = propsRef.current
        postureRef.current = postureFor(p.view, 'recline45')
        scene.setPose({ posture: postureRef.current }, true)
        scene.setClothing(clothingFor(p.exposure, female))
        scene.shot(fit(shotFor(scene, SHOT_OF[p.view])), true)
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
      for (const [id, el] of labelEls.current) {
        const rest = el.dataset.rest?.split(',').map(Number)
        if (!rest || !scene.human) continue
        const world = scene.restToWorld(new THREE.Vector3(rest[0], rest[1], rest[2]), new THREE.Vector3(), +(el.dataset.c ?? 0))
        const s = scene.project(world)
        const on = s.visible && s.x > -40 && s.y > -40 && s.x < w + 40 && s.y < h + 40
        el.style.opacity = on ? '' : '0'
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`
        void id
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

  // frame the shot for this canvas shape: portrait screens need to stand further back
  const fit = (s: Shot3): Shot3 => {
    const canvas = canvasRef.current
    const aspect = canvas && canvas.clientHeight ? canvas.clientWidth / canvas.clientHeight : 1.4
    const k = aspect < 1.1 ? Math.min(2.1, 1.25 / Math.max(0.45, aspect)) : 1
    return { ...s, dist: s.dist * k }
  }

  /* --------------------------------------------------- pose and camera */

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !ready) return
    const posture = postureFor(view, postureRef.current)
    postureRef.current = posture
    const arms: Arms | undefined = view === 'hands' ? (handView === 'palms' ? 'forwardPalmsUp' : 'forward') : undefined
    // "hold your arms out, cock your wrists back and spread your fingers"
    const out = view === 'hands' && handView === 'outstretched'
    scene.setPose({ posture, arms, wrists: out ? -55 : undefined, spread: out })
    scene.shot(() => fit(shotFor(scene, SHOT_OF[view])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, handView, ready])

  useEffect(() => {
    if (ready) sceneRef.current?.setClothing(clothingFor(exposure, female))
  }, [exposure, female, ready])

  useEffect(() => {
    if (ready) sceneRef.current?.setHerniaPhase(herniaPhase)
  }, [herniaPhase, ready])

  useEffect(() => {
    if (ready) sceneRef.current?.setGrid(showRegions && view === 'abdomen' && (exposure === 'abdomen' || exposure === 'groin'), regionState ?? {})
  }, [showRegions, view, exposure, regionState, ready])

  useEffect(() => {
    if (ready) sceneRef.current?.setExpression({ pain, mouthOpen, tongueOut, lookAt })
  }, [pain, mouthOpen, tongueOut, lookAt, ready])

  useEffect(() => {
    if (ready) sceneRef.current?.setFlap(flap)
  }, [flap, ready])

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

  /* ----------------------------------------------------------- effects */

  useEffect(() => {
    const scene = sceneRef.current
    const warp = warpRef.current
    if (!scene || !warp || !ready) return
    const restOf = (at: Pt) => {
      const t = lastTap.current
      return t && t.pt[0] === at[0] && t.pt[1] === at[1] ? t.rest : warp.to3(at)
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
  }, [effects, ready])

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
      const onPoint = propsRef.current.onPoint
      if (!scene || !warp || !onPoint || !scene.anatomy) return
      const r = canvas.getBoundingClientRect()
      const x = clientX - r.left
      const y = clientY - r.top
      if (scene.pickChart(x, y)) return onPoint([118, 842], null)
      const hit = scene.pick(x, y)
      // off the patient: only the bedside view reacts (a look from the end of the bed)
      if (!hit) return propsRef.current.view === 'bed' ? onPoint([0, -600], null) : undefined
      const pt = warp.to2(hit.rest)
      lastTap.current = { pt, rest: hit.rest }
      onPoint(pt, { region: abdoRegionAt(hit.rest, scene.anatomy), rest: hit.rest })
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

  /* ------------------------------------------------------------ labels */

  const labels: Label[] = useMemo(() => {
    const scene = sceneRef.current
    const warp = warpRef.current
    if (!ready || !scene?.anatomy || !warp) return notes
    const out: Label[] = []
    if (showLandmarks && (view === 'abdomen' || view === 'groin')) {
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
    if (showRegions && view === 'abdomen' && (exposure === 'abdomen' || exposure === 'groin'))
      for (const r of REGION_ORDER) out.push({ id: `rg-${r}`, rest: regionCentre(r, scene.anatomy), text: REGION_SHORT[r], kind: 'region' })
    return [...out, ...notes]
  }, [ready, showLandmarks, showRegions, view, exposure, lm2, notes])

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

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-stage">
      <canvas
        ref={canvasRef}
        className={cn('block h-full w-full touch-none-select transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')}
        style={{ cursor: cursor ?? 'default', touchAction: 'none' }}
        aria-label={`${c.patient.name}, ${isClinic(c.setting) ? 'on the examination couch' : 'in bed'}. Drag to look around, pinch or scroll to zoom, tap to examine.`}
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
            {l.kind === 'landmark' ? (
              <div className="flex -translate-x-[5px] -translate-y-[5px] items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf3c] ring-2 ring-white" />
                <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white backdrop-blur-sm">{l.text}</span>
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
