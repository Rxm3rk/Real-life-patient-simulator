import { darken, lighten, mix } from './color'
import { IRIS, skinPalette } from './palette'
import type { Appearance } from './types'

/**
 * Eye close-up with the lower lid gently pulled down: shows the sclera (for
 * jaundice) and the palpebral conjunctiva (for pallor). Canvas 0..300 × 0..180.
 */
export function EyeCloseup({ a, sclera, conjunctiva, id }: { a: Appearance; sclera: 'white' | 'icteric'; conjunctiva: 'pink' | 'pale'; id: string }) {
  const pal = skinPalette(a)
  const iris = IRIS[a.eyeColor ?? (a.skinTone >= 3 ? 'brown' : 'hazel')]
  const scl = sclera === 'icteric' ? mix('#f4f1ea', '#e3c64a', Math.max(0.55, a.jaundice ?? 0.7)) : '#f3f1ec'
  const conj = conjunctiva === 'pale' ? '#efd3cf' : '#d9676d'
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-sk`} cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor={pal.highlight} />
          <stop offset="1" stopColor={pal.shadow} />
        </radialGradient>
        <radialGradient id={`${id}-ir`}>
          <stop offset="0" stopColor={lighten(iris, 0.3)} />
          <stop offset="0.75" stopColor={iris} />
          <stop offset="1" stopColor={darken(iris, 0.5)} />
        </radialGradient>
        <clipPath id={`${id}-eye`}>
          <path d="M40 92 C80 40 220 40 260 92 C220 122 80 122 40 92 Z" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="300" height="180" rx="18" fill={`url(#${id}-sk)`} />
      {/* brow */}
      <path d="M50 38 C110 16 200 16 262 34 L258 44 C200 30 112 30 54 48 Z" fill={darken(pal.shadow, 0.5)} opacity="0.75" />
      {/* eyeball */}
      <path d="M40 92 C80 40 220 40 260 92 C220 122 80 122 40 92 Z" fill={scl} />
      <g clipPath={`url(#${id}-eye)`}>
        <circle cx="150" cy="80" r="34" fill={`url(#${id}-ir)`} />
        <circle cx="150" cy="80" r="13" fill="#0c0908" />
        <circle cx="160" cy="70" r="6" fill="#fff" opacity="0.85" />
        {/* looking up: sclera below iris visible */}
        <path d="M40 60 C80 40 220 40 260 60 L260 40 L40 40 Z" fill="#000" opacity="0.08" />
        {/* scleral vessels */}
        <path d="M60 96 C80 90 96 94 110 88 M240 96 C222 92 206 96 192 90" stroke="#c9727a" strokeWidth="0.8" fill="none" opacity="0.5" />
      </g>
      <path d="M40 92 C80 40 220 40 260 92" stroke="#1e1512" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* everted lower lid showing conjunctiva */}
      <path d="M44 100 C90 150 210 150 256 100 C214 118 86 118 44 100 Z" fill={conj} />
      <path d="M44 100 C90 150 210 150 256 100" stroke={darken(conj, 0.2)} strokeWidth="1.2" fill="none" />
      <path d="M60 110 C100 128 200 128 240 110" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.35" />
      {/* lid skin pulled down + examiner's thumb */}
      <path d="M36 104 C90 172 210 172 264 104 L270 150 C220 190 80 190 30 150 Z" fill={pal.base} />
      <ellipse cx="150" cy="172" rx="46" ry="22" fill="#f1e1d6" stroke="#cdb8a8" strokeWidth="1" />
      <path d="M112 166 C132 158 168 158 188 166" stroke="#cdb8a8" strokeWidth="1" fill="none" />
    </g>
  )
}

/** Open mouth with tongue — shows hydration, pallor, glossitis, angular stomatitis. 0..300 × 0..200 */
export function MouthCloseup({
  a,
  mucosa,
  tongue,
  angular,
  ulcers,
  id,
}: {
  a: Appearance
  mucosa: 'moist' | 'dry'
  tongue: 'normal' | 'dry-furred' | 'smooth-red' | 'pale'
  angular?: boolean
  ulcers?: boolean
  id: string
}) {
  const pal = skinPalette(a)
  const tongueColor = tongue === 'smooth-red' ? '#c8373c' : tongue === 'pale' ? '#e7b4b2' : '#d9747a'
  const dry = mucosa === 'dry'
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-sk`} cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor={pal.highlight} />
          <stop offset="1" stopColor={pal.shadow} />
        </radialGradient>
        <radialGradient id={`${id}-t`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor={lighten(tongueColor, 0.12)} />
          <stop offset="1" stopColor={darken(tongueColor, 0.2)} />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="300" height="200" rx="18" fill={`url(#${id}-sk)`} />
      {/* mouth cavity */}
      <path d="M60 90 C100 40 200 40 240 90 C212 168 88 168 60 90 Z" fill="#4a1417" />
      {/* upper teeth */}
      <path d="M78 76 C110 58 190 58 222 76 L218 88 C186 76 114 76 82 88 Z" fill="#f4efe4" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${104 + i * 18} 66 L${104 + i * 18} 82`} stroke="#d8d0c0" strokeWidth="1" />
      ))}
      {/* tongue */}
      <path d="M92 120 C96 92 204 92 208 120 C204 152 178 170 150 170 C122 170 96 152 92 120 Z" fill={`url(#${id}-t)`} />
      <path d="M150 104 L150 150" stroke={darken(tongueColor, 0.3)} strokeWidth="1.4" opacity="0.5" />
      {tongue === 'dry-furred' && <path d="M112 118 C130 104 170 104 188 118 C176 136 124 136 112 118 Z" fill="#efe6d2" opacity="0.7" />}
      {tongue !== 'smooth-red' &&
        Array.from({ length: 26 }).map((_, i) => (
          <circle key={i} cx={110 + ((i * 37) % 80)} cy={110 + ((i * 23) % 40)} r="1.1" fill={lighten(tongueColor, 0.25)} opacity="0.55" />
        ))}
      {!dry && <path d="M118 112 C134 104 160 104 176 110" stroke="#fff" strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />}
      {dry && (
        <g stroke={darken(tongueColor, 0.35)} strokeWidth="0.8" opacity="0.6" fill="none">
          <path d="M120 126 l10 -6 M160 124 l12 4 M140 140 l8 6" />
        </g>
      )}
      {ulcers && <ellipse cx="206" cy="128" rx="6" ry="4" fill="#f5efd6" stroke="#d97b6f" strokeWidth="1.5" />}
      {/* lips */}
      <path d="M50 92 C92 30 208 30 250 92 C212 58 88 58 50 92 Z" fill={darken(pal.lip, 0.05)} />
      <path d="M50 92 C88 178 212 178 250 92 C212 160 88 160 50 92 Z" fill={pal.lip} />
      {angular && (
        <g stroke="#a3322e" strokeWidth="1.6" strokeLinecap="round">
          <path d="M44 92 l-8 -4 M44 94 l-9 2 M256 92 l8 -4 M256 94 l9 2" />
        </g>
      )}
      {dry && <path d="M70 80 l6 4 M90 70 l4 5 M212 72 l-4 5 M230 80 l-6 4" stroke={darken(pal.lip, 0.4)} strokeWidth="1" />}
    </g>
  )
}
