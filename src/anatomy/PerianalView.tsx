import { memo } from 'react'
import type { PerianalVisual } from '../engine/types'
import { darken, lighten, mix } from './color'
import type { Pt } from './geometry'
import { skinPalette } from './palette'
import type { Appearance } from './types'

/**
 * Clinical close-up for the perianal station. Drawn in the orientation used
 * to document findings — the lithotomy clock face: 12 o’clock anterior (top),
 * 6 o’clock posterior (bottom), 3 o’clock the patient’s left (viewer’s right).
 * Canvas 0..400 × 0..320.
 */
export const PERIANAL_VIEWBOX = { cx: 200, cy: 165, w: 400, h: 320 }

export const ANUS: Pt = [200, 168]
/** Pixels per centimetre at the anal verge */
export const PX_CM = 11

/** A point at a clock position, `r` px from the anus. */
export function clockPt(clock: number, r: number): Pt {
  const t = (clock / 12) * Math.PI * 2
  return [ANUS[0] + Math.sin(t) * r, ANUS[1] - Math.cos(t) * r]
}

export function lesionPt(spec: PerianalVisual | undefined): Pt | null {
  if (!spec || spec.kind === 'normal') return null
  const clock = Array.isArray(spec.clock) ? spec.clock[0] : spec.clock ?? 6
  const r = spec.kind === 'fissure' ? 18 : spec.kind === 'thrombosed-piles' ? 16 : 12 + (spec.distCm ?? 2) * PX_CM
  return clockPt(clock, r)
}

export const PerianalView = memo(function PerianalView({
  a,
  spec,
  id,
  exposed,
  parted,
  straining,
  finger,
  scope,
  sex,
}: {
  a: Appearance
  spec?: PerianalVisual
  id: string
  exposed: boolean
  /** Buttocks held apart */
  parted: boolean
  straining: boolean
  /** Gloved finger at the anal verge (DRE) */
  finger: boolean
  /** Proctoscopic view */
  scope: boolean
  sex: 'male' | 'female'
}) {
  const pal = skinPalette(a)
  const skin = mix(pal.base, pal.deep, 0.18)
  const peri = mix(pal.base, pal.deep, 0.55)
  const g = (n: string) => `${id}-${n}`
  const kind = spec?.kind ?? 'normal'
  const clocks = spec?.clock == null ? [] : Array.isArray(spec.clock) ? spec.clock : [spec.clock]
  const open = parted ? 1 : 0.35
  const [ax, ay] = ANUS

  return (
    <g>
      <defs>
        <linearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stage-2)" />
          <stop offset="1" stopColor="var(--stage)" />
        </linearGradient>
        <radialGradient id={g('buttL')} cx="0.62" cy="0.45" r="0.75">
          <stop offset="0" stopColor={lighten(skin, 0.1)} />
          <stop offset="0.7" stopColor={skin} />
          <stop offset="1" stopColor={darken(skin, 0.3)} />
        </radialGradient>
        <radialGradient id={g('buttR')} cx="0.38" cy="0.45" r="0.75">
          <stop offset="0" stopColor={lighten(skin, 0.1)} />
          <stop offset="0.7" stopColor={skin} />
          <stop offset="1" stopColor={darken(skin, 0.3)} />
        </radialGradient>
        <radialGradient id={g('peri')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={darken(peri, 0.25)} />
          <stop offset="0.55" stopColor={peri} />
          <stop offset="1" stopColor={skin} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('abscess')} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#f2b08a" />
          <stop offset="0.45" stopColor="#d4564a" />
          <stop offset="1" stopColor="#b3261e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('pile')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#8a6aa8" />
          <stop offset="0.6" stopColor="#4a2d63" />
          <stop offset="1" stopColor="#2b1838" />
        </radialGradient>
        <radialGradient id={g('mucosa')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3b0d12" />
          <stop offset="0.35" stopColor="#a8323c" />
          <stop offset="0.8" stopColor="#e07b7b" />
          <stop offset="1" stopColor="#f0a39d" />
        </radialGradient>
        <filter id={g('b2')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id={g('b6')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect x={-200} y={-200} width={800} height={720} fill={`url(#${g('bg')})`} />

      {/* skin deep in the natal cleft, seen when the buttocks are parted */}
      <path d="M120 -40 L280 -40 L280 380 L120 380 Z" fill={mix(skin, pal.deep, 0.32)} />
      {/* the buttocks, parted at the cleft */}
      <path d={`M-40 -40 L${196 - open * 26} -40 C${190 - open * 30} 90 ${184 - open * 44} 150 ${186 - open * 40} 200 C${188 - open * 34} 260 ${194 - open * 12} 320 196 380 L-40 380 Z`} fill={`url(#${g('buttL')})`} />
      <path d={`M440 -40 L${204 + open * 26} -40 C${210 + open * 30} 90 ${216 + open * 44} 150 ${214 + open * 40} 200 C${212 + open * 34} 260 ${206 + open * 12} 320 204 380 L440 380 Z`} fill={`url(#${g('buttR')})`} />
      {/* cleft shadow */}
      <path d={`M200 -40 L200 380`} stroke={darken(skin, 0.5)} strokeWidth={6 + open * 30} opacity="0.35" filter={`url(#${g('b6')})`} />

      {!exposed ? (
        <path d="M-60 -60 L460 -60 L460 380 L-60 380 Z" fill="#a8c9da" />
      ) : (
        <g>
          {/* pigmented perianal skin with radial folds */}
          <ellipse cx={ax} cy={ay} rx={30 + open * 30} ry={40 + open * 22} fill={`url(#${g('peri')})`} />
          <g stroke={darken(peri, 0.35)} strokeWidth="1.1" opacity={0.55} strokeLinecap="round">
            {Array.from({ length: 16 }, (_, i) => {
              const t = (i / 16) * Math.PI * 2
              const r0 = 6.5
              const r1 = 18 + (i % 3) * 4 + open * 6
              return <line key={i} x1={ax + Math.sin(t) * r0} y1={ay - Math.cos(t) * r0} x2={ax + Math.sin(t) * r1} y2={ay - Math.cos(t) * r1} />
            })}
          </g>
          {/* the anal verge */}
          <ellipse cx={ax} cy={ay} rx={straining ? 9 : 6.5} ry={straining ? 8 : 5.5} fill={darken(peri, 0.6)} />
          <ellipse cx={ax} cy={ay - 1} rx={straining ? 5 : 3} ry={straining ? 4 : 2.4} fill="#2a0f12" opacity="0.8" />

          {/* skin tags */}
          {(spec?.tags ?? []).map((cl) => {
            const [x, y] = clockPt(cl, 15)
            return <ellipse key={cl} cx={x} cy={y} rx={4.5} ry={6} fill={lighten(peri, 0.08)} stroke={darken(peri, 0.3)} strokeWidth="0.8" />
          })}

          {kind === 'fissure' && <Fissure clock={clocks[0] ?? 6} sentinel={!!spec?.sentinel} peri={peri} />}

          {kind === 'abscess' &&
            (() => {
              const [x, y] = lesionPt(spec)!
              const r = 10 + (spec?.sizeCm ?? 3) * 4
              return (
                <g>
                  <circle cx={x} cy={y} r={r * 1.9} fill="#c0392b" opacity="0.22" filter={`url(#${g('b6')})`} />
                  <circle cx={x} cy={y} r={r} fill={`url(#${g('abscess')})`} />
                  <circle cx={x - r * 0.15} cy={y - r * 0.2} r={r * 0.45} fill="#f6d36b" opacity="0.35" filter={`url(#${g('b2')})`} />
                  <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.28} ry={r * 0.16} fill="#fff" opacity="0.4" />
                </g>
              )
            })()}

          {kind === 'thrombosed-piles' &&
            (clocks.length ? clocks : [3, 7, 11]).map((cl, i) => {
              const [x, y] = clockPt(cl, 13)
              const r = (spec?.sizeCm ?? 1.5) * 5.5 * (i === 0 ? 1 : 0.8)
              return (
                <g key={cl}>
                  <circle cx={x} cy={y} r={r * 1.35} fill={mix(peri, '#d98a8a', 0.5)} opacity="0.8" filter={`url(#${g('b2')})`} />
                  <circle cx={x} cy={y} r={r} fill={`url(#${g('pile')})`} />
                  <ellipse cx={x - r * 0.3} cy={y - r * 0.35} rx={r * 0.3} ry={r * 0.18} fill="#fff" opacity="0.35" />
                </g>
              )
            })}

          {kind === 'fistula' &&
            (() => {
              const [x, y] = lesionPt(spec)!
              return (
                <g>
                  <circle cx={x} cy={y} r={7} fill="#c0392b" opacity="0.25" filter={`url(#${g('b2')})`} />
                  <circle cx={x} cy={y} r={3.6} fill="#d9485a" />
                  <circle cx={x + 0.8} cy={y + 0.6} r={1.5} fill="#f2e2a0" />
                </g>
              )
            })()}

          {/* clock-face reference */}
          <g fontSize="9" fontWeight="600" fill="#ffffff" opacity="0.75" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.55)', strokeWidth: 2.5 }} pointerEvents="none">
            <text x={ax} y={ay - 62}>12 · anterior</text>
            <text x={ax} y={ay + 72}>6 · posterior</text>
            <text x={ax + 66} y={ay + 3}>3</text>
            <text x={ax - 66} y={ay + 3}>9</text>
          </g>
        </g>
      )}

      {/* drape over the perineum (anterior) */}
      <g>
        <path d="M110 -60 L290 -60 L282 70 C250 82 150 82 118 70 Z" fill="#f6f8f9" />
        <path d="M118 70 C150 82 250 82 282 70" stroke="#000" strokeOpacity="0.12" strokeWidth="3" fill="none" />
        <text x="200" y="52" textAnchor="middle" fontSize="8.5" fill="#8a97a3" fontWeight="600" letterSpacing="1.2">
          {sex === 'male' ? 'SCROTUM DRAPED' : 'VULVA DRAPED'}
        </text>
      </g>

      {/* gloved hand parting the buttocks */}
      {parted && exposed && !scope && (
        <g opacity="0.95" style={{ animation: 'bs-fade-in 0.25s ease-out' }}>
          <path d="M28 120 C70 112 110 118 140 132 C150 137 150 150 140 154 C108 158 70 160 30 170 Z" fill="#a9cbe8" stroke="#7fa8cc" strokeWidth="1.2" />
          <path d="M372 120 C330 112 290 118 260 132 C250 137 250 150 260 154 C292 158 330 160 370 170 Z" fill="#a9cbe8" stroke="#7fa8cc" strokeWidth="1.2" />
          <g stroke="#7fa8cc" strokeWidth="1" fill="none" opacity="0.8">
            <path d="M60 128 C90 126 116 130 136 138" />
            <path d="M58 146 C88 144 114 146 138 150" />
            <path d="M340 128 C310 126 284 130 264 138" />
            <path d="M342 146 C312 144 286 146 262 150" />
          </g>
        </g>
      )}

      {/* gloved index finger at the verge */}
      {finger && exposed && !scope && (
        <g style={{ animation: 'bs-fade-in 0.25s ease-out' }}>
          <path d={`M${ax + 8} ${ay + 6} C${ax + 30} ${ay + 40} ${ax + 70} ${ay + 92} ${ax + 112} ${ay + 150} L${ax + 140} ${ay + 128} C${ax + 96} ${ay + 76} ${ax + 52} ${ay + 26} ${ax + 18} ${ay - 2} C${ax + 12} ${ay - 6} ${ax + 4} ${ay} ${ax + 8} ${ay + 6} Z`} fill="#bcd7ef" stroke="#86acd0" strokeWidth="1.3" />
          <path d={`M${ax + 22} ${ay + 18} c4 3 8 2 10 -1`} stroke="#86acd0" strokeWidth="1" fill="none" />
        </g>
      )}

      {/* proctoscopic view */}
      {scope && exposed && (
        <g style={{ animation: 'bs-fade-in 0.35s ease-out' }}>
          <rect x={-200} y={-200} width={800} height={720} fill="#05070b" opacity="0.9" />
          <circle cx={ax} cy={ay} r={82} fill="#c9ced6" />
          <circle cx={ax} cy={ay} r={74} fill={`url(#${g('mucosa')})`} />
          {/* submucosal vessels */}
          <g stroke="#7e1d2a" strokeWidth="1" fill="none" opacity="0.45">
            <path d={`M${ax - 50} ${ay - 30} q20 10 30 -6 q14 -14 30 -4`} />
            <path d={`M${ax + 20} ${ay + 40} q16 -8 30 4`} />
          </g>
          {(spec?.internalPiles || kind === 'thrombosed-piles') &&
            [3, 7, 11].map((cl) => {
              const t = (cl / 12) * Math.PI * 2
              const x = ax + Math.sin(t) * 46
              const y = ay - Math.cos(t) * 46
              return <ellipse key={cl} cx={x} cy={y} rx={20} ry={14} transform={`rotate(${(cl / 12) * 360} ${x} ${y})`} fill={`url(#${g('pile')})`} opacity="0.85" />
            })}
          {kind === 'fissure' && <path d={`M${ax} ${ay + 40} l-3 30 l6 0 z`} fill="#f5d0cc" opacity="0.9" />}
          <text x={ax} y={ay + 108} textAnchor="middle" fontSize="10" fill="#e6edf3" fontWeight="600" letterSpacing="1.2">
            PROCTOSCOPIC VIEW
          </text>
        </g>
      )}
    </g>
  )
})

function Fissure({ clock, sentinel, peri }: { clock: number; sentinel: boolean; peri: string }) {
  const t = (clock / 12) * 360
  const [ax, ay] = ANUS
  return (
    <g transform={`rotate(${t} ${ax} ${ay})`}>
      {/* a raw split running from the verge outwards (drawn at 12, rotated into place) */}
      <path d={`M${ax} ${ay - 6} C${ax - 4} ${ay - 14} ${ax - 3} ${ay - 24} ${ax} ${ay - 30} C${ax + 3} ${ay - 24} ${ax + 4} ${ay - 14} ${ax} ${ay - 6} Z`} fill="#b8323a" />
      <path d={`M${ax} ${ay - 9} C${ax - 1.5} ${ay - 15} ${ax - 1} ${ay - 22} ${ax} ${ay - 26}`} stroke="#f0a0a0" strokeWidth="1" fill="none" />
      {sentinel && <ellipse cx={ax} cy={ay - 36} rx={5} ry={6.5} fill={lighten(peri, 0.12)} stroke={darken(peri, 0.3)} strokeWidth="0.8" />}
    </g>
  )
}
