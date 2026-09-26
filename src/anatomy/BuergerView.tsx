import { memo } from 'react'
import { darken, lighten, mix } from './color'
import type { Pt } from './geometry'
import { hairColor, skinPalette } from './palette'
import type { Appearance } from './types'

/**
 * Side view of Buerger’s test. Canvas 0..420 × 0..320.
 * Lying: the straight leg is raised to `angle` degrees about the hip.
 * Dependent: the patient sits on the couch edge with the legs hanging down.
 */
export const BUERGER_VIEWBOX = { x: 0, y: 0, w: 420, h: 320 }

const SCALE = 0.8
const THIGH = 92 * SCALE
const SHIN = 86 * SCALE

/** Tapered limb segment: a quadrilateral plus round caps drawn as circles (no gaps at the joints). */
function Segment({ p0, p1, w0, w1, fill }: { p0: Pt; p1: Pt; w0: number; w1: number; fill: string }) {
  const dx = p1[0] - p0[0]
  const dy = p1[1] - p0[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const d = `M${p0[0] + nx * w0} ${p0[1] + ny * w0} L${p1[0] + nx * w1} ${p1[1] + ny * w1} L${p1[0] - nx * w1} ${p1[1] - ny * w1} L${p0[0] - nx * w0} ${p0[1] - ny * w0} Z`
  return (
    <g>
      <path d={d} fill={fill} />
      <circle cx={p0[0]} cy={p0[1]} r={w0} fill={fill} />
      <circle cx={p1[0]} cy={p1[1]} r={w1} fill={fill} />
    </g>
  )
}

/** Offset a straight segment towards `up` (for highlight/shadow strokes). */
const along2 = (p0: Pt, p1: Pt, up: Pt, k: number) => `M${p0[0] + up[0] * k} ${p0[1] + up[1] * k} L${p1[0] + up[0] * k} ${p1[1] + up[1] * k}`

/** Foot attached at the ankle: `along` is the shin direction, `up` the anterior direction. */
function footPath(ankle: Pt, along: Pt, up: Pt): string {
  const P = (u: number, v: number): Pt => [ankle[0] + along[0] * u + up[0] * v, ankle[1] + along[1] * u + up[1] * v]
  const pts: Pt[] = [P(-6, 7), P(2, 11), P(6, 20), P(8, 27), P(12, 29), P(15, 25), P(13, 12), P(12, -2), P(6, -9), P(-4, -8)]
  return `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')} Z`
}

export const BuergerView = memo(function BuergerView({
  a,
  angle,
  dependent,
  pallor,
  rubor,
  showAngle,
  target,
  id,
}: {
  a: Appearance
  angle: number
  dependent: boolean
  /** 0..1 */
  pallor: number
  /** 0..1 */
  rubor: number
  showAngle?: boolean
  /** Case Buerger’s angle, drawn as a guide in learn mode */
  target?: number
  id: string
}) {
  const pal = skinPalette(a)
  const dark = a.skinTone >= 5
  const hair = hairColor(a)
  const g = (n: string) => `${id}-${n}`
  const footColour = mix(mix(pal.base, dark ? '#9f968e' : '#f2ede6', Math.min(1, pallor) * 0.85), '#8a2c3a', Math.min(1, rubor) * 0.55)
  const couchTop = 182

  let hip: Pt
  let knee: Pt
  let ankle: Pt
  let along: Pt
  let up: Pt
  if (!dependent) {
    const t = (-angle * Math.PI) / 180
    const dir: Pt = [Math.cos(t), Math.sin(t)]
    hip = [212, 168]
    knee = [hip[0] + dir[0] * THIGH, hip[1] + dir[1] * THIGH]
    ankle = [knee[0] + dir[0] * SHIN, knee[1] + dir[1] * SHIN]
    along = dir
    up = [dir[1], -dir[0]]
  } else {
    hip = [300, 170]
    knee = [hip[0] + THIGH, hip[1]]
    ankle = [knee[0], knee[1] + SHIN]
    along = [0, 1]
    up = [1, 0]
  }

  return (
    <g>
      <defs>
        <linearGradient id={g('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stage-2)" />
          <stop offset="1" stopColor="var(--stage)" />
        </linearGradient>
        <linearGradient id={g('leg')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.highlight} />
          <stop offset="0.5" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.shadow} />
        </linearGradient>
        <linearGradient id={g('mat')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7f9" />
          <stop offset="1" stopColor="#d3dbe1" />
        </linearGradient>
        <filter id={g('soft')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect x={-200} y={-200} width={820} height={720} fill={`url(#${g('wall')})`} />
      <rect x={-200} y={306} width={820} height={200} fill="#000" opacity="0.08" />

      {/* examination couch */}
      <rect x={24} y={couchTop + 22} width={372} height={8} rx={3} fill="#8b96a3" />
      <rect x={44} y={couchTop + 30} width={8} height={78} fill="#7a8591" />
      <rect x={368} y={couchTop + 30} width={8} height={78} fill="#7a8591" />
      <rect x={20} y={couchTop} width={380} height={24} rx={10} fill={`url(#${g('mat')})`} stroke="#c3ccd4" strokeWidth="1" />

      {!dependent ? (
        <g>
          {/* head on a pillow and gowned torso */}
          <rect x={22} y={couchTop - 16} width={52} height={18} rx={9} fill="#fff" stroke="#dde3e8" />
          <circle cx={48} cy={couchTop - 30} r={17} fill={pal.base} />
          <path d={`M31 ${couchTop - 34} C32 ${couchTop - 52} 62 ${couchTop - 54} 66 ${couchTop - 36} C58 ${couchTop - 44} 40 ${couchTop - 44} 31 ${couchTop - 34} Z`} fill={hair} />
          <path d={`M64 ${couchTop - 2} C66 ${couchTop - 40} 90 ${couchTop - 46} 150 ${couchTop - 44} C188 ${couchTop - 42} 214 ${couchTop - 34} 222 ${couchTop - 2} Z`} fill="#a8c9da" />
          <path d={`M90 ${couchTop - 40} C120 ${couchTop - 30} 160 ${couchTop - 30} 200 ${couchTop - 36}`} stroke="#86aec3" strokeWidth="2" fill="none" />
          {/* underwear at the hip */}
          <path d={`M190 ${couchTop - 2} C196 ${couchTop - 30} 222 ${couchTop - 34} 236 ${couchTop - 22} L240 ${couchTop - 2} Z`} fill="#27344d" />
        </g>
      ) : (
        <g>
          {/* sitting up on the edge of the couch */}
          <circle cx={296} cy={76} r={17} fill={pal.base} />
          <path d={`M279 72 C280 54 310 52 314 70 C306 62 288 62 279 72 Z`} fill={hair} />
          <path d={`M278 96 C272 120 272 150 276 ${couchTop - 2} L326 ${couchTop - 2} C328 150 326 118 318 96 C306 90 290 90 278 96 Z`} fill="#a8c9da" />
          <path d={`M272 ${couchTop - 26} L330 ${couchTop - 26} L334 ${couchTop - 2} L270 ${couchTop - 2} Z`} fill="#27344d" />
        </g>
      )}

      {/* the leg: flat skin with a highlight along the front and shadow behind */}
      <g>
        <Segment p0={hip} p1={knee} w0={15} w1={10.5} fill={pal.base} />
        <Segment p0={knee} p1={ankle} w0={10.5} w1={6.5} fill={pal.base} />
        {/* calf bulge on the posterior side */}
        <ellipse
          cx={(knee[0] + ankle[0]) / 2 - up[0] * 5 - along[0] * 8}
          cy={(knee[1] + ankle[1]) / 2 - up[1] * 5 - along[1] * 8}
          rx={20}
          ry={8.5}
          transform={`rotate(${(Math.atan2(along[1], along[0]) * 180) / Math.PI} ${(knee[0] + ankle[0]) / 2 - up[0] * 5 - along[0] * 8} ${(knee[1] + ankle[1]) / 2 - up[1] * 5 - along[1] * 8})`}
          fill={pal.base}
        />
        <g fill="none" strokeLinecap="round" filter={`url(#${g('soft')})`}>
          <path d={along2(hip, knee, up, 9)} stroke={pal.highlight} strokeWidth="5" opacity="0.5" />
          <path d={along2(knee, ankle, up, 5)} stroke={pal.highlight} strokeWidth="4" opacity="0.5" />
          <path d={along2(hip, knee, up, -11)} stroke={pal.shadow} strokeWidth="5" opacity="0.45" />
          <path d={along2(knee, ankle, up, -8)} stroke={pal.shadow} strokeWidth="4" opacity="0.45" />
        </g>
        <circle cx={knee[0] + up[0] * 8} cy={knee[1] + up[1] * 8} r={4.5} fill={pal.highlight} opacity="0.55" />
        {/* shin and foot, coloured by perfusion */}
        <g opacity={Math.max(pallor, rubor) * 0.6}>
          <Segment p0={[ankle[0] - along[0] * 24, ankle[1] - along[1] * 24]} p1={ankle} w0={7.6} w1={6.5} fill={footColour} />
        </g>
        <path d={footPath(ankle, along, up)} fill={footColour} stroke={darken(footColour, 0.2)} strokeWidth="0.8" />
        <path d={footPath(ankle, along, up)} fill={lighten(footColour, 0.3)} opacity="0.15" />
      </g>

      {/* protractor */}
      {showAngle && !dependent && (
        <g pointerEvents="none">
          <path d={`M${hip[0] + 60} ${hip[1]} A60 60 0 0 0 ${hip[0] + 60 * Math.cos((-angle * Math.PI) / 180)} ${hip[1] + 60 * Math.sin((-angle * Math.PI) / 180)}`} fill="none" stroke="var(--accent)" strokeWidth="2" />
          <path d={`M${hip[0]} ${hip[1]} L${hip[0] + 150} ${hip[1]}`} stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          <text x={hip[0] + 68} y={hip[1] - 10} fontSize="15" fontWeight="700" fill="var(--accent)">
            {Math.round(angle)}°
          </text>
          {target !== undefined && (
            <path
              d={`M${hip[0]} ${hip[1]} L${hip[0] + 170 * Math.cos((-target * Math.PI) / 180)} ${hip[1] + 170 * Math.sin((-target * Math.PI) / 180)}`}
              stroke="#f59e0b"
              strokeWidth="1.4"
              strokeDasharray="3 5"
              opacity="0.8"
            />
          )}
        </g>
      )}
      <ellipse cx="210" cy="312" rx="150" ry="6" fill="#000" opacity="0.08" filter={`url(#${g('soft')})`} />
    </g>
  )
})
