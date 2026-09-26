import { memo } from 'react'
import type { ScrotalVisual } from '../engine/types'
import { darken, lighten, mix } from './color'
import { smoothPath, type Pt } from './geometry'
import { skinPalette } from './palette'
import type { Appearance } from './types'

/**
 * Clinical close-up for the scrotal station (standing, penis draped).
 * Canvas 0..400 × 0..320; the patient’s right is on the viewer’s left.
 */
export const SCROTUM_VIEWBOX = { cx: 200, cy: 160, w: 400, h: 320 }

export interface ScrotumGeom {
  /** Centre of each testis (viewer-left = patient's right) */
  right: Pt
  left: Pt
  /** Cord at the neck of each hemiscrotum */
  cordR: Pt
  cordL: Pt
  groinR: Pt
  groinL: Pt
}

export function scrotumGeom(spec: ScrotalVisual | undefined, lying: boolean): ScrotumGeom {
  const drop = lying ? -10 : 0
  const aff = spec?.side
  const high = spec?.highRiding ? -22 : 0
  const big = spec && (spec.kind === 'hydrocele' || spec.kind === 'inguinoscrotal-hernia') ? spec.size * 9 : 0
  const yR = 214 + drop + (aff === 'right' ? high + big * 0.5 : 0)
  const yL = 222 + drop + (aff === 'left' ? high + big * 0.5 : 0)
  return {
    right: [168 - (aff === 'right' ? big * 0.35 : 0), yR],
    left: [232 + (aff === 'left' ? big * 0.35 : 0), yL],
    cordR: [176, 150],
    cordL: [224, 150],
    groinR: [104, 86],
    groinL: [296, 86],
  }
}

export const ScrotumView = memo(function ScrotumView({
  a,
  spec,
  id,
  lying,
  anatomy,
  torch,
  exposed,
}: {
  a: Appearance
  spec?: ScrotalVisual
  id: string
  lying: boolean
  /** See-through teaching view of the underlying anatomy */
  anatomy?: boolean
  torch?: boolean
  exposed: boolean
}) {
  const pal = skinPalette(a)
  const skin = mix(pal.base, pal.deep, 0.28)
  const g = (n: string) => `${id}-${n}`
  const geo = scrotumGeom(spec, lying)
  const aff = spec?.side
  const kind = spec?.kind
  const size = spec?.size ?? 1
  const ery = spec?.erythema ?? 0

  // hemiscrotum outline around a testis centre; `k` scales, `up` stretches towards the groin
  const hemi = (c: Pt, sx: number, k: number, up = 0): string => {
    const [x, y] = c
    const w = 30 * k
    const h = 38 * k
    const pts: Pt[] = [
      [x + sx * 4, 132 - up],
      [x + sx * (w * 0.62), y - h * 0.75],
      [x + sx * w, y - h * 0.1],
      [x + sx * (w * 0.85), y + h * 0.62],
      [x + sx * (w * 0.2), y + h * 0.98],
      [200 + sx * 2, y + h * 0.7],
      [200 + sx * 1, 150 - up * 0.3],
    ]
    return smoothPath(pts, true, 0.9)
  }
  const kR = aff === 'right' ? swellK(kind, size) : 1
  const kL = aff === 'left' ? swellK(kind, size) : 1
  const upR = aff === 'right' && kind === 'inguinoscrotal-hernia' ? 30 + size * 12 : 0
  const upL = aff === 'left' && kind === 'inguinoscrotal-hernia' ? 30 + size * 12 : 0
  const glows = kind === 'hydrocele' || kind === 'epididymal-cyst'
  const affC = aff === 'left' ? geo.left : geo.right
  const sxAff = aff === 'left' ? 1 : -1

  return (
    <g>
      <defs>
        <linearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stage-2)" />
          <stop offset="1" stopColor="var(--stage)" />
        </linearGradient>
        <linearGradient id={g('thigh')} x1="0" x2="1">
          <stop offset="0" stopColor={pal.shadow} />
          <stop offset="0.45" stopColor={mix(pal.base, pal.highlight, 0.35)} />
          <stop offset="1" stopColor={pal.shadow} />
        </linearGradient>
        <radialGradient id={g('sac')} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={lighten(skin, 0.12)} />
          <stop offset="0.7" stopColor={skin} />
          <stop offset="1" stopColor={darken(skin, 0.28)} />
        </radialGradient>
        <radialGradient id={g('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc07a" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#ff6b3d" stopOpacity="0.7" />
          <stop offset="1" stopColor="#b3261e" stopOpacity="0" />
        </radialGradient>
        <filter id={g('b2')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id={g('b5')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <rect x={-200} y={-200} width={800} height={720} fill={`url(#${g('bg')})`} />

      {/* lower abdomen and thighs */}
      <path d="M40 -60 L360 -60 C368 20 356 60 344 110 C330 170 318 240 312 330 L234 330 C230 260 222 200 200 172 C178 200 170 260 166 330 L88 330 C82 240 70 170 56 110 C44 60 32 20 40 -60 Z" fill={`url(#${g('thigh')})`} />
      {/* groin creases */}
      {[1, -1].map((sx) => (
        <path key={sx} transform={`translate(200 0) scale(${sx} 1) translate(-200 0)`} d="M86 36 C120 66 150 104 176 136" stroke={pal.deep} strokeWidth="3" fill="none" opacity="0.35" filter={`url(#${g('b2')})`} />
      ))}
      {/* underwear lowered to the thighs */}
      <path d="M60 300 C140 292 260 292 340 300 L344 330 L56 330 Z" fill="#27344d" />

      {!exposed ? (
        <path d="M30 -60 L370 -60 L370 330 L30 330 Z" fill="#a8c9da" />
      ) : (
        <g>
          {/* hemiscrota */}
          <g filter={`url(#${g('b5')})`} opacity="0.45">
            <path d={hemi(geo.right, -1, kR, upR)} fill={pal.deep} transform="translate(3 7)" />
            <path d={hemi(geo.left, 1, kL, upL)} fill={pal.deep} transform="translate(3 7)" />
          </g>
          <path d={hemi(geo.right, -1, kR, upR)} fill={`url(#${g('sac')})`} />
          <path d={hemi(geo.left, 1, kL, upL)} fill={`url(#${g('sac')})`} />
          {/* erythema of the affected side */}
          {ery > 0 && aff && <path d={hemi(affC, sxAff, aff === 'left' ? kL : kR, aff === 'left' ? upL : upR)} fill="#c0392b" opacity={ery * 0.4} />}
          {/* rugae */}
          <g stroke={darken(skin, 0.3)} strokeWidth="0.8" fill="none" opacity={kind === 'hydrocele' && size >= 2 ? 0.08 : 0.28}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} d={`M${150 + i * 18} ${186 + (i % 2) * 8} q6 ${10 + (i % 3) * 4} 2 ${22 + (i % 2) * 6}`} />
            ))}
          </g>
          {/* median raphe */}
          <path d={`M200 150 C198 180 202 210 200 ${Math.max(geo.right[1], geo.left[1]) + 30}`} stroke={darken(skin, 0.35)} strokeWidth="1.3" fill="none" opacity="0.55" />
          {/* testis contours seen through the skin */}
          {[
            [geo.right, -1, aff === 'right'] as const,
            [geo.left, 1, aff === 'left'] as const,
          ].map(([c, sx, isAff]) => {
            const horiz = isAff && spec?.highRiding
            const hidden = isAff && kind === 'hydrocele' && size >= 2
            if (hidden) return null
            return (
              <ellipse
                key={sx}
                cx={c[0]}
                cy={c[1]}
                rx={horiz ? 17 : 13}
                ry={horiz ? 12 : 17}
                fill={lighten(skin, 0.1)}
                opacity={isAff && kind === 'tumour' ? 0.55 : 0.35}
                filter={`url(#${g('b2')})`}
              />
            )
          })}
          {/* varicocele: “bag of worms” above the testis, visible standing */}
          {kind === 'varicocele' && !lying && aff && (
            <g stroke={mix(skin, '#44507a', 0.55)} strokeWidth={2 + size * 0.7} fill="none" strokeLinecap="round" opacity="0.75">
              {[0, 1, 2].map((i) => (
                <path
                  key={i}
                  d={`M${(aff === 'left' ? geo.cordL[0] : geo.cordR[0]) + sxAff * (i * 5 - 4)} 150 c${sxAff * 8} 8 ${sxAff * -6} 14 ${sxAff * 3} 22 c${sxAff * 8} 8 ${sxAff * -7} 12 ${sxAff * 2} 20`}
                />
              ))}
            </g>
          )}
          {/* epididymal cyst: separate smooth swelling above the testis */}
          {kind === 'epididymal-cyst' && aff && (
            <g>
              <ellipse cx={affC[0] + sxAff * 6} cy={affC[1] - 30} rx={9 + size * 3} ry={8 + size * 3} fill={lighten(skin, 0.14)} />
              <ellipse cx={affC[0] + sxAff * 4} cy={affC[1] - 33} rx={4 + size} ry={3 + size} fill="#fff" opacity="0.18" />
            </g>
          )}
        </g>
      )}

      {/* folded towel over the penis */}
      <g>
        <path d="M150 58 C170 50 230 50 250 58 L236 152 C220 158 180 158 164 152 Z" fill="#f6f8f9" />
        <path d="M150 58 C170 50 230 50 250 58 L248 70 C228 62 172 62 152 70 Z" fill="#e4e9ec" />
        <path d="M176 70 L170 150 M200 66 L200 156 M224 70 L230 150" stroke="#dde3e7" strokeWidth="1.2" />
        <path d="M164 152 C180 158 220 158 236 152" stroke="#000" strokeOpacity="0.12" strokeWidth="3" fill="none" />
      </g>

      {/* see-through anatomy (teaching) */}
      {anatomy && exposed && (
        <g opacity="0.9" style={{ animation: 'bs-fade-in 0.4s ease-out' }}>
          {[
            [geo.right, -1, aff === 'right'] as const,
            [geo.left, 1, aff === 'left'] as const,
          ].map(([c, sx, isAff]) => {
            const horiz = isAff && spec?.highRiding
            const torsion = isAff && kind === 'torsion'
            return (
              <g key={sx}>
                {/* spermatic cord */}
                <path d={`M${c[0] + sx * 4} ${c[1] - 16} C${c[0] + sx * 6} ${c[1] - 40} ${200 + sx * 22} 120 ${200 + sx * 70} 70`} stroke={isAff && kind === 'varicocele' ? '#5a6ea8' : '#d9b48f'} strokeWidth={isAff && kind === 'varicocele' ? 7 : 4} fill="none" strokeLinecap="round" />
                {torsion && <path d={`M${c[0] + sx * 2} ${c[1] - 30} q${sx * 10} -6 0 -12 q${sx * -10} -6 0 -12`} stroke="#7a1f2a" strokeWidth="3" fill="none" />}
                {/* tunica vaginalis fluid (hydrocele) */}
                {isAff && kind === 'hydrocele' && <ellipse cx={c[0]} cy={c[1]} rx={20 + size * 8} ry={26 + size * 9} fill="#8fd3f0" opacity="0.45" stroke="#5fb3d6" />}
                {/* testis */}
                <ellipse cx={c[0]} cy={c[1]} rx={horiz ? 16 : 11.5} ry={horiz ? 11 : 16} fill={torsion ? '#8e2f3b' : '#f1dcd2'} stroke={torsion ? '#5e1621' : '#c9a397'} strokeWidth="1" />
                {isAff && kind === 'tumour' && <path d={`M${c[0] - 6} ${c[1] - 4} C${c[0] - 2} ${c[1] - 11} ${c[0] + 7} ${c[1] - 6} ${c[0] + 6} ${c[1] + 2} C${c[0] + 5} ${c[1] + 9} ${c[0] - 5} ${c[1] + 8} ${c[0] - 6} ${c[1] - 4} Z`} fill="#8d8b86" />}
                {/* epididymis: head at the upper pole, body and tail along the back */}
                <path
                  d={`M${c[0] + sx * 3} ${c[1] - 17} C${c[0] + sx * 16} ${c[1] - 16} ${c[0] + sx * 16} ${c[1] + 4} ${c[0] + sx * 11} ${c[1] + 15}`}
                  stroke={isAff && kind === 'epididymitis' ? '#c0392b' : '#c79a6f'}
                  strokeWidth={isAff && kind === 'epididymitis' ? 8 : 5}
                  fill="none"
                  strokeLinecap="round"
                />
                {isAff && kind === 'epididymal-cyst' && <circle cx={c[0] + sx * 8} cy={c[1] - 30} r={8 + size * 3} fill="#8fd3f0" opacity="0.6" stroke="#5fb3d6" />}
                {isAff && kind === 'inguinoscrotal-hernia' && (
                  <path d={`M${200 + sx * 60} 60 C${200 + sx * 40} 110 ${c[0] + sx * 20} ${c[1] - 60} ${c[0] + sx * 6} ${c[1] - 22}`} stroke="#e7b3a5" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.85" />
                )}
              </g>
            )
          })}
        </g>
      )}

      {/* transillumination */}
      {torch && exposed && (
        <g style={{ animation: 'bs-fade-in 0.5s ease-out' }}>
          <rect x={-200} y={-200} width={800} height={720} fill="#05070b" opacity="0.87" />
          {glows && aff ? (
            kind === 'hydrocele' ? (
              <path d={hemi(affC, sxAff, aff === 'left' ? kL : kR)} fill={`url(#${g('glow')})`} />
            ) : (
              <circle cx={affC[0] + sxAff * 6} cy={affC[1] - 30} r={11 + size * 3} fill={`url(#${g('glow')})`} />
            )
          ) : (
            <path d={hemi(affC, sxAff, aff === 'left' ? kL : kR, aff === 'left' ? upL : upR)} fill="#1c1310" opacity="0.8" />
          )}
          <g transform={`translate(${affC[0] + sxAff * 40} ${affC[1] + 30}) rotate(${sxAff * 30})`}>
            <circle r="6" fill="#fff6d8" opacity="0.9" filter={`url(#${g('b2')})`} />
            <rect x={-5} y={2} width={10} height={62} rx={4} fill="#2a2f36" stroke="#59616b" />
          </g>
        </g>
      )}
    </g>
  )
})

function swellK(kind: ScrotalVisual['kind'] | undefined, size: number): number {
  switch (kind) {
    case 'hydrocele':
      return 1 + size * 0.34
    case 'inguinoscrotal-hernia':
      return 1 + size * 0.26
    case 'epididymitis':
    case 'torsion':
      return 1.12 + size * 0.06
    case 'tumour':
      return 1.06 + size * 0.08
    default:
      return 1
  }
}
