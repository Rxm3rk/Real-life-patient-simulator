import { memo } from 'react'
import type { NeckVisual } from '../engine/types'
import { lighten, mix } from './color'
import { smoothPath, type Pt } from './geometry'
import { Face } from './Face'
import { skinPalette } from './palette'
import type { Appearance } from './types'

/**
 * Head, neck and upper chest for the thyroid station, in face units (vertex
 * y = 0, chin y = 100). The neck is exposed down to the clavicles.
 * View box ≈ x −120…120, y −30…250.
 */
export const NECK_VIEWBOX = { cx: 0, cy: 108, w: 240, h: 270 }

export interface NeckBustState {
  /** Swallow: larynx and thyroid rise 0..1 */
  swallow: number
  /** Tongue protrusion 0..1 */
  tongue: number
  /** Downgaze 0..1 (lid-lag test) */
  gazeDown: number
  /** Arms raised (Pemberton): plethora develops 0..1 */
  pemberton: number
  pain: number
  wince: number
  /** Show the face turned slightly (profile hint for proptosis) */
  lookAt?: 'examiner' | 'up' | 'down'
}

export const NeckBust = memo(function NeckBust({ a: a0, neck, st, id, exposed }: { a: Appearance; neck?: NeckVisual; st: NeckBustState; id: string; exposed: boolean }) {
  // long hair is tied back (and a headscarf loosened) so the neck can be examined
  const a: Appearance = a0.hair === 'long' || a0.hair === 'curly' || a0.hair === 'hijab' ? { ...a0, hair: 'bun' } : a0
  const pal = skinPalette(a)
  const female = a.sex === 'female'
  const g = (n: string) => `${id}-${n}`
  const nw = female ? 19 : 23 // neck half-width at the jaw
  const lift = st.swallow * 8
  const goitre = neck?.goitre
  const size = goitre?.size ?? 0
  const thy = neck?.thyroglossal
  const cystLift = lift * 0.8 + st.tongue * 5
  const thyPlethora = Math.min(1, st.pemberton) * (neck && goitre && goitre.size >= 2 ? 1 : 0)

  /**
   * A swelling that changes the neck contour: a crisp silhouette filled with the
   * neck's cylindrical shading, plus a clipped highlight above and shadow below.
   */
  const swelling = (d: string, key: string, box: { cx: number; cy: number; rx: number; ry: number }) => (
    <g key={key}>
      <defs>
        <clipPath id={g(`clip-${key}`)}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={pal.deep} opacity="0.28" transform="translate(0 3)" filter={`url(#${g('b3')})`} />
      <path d={d} fill={`url(#${g('swell')})`} />
      <g clipPath={`url(#${g(`clip-${key}`)})`}>
        <ellipse cx={box.cx} cy={box.cy - box.ry * 0.45} rx={box.rx * 0.7} ry={box.ry * 0.5} fill={pal.highlight} opacity="0.4" filter={`url(#${g('b3')})`} />
        <ellipse cx={box.cx} cy={box.cy + box.ry * 1.05} rx={box.rx * 1.1} ry={box.ry * 0.55} fill={pal.deep} opacity="0.35" filter={`url(#${g('b3')})`} />
      </g>
    </g>
  )
  const round = (cx: number, cy: number, rx: number, ry: number, key: string) =>
    swelling(
      smoothPath(Array.from({ length: 12 }, (_, i) => [cx + Math.cos((i / 12) * Math.PI * 2) * rx, cy + Math.sin((i / 12) * Math.PI * 2) * ry] as Pt), true),
      key,
      { cx, cy, rx, ry },
    )
  /** Butterfly-shaped goitre outline (both lobes + isthmus); `asym` enlarges one side. */
  const butterfly = (k: number, asym = 0, lumpy = 0): string => {
    const L = 1 - asym * 0.25
    const R = 1 + asym * 0.25
    const pts: Pt[] = [
      [0, 125],
      [9 * R, 113 - k * 1.2],
      [17 * R + k * 3 * R, 116 - k],
      [22 * R + k * 4.2 * R, 126 + lumpy],
      [19 * R + k * 3.6 * R, 138 + k * 1.2],
      [9 * R, 142 + k * 1.4 - lumpy],
      [0, 139 + k * 0.8],
      [-9 * L, 142 + k * 1.4],
      [-19 * L - k * 3.6 * L, 138 + k * 1.2 - lumpy],
      [-22 * L - k * 4.2 * L, 126],
      [-17 * L - k * 3 * L, 116 - k + lumpy],
      [-9 * L, 113 - k * 1.2],
    ]
    return smoothPath(pts, true, 0.95)
  }

  return (
    <g>
      <defs>
        <linearGradient id={g('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stage-2)" />
          <stop offset="1" stopColor="var(--stage)" />
        </linearGradient>
        <linearGradient id={g('neck')} x1="0" x2="1">
          <stop offset="0" stopColor={pal.deep} />
          <stop offset="0.2" stopColor={pal.shadow} />
          <stop offset="0.5" stopColor={mix(pal.base, pal.highlight, 0.3)} />
          <stop offset="0.8" stopColor={pal.shadow} />
          <stop offset="1" stopColor={pal.deep} />
        </linearGradient>
        <linearGradient id={g('swell')} x1="0" x2="1">
          <stop offset="0" stopColor={pal.shadow} />
          <stop offset="0.28" stopColor={pal.base} />
          <stop offset="0.5" stopColor={mix(pal.base, pal.highlight, 0.4)} />
          <stop offset="0.72" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.shadow} />
        </linearGradient>
        <linearGradient id={g('chest')} x1="0" x2="1">
          <stop offset="0" stopColor={pal.shadow} />
          <stop offset="0.3" stopColor={pal.base} />
          <stop offset="0.5" stopColor={mix(pal.base, pal.highlight, 0.4)} />
          <stop offset="0.7" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.shadow} />
        </linearGradient>
        <mask id={g('neckfade')} maskUnits="userSpaceOnUse" x="-80" y="60" width="160" height="100">
          <rect x="-80" y="60" width="160" height="60" fill="#fff" />
          <rect x="-80" y="119" width="160" height="36" fill={`url(#${g('fadeV')})`} />
        </mask>
        <linearGradient id={g('fadeV')} x1="0" y1="119" x2="0" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <filter id={g('b2')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={g('b3')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect x={-400} y={-300} width={800} height={700} fill={`url(#${g('wall')})`} />

      {/* shoulders and upper chest */}
      <path
        d={`M${-nw + 1} 96 C${-nw - 3} 122 -58 138 -96 152 C-114 160 -122 184 -124 214 L-126 290 L126 290 L124 214 C122 184 114 160 96 152 C58 138 ${nw + 3} 122 ${nw - 1} 96 Z`}
        fill={`url(#${g('chest')})`}
      />
      {/* neck */}
      {/* the neck fades into the chest rather than ending in a hard edge */}
      <path
        d={`M${-nw} 78 C${-nw - 1} 100 ${-nw - 3} 118 ${-nw - 14} 134 C${-nw - 24} 146 -16 152 0 152 C16 152 ${nw + 24} 146 ${nw + 14} 134 C${nw + 3} 118 ${nw + 1} 100 ${nw} 78 Z`}
        fill={`url(#${g('neck')})`}
        mask={`url(#${g('neckfade')})`}
      />

      {/* sternocleidomastoids */}
      {[1, -1].map((sx) => (
        <g key={sx} transform={`scale(${sx} 1)`}>
          <path d={`M${nw - 2} 86 C${nw - 6} 108 16 132 7 150`} stroke={pal.shadow} strokeWidth="3.2" fill="none" opacity="0.32" filter={`url(#${g('b2')})`} />
          <path d={`M${nw - 6} 88 C${nw - 9} 108 13 128 5 146`} stroke={pal.highlight} strokeWidth="2.4" fill="none" opacity="0.3" filter={`url(#${g('b2')})`} />
          {/* clavicle */}
          <path d="M8 152 C30 156 60 150 100 158" stroke={pal.highlight} strokeWidth="3.6" fill="none" opacity="0.5" strokeLinecap="round" filter={`url(#${g('b2')})`} />
          <path d="M9 157 C31 162 60 156 99 164" stroke={pal.deep} strokeWidth="2.6" fill="none" opacity="0.28" strokeLinecap="round" filter={`url(#${g('b2')})`} />
          {/* supraclavicular hollow */}
          <ellipse cx="40" cy="145" rx="16" ry="5" fill={pal.deep} opacity="0.18" filter={`url(#${g('b3')})`} />
        </g>
      ))}
      {/* suprasternal notch */}
      <ellipse cx="0" cy="151" rx="6" ry="3.4" fill={pal.deep} opacity="0.4" filter={`url(#${g('b2')})`} />
      {/* sternum and manubrium */}
      <path d="M0 158 L0 250" stroke={pal.shadow} strokeWidth="3" opacity="0.14" filter={`url(#${g('b2')})`} />

      {/* moving structures: larynx, thyroid, thyroglossal cyst */}
      <g transform={`translate(0 ${-lift})`} style={{ transition: 'transform 0.35s cubic-bezier(.3,.7,.3,1)' }}>
        {/* laryngeal prominence and cricoid */}
        {!female && (
          <g>
            <path d="M-6 100 C-3 94 3 94 6 100 C4 106 -4 106 -6 100 Z" fill={pal.highlight} opacity="0.5" filter={`url(#${g('b2')})`} />
            <path d="M-5 104 C-2 107 2 107 5 104" stroke={pal.shadow} strokeWidth="1" fill="none" opacity="0.4" />
          </g>
        )}
        <path d="M-5 116 C-2 118 2 118 5 116" stroke={pal.shadow} strokeWidth="0.9" fill="none" opacity="0.3" />
        {/* tracheal rings, faintly */}
        {[124, 130, 136, 142].map((y) => (
          <path key={y} d={`M-4 ${y} C-1.5 ${y + 1} 1.5 ${y + 1} 4 ${y}`} stroke={pal.shadow} strokeWidth="0.6" fill="none" opacity="0.18" />
        ))}

        {/* goitre */}
        {goitre?.kind === 'diffuse' && swelling(butterfly(size), 'goitre', { cx: 0, cy: 128, rx: 22 + size * 4, ry: 14 + size })}
        {goitre?.kind === 'multinodular' && (
          <g>
            {swelling(butterfly(size, goitre.side === 'right' ? -0.6 : 0.6, 2.5), 'goitre', { cx: 0, cy: 128, rx: 22 + size * 4, ry: 14 + size })}
            {/* nodules catching the light */}
            {[
              [goitre.side === 'right' ? -16 : 16, 124, 5 + size],
              [goitre.side === 'right' ? 12 : -12, 134, 3.5 + size * 0.6],
              [goitre.side === 'right' ? -8 : 8, 137, 3 + size * 0.5],
            ].map(([x, y, r], i) => (
              <ellipse key={i} cx={x} cy={y - r * 0.3} rx={r} ry={r * 0.8} fill={pal.highlight} opacity="0.3" filter={`url(#${g('b2')})`} />
            ))}
          </g>
        )}
        {goitre?.kind === 'nodule' && round((goitre.side === 'left' ? 1 : -1) * 11, 129, 5 + size * 2.2, 5 + size * 2, 'nodule')}
      </g>

      {/* thyroglossal cyst: midline at the hyoid, rises with swallowing AND tongue protrusion */}
      {thy && (
        <g transform={`translate(0 ${-cystLift})`} style={{ transition: 'transform 0.35s cubic-bezier(.3,.7,.3,1)' }}>
          {round(0, 114, thy.sizeCm * 2.9, thy.sizeCm * 2.5, 'tgc')}
        </g>
      )}

      {/* cervical lymphadenopathy along the anterior border of sternocleidomastoid */}
      {neck?.nodes &&
        (neck.nodes === 'both' ? [1, -1] : [neck.nodes === 'left' ? 1 : -1]).map((sx) => (
          <g key={sx}>{[0, 1].map((i) => round(sx * (nw - 2 - i * 2), 100 + i * 12, 3.2, 2.8, `ln${sx}${i}`))}</g>
        ))}

      {/* collar scar from a previous thyroidectomy */}
      {neck?.scar && <path d="M-26 140 C-12 146 12 146 26 140" stroke={lighten(pal.base, 0.35)} strokeWidth="1.6" fill="none" strokeLinecap="round" />}

      {/* gown lowered to below the clavicles */}
      <path
        d={`M-130 ${exposed ? 196 : 150} C-80 ${exposed ? 188 : 142} -40 ${exposed ? 192 : 146} 0 ${exposed ? 194 : 150} C40 ${exposed ? 192 : 146} 80 ${exposed ? 188 : 142} 130 ${exposed ? 196 : 150} L130 300 L-130 300 Z`}
        fill="#a8c9da"
      />
      <path d={`M-130 ${exposed ? 196 : 150} C-80 ${exposed ? 188 : 142} -40 ${exposed ? 192 : 146} 0 ${exposed ? 194 : 150} C40 ${exposed ? 192 : 146} 80 ${exposed ? 188 : 142} 130 ${exposed ? 196 : 150}`} stroke="#86aec3" strokeWidth="3" fill="none" />
      {!exposed && <path d={`M${-nw - 6} 128 C-10 150 10 150 ${nw + 6} 128`} stroke="#86aec3" strokeWidth="2.4" fill="none" />}

      {/* head */}
      <Face
        a={a}
        id={`${id}-face`}
        pose={{ pain: st.pain, wince: st.wince, lookAt: st.lookAt ?? 'examiner' }}
        eyes={{ retraction: neck?.lidRetraction ? 1 : 0, proptosis: neck?.proptosis ?? 0, lag: neck?.lidLag }}
        gaze={{ x: 0, y: st.gazeDown > 0 ? -0.6 + st.gazeDown * 2.6 : 0 }}
        tongueOut={st.tongue}
        plethora={thyPlethora}
      />
      {/* sweaty sheen (thyrotoxicosis) */}
      {neck?.sweaty && (
        <g fill="#fff" opacity="0.5">
          <ellipse cx="-14" cy="112" rx="1" ry="1.5" />
          <ellipse cx="16" cy="118" rx="0.9" ry="1.3" />
          <ellipse cx="-30" cy="150" rx="0.9" ry="1.3" />
        </g>
      )}
    </g>
  )
})
