import { useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import type { Pt } from '../../../anatomy/geometry'
import { useElementSize } from '../../../lib/hooks'
import { useCameraRect } from '../exam/camera'
import { EffectView, type Effect } from '../exam/Stage'
import type { SceneSpec, Zone } from './types'

/**
 * Generic stage for the non-abdominal stations: renders a scene spec, glides
 * the camera to its framing, and resolves taps to examination zones.
 */
export function StationCanvas({
  spec,
  effects,
  onZone,
  onMiss,
  showZones,
  highlight,
  overlay,
}: {
  spec: SceneSpec
  effects: Effect[]
  onZone: (z: Zone, at: Pt) => void
  onMiss?: (at: Pt) => void
  showZones: boolean
  highlight?: string | null
  /** Extra marks in scene coordinates */
  overlay?: ReactNode
}) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const aspect = size.width && size.height ? size.width / size.height : 0.8
  const vb = useCameraRect(spec.rect, aspect)
  const svgRef = useRef<SVGSVGElement>(null)
  const unit = spec.rect.h / 100
  const k = spec.effectScale ?? 1

  const toScene = (e: RPointerEvent): Pt | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const q = p.matrixTransform(ctm.inverse())
    return [q.x, q.y]
  }

  const pick = (pt: Pt): Zone | null => {
    let best: Zone | null = null
    let bd = Infinity
    for (const z of spec.zones) {
      const d = Math.hypot(pt[0] - z.at[0], pt[1] - z.at[1])
      // generous touch targets on phones
      if (d < z.r * 1.25 && d < bd) {
        bd = d
        best = z
      }
    }
    return best
  }

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-stage">
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="h-full w-full touch-none-select"
        style={{ cursor: spec.zones.length ? 'pointer' : 'default' }}
        role="img"
        aria-label={spec.aria}
        onPointerDown={(e) => {
          const pt = toScene(e)
          if (!pt) return
          const z = pick(pt)
          if (z) onZone(z, pt)
          else onMiss?.(pt)
        }}
      >
        {spec.content}

        {(showZones || highlight) && (
          <g pointerEvents="none">
            {spec.zones.map((z) => {
              const hot = !!highlight && z.actions.includes(highlight)
              if (!showZones && !hot) return null
              return (
                <g key={z.id} transform={`translate(${z.at[0]} ${z.at[1]})`}>
                  {hot && (
                    <circle
                      r={z.r * 0.9}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={unit * 0.5}
                      style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'bs-ring 1.4s ease-out infinite' }}
                    />
                  )}
                  <circle r={unit * 0.9} fill={hot ? 'var(--accent)' : '#fbbf3c'} stroke="#fff" strokeWidth={unit * 0.3} />
                  {showZones && (
                    <text
                      x={unit * 1.6}
                      y={-unit * 1.1}
                      fontSize={unit * 2.3}
                      fontWeight="600"
                      fill="#fff"
                      style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.6)', strokeWidth: unit * 0.7 }}
                    >
                      {z.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        )}

        {overlay}

        {effects.map((ef) => (
          <g key={ef.id} transform={k === 1 ? undefined : `translate(${ef.at[0]} ${ef.at[1]}) scale(${k}) translate(${-ef.at[0]} ${-ef.at[1]})`}>
            <EffectView ef={ef} />
          </g>
        ))}
      </svg>
    </div>
  )
}
