import { memo } from 'react'
import { darken, lighten, mix } from './color'
import { skinPalette } from './palette'
import type { Appearance } from './types'

export interface HandSigns {
  clubbing?: boolean
  leukonychia?: boolean
  koilonychia?: boolean
  palmarErythema?: boolean
  dupuytren?: boolean
  tarStaining?: boolean
  flap?: boolean
  /** 0..1: blanched nail bed (capillary refill test) */
  blanch?: number
  cannula?: 'left' | 'right'
  scratches?: boolean
}

export type HandView = 'dorsal' | 'palms' | 'outstretched'

/**
 * Both hands, viewed from above as the patient holds them out (right hand on
 * the viewer's right, thumbs towards the midline). Canvas: 0..400 × 0..320.
 */
export const HandsIllustration = memo(function HandsIllustration({
  a,
  signs,
  view,
  flapPhase = 0,
  id,
}: {
  a: Appearance
  signs: HandSigns
  view: HandView
  flapPhase?: number
  id: string
}) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-er`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#d9534f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d9534f" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {/* left hand (viewer's left) is a mirror of the right */}
      <g transform="translate(200 0) scale(-1 1) translate(-200 0) translate(-6 0)">
        <Hand a={a} signs={{ ...signs, cannula: signs.cannula === 'left' ? 'left' : undefined }} view={view} flap={flapPhase * 0.85} id={`${id}-L`} />
      </g>
      <g transform="translate(6 0)">
        <Hand a={a} signs={{ ...signs, cannula: signs.cannula === 'right' ? 'right' : undefined }} view={view} flap={flapPhase} id={`${id}-R`} />
      </g>
      <text x="96" y="46" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="2" fill="currentColor" opacity="0.45">
        LEFT
      </text>
      <text x="304" y="46" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="2" fill="currentColor" opacity="0.45">
        RIGHT
      </text>
    </g>
  )
})

/** Right hand, fingers up, thumb on the left (medial). Occupies x 208..392. */
function Hand({ a, signs, view, flap, id }: { a: Appearance; signs: HandSigns; view: HandView; flap: number; id: string }) {
  const pal = skinPalette(a)
  const palm = view === 'palms'
  const skin = palm ? mix(pal.palm, pal.base, 0.25) : pal.base
  const shade = palm ? mix(pal.palm, pal.shadow, 0.5) : pal.shadow
  const hi = palm ? lighten(pal.palm, 0.15) : pal.highlight
  const clubbed = !!signs.clubbing
  const nailBase = signs.leukonychia ? '#f3f1ee' : pal.nail
  const nail = signs.blanch ? mix(nailBase, '#f6f2ee', signs.blanch) : nailBase

  // fingers: [baseX, length, width]
  const fingers: [number, number, number][] = [
    [262, 86, 21],
    [290, 96, 22],
    [317, 90, 21],
    [342, 70, 18.5],
  ]
  const mcpY = 168
  // Dupuytren's: ring finger flexed at MCP/PIP — appears shorter in palm view
  const lengthOf = (i: number, len: number) => (palm && signs.dupuytren && i === 2 ? len * 0.52 : len)

  const tilt = view === 'outstretched' ? flap * 26 : 0
  return (
    <g transform={`rotate(${tilt} 300 250)`}>
      {/* shadow */}
      <ellipse cx="300" cy="215" rx="88" ry="110" fill="#000" opacity="0.18" filter={`url(#${id.split('-')[0]}-shadow)`} />
      {/* forearm & wrist */}
      <path d="M258 320 C258 290 262 262 266 238 L336 238 C340 262 344 290 344 320 Z" fill={skin} />
      <path d="M258 320 C258 290 262 262 266 238 L276 238 C272 262 270 292 272 320 Z" fill={shade} opacity="0.35" />
      {/* back of hand / palm */}
      <path
        d={`M266 244 C258 222 252 200 252 ${mcpY} C252 ${mcpY - 12} 262 ${mcpY - 16} 276 ${mcpY - 14} L352 ${mcpY - 12} C360 ${mcpY - 8} 362 ${mcpY + 4} 360 ${mcpY + 22} C358 200 350 224 336 244 Z`}
        fill={skin}
      />
      {/* thumb */}
      <path
        d="M268 236 C258 226 246 214 236 200 C228 188 222 176 220 166 C218 154 224 147 232 147 C240 147 245 154 248 163 C252 176 258 188 266 196 C270 200 272 204 274 208 Z"
        fill={skin}
        stroke={shade}
        strokeWidth="0.8"
      />
      {!palm && (
        <ellipse cx="231" cy="157" rx={clubbed ? 8 : 6.6} ry={clubbed ? 9.5 : 8.2} fill={nail} stroke={darken(nail, 0.2)} strokeWidth="0.6" transform="rotate(-24 231 157)" />
      )}
      {palm && <ellipse cx="231" cy="158" rx="7" ry="8.5" fill={lighten(skin, 0.06)} />}

      {/* fingers */}
      {fingers.map(([x, len0, w], i) => {
        const len = lengthOf(i, len0)
        const tipY = mcpY - len
        const tipW = clubbed ? w * 1.28 : w
        const r = w / 2
        const path = `M${x - r} ${mcpY} L${x - r} ${tipY + tipW * 0.9} C${x - tipW / 2} ${tipY + 2} ${x - tipW / 2 + 1} ${tipY - tipW * 0.18} ${x} ${tipY - tipW * 0.2} C${x + tipW / 2 - 1} ${tipY - tipW * 0.18} ${x + tipW / 2} ${tipY + 2} ${x + r} ${tipY + tipW * 0.9} L${x + r} ${mcpY} Z`
        return (
          <g key={i}>
            <path d={path} fill={skin} stroke={shade} strokeWidth="0.8" />
            {/* knuckle creases */}
            {!palm && (
              <>
                <path d={`M${x - r * 0.6} ${mcpY - len * 0.42} q${r * 0.6} 2 ${r * 1.2} 0`} stroke={shade} strokeWidth="0.9" fill="none" opacity="0.7" />
                <path d={`M${x - r * 0.5} ${mcpY - len * 0.44} q${r * 0.5} -1.5 ${r} 0`} stroke={shade} strokeWidth="0.6" fill="none" opacity="0.5" />
                <path d={`M${x - r * 0.5} ${mcpY - len * 0.72} q${r * 0.5} 1.5 ${r} 0`} stroke={shade} strokeWidth="0.7" fill="none" opacity="0.55" />
                <ellipse cx={x} cy={mcpY - 2} rx={r * 0.7} ry="4" fill={hi} opacity="0.4" />
              </>
            )}
            {palm && (
              <>
                <path d={`M${x - r * 0.7} ${mcpY - len * 0.36} L${x + r * 0.7} ${mcpY - len * 0.36}`} stroke={shade} strokeWidth="0.9" opacity="0.55" />
                <path d={`M${x - r * 0.7} ${mcpY - len * 0.68} L${x + r * 0.7} ${mcpY - len * 0.68}`} stroke={shade} strokeWidth="0.9" opacity="0.55" />
                <ellipse cx={x} cy={tipY + len * 0.14} rx={r * 0.8} ry={len * 0.13} fill={hi} opacity="0.35" />
              </>
            )}
            {/* nails */}
            {!palm && (
              <g>
                <path
                  d={`M${x - tipW * 0.34} ${tipY + tipW * 1.05} L${x - tipW * 0.36} ${tipY + tipW * 0.25} C${x - tipW * 0.3} ${tipY - tipW * 0.02} ${x + tipW * 0.3} ${tipY - tipW * 0.02} ${x + tipW * 0.36} ${tipY + tipW * 0.25} L${x + tipW * 0.34} ${tipY + tipW * 1.05} C${x + tipW * 0.2} ${tipY + tipW * 1.14} ${x - tipW * 0.2} ${tipY + tipW * 1.14} ${x - tipW * 0.34} ${tipY + tipW * 1.05} Z`}
                  fill={nail}
                  stroke={darken(nailBase, 0.22)}
                  strokeWidth="0.6"
                />
                {/* lunula */}
                {!signs.leukonychia && <path d={`M${x - tipW * 0.24} ${tipY + tipW * 1.02} Q${x} ${tipY + tipW * 0.84} ${x + tipW * 0.24} ${tipY + tipW * 1.02}`} fill="#fff" opacity="0.35" />}
                {/* gloss */}
                <path d={`M${x - tipW * 0.18} ${tipY + tipW * 0.3} L${x - tipW * 0.18} ${tipY + tipW * 0.8}`} stroke="#fff" strokeWidth={clubbed ? 2.4 : 1.6} opacity={clubbed ? 0.7 : 0.5} strokeLinecap="round" />
                {signs.koilonychia && <path d={`M${x - tipW * 0.3} ${tipY + tipW * 0.5} Q${x} ${tipY + tipW * 0.66} ${x + tipW * 0.3} ${tipY + tipW * 0.5}`} stroke={darken(nail, 0.3)} strokeWidth="0.8" fill="none" />}
              </g>
            )}
            {signs.tarStaining && !palm && (i === 0 || i === 1) && (
              <ellipse cx={x + (i === 0 ? 6 : -6)} cy={mcpY - len * 0.55} rx={6} ry={len * 0.22} fill="#b8862e" opacity="0.45" filter={`url(#${id.split('-')[0]}-blur)`} />
            )}
          </g>
        )
      })}

      {/* dorsum details */}
      {!palm && (
        <g>
          {[262, 290, 317, 342].map((x, i) => (
            <path key={i} d={`M${290 + (x - 300) * 0.3} 232 L${x} ${mcpY + 4}`} stroke={hi} strokeWidth="2.2" opacity="0.22" />
          ))}
          <path d="M280 212 C292 206 312 206 326 214" stroke={pal.vein} strokeWidth="2.4" fill="none" opacity="0.35" />
        </g>
      )}

      {/* palm details */}
      {palm && (
        <g>
          <path d="M256 176 C268 196 272 214 270 236" stroke={shade} strokeWidth="1.3" fill="none" opacity="0.6" />
          <path d="M262 170 C290 178 320 176 356 168" stroke={shade} strokeWidth="1.2" fill="none" opacity="0.55" />
          <path d="M258 188 C288 196 318 196 346 190" stroke={shade} strokeWidth="1.2" fill="none" opacity="0.55" />
          {signs.palmarErythema && (
            <g>
              <ellipse cx="262" cy="214" rx="26" ry="30" fill={`url(#${id.split('-')[0]}-er)`} />
              <ellipse cx="344" cy="208" rx="20" ry="32" fill={`url(#${id.split('-')[0]}-er)`} />
            </g>
          )}
          {signs.dupuytren && (
            <g>
              <path d="M306 232 C310 214 314 196 317 172" stroke={lighten(skin, 0.18)} strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M306 232 C310 214 314 196 317 172" stroke={shade} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" transform="translate(3 0)" />
              <circle cx="313" cy="200" r="5" fill={lighten(skin, 0.12)} stroke={shade} strokeWidth="0.8" />
            </g>
          )}
          {/* radial pulse point */}
          <circle cx="270" cy="286" r="3" fill={mix(skin, '#c24848', 0.25)} opacity="0.6" />
        </g>
      )}

      {signs.scratches && (
        <g stroke="#b24a45" strokeWidth="1" strokeLinecap="round" opacity="0.6">
          <path d="M280 300 l14 -20 M286 304 l14 -20 M312 296 l10 -18" />
        </g>
      )}

      {signs.cannula && !palm && (
        <g transform="translate(300 214)">
          <rect x="-13" y="-12" width="26" height="28" rx="3" fill="#fff" opacity="0.55" stroke="#dfe7ec" />
          <rect x="-3.5" y="-9" width="7" height="14" rx="1.5" fill="#f4a3c8" />
          <rect x="-2" y="4" width="4" height="8" fill="#fff" />
          <circle cx="0" cy="-12" r="3.5" fill="#fff" stroke="#ccd" />
        </g>
      )}
    </g>
  )
}

/**
 * Schamroth's window test: dorsal surfaces of both index fingers placed nail to
 * nail. A diamond-shaped window is normal; clubbing obliterates it.
 */
export function SchamrothView({ a, clubbed, koilonychia }: { a: Appearance; clubbed: boolean; koilonychia?: boolean }) {
  const pal = skinPalette(a)
  const finger = (flip: boolean) => {
    const bulb = clubbed ? 1.35 : 1
    const nailCurve = clubbed ? -10 : koilonychia ? 6 : -3
    return (
      <g transform={flip ? 'translate(400 0) scale(-1 1)' : undefined}>
        <path
          d={`M10 120 L150 112 C170 ${112 - 6 * bulb} 188 ${104 - 8 * bulb} 194 ${118 - 4 * bulb} C198 128 196 ${148 + 6 * bulb} 186 ${156 + 6 * bulb} C170 164 150 160 10 168 Z`}
          fill={pal.base}
          stroke={pal.shadow}
          strokeWidth="1.2"
        />
        {/* nail */}
        <path d={`M150 ${112 - 1} Q172 ${106 + nailCurve} 194 ${118 - 4 * bulb}`} stroke={pal.nail} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d={`M150 ${112 - 1} Q172 ${106 + nailCurve} 194 ${118 - 4 * bulb}`} stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.55" />
        <path d="M60 128 q6 8 0 18 M110 126 q6 8 0 18" stroke={pal.shadow} strokeWidth="1" fill="none" opacity="0.6" />
      </g>
    )
  }
  return (
    <g>
      {finger(false)}
      {finger(true)}
      {!clubbed && <path d="M190 116 L200 104 L210 116 L200 128 Z" fill="var(--stage)" stroke="#fbbf3c" strokeWidth="1.2" />}
      <text x="200" y="210" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor" opacity="0.7">
        {clubbed ? 'Window obliterated' : 'Diamond window present'}
      </text>
    </g>
  )
}
