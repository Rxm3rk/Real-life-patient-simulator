import { memo } from 'react'
import type { BreastVisual } from '../engine/types'
import type { ArmPose } from './Body'
import { CM, type BodyDims, type Landmarks } from './bodyModel'
import { darken, mix } from './color'
import type { Pt } from './geometry'
import { skinPalette } from './palette'
import type { Appearance } from './types'

/** Breast lift used by the body renderer for each arm position. */
export const breastLift = (pose: ArmPose) => (pose === 'up' ? 6 : pose === 'hips' ? 1.5 : 0)

/** Position of a clock-face location (as the examiner faces the patient). */
export function clockPoint(nipple: Pt, clock: number, distCm: number): Pt {
  const t = (clock / 12) * Math.PI * 2
  return [nipple[0] + Math.sin(t) * distCm * CM, nipple[1] - Math.cos(t) * distCm * CM * 0.9]
}

export function breastCentres(lm: Landmarks, d: BodyDims, pose: ArmPose): { right: Pt; left: Pt; r: number } {
  const lift = breastLift(pose)
  const r = 30 * (d.chestW / 65)
  return { right: [lm.nippleR[0] - 3, lm.nippleR[1] - lift], left: [lm.nippleL[0] + 3, lm.nippleL[1] - lift], r }
}

export const BreastSigns = memo(function BreastSigns({
  a,
  d,
  lm,
  spec,
  pose,
  id,
  clockGuide,
}: {
  a: Appearance
  d: BodyDims
  lm: Landmarks
  spec: BreastVisual
  pose: ArmPose
  id: string
  /** Show a clock face over the affected breast (teaching) */
  clockGuide?: boolean
}) {
  const pal = skinPalette(a)
  const lift = breastLift(pose)
  const nipple = (side: 'left' | 'right'): Pt => (side === 'left' ? [lm.nippleL[0], lm.nippleL[1] - lift] : [lm.nippleR[0], lm.nippleR[1] - lift])
  const r = 30 * (d.chestW / 65)
  // tethering shows most when the pectorals are tensed or the arms raised
  const tetherShow = pose === 'hips' ? 1 : pose === 'up' ? 0.9 : 0.35
  const lump = spec.lump
  const lp = lump ? clockPoint(nipple(lump.side), lump.clock, lump.distCm) : null
  const affected = lump?.side ?? spec.nipple?.side ?? 'left'
  const nip = nipple(affected)
  const skinChange = spec.skin && spec.skin !== 'normal'

  return (
    <g pointerEvents="none">
      <defs>
        <filter id={`${id}-b1`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id={`${id}-b3`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <pattern id={`${id}-peau`} width="3.2" height="3.2" patternUnits="userSpaceOnUse">
          <circle cx="1.6" cy="1.6" r="0.55" fill={darken(pal.shadow, 0.2)} opacity="0.55" />
        </pattern>
        <clipPath id={`${id}-breast`}>
          <ellipse cx={nip[0] + (affected === 'left' ? 3 : -3)} cy={nip[1]} rx={r} ry={r * 0.86} />
        </clipPath>
      </defs>

      {/* skin changes over the affected breast */}
      {skinChange && (
        <g clipPath={`url(#${id}-breast)`}>
          {(spec.skin === 'erythema' || spec.skin === 'peau') && (
            <ellipse cx={nip[0]} cy={nip[1] + r * 0.3} rx={r * 0.9} ry={r * 0.6} fill="#c8514a" opacity={spec.skin === 'erythema' ? 0.35 : 0.14} filter={`url(#${id}-b3)`} />
          )}
          {spec.skin === 'peau' && <ellipse cx={nip[0]} cy={nip[1] + r * 0.35} rx={r * 0.85} ry={r * 0.55} fill={`url(#${id}-peau)`} />}
        </g>
      )}

      {/* the lump: visible contour and skin tethering */}
      {lump && lp && (
        <g>
          {lump.visible && (
            <g>
              <ellipse cx={lp[0] + 1.5} cy={lp[1] + 3} rx={lump.sizeCm * CM * 0.55} ry={lump.sizeCm * CM * 0.45} fill={pal.deep} opacity="0.28" filter={`url(#${id}-b3)`} />
              <ellipse cx={lp[0] - 1} cy={lp[1] - 1.5} rx={lump.sizeCm * CM * 0.42} ry={lump.sizeCm * CM * 0.34} fill={pal.highlight} opacity="0.4" filter={`url(#${id}-b3)`} />
            </g>
          )}
          {lump.tethered && (
            // skin puckering: a small pit with radiating creases, lit from above
            <g opacity={tetherShow}>
              <ellipse cx={lp[0]} cy={lp[1] + 1.8} rx="3.4" ry="1.8" fill={pal.deep} opacity="0.5" filter={`url(#${id}-b1)`} />
              {[-40, -15, 15, 40].map((a) => (
                <path
                  key={a}
                  d={`M${lp[0] + Math.sin((a * Math.PI) / 180) * 3} ${lp[1] + 2 - Math.cos((a * Math.PI) / 180) * 1.2} l${Math.sin((a * Math.PI) / 180) * 3.2} ${-Math.cos((a * Math.PI) / 180) * 2.4}`}
                  stroke={darken(pal.shadow, 0.1)}
                  strokeWidth="0.6"
                  opacity="0.55"
                  strokeLinecap="round"
                />
              ))}
              <path d={`M${lp[0] - 3.2} ${lp[1] + 0.2} q3.2 -1.4 6.4 0`} stroke={pal.highlight} strokeWidth="0.7" fill="none" opacity="0.6" />
            </g>
          )}
        </g>
      )}

      {/* nipple changes */}
      {spec.nipple &&
        (() => {
          const n = nipple(spec.nipple.side)
          switch (spec.nipple.change) {
            case 'inverted':
            case 'retracted': {
              // the nipple is drawn in: a small dark pit, displaced towards the lump when retracted
              const dir = lp && spec.nipple.change === 'retracted' ? Math.atan2(lp[1] - n[1], lp[0] - n[0]) : Math.PI / 2
              const ox = Math.cos(dir) * 1.4
              const oy = Math.sin(dir) * 1.4
              return (
                <g>
                  <circle cx={n[0]} cy={n[1]} r={3.6} fill={pal.nipple} />
                  <ellipse cx={n[0] + ox} cy={n[1] + oy} rx={1.9} ry={1.2} fill={darken(pal.nipple, 0.55)} transform={`rotate(${(dir * 180) / Math.PI} ${n[0] + ox} ${n[1] + oy})`} />
                  <path d={`M${n[0] - 2.6} ${n[1] - 1.2} q2.6 -1.6 5.2 0`} stroke={pal.highlight} strokeWidth="0.6" fill="none" opacity="0.5" />
                </g>
              )
            }
            case 'paget':
              return (
                <g>
                  <circle cx={n[0]} cy={n[1]} r={9} fill="#c4574c" opacity="0.75" filter={`url(#${id}-b1)`} />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <circle key={i} cx={n[0] + Math.cos(i * 2.1) * (2 + (i % 4) * 1.6)} cy={n[1] + Math.sin(i * 2.1) * (2 + (i % 3) * 1.8)} r="0.7" fill="#f3e2d6" opacity="0.8" />
                  ))}
                </g>
              )
            case 'discharge':
              return <ellipse cx={n[0] + 0.6} cy={n[1] + 3} rx="1.5" ry="2" fill={mix('#b3372f', '#e9c46a', 0.2)} opacity="0.9" />
          }
          return null
        })()}

      {/* clock-face guide */}
      {clockGuide && (
        <g opacity="0.85">
          <circle cx={nip[0]} cy={nip[1]} r={r * 0.95} fill="none" stroke="#fff" strokeWidth="0.7" strokeDasharray="2 2" />
          {[12, 3, 6, 9].map((h) => {
            const p = clockPoint(nip, h, (r * 1.13) / CM)
            return (
              <text key={h} x={p[0]} y={p[1] + 1.6} textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.55)', strokeWidth: 1.3 }}>
                {h}
              </text>
            )
          })}
          <path d={`M${nip[0] - r} ${nip[1]} L${nip[0] + r} ${nip[1]} M${nip[0]} ${nip[1] - r * 0.86} L${nip[0]} ${nip[1] + r * 0.86}`} stroke="#fff" strokeWidth="0.5" opacity="0.6" />
        </g>
      )}
    </g>
  )
})
