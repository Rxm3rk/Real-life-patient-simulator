import { memo, useMemo, useRef, type PointerEvent as RPointerEvent } from 'react'
import { bodyDims, landmarks, REGION_ORDER, REGION_SHORT, regionCentre, type Landmarks, type RegionId } from '../../../anatomy/bodyModel'
import type { Pt } from '../../../anatomy/geometry'
import type { HerniaPhase } from '../../../anatomy/Body'
import { BedScene } from '../../../anatomy/Scene'
import type { Exposure, PatientPose } from '../../../anatomy/types'
import type { CaseDef } from '../../../engine/types'
import { useElementSize } from '../../../lib/hooks'
import { useCamera, type Shot } from './camera'

export type EffectKind = 'light' | 'deep' | 'percuss' | 'listen' | 'tender' | 'press' | 'tap'

export interface Effect {
  id: number
  kind: EffectKind
  at: Pt
  label?: string
  /** persistent effects (listening) stay until removed */
  sticky?: boolean
}

export interface StageProps {
  c: CaseDef
  shot: Shot
  exposure: Exposure
  pose: PatientPose
  herniaPhase: HerniaPhase
  effects: Effect[]
  showRegions: boolean
  showLandmarks: boolean
  regionState?: Partial<Record<RegionId, 'light' | 'deep'>>
  onPoint?: (pt: Pt) => void
  cursor?: string
  /** Extra overlay in scene coordinates */
  overlay?: React.ReactNode
  /** Small screen: tighter framing */
  compact?: boolean
}

export const Stage = memo(function Stage(props: StageProps) {
  const { c, shot, exposure, pose, herniaPhase, effects, showRegions, showLandmarks, regionState, onPoint, cursor, overlay, compact } = props
  const [ref, size] = useElementSize<HTMLDivElement>()
  const aspect = size.width && size.height ? size.width / size.height : 0.8
  const vb = useCamera(shot, aspect, compact)
  const svgRef = useRef<SVGSVGElement>(null)
  const a = c.patient.appearance
  const d = useMemo(() => bodyDims(a), [a])
  const lm = useMemo(() => landmarks(a, d), [a, d])

  const toScene = (e: RPointerEvent): Pt | null => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const q = p.matrixTransform(ctm.inverse())
    return [q.x, q.y]
  }

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-stage">
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="h-full w-full touch-none-select"
        style={{ cursor: cursor ?? 'default' }}
        onPointerDown={(e) => {
          if (!onPoint) return
          const pt = toScene(e)
          if (pt) onPoint(pt)
        }}
        role="img"
        aria-label={`${c.patient.name} lying on a hospital bed`}
      >
        <BedScene
          id="stage"
          items={c.bedside}
          body={{ a, pose: { ...pose, exposure }, id: 'stagebody', seed: c.id, herniaPhase, hr: c.vitals.hr, rr: c.vitals.rr }}
        />

        {showRegions && (exposure === 'abdomen' || exposure === 'groin') && (shot === 'abdomen' || shot === 'groin') && (
          <RegionGrid lm={lm} waist={d.waistW} hip={d.hipW} state={regionState} labels={shot === 'abdomen'} />
        )}
        {showLandmarks && (shot === 'abdomen' || shot === 'groin') && <LandmarkDots lm={lm} shot={shot} />}
        {overlay}
        {effects.map((ef) => (
          <EffectView key={ef.id} ef={ef} />
        ))}
      </svg>
    </div>
  )
})

function RegionGrid({ lm, waist, hip, state, labels }: { lm: Landmarks; waist: number; hip: number; state?: Partial<Record<RegionId, 'light' | 'deep'>>; labels: boolean }) {
  const top = 236
  const bottom = 390
  const xl = -Math.max(waist, hip) - 2
  const xr = Math.max(waist, hip) + 2
  return (
    <g pointerEvents="none">
      {REGION_ORDER.map((r) => {
        const st = state?.[r]
        if (!st) return null
        const [cx, cy] = regionCentre(r, lm)
        return <circle key={r} cx={cx} cy={cy} r={11} fill={st === 'deep' ? 'var(--accent)' : 'var(--info)'} opacity={0.18} />
      })}
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.9" strokeDasharray="3 3" fill="none">
        <path d={`M${lm.mclR} ${top} L${lm.mclR * 0.9} ${bottom}`} />
        <path d={`M${lm.mclL} ${top} L${lm.mclL * 0.9} ${bottom}`} />
        <path d={`M${xl} ${lm.subcostalY} L${xr} ${lm.subcostalY}`} />
        <path d={`M${xl} ${lm.transtubercularY} L${xr} ${lm.transtubercularY}`} />
      </g>
      <g stroke="#0b1220" strokeOpacity="0.25" strokeWidth="0.9" strokeDasharray="3 3" fill="none" transform="translate(0.6 0.6)">
        <path d={`M${lm.mclR} ${top} L${lm.mclR * 0.9} ${bottom}`} />
        <path d={`M${lm.mclL} ${top} L${lm.mclL * 0.9} ${bottom}`} />
        <path d={`M${xl} ${lm.subcostalY} L${xr} ${lm.subcostalY}`} />
        <path d={`M${xl} ${lm.transtubercularY} L${xr} ${lm.transtubercularY}`} />
      </g>
      {labels &&
        REGION_ORDER.map((r) => {
          const [cx, cy] = regionCentre(r, lm)
          return (
            <text key={r} x={cx} y={cy + 2} textAnchor="middle" fontSize="4.4" fontWeight="600" fill="#fff" opacity="0.72" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.45)', strokeWidth: 1.6 }}>
              {REGION_SHORT[r]}
            </text>
          )
        })}
    </g>
  )
}

function LandmarkDots({ lm, shot }: { lm: Landmarks; shot: Shot }) {
  const pts: [Pt, string][] =
    shot === 'groin'
      ? [
          [lm.asisR, 'ASIS'],
          [lm.pubicTubercleR, 'Pubic tubercle'],
          [lm.deepRingR, 'Deep ring'],
          [lm.superficialRingR, 'Superficial ring'],
          [lm.femoralCanalR, 'Femoral canal'],
          [lm.midInguinalR, 'Mid-inguinal point'],
        ]
      : [
          [lm.mcburney, 'McBurney’s point'],
          [lm.murphy, 'Murphy’s point'],
          [lm.umbilicus, 'Umbilicus'],
          [lm.asisR, 'ASIS'],
          [lm.xiphisternum, 'Xiphisternum'],
        ]
  return (
    <g pointerEvents="none">
      {pts.map(([p, label]) => (
        <g key={label} transform={`translate(${p[0]} ${p[1]})`}>
          <circle r="2.2" fill="#fbbf3c" stroke="#fff" strokeWidth="0.7" />
          <text x="3.5" y="-2.5" fontSize="4.6" fontWeight="600" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.6)', strokeWidth: 1.4 }}>
            {label}
          </text>
        </g>
      ))}
    </g>
  )
}

export function EffectView({ ef }: { ef: Effect }) {
  const [x, y] = ef.at
  const base = { transformBox: 'fill-box' as const, transformOrigin: 'center' }
  switch (ef.kind) {
    case 'light':
    case 'deep': {
      const deep = ef.kind === 'deep'
      return (
        <g transform={`translate(${x} ${y})`} pointerEvents="none">
          <circle r={deep ? 16 : 12} fill="#000" opacity={deep ? 0.22 : 0.1} style={{ ...base, animation: 'bs-press 0.9s ease-out forwards' }} />
          <g style={{ ...base, animation: 'bs-press 0.9s ease-out forwards' }} opacity="0.9">
            {[-7.5, -2.5, 2.5, 7.5].map((fx, i) => (
              <ellipse key={i} cx={fx} cy={Math.abs(fx) * 0.25 - (i === 1 || i === 2 ? 1.5 : 0)} rx={2.4} ry={deep ? 5 : 4.2} fill="#f7fbff" stroke="#9fb6cc" strokeWidth="0.5" />
            ))}
          </g>
        </g>
      )
    }
    case 'percuss':
      return (
        <g transform={`translate(${x} ${y})`} pointerEvents="none">
          {[0, 0.12].map((dl) => (
            <circle key={dl} r="10" fill="none" stroke="#fff" strokeWidth="1.2" style={{ ...base, animation: `bs-ring 0.7s ${dl}s ease-out forwards`, opacity: 0 }} />
          ))}
          <rect x="-10" y="-1.6" width="20" height="3.2" rx="1.6" fill="#f7fbff" stroke="#9fb6cc" strokeWidth="0.5" opacity="0.95" />
          <ellipse cx="0" cy="-5" rx="2.2" ry="3.4" fill="#f7fbff" stroke="#9fb6cc" strokeWidth="0.5" style={{ ...base, animation: 'bs-press 0.35s ease-out forwards' }} />
          {ef.label && (
            <text y="-10" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.6)', strokeWidth: 1.5, animation: 'bs-fade 1.4s ease-out forwards' }}>
              {ef.label}
            </text>
          )}
        </g>
      )
    case 'listen':
      return (
        <g transform={`translate(${x} ${y})`} pointerEvents="none">
          <circle r="16" fill="none" stroke="var(--accent)" strokeWidth="1" style={{ ...base, animation: 'bs-ring 1.6s ease-out infinite' }} />
          <path d="M4 -6 C18 -20 30 -30 44 -60" stroke="#2b3440" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle r="8.5" fill="#cfd8e2" stroke="#6f7c8a" strokeWidth="1.2" />
          <circle r="6" fill="#e9eef3" />
          <circle r="2.2" fill="#aab6c2" />
        </g>
      )
    case 'tender':
      return <circle cx={x} cy={y} r="12" fill="none" stroke="#ff5a6e" strokeWidth="1.6" pointerEvents="none" style={{ ...base, animation: 'bs-ring 0.9s ease-out forwards' }} />
    case 'press':
      return (
        <g transform={`translate(${x} ${y})`} pointerEvents="none">
          <circle r="7" fill="#000" opacity="0.18" style={{ ...base, animation: 'bs-press 1.2s ease-out forwards' }} />
          <ellipse rx="3.2" ry="5" fill="#f7fbff" stroke="#9fb6cc" strokeWidth="0.5" style={{ ...base, animation: 'bs-press 1.2s ease-out forwards' }} />
        </g>
      )
    case 'tap':
    default:
      return <circle cx={x} cy={y} r="8" fill="none" stroke="#fff" strokeWidth="1.2" pointerEvents="none" style={{ ...base, animation: 'bs-ring 0.6s ease-out forwards' }} />
  }
}

export function nearest(pt: Pt, targets: [string, Pt][], radius: number): string | null {
  let best: string | null = null
  let bd = radius
  for (const [id, p] of targets) {
    const d = Math.hypot(pt[0] - p[0], pt[1] - p[1])
    if (d < bd) {
      bd = d
      best = id
    }
  }
  return best
}
