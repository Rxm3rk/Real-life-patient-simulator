import { useEffect, useRef, useState } from 'react'
import { SCENE_VIEWBOX } from '../../../anatomy/Scene'

export type Shot = 'bed' | 'face' | 'neck' | 'chest' | 'abdomen' | 'groin' | 'legs'

/** Target rectangles in scene (body) units. */
export const SHOTS: Record<Shot, { cx: number; cy: number; w: number; h: number }> = {
  bed: { cx: 0, cy: SCENE_VIEWBOX.y + SCENE_VIEWBOX.h / 2, w: SCENE_VIEWBOX.w, h: SCENE_VIEWBOX.h },
  face: { cx: 0, cy: 50, w: 150, h: 170 },
  neck: { cx: 0, cy: 132, w: 190, h: 150 },
  chest: { cx: 0, cy: 205, w: 250, h: 200 },
  abdomen: { cx: 0, cy: 314, w: 210, h: 218 },
  groin: { cx: 0, cy: 385, w: 200, h: 160 },
  legs: { cx: 0, cy: 610, w: 280, h: 430 },
}

/** Fit a target rect into a container aspect ratio (like preserveAspectRatio meet). */
export function fit(shot: { cx: number; cy: number; w: number; h: number }, aspect: number) {
  let { w, h } = shot
  if (w / h < aspect) w = h * aspect
  else h = w / aspect
  return { x: shot.cx - w / 2, y: shot.cy - h / 2, w, h }
}

/** On small screens the whole bed is too small to read — frame head to knees. */
export const COMPACT_BED = { cx: 0, cy: 318, w: 420, h: 700 }

export type ShotRect = { cx: number; cy: number; w: number; h: number }

/** Critically-damped camera that glides between shots. */
export function useCamera(shot: Shot, aspect: number, compact = false) {
  let spec = shot === 'bed' && compact ? COMPACT_BED : SHOTS[shot]
  // leave room for the tool dock on phones: frame a little larger and lower
  if (compact && shot !== 'bed') spec = { ...spec, cy: spec.cy + spec.h * 0.1, h: spec.h * 1.12, w: spec.w * 1.04 }
  return useCameraRect(spec, aspect)
}

/** Camera gliding to an arbitrary target rectangle (scene units). */
export function useCameraRect(spec: ShotRect, aspect: number) {
  const target = fit(spec, aspect || 1)
  const [vb, setVb] = useState(target)
  const cur = useRef(target)
  const tgt = useRef(target)
  tgt.current = target

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = 1 - Math.exp(-dt * 7.5)
      const c = cur.current
      const t = tgt.current
      const next = { x: c.x + (t.x - c.x) * k, y: c.y + (t.y - c.y) * k, w: c.w + (t.w - c.w) * k, h: c.h + (t.h - c.h) * k }
      const done = Math.abs(next.x - t.x) < 0.05 && Math.abs(next.y - t.y) < 0.05 && Math.abs(next.w - t.w) < 0.05
      cur.current = done ? t : next
      setVb(cur.current)
      if (!done) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [target.x, target.y, target.w, target.h])

  return vb
}
