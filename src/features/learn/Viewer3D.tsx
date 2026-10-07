import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Appearance } from '../../anatomy/types'
import { PatientScene } from '../../anatomy3d/patientScene'
import type { SetKind } from '../../anatomy3d/sets'
import { cn } from '../../lib/utils'

export interface ViewerMarker {
  id: string
  rest: (scene: PatientScene) => THREE.Vector3
  active?: boolean
  label?: string
}

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/**
 * A 3D patient for the Learn atlases: `setup` poses, dresses and marks them
 * (re-run whenever `setupKey` changes); you can turn them round, zoom in, and
 * tap the markers.
 */
export default function Viewer3D({
  appearance,
  set = 'standing',
  setup,
  setupKey,
  markers = [],
  onPick,
  className,
  label,
  onUnavailable,
  onScene,
}: {
  appearance: Appearance
  set?: SetKind
  setup: (scene: PatientScene, first: boolean) => void
  setupKey: string
  markers?: ViewerMarker[]
  onPick?: (id: string) => void
  className?: string
  label: string
  onUnavailable?: () => void
  /** The scene once it's ready (null when it goes away), for buttons that act on the patient */
  onScene?: (scene: PatientScene | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PatientScene | null>(null)
  const markerEls = useRef(new Map<string, HTMLButtonElement>())
  const [ready, setReady] = useState(false)
  const setupRef = useRef(setup)
  setupRef.current = setup
  const markersRef = useRef(markers)
  markersRef.current = markers
  const first = useRef(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: PatientScene
    try {
      scene = new PatientScene(canvas, { appearance, set, background: cssVar('--stage', '#0b1220'), dark: true })
    } catch {
      onUnavailable?.()
      return
    }
    sceneRef.current = scene
    let alive = true
    scene.ready
      // all garments too: each sign dresses the patient differently
      .then(() => scene.precompile())
      .then(() => alive && setReady(true))
      .catch(() => onUnavailable?.())
    const paint = () => scene.setBackground(cssVar('--stage', '#0b1220'))
    const mo = new MutationObserver(paint)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    // each marker's rest point and nearest skin vertex, worked out once
    const cache = new Map<string, { rest: THREE.Vector3; c: number }>()
    const off = scene.stage.onAfterRender(() => {
      if (!scene.human) return
      for (const m of markersRef.current) {
        const el = markerEls.current.get(m.id)
        if (!el) continue
        let hit = cache.get(m.id)
        if (!hit) {
          const rest = m.rest(scene)
          cache.set(m.id, (hit = { rest, c: scene.nearestVertex(rest) }))
        }
        const s = scene.project(scene.restToWorld(hit.rest, new THREE.Vector3(), hit.c))
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`
        el.style.opacity = s.visible ? '' : '0'
      }
    })
    return () => {
      alive = false
      off()
      mo.disconnect()
      sceneRef.current = null
      scene.dispose()
    }
    // one scene per appearance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance, set])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !ready) return
    setupRef.current(scene, first.current)
    first.current = false
    scene.stage.invalidate()
    onScene?.(scene)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupKey, ready])

  useEffect(() => () => onScene?.(null), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    sceneRef.current?.stage.invalidate()
  }, [markers])

  return (
    <div className={cn('relative overflow-hidden bg-stage', className)}>
      <canvas ref={canvasRef} className={cn('absolute inset-0 block h-full w-full touch-none transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')} role="img" aria-label={label} />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}
      {ready &&
        markers.map((m) => (
          <button
            key={m.id}
            ref={(el) => {
              if (el) markerEls.current.set(m.id, el)
              else markerEls.current.delete(m.id)
            }}
            onClick={() => onPick?.(m.id)}
            aria-label={m.label ?? m.id}
            title={m.label}
            className="absolute top-0 left-0 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center transition-opacity"
            style={{ opacity: 0 }}
          >
            {/* the chosen one is a ring, so what it marks stays in view */}
            <span className={cn('block rounded-full transition-all', m.active ? 'h-7 w-7 ring-2 ring-accent' : 'h-2.5 w-2.5 bg-[#fbbf3c] ring-2 ring-white')} />
          </button>
        ))}
    </div>
  )
}
