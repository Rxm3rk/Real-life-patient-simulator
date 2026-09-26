import { memo, useMemo } from 'react'
import type { LegSide, LegsVisual } from '../engine/types'
import { hashString, seededRandom } from '../lib/utils'
import { CM, legOutline, type BodyDims } from './bodyModel'
import { darken, lighten, mix } from './color'
import { smoothPath, type Pt } from './geometry'
import { skinPalette, type SkinPalette } from './palette'
import type { Appearance } from './types'

/**
 * Clinical signs of the lower limbs drawn over the body (same body units).
 * Everything is authored for the viewer's-right leg and mirrored, so each
 * side can carry its own findings.
 */

interface LegGeom {
  kneeIn: number
  s: number
  inner: Pt[]
  outer: Pt[]
  path: string
}

function legGeom(d: BodyDims, sex: Appearance['sex']): LegGeom {
  const pts = legOutline(d, sex)
  const outer = pts.slice(0, 14)
  const inner = pts.slice(21).slice().reverse() // ascending y
  return { kneeIn: sex === 'female' ? 17 : 21, s: d.legScale, inner, outer, path: smoothPath(pts, true, 0.9) }
}

/** x of a polyline at height y (points ordered by y). */
function xAt(pts: Pt[], y: number): number {
  const sorted = pts.slice().sort((a, b) => a[1] - b[1])
  if (y <= sorted[0][1]) return sorted[0][0]
  for (let i = 0; i < sorted.length - 1; i++) {
    const [x1, y1] = sorted[i]
    const [x2, y2] = sorted[i + 1]
    if (y >= y1 && y <= y2) return x1 + ((y - y1) / (y2 - y1 || 1)) * (x2 - x1)
  }
  return sorted[sorted.length - 1][0]
}

/**
 * A tortuous vein following a course: gentle, irregular meanders (about one
 * bend per `wavelength` units) rather than a regular zig-zag.
 */
function tortuous(course: Pt[], amp: number, rnd: () => number, wavelength = 26): Pt[] {
  const out: Pt[] = []
  let dist = 0
  const phase = rnd() * Math.PI * 2
  for (let i = 0; i < course.length - 1; i++) {
    const [x1, y1] = course[i]
    const [x2, y2] = course[i + 1]
    const len = Math.hypot(x2 - x1, y2 - y1)
    const n = Math.max(2, Math.round(len / 9))
    const nx = -(y2 - y1) / (len || 1)
    const ny = (x2 - x1) / (len || 1)
    for (let k = 0; k < n; k++) {
      const t = k / n
      const d = dist + len * t
      const w = Math.sin((d / wavelength) * Math.PI * 2 + phase) * amp * (0.75 + rnd() * 0.4)
      out.push([x1 + (x2 - x1) * t + nx * w, y1 + (y2 - y1) * t + ny * w])
    }
    dist += len
  }
  out.push(course[course.length - 1])
  return out
}

function Vein({ pts, width, pal, fill, id }: { pts: Pt[]; width: number; pal: SkinPalette; fill: number; id: string }) {
  if (fill <= 0.02) return null
  const d = smoothPath(pts, false, 0.9)
  const blue = mix(pal.base, '#4a5f9c', 0.48)
  return (
    <g opacity={Math.min(1, fill * 1.1)}>
      {/* shadow cast by the raised vein */}
      <path d={d} stroke={darken(pal.shadow, 0.25)} strokeWidth={width * 1.5 * fill} fill="none" opacity="0.3" strokeLinecap="round" transform="translate(1.2 1.4)" filter={`url(#${id}-b1)`} />
      <path d={d} stroke={blue} strokeWidth={width * fill} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={mix(blue, '#2d3a5e', 0.35)} strokeWidth={width * 0.45 * fill} fill="none" strokeLinecap="round" opacity="0.55" transform="translate(0.5 0.5)" />
      {/* highlight on the top of the bulging vein */}
      <path d={d} stroke={lighten(pal.highlight, 0.2)} strokeWidth={Math.max(0.5, width * 0.28 * fill)} fill="none" strokeLinecap="round" opacity="0.45" transform="translate(-0.7 -0.6)" />
    </g>
  )
}

function Ulcer({ kind, at, size, pal, rnd, id }: { kind: NonNullable<LegSide['ulcer']>['kind']; at: Pt; size: number; pal: SkinPalette; rnd: () => number; id: string }) {
  const [x, y] = at
  if (kind === 'venous') {
    // large, shallow, irregular, sloping edges; granulation and slough
    const n = 14
    const pts: Pt[] = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2
      const r = size * (0.78 + rnd() * 0.4)
      return [x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 1.15] as Pt
    })
    const shape = smoothPath(pts, true, 1)
    return (
      <g>
        <path d={shape} fill={mix(pal.base, '#8a3b2a', 0.45)} transform={`translate(${x} ${y}) scale(1.28) translate(${-x} ${-y})`} opacity="0.55" filter={`url(#${id}-b2)`} />
        <path d={shape} fill="#b3483b" />
        <path d={shape} fill={`url(#${id}-gran)`} />
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={x + (rnd() - 0.5) * size} cy={y + (rnd() - 0.5) * size * 1.2} rx={size * (0.18 + rnd() * 0.18)} ry={size * (0.12 + rnd() * 0.14)} fill="#dcc87e" opacity="0.85" />
        ))}
        <path d={shape} fill="none" stroke={mix(pal.base, '#e7a79a', 0.5)} strokeWidth="1.2" opacity="0.8" />
      </g>
    )
  }
  // arterial / neuropathic: small, deep, punched-out, pale base
  const neuro = kind === 'neuropathic'
  return (
    <g>
      <ellipse cx={x} cy={y} rx={size * 1.35} ry={size * 1.2} fill={neuro ? mix(pal.base, '#e8e0cf', 0.5) : mix(pal.base, '#8f4f45', 0.25)} opacity="0.8" filter={`url(#${id}-b1)`} />
      <ellipse cx={x} cy={y} rx={size} ry={size * 0.88} fill={darken(pal.deep, 0.35)} />
      <ellipse cx={x + 0.4} cy={y + 0.6} rx={size * 0.8} ry={size * 0.68} fill={neuro ? '#c9a58d' : '#b5a58a'} />
      <ellipse cx={x + 0.6} cy={y + 0.9} rx={size * 0.45} ry={size * 0.35} fill={neuro ? '#a8554a' : '#9a8a70'} opacity="0.7" />
      <ellipse cx={x - size * 0.3} cy={y - size * 0.35} rx={size * 0.5} ry={size * 0.22} fill="#000" opacity="0.28" />
    </g>
  )
}

function ulcerAt(site: NonNullable<LegSide['ulcer']>['site'], g: LegGeom): Pt | null {
  const k = g.kneeIn
  switch (site) {
    case 'lateral-malleolus':
      return [k + 35, 727]
    case 'medial-malleolus':
      return [k + 12, 722]
    case 'gaiter':
      return [k + 15, 700]
    case 'hallux':
      return [k + 11, 795]
    case 'toe-tips':
      return [k + 22, 792]
    case 'dorsum':
      return [k + 24, 772]
    case 'heel':
    default:
      return null // heels are hidden against the mattress in this view
  }
}

/** Ankle oedema: a smooth swollen contour with lost malleolar definition (drawn outside the leg clip). */
function Oedema({ side, g, pal, bodyId, id }: { side: LegSide; g: LegGeom; pal: SkinPalette; bodyId: string; id: string }) {
  const k = g.kneeIn
  const oed = side.oedema ?? 0
  if (!oed) return null
  return (
        <g>
          <path
            d={smoothPath(
              [
                [xAt(g.inner, 660) + 1, 660],
                [xAt(g.inner, 700) - oed * 3, 700],
                [xAt(g.inner, 728) - oed * 4.5, 728],
                [k + 12, 748],
                [k + 38, 752],
                [xAt(g.outer, 728) + oed * 4.5, 728],
                [xAt(g.outer, 700) + oed * 3, 700],
                [xAt(g.outer, 660) - 1, 660],
              ],
              true,
              0.9,
            )}
            fill={`url(#${bodyId}-limb)`}
          />
          <ellipse cx={k + 24} cy={726} rx={16 + oed * 2} ry={14} fill={pal.highlight} opacity="0.18" filter={`url(#${id}-b2)`} />
    </g>
  )
}

function OneLeg({ side, g, pal, id, rnd, fill, dark }: { side: LegSide; g: LegGeom; pal: SkinPalette; id: string; rnd: () => number; fill: number; dark: boolean }) {
  const k = g.kneeIn
  // pallor looks waxy-white on fair skin and ashen-grey on dark skin
  const pale = mix(pal.base, dark ? '#a39a92' : '#f3ede4', 0.75)
  const sevV = side.varicose?.severity ?? 1

  // Great saphenous course (anteromedial) from the ankle to the groin — mild disease stays below the knee
  // the calf segment is the most tortuous; the thigh trunk runs straighter
  const calf = tortuous(
    [724, 690, 650, 610, 575].map((y, i) => [xAt(g.inner, y) + (i === 0 ? 10 : 7), y] as Pt),
    1.6 + sevV * 1.1,
    rnd,
    sevV >= 3 ? 22 : 30,
  )
  const thigh = sevV >= 2 ? tortuous([575, 548, 515, 486, 460, 440].map((y) => [xAt(g.inner, y) + (y > 560 ? 7 : 9), y] as Pt), 0.8 + sevV * 0.5, rnd, 40) : []
  const gsv = [...calf, ...thigh.slice(1)]
  const branches = (sevV >= 3 ? [640, 598, 520] : sevV === 2 ? [628, 560] : [640]).map((y) => {
    const x0 = xAt(g.inner, y) + 7
    const x1 = xAt(g.outer, y + 30) - 10
    return tortuous([[x0, y], [(x0 + x1) / 2, y + 18], [x1, y + 34]], 1.8, rnd, 20)
  })

  const varicose = side.varicose && side.varicose.system !== 'ssv'
  const sev = side.varicose?.severity ?? 1

  return (
    <g>
      {/* colour: pallor / dependent rubor, strongest distally */}
      {(side.pallor ?? 0) > 0 && <rect x="-10" y="430" width="120" height="380" fill={`url(#${id}-pale)`} opacity={side.pallor} style={{ color: pale }} />}
      {(side.rubor ?? 0) > 0 && <rect x="-10" y="430" width="120" height="380" fill={`url(#${id}-rubor)`} opacity={side.rubor} />}

      {/* haemosiderin deposition and lipodermatosclerosis in the gaiter area */}
      {side.lipodermatosclerosis && (
        <g filter={`url(#${id}-b3)`}>
          <ellipse cx={k + 24} cy={706} rx={26} ry={30} fill="#6b3524" opacity="0.42" />
          <ellipse cx={k + 18} cy={712} rx={14} ry={20} fill="#4d2418" opacity="0.3" />
        </g>
      )}
      {side.haemosiderin && (
        <g filter={`url(#${id}-b2)`}>
          {Array.from({ length: 9 }).map((_, i) => (
            <ellipse key={i} cx={k + 10 + rnd() * 28} cy={672 + rnd() * 60} rx={4 + rnd() * 6} ry={3 + rnd() * 5} fill="#7a4526" opacity={0.25 + rnd() * 0.2} />
          ))}
        </g>
      )}
      {side.eczema && (
        <g>
          <ellipse cx={k + 16} cy={690} rx={15} ry={20} fill="#c0564a" opacity="0.28" filter={`url(#${id}-b2)`} />
          {Array.from({ length: 16 }).map((_, i) => (
            <ellipse key={i} cx={k + 6 + rnd() * 22} cy={674 + rnd() * 34} rx={0.9 + rnd()} ry={0.5 + rnd() * 0.6} fill="#fff" opacity="0.5" />
          ))}
        </g>
      )}
      {side.atrophieBlanche && (
        <g>
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${k + 12 + i * 9} ${712 + i * 7})`}>
              <path d="M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2 Z" fill="#f5f0ea" opacity="0.95" />
              {[0, 1, 2].map((j) => (
                <circle key={j} cx={(rnd() - 0.5) * 5} cy={(rnd() - 0.5) * 5} r="0.45" fill="#b3372f" />
              ))}
            </g>
          ))}
        </g>
      )}

      {/* corona phlebectatica: fine venules around the medial ankle */}
      {(side.varicose || side.haemosiderin) && (
        <g stroke="#6a5aa8" strokeWidth="0.45" fill="none" opacity="0.55">
          {Array.from({ length: 7 }).map((_, i) => {
            const x = k + 8 + i * 2.6
            return <path key={i} d={`M${x} 742 q${(rnd() - 0.5) * 3} -4 ${(rnd() - 0.5) * 2} -${5 + rnd() * 5}`} />
          })}
        </g>
      )}

      {/* varicose great saphenous vein and branches */}
      {varicose && (
        <g>
          <Vein pts={gsv} width={2.2 + sev * 1.1} pal={pal} fill={fill} id={id} />
          {branches.map((b, i) => (
            <Vein key={i} pts={b} width={1.6 + sev * 0.7} pal={pal} fill={fill} id={id} />
          ))}
          {sev >= 2 &&
            [0.22, 0.4, 0.62].map((t, i) => {
              const p = gsv[Math.floor(t * (gsv.length - 1))]
              return <ellipse key={i} cx={p[0]} cy={p[1]} rx={(2.4 + sev) * fill} ry={(3 + sev) * fill} fill={mix(pal.base, '#4d5f8c', 0.42)} opacity={fill} />
            })}
        </g>
      )}

      {/* shiny, hairless atrophic skin: a soft specular sheen down the shin */}
      {side.shiny && (
        <path d={`M${k + 27} 596 C${k + 26} 632 ${k + 24} 668 ${k + 22} 706`} stroke="#fff" strokeWidth="5" fill="none" opacity="0.16" strokeLinecap="round" filter={`url(#${id}-b2)`} />
      )}

      {/* scars */}
      {side.scar === 'vein-harvest' || side.scar === 'bypass' ? (
        <g>
          <path
            d={smoothPath(
              (side.scar === 'bypass' ? [460, 500, 540, 580, 620] : [470, 520, 570, 620, 670, 710]).map((y) => [xAt(g.inner, y) + 8, y] as Pt),
              false,
              0.9,
            )}
            stroke={mix(pal.base, '#f4e3dc', 0.55)}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {(side.scar === 'bypass' ? [470, 490, 510, 530, 550, 570, 590, 610] : [480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 680, 700]).map((y) => (
            <path key={y} d={`M${xAt(g.inner, y) + 5.5} ${y} l5 0.6`} stroke={mix(pal.base, '#f4e3dc', 0.45)} strokeWidth="0.9" opacity="0.8" />
          ))}
        </g>
      ) : side.scar === 'stripping' ? (
        <g stroke={mix(pal.base, '#f4e3dc', 0.55)} strokeWidth="1.8" strokeLinecap="round">
          <path d={`M${xAt(g.inner, 552) + 5} 552 l6 1`} />
          <path d={`M${k + 12} 716 l5 1`} />
        </g>
      ) : null}

      {/* dry gangrene of the toes with a line of demarcation */}
      {side.gangrene?.map((t) => {
        const i = Math.max(0, Math.min(4, t - 1))
        const tx = k + 11 + i * 5.6
        const ty = 792 - Math.abs(i - 1) * 2.4 - i * 0.6
        const rx = i === 0 ? 4.9 : 3.5
        const ry = i === 0 ? 6 : 4.8
        return (
          <g key={t}>
            <ellipse cx={tx} cy={ty - ry * 0.8} rx={rx + 1} ry={2.2} fill="#b3372f" opacity="0.75" filter={`url(#${id}-b1)`} />
            <ellipse cx={tx} cy={ty + 0.6} rx={rx} ry={ry} fill="#241611" />
            <ellipse cx={tx - 1} cy={ty - 1} rx={rx * 0.45} ry={ry * 0.3} fill="#5b4238" opacity="0.6" />
            <path d={`M${tx - rx * 0.6} ${ty + 1} q${rx * 0.6} 1.5 ${rx * 1.2} 0`} stroke="#000" strokeWidth="0.5" fill="none" opacity="0.6" />
          </g>
        )
      })}

      {/* ulcer */}
      {side.ulcer &&
        (() => {
          const at = ulcerAt(side.ulcer.site, g)
          if (!at) return null
          return <Ulcer kind={side.ulcer.kind} at={at} size={Math.max(2.2, (side.ulcer.sizeCm * CM) / 2)} pal={pal} rnd={rnd} id={id} />
        })()}

      {/* saphena varix: soft swelling at the saphenofemoral junction */}
      {side.saphenaVarix && (
        <g>
          <ellipse cx={20} cy={430} rx={9 * fill + 2} ry={7 * fill + 2} fill={pal.deep} opacity="0.25" filter={`url(#${id}-b2)`} />
          <ellipse cx={19} cy={427} rx={8 * fill + 1.5} ry={6.2 * fill + 1.5} fill={mix(pal.base, '#6c7aa3', 0.18)} />
          <ellipse cx={17.5} cy={425} rx={4 * fill + 1} ry={2.6 * fill + 1} fill={pal.highlight} opacity="0.4" />
        </g>
      )}
    </g>
  )
}

export const LegSigns = memo(function LegSigns({
  a,
  d,
  spec,
  id,
  bodyId,
  veinFill = 1,
  seed = 'legs',
  top = 454,
}: {
  a: Appearance
  d: BodyDims
  spec: LegsVisual
  id: string
  /** Body component id, to reuse its limb gradient */
  bodyId: string
  /** Distension of varicose veins 0..1 (they empty on elevation) */
  veinFill?: number
  seed?: string
  /** Nothing is drawn above this line (the gown hem) */
  top?: number
}) {
  const pal = skinPalette(a)
  const g = useMemo(() => legGeom(d, a.sex), [d, a.sex])
  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={g.path} />
        </clipPath>
        <clipPath id={`${id}-below`}>
          <rect x="-300" y={top} width="600" height="600" />
        </clipPath>
        <linearGradient id={`${id}-pale`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.45" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-rubor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8e2f35" stopOpacity="0" />
          <stop offset="0.6" stopColor="#8e2f35" stopOpacity="0.25" />
          <stop offset="1" stopColor="#7a2233" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id={`${id}-gran`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c8574a" />
          <stop offset="0.7" stopColor="#a33b33" />
          <stop offset="1" stopColor="#d58e7d" />
        </radialGradient>
        <filter id={`${id}-b1`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id={`${id}-b2`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`${id}-b3`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {([1, -1] as const).map((sx) => {
        // viewer's right (x > 0) is the patient's LEFT
        const side = sx === 1 ? spec.left : spec.right
        const rnd = seededRandom(hashString(`${seed}${sx}`))
        return (
          <g key={sx} transform={`scale(${sx} 1)`} clipPath={`url(#${id}-below)`}>
            <Oedema side={side} g={g} pal={pal} bodyId={bodyId} id={id} />
            <g clipPath={`url(#${id}-clip)`}>
              <OneLeg side={side} g={g} pal={pal} id={id} rnd={rnd} fill={veinFill} dark={a.skinTone >= 5} />
            </g>
          </g>
        )
      })}
    </g>
  )
})

/* ------------------------------------------------------------------------ */
/* Posterior view of the legs (standing, from behind) for the SSV            */
/* ------------------------------------------------------------------------ */

export const LegsBack = memo(function LegsBack({
  a,
  d,
  spec,
  id,
  veinFill = 1,
  seed = 'back',
}: {
  a: Appearance
  d: BodyDims
  spec: LegsVisual
  id: string
  veinFill?: number
  seed?: string
}) {
  const pal = skinPalette(a)
  const g = useMemo(() => legGeom(d, a.sex), [d, a.sex])
  const k = g.kneeIn
  const female = a.sex === 'female'
  const pants = female ? '#3d3448' : '#27344d'
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-limb`} x1="0" x2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={pal.shadow} />
          <stop offset="0.3" stopColor={pal.base} />
          <stop offset="0.55" stopColor={mix(pal.base, pal.highlight, 0.45)} />
          <stop offset="0.85" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.deep} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={g.path} />
        </clipPath>
        <filter id={`${id}-b1`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id={`${id}-b2`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id={`${id}-b4`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* back of the gown */}
      <path d={`M${-d.hipW - 6} 250 C${-d.hipW - 8} 300 ${-d.hipW - 4} 340 ${-d.hipW + 2} 360 L${d.hipW - 2} 360 C${d.hipW + 4} 340 ${d.hipW + 8} 300 ${d.hipW + 6} 250 Z`} fill="#a8c9da" />
      {[1, -1].map((sx) => (
        <g key={sx} transform={`scale(${sx} 1)`}>
          <path d={g.path} fill={`url(#${id}-limb)`} />
          <g clipPath={`url(#${id}-clip)`}>
            {/* popliteal crease */}
            <path d={`M${k - 4} 548 C${k + 10} 552 ${k + 30} 552 ${k + 44} 546`} stroke={pal.deep} strokeWidth="1.6" fill="none" opacity="0.45" filter={`url(#${id}-b1)`} />
            {/* gastrocnemius heads */}
            <ellipse cx={k + 10} cy={604} rx={12} ry={34} fill={pal.highlight} opacity="0.3" filter={`url(#${id}-b4)`} />
            <ellipse cx={k + 34} cy={598} rx={11} ry={30} fill={pal.highlight} opacity="0.26" filter={`url(#${id}-b4)`} />
            <path d={`M${k + 22} 580 C${k + 22} 610 ${k + 22} 640 ${k + 23} 660`} stroke={pal.shadow} strokeWidth="2.4" fill="none" opacity="0.3" filter={`url(#${id}-b2)`} />
            {/* Achilles tendon & heel */}
            <path d={`M${k + 18} 668 C${k + 20} 700 ${k + 21} 722 ${k + 22} 744 M${k + 28} 668 C${k + 27} 700 ${k + 25} 722 ${k + 25} 744`} stroke={pal.shadow} strokeWidth="1.6" fill="none" opacity="0.4" filter={`url(#${id}-b1)`} />
            <ellipse cx={k + 24} cy={774} rx={15} ry={22} fill={pal.highlight} opacity="0.35" filter={`url(#${id}-b2)`} />
            <path d={`M${k + 10} 790 C${k + 18} 800 ${k + 30} 800 ${k + 38} 790`} stroke={pal.deep} strokeWidth="1.2" fill="none" opacity="0.4" />
          </g>
        </g>
      ))}
      {/* buttocks and underwear */}
      <path
        d={`M${-d.hipW - 1} 330 C${-d.trochW - 2} 360 ${-d.trochW} 400 ${-d.trochW + 6} 424 C-40 444 -8 440 0 428 C8 440 40 444 ${d.trochW - 6} 424 C${d.trochW} 400 ${d.trochW + 2} 360 ${d.hipW + 1} 330 Z`}
        fill={pal.base}
      />
      <path d={`M${-d.hipW} 334 C${-d.trochW} 364 ${-d.trochW + 1} 394 ${-d.trochW + 7} 410 C-40 430 -10 426 0 414 C10 426 40 430 ${d.trochW - 7} 410 C${d.trochW - 1} 394 ${d.trochW} 364 ${d.hipW} 334 Z`} fill={pants} />
      <path d="M0 352 L0 414" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
      {[1, -1].map((sx) => (
        <path key={sx} transform={`scale(${sx} 1)`} d={`M6 434 C24 446 48 446 ${d.trochW - 12} 432`} stroke={pal.deep} strokeWidth="2" fill="none" opacity="0.35" filter={`url(#${id}-b1)`} />
      ))}

      {/* short saphenous varicosities on the back of the calf (viewer's right = patient's right) */}
      {([1, -1] as const).map((sx) => {
        const side = sx === 1 ? spec.right : spec.left
        const v = side.varicose
        if (!v) return null
        const rnd = seededRandom(hashString(`${seed}${sx}`))
        const show = v.system === 'ssv' || v.system === 'both'
        const ssv = tortuous(
          [
            [k + 36, 736],
            [k + 31, 700],
            [k + 25, 660],
            [k + 22, 620],
            [k + 21, 585],
            [k + 21, 556],
          ],
          2.4 + v.severity * 1.2,
          rnd,
        )
        const medial = tortuous([610, 575, 548, 515].map((y) => [xAt(g.inner, y) + 6, y] as Pt), 2 + v.severity, rnd)
        return (
          <g key={sx} transform={`scale(${sx} 1)`} clipPath={`url(#${id}-clip)`}>
            {show && <Vein pts={ssv} width={1.6 + v.severity * 0.9} pal={pal} fill={veinFill} id={id} />}
            {v.system !== 'ssv' && <Vein pts={medial} width={1.3 + v.severity * 0.7} pal={pal} fill={veinFill} id={id} />}
          </g>
        )
      })}
    </g>
  )
})
