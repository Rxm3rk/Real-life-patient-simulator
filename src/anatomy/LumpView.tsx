import { memo } from 'react'
import type { LumpVisual } from '../engine/types'
import { hashString, seededRandom } from '../lib/utils'
import { darken, lighten, mix } from './color'
import { smoothPath, type Pt } from './geometry'
import { skinPalette } from './palette'
import type { Appearance } from './types'

/**
 * Close-up of a skin lump. Canvas 0..400 × 0..300 with 1 cm = 15 units.
 * Light comes from the upper left, so domes cast shadows down and right.
 */
export const LUMP_VIEWBOX = { cx: 200, cy: 150, w: 400, h: 300 }
export const LUMP_CM = 15

export function lumpCentre(spec: LumpVisual): Pt {
  switch (spec.site) {
    case 'forearm':
      return [185, 146]
    case 'upper-back':
      return [226, 132]
    case 'shoulder':
      return [210, 120]
    case 'chest-wall':
      return [236, 140]
    case 'thigh':
    default:
      return [200, 150]
  }
}

export const LumpView = memo(function LumpView({
  a,
  spec,
  id,
  torch,
  measure,
  pinch,
  exposed,
}: {
  a: Appearance
  spec: LumpVisual
  id: string
  /** Transillumination in progress */
  torch?: boolean
  /** Tape-measure overlay in progress */
  measure?: boolean
  /** Skin being moved over the lump */
  pinch?: boolean
  exposed: boolean
}) {
  const pal = skinPalette(a)
  const g = (n: string) => `${id}-${n}`
  const [cx, cy] = lumpCentre(spec)
  const rx = (spec.w * LUMP_CM) / 2
  const ry = (spec.h * LUMP_CM) / 2
  const rnd = seededRandom(hashString(id + spec.kind))
  const ery = spec.erythema ?? 0
  const lumpFill = mix(mix(pal.base, pal.highlight, 0.12), '#c0473f', ery * 0.45)
  const domed = spec.domed ?? (spec.kind === 'lipoma' ? 0.45 : 0.8)

  // lobulated outline for lipomas, smooth for cysts
  const outline = (() => {
    const n = spec.lobulated ? 11 : 18
    const pts: Pt[] = Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2
      const k = spec.lobulated ? 0.9 + rnd() * 0.18 : 1
      return [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k] as Pt
    })
    return smoothPath(pts, true, 1)
  })()

  const forearm = spec.site === 'forearm'
  return (
    <g>
      <defs>
        <linearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stage-2)" />
          <stop offset="1" stopColor="var(--stage)" />
        </linearGradient>
        <linearGradient id={g('arm')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.shadow} />
          <stop offset="0.25" stopColor={pal.base} />
          <stop offset="0.45" stopColor={mix(pal.base, pal.highlight, 0.55)} />
          <stop offset="0.8" stopColor={pal.base} />
          <stop offset="1" stopColor={darken(pal.shadow, 0.15)} />
        </linearGradient>
        <radialGradient id={g('skin')} cx="0.4" cy="0.35" r="0.85">
          <stop offset="0" stopColor={mix(pal.base, pal.highlight, 0.35)} />
          <stop offset="0.7" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.shadow} />
        </radialGradient>
        <radialGradient id={g('dome')} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor={lighten(lumpFill, 0.28)} stopOpacity={0.9 * domed} />
          <stop offset="0.55" stopColor={lumpFill} stopOpacity="0" />
          <stop offset="1" stopColor={darken(lumpFill, 0.25)} stopOpacity={0.6 * domed} />
        </radialGradient>
        <radialGradient id={g('ery')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c0473f" stopOpacity={0.45 * ery} />
          <stop offset="1" stopColor="#c0473f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb36b" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#ff6a3d" stopOpacity="0.75" />
          <stop offset="1" stopColor="#b3261e" stopOpacity="0" />
        </radialGradient>
        <filter id={g('b2')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id={g('b6')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <rect x={-200} y={-200} width={800} height={700} fill={`url(#${g('bg')})`} />

      {forearm ? (
        <g>
          {/* drape under the arm */}
          <rect x={-200} y={210} width={800} height={300} fill="#bcd6e2" opacity="0.6" />
          <path d="M-40 232 C100 226 260 236 440 230" stroke="#9fc0cf" strokeWidth="3" fill="none" opacity="0.6" />
          {/* forearm lying across, dorsal surface up: elbow left, wrist and hand right */}
          <path d="M-60 72 C60 70 200 78 300 92 C318 95 330 98 342 100 L342 196 C330 198 318 200 300 202 C200 214 60 222 -60 226 Z" fill={`url(#${g('arm')})`} />
          <path d="M342 100 C372 96 402 104 420 118 L424 186 C402 196 372 200 342 196 Z" fill={`url(#${g('arm')})`} />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${352 + i * 3} ${114 + i * 22} C${380 + i * 2} ${116 + i * 20} ${402} ${118 + i * 19} 430 ${122 + i * 18}`} stroke={pal.highlight} strokeWidth="1.4" fill="none" opacity="0.28" />
          ))}
          {/* wrist crease and ulnar styloid */}
          <path d="M338 102 C336 130 336 166 338 194" stroke={pal.shadow} strokeWidth="1.4" fill="none" opacity="0.35" />
          <ellipse cx="330" cy="184" rx="7" ry="5" fill={pal.highlight} opacity="0.35" filter={`url(#${g('b2')})`} />
          {/* superficial veins */}
          <path d="M20 180 C90 170 160 176 230 160 C270 150 300 140 330 146" stroke={mix(pal.base, '#5b6f9a', 0.32)} strokeWidth="2.2" fill="none" opacity="0.45" />
          {/* sleeve covering the forearm until it is rolled up */}
          {!exposed && (
            <g>
              <path d="M-60 62 C60 60 200 70 318 84 L324 212 C200 224 60 232 -60 236 Z" fill="#8fa9c4" />
              {[60, 140, 220].map((x) => (
                <path key={x} d={`M${x} ${70 + x * 0.06} C${x + 20} 120 ${x - 10} 170 ${x + 12} ${224 - x * 0.04}`} stroke="#7690ab" strokeWidth="3" fill="none" opacity="0.6" />
              ))}
              <path d="M318 84 L324 212" stroke="#6f88a2" strokeWidth="5" />
            </g>
          )}
        </g>
      ) : (
        <g>
          <rect x={-200} y={-200} width={800} height={700} fill={`url(#${g('skin')})`} />
          {spec.site === 'upper-back' && (
            <g>
              <path d="M70 -40 C74 60 70 180 76 340" stroke={pal.deep} strokeWidth="7" fill="none" opacity="0.22" filter={`url(#${g('b6')})`} />
              {[0, 1, 2, 3, 4].map((i) => (
                <ellipse key={i} cx={73} cy={10 + i * 60} rx="4" ry="6" fill={pal.highlight} opacity="0.25" filter={`url(#${g('b2')})`} />
              ))}
              <path d="M150 40 C230 30 300 50 330 80 C300 150 250 220 190 260" stroke={pal.shadow} strokeWidth="10" fill="none" opacity="0.14" filter={`url(#${g('b6')})`} />
            </g>
          )}
          {spec.site === 'chest-wall' && (
            <g>
              <path d="M40 -40 C44 80 42 200 46 340" stroke={pal.shadow} strokeWidth="8" fill="none" opacity="0.16" filter={`url(#${g('b6')})`} />
              <path d="M50 30 C160 20 280 40 440 20" stroke={pal.highlight} strokeWidth="9" fill="none" opacity="0.3" filter={`url(#${g('b6')})`} />
            </g>
          )}
          {spec.site === 'shoulder' && <path d="M-40 250 C60 60 240 10 440 40" stroke={pal.shadow} strokeWidth="18" fill="none" opacity="0.14" filter={`url(#${g('b6')})`} />}
          {/* gown edge */}
          <path d="M-200 272 C0 262 200 280 600 266 L600 500 L-200 500 Z" fill="#a8c9da" />
          <path d="M-200 272 C0 262 200 280 600 266" stroke="#86aec3" strokeWidth="3" fill="none" />
          {!exposed && <rect x={-200} y={-200} width={800} height={700} fill="#a8c9da" />}
        </g>
      )}

      {/* the lump */}
      {exposed && (
        <g>
          {ery > 0 && <ellipse cx={cx} cy={cy} rx={rx * 1.9} ry={ry * 1.9} fill={`url(#${g('ery')})`} />}
          <path d={outline} fill={pal.deep} opacity={0.35 * domed} transform={`translate(${5 * domed} ${8 * domed})`} filter={`url(#${g('b6')})`} />
          <path d={outline} fill={lumpFill} />
          <path d={outline} fill={`url(#${g('dome')})`} />
          {spec.lobulated &&
            [0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M${cx - rx * 0.6 + i * rx * 0.5} ${cy - ry * 0.7} q${rx * 0.12} ${ry * 0.7} ${rx * 0.02} ${ry * 1.3}`}
                stroke={pal.shadow}
                strokeWidth="1.3"
                fill="none"
                opacity="0.14"
              />
            ))}
          {spec.punctum && (
            <g>
              <circle cx={cx - rx * 0.05} cy={cy - ry * 0.1} r={pinch ? 2.6 : 1.8} fill={darken(pal.deep, 0.45)} />
              {pinch && <path d={`M${cx - 10} ${cy - 3} Q${cx} ${cy + 2} ${cx + 10} ${cy - 3}`} stroke={darken(pal.deep, 0.3)} strokeWidth="1.4" fill="none" opacity="0.7" />}
            </g>
          )}
          {spec.kind === 'abscess' && <ellipse cx={cx - 2} cy={cy - 4} rx={rx * 0.25} ry={ry * 0.22} fill="#e8d17a" opacity="0.85" filter={`url(#${g('b2')})`} />}
          {/* specular highlight: tense cysts are shiny */}
          <ellipse cx={cx - rx * 0.32} cy={cy - ry * 0.38} rx={rx * 0.22} ry={ry * 0.14} fill="#fff" opacity={spec.kind === 'lipoma' ? 0.08 : 0.22} filter={`url(#${g('b2')})`} />
        </g>
      )}

      {/* transillumination: dimmed room, torch against the lump */}
      {torch && (
        <g style={{ animation: 'bs-fade-in 0.5s ease-out' }}>
          <rect x={-200} y={-200} width={800} height={700} fill="#05070b" opacity="0.86" />
          {spec.transilluminates ? (
            <path d={outline} fill={`url(#${g('glow')})`} style={{ mixBlendMode: 'screen' }} />
          ) : (
            <path d={outline} fill="#1c1310" opacity="0.8" />
          )}
          <g transform={`translate(${cx + rx + 6} ${cy + 4}) rotate(-8)`}>
            <circle r="7" fill="#fff6d8" opacity="0.9" filter={`url(#${g('b2')})`} />
            <rect x={2} y={-5} width={70} height={10} rx={4} fill="#2a2f36" stroke="#59616b" />
            <rect x={-1} y={-5.5} width={6} height={11} rx={2} fill="#c9ced4" />
          </g>
        </g>
      )}

      {/* tape measure */}
      {measure && (
        <g style={{ animation: 'bs-fade-in 0.3s ease-out' }}>
          <g transform={`translate(${cx - rx} ${cy + ry + 14})`}>
            <rect x={-6} y={-7} width={rx * 2 + 12} height={14} rx={2} fill="#f5cf3f" stroke="#c9a41f" />
            {Array.from({ length: Math.floor((rx * 2) / (LUMP_CM / 2)) + 1 }).map((_, i) => (
              <path key={i} d={`M${(i * LUMP_CM) / 2} -7 l0 ${i % 2 ? 4 : 7}`} stroke="#3a2f0b" strokeWidth="0.8" />
            ))}
            <text x={rx} y={24} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.65)', strokeWidth: 3 }}>
              {spec.w.toFixed(1)} cm
            </text>
          </g>
          <g transform={`translate(${cx + rx + 14} ${cy - ry})`}>
            <rect x={-7} y={-6} width={14} height={ry * 2 + 12} rx={2} fill="#f5cf3f" stroke="#c9a41f" />
            {Array.from({ length: Math.floor((ry * 2) / (LUMP_CM / 2)) + 1 }).map((_, i) => (
              <path key={i} d={`M-7 ${(i * LUMP_CM) / 2} l${i % 2 ? 4 : 7} 0`} stroke="#3a2f0b" strokeWidth="0.8" />
            ))}
            <text x={14} y={ry + 4} fontSize="13" fontWeight="700" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.65)', strokeWidth: 3 }}>
              {spec.h.toFixed(1)} cm
            </text>
          </g>
        </g>
      )}
    </g>
  )
})
