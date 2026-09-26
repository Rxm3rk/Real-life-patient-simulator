import { memo, useMemo } from 'react'
import { hashString, seededRandom } from '../lib/utils'
import { armOutline, bodyDims, CM, landmarks, legOutline, torsoContour, type BodyDims, type Landmarks } from './bodyModel'
import { darken, lighten, mix } from './color'
import { Face } from './Face'
import { lerpPt, smoothPath, symmetricOutline, type Pt } from './geometry'
import { skinPalette, type SkinPalette } from './palette'
import { Scars } from './Scars'
import type { Appearance, HerniaBulge, PatientPose } from './types'

/**
 * rest: lying quietly · cough: momentary impulse · standing: upright ·
 * reduced: hernia pushed back · ring-cough: coughing with the deep ring occluded
 */
export type HerniaPhase = 'rest' | 'cough' | 'standing' | 'reduced' | 'ring-cough'
export type ArmPose = 'sides' | 'hips' | 'up'

export interface BodyProps {
  a: Appearance
  pose: PatientPose
  id: string
  /** Seed for small random details (spider naevi, veins) */
  seed?: string
  /** Show a hernia that only appears on coughing / standing */
  herniaPhase?: HerniaPhase
  /** Heart rate for visible pulsation */
  hr?: number
  /** Respiratory rate — animates the chest and abdomen */
  rr?: number
  /** Upright patient (no blanket) */
  standing?: boolean
  /** Outpatient clinic: no wristband, probe or monitoring lines */
  clinic?: boolean
  /** Arm position (breast inspection) */
  armPose?: ArmPose
}

const GOWN = '#a8c9da'
const GOWN_DARK = '#86aec3'
const BLANKET = '#dfe6ea'

export const Body = memo(function Body({ a, pose, id, seed = 'p', herniaPhase = 'rest', hr = 80, rr, standing, clinic, armPose = 'sides' }: BodyProps) {
  const d = useMemo(() => bodyDims(a), [a])
  const lm = useMemo(() => landmarks(a, d), [a, d])
  const pal = skinPalette(a)
  const female = a.sex === 'female'
  const g = (n: string) => `${id}-${n}`

  const torso = useMemo(() => symmetricOutline(torsoContour(d, a.sex)), [d, a.sex])
  const arm = useMemo(() => (armPose === 'hips' ? armOutline(d, 36, -58) : armPose === 'up' ? armOutline(d, 163, 177) : armOutline(d)), [d, armPose])
  const handsInFront = armPose === 'hips'
  const armPath = useMemo(() => smoothPath([...arm.outer, ...arm.inner.slice().reverse()], true, 0.9), [arm])
  const leg = useMemo(() => smoothPath(legOutline(d, a.sex), true, 0.9), [d, a.sex])

  const exposure = pose.exposure
  const breath = pose.breath ?? 0
  const chestScale = 1 + breath * 0.012
  const bellyScale = 1 + breath * 0.018

  const showChest = exposure === 'torso' || (exposure === 'abdomen' && !female) || (!female && exposure === 'groin')
  const blanketTop = standing
    ? 900
    : exposure === 'gowned'
      ? 326
      : exposure === 'abdomen'
        ? 446
        : exposure === 'groin' || exposure === 'standing-groin'
          ? 488
          : exposure === 'torso'
            ? 334
            : 900
  const gownBottom = exposure === 'gowned' ? 470 : exposure === 'legs' ? 452 : exposure === 'torso' ? 0 : female ? 250 : 0

  return (
    <g>
      <defs>
        <linearGradient id={g('torso')} x1="0" x2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={pal.deep} />
          <stop offset="0.07" stopColor={pal.shadow} />
          <stop offset="0.22" stopColor={pal.base} />
          <stop offset="0.5" stopColor={mix(pal.base, pal.highlight, 0.55)} />
          <stop offset="0.78" stopColor={pal.base} />
          <stop offset="0.93" stopColor={pal.shadow} />
          <stop offset="1" stopColor={pal.deep} />
        </linearGradient>
        <linearGradient id={g('limb')} x1="0" x2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={pal.shadow} />
          <stop offset="0.3" stopColor={pal.base} />
          <stop offset="0.55" stopColor={mix(pal.base, pal.highlight, 0.5)} />
          <stop offset="0.85" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.deep} />
        </linearGradient>
        <radialGradient id={g('belly')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={pal.highlight} stopOpacity="0.55" />
          <stop offset="1" stopColor={pal.highlight} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('dark')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={pal.deep} stopOpacity="0.55" />
          <stop offset="1" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('umb')} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor={darken(pal.deep, 0.35)} />
          <stop offset="0.6" stopColor={pal.deep} />
          <stop offset="1" stopColor={pal.shadow} />
        </radialGradient>
        <filter id={g('blur2')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id={g('blur4')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={g('blur8')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <pattern id={g('gownPat')} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" fill={GOWN} />
          <rect x="5.5" y="5.5" width="3" height="3" fill={GOWN_DARK} opacity="0.55" />
        </pattern>
        <pattern id={g('blanketPat')} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.3" fill="#b9c6cd" opacity="0.5" />
        </pattern>
        <clipPath id={g('torsoClip')}>
          <path d={torso} />
        </clipPath>
      </defs>

      {/* Cast shadow on the mattress */}
      <g filter={`url(#${g('blur8')})`} opacity="0.34" transform="translate(4 8)">
        <path d={torso} fill="#1a2233" />
        <path d={armPath} fill="#1a2233" />
        <path d={armPath} fill="#1a2233" transform="scale(-1 1)" />
        <path d={leg} fill="#1a2233" />
        <path d={leg} fill="#1a2233" transform="scale(-1 1)" />
        <ellipse cx="0" cy="52" rx="42" ry="54" fill="#1a2233" />
      </g>

      {/* Legs */}
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d={leg} fill={`url(#${g('limb')})`} />
          <Leg pal={pal} d={d} sex={a.sex} id={id} />
        </g>
      ))}

      {/* Arms and hands */}
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d={armPath} fill={`url(#${g('limb')})`} />
          {/* elbow crease & forearm shading */}
          <path
            d={smoothPath([lerpPt(arm.inner[4], arm.outer[4], 0.18), lerpPt(arm.inner[4], arm.outer[4], 0.5)])}
            stroke={pal.shadow}
            strokeWidth="2.4"
            opacity="0.22"
            fill="none"
            strokeLinecap="round"
            filter={`url(#${g('blur2')})`}
          />
          <path
            d={smoothPath([arm.outer[1], arm.outer[3], arm.outer[5]])}
            stroke={pal.highlight}
            strokeWidth="5"
            opacity="0.18"
            fill="none"
            filter={`url(#${g('blur4')})`}
            transform="translate(-6 0)"
          />
          {!handsInFront && <Hand pal={pal} wrist={arm.wrist} dir={arm.wristDir} scale={d.armScale} id={`${id}-h${s}`} />}
        </g>
      ))}

      {/* Torso */}
      <g
        style={
          rr
            ? { transformBox: 'fill-box', transformOrigin: '50% 62%', animation: `bs-breathe ${(60 / rr).toFixed(2)}s ease-in-out infinite` }
            : undefined
        }
      >
      <g transform={`translate(0 ${lm.umbilicus[1]}) scale(1 ${bellyScale}) translate(0 ${-lm.umbilicus[1]})`}>
        <path d={torso} fill={`url(#${g('torso')})`} />
        <g clipPath={`url(#${g('torsoClip')})`}>
          <TorsoDetail a={a} pal={pal} d={d} lm={lm} g={g} female={female} chestScale={chestScale} />
          <Signs a={a} pal={pal} lm={lm} d={d} g={g} seed={seed} hr={hr} />
          <Scars scars={a.scars ?? []} lm={lm} pal={pal} skinTone={a.skinTone} />
          {a.stoma && <StomaView stoma={a.stoma} lm={lm} />}
        </g>
        {(a.hernias ?? []).map((h, i) => (
          <HerniaView key={i} h={h} lm={lm} pal={pal} phase={herniaPhase} g={g} />
        ))}
      </g>
      </g>

      {/* Female breasts (visible only when the torso is exposed) */}
      {female && showChest && <Breasts pal={pal} lm={lm} d={d} g={g} lift={armPose === 'up' ? 6 : armPose === 'hips' ? 1.5 : 0} />}

      {/* Hands resting on the hips sit in front of the torso */}
      {handsInFront &&
        [1, -1].map((s) => (
          <g key={s} transform={`scale(${s} 1)`}>
            <Hand pal={pal} wrist={arm.wrist} dir={arm.wristDir} scale={d.armScale * 0.82} id={`${id}-hf${s}`} />
          </g>
        ))}
      {!female && a.gynaecomastia && showChest && <Gynaecomastia pal={pal} lm={lm} g={g} />}

      {/* Underwear */}
      {exposure !== 'torso' && <Underwear a={a} d={d} exposure={exposure} />}

      {/* Gown */}
      {gownBottom > 0 && <Gown d={d} bottom={gownBottom} female={female} sex={a.sex} arm={arm} exposure={exposure} g={g} />}

      {/* Head */}
      <g transform={`translate(0 ${pose.headLift ? 6 : 0})`}>
        <Face a={a} pose={pose} id={`${id}-face`} />
      </g>

      {/* Wristband & SpO2 probe */}
      {!clinic && armPose === 'sides' && <Devices a={a} arm={arm} pal={pal} />}

      {/* Blanket */}
      {blanketTop < 900 && <Blanket top={blanketTop} d={d} g={g} />}
    </g>
  )
})

/* ------------------------------------------------------------------------ */

function TorsoDetail({
  a,
  pal,
  d,
  lm,
  g,
  female,
  chestScale,
}: {
  a: Appearance
  pal: SkinPalette
  d: BodyDims
  lm: Landmarks
  g: (n: string) => string
  female: boolean
  chestScale: number
}) {
  const thin = a.habitus === 'thin' || a.cachexia
  const heavy = a.habitus === 'obese' || a.habitus === 'overweight'
  const obese = a.habitus === 'obese'
  const dist = a.distension ?? 0
  const u = lm.umbilicus
  return (
    <g>
      {/* belly dome highlight */}
      <ellipse
        cx="0"
        cy={u[1] - 6}
        rx={d.waistW * 1.05}
        ry={70 + dist * 6}
        fill={`url(#${g('belly')})`}
        opacity={(0.3 + Math.max(0, d.belly) * 0.12 + dist * 0.06) * (a.skinTone >= 5 ? 0.6 : 1)}
      />
      {/* neck: sternocleidomastoids & notch */}
      <g stroke={pal.shadow} fill="none" strokeLinecap="round" opacity="0.4">
        <path d={`M-6 139 C-10 126 -15 112 -19 98`} strokeWidth="2.4" filter={`url(#${g('blur2')})`} />
        <path d={`M6 139 C10 126 15 112 19 98`} strokeWidth="2.4" filter={`url(#${g('blur2')})`} />
      </g>
      <ellipse cx="0" cy="141.5" rx="5" ry="3" fill={pal.deep} opacity="0.35" filter={`url(#${g('blur2')})`} />
      {/* clavicles */}
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d="M9 143 C22 147 34 142 50 143 C62 144 72 146 80 148" stroke={pal.highlight} strokeWidth="2.6" fill="none" opacity={thin ? 0.6 : 0.34} strokeLinecap="round" filter={`url(#${g('blur2')})`} />
          <path d="M10 147.5 C24 152 36 147 51 148 C63 149 72 151 79 153" stroke={pal.deep} strokeWidth="2" fill="none" opacity={thin ? 0.4 : 0.16} strokeLinecap="round" filter={`url(#${g('blur2')})`} />
        </g>
      ))}
      {/* chest */}
      <g transform={`translate(0 200) scale(1 ${chestScale}) translate(0 -200)`}>
        {!female && (
          <>
            {[1, -1].map((s) => (
              <g key={s} transform={`scale(${s} 1)`}>
                <path
                  d={`M4 234 C22 240 44 236 ${d.chestW - 4} 212`}
                  stroke={pal.deep}
                  strokeWidth={heavy ? 7 : 5}
                  fill="none"
                  opacity={heavy ? 0.26 : 0.2}
                  filter={`url(#${g('blur4')})`}
                />
                <path d={`M6 170 C28 176 48 180 ${d.chestW - 6} 196`} stroke={pal.highlight} strokeWidth="10" fill="none" opacity="0.18" filter={`url(#${g('blur4')})`} />
              </g>
            ))}
            {[lm.nippleR, lm.nippleL].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={5.4} fill={pal.nipple} opacity="0.85" />
                <circle cx={x} cy={y} r={1.9} fill={darken(pal.nipple, 0.2)} />
              </g>
            ))}
          </>
        )}
        {/* sternum */}
        <path d="M0 150 L0 236" stroke={pal.shadow} strokeWidth="3" opacity="0.14" filter={`url(#${g('blur2')})`} />
        {/* ribs in thin patients */}
        {thin &&
          [0, 1, 2, 3].map((i) =>
            [1, -1].map((s) => (
              <path
                key={`${i}${s}`}
                transform={`scale(${s} 1)`}
                d={`M${34 + i * 3} ${226 + i * 14} C${48 + i * 3} ${226 + i * 14} ${58 + i * 2} ${232 + i * 13} ${d.ribW - 2} ${244 + i * 13}`}
                stroke={pal.deep}
                strokeWidth="2.2"
                fill="none"
                opacity={a.cachexia ? 0.3 : 0.16}
                filter={`url(#${g('blur2')})`}
              />
            )),
          )}
      </g>
      {/* costal margins */}
      {[lm.costalMarginR, lm.costalMarginL].map((pts, i) => (
        <path
          key={i}
          d={smoothPath(pts.map(([x, y]) => [x, y + 4] as Pt))}
          stroke={pal.deep}
          strokeWidth={thin ? 4 : 5}
          fill="none"
          opacity={thin ? 0.3 : heavy ? 0.06 : 0.13}
          filter={`url(#${g('blur4')})`}
        />
      ))}
      {/* linea alba & rectus edges */}
      <path d={`M0 246 L0 ${u[1] - 8}`} stroke={pal.shadow} strokeWidth="2" opacity={thin ? 0.25 : 0.12} filter={`url(#${g('blur2')})`} />
      {!heavy &&
        [1, -1].map((s) => (
          <path
            key={s}
            transform={`scale(${s} 1)`}
            d={`M30 250 C37 280 38 318 26 372`}
            stroke={pal.shadow}
            strokeWidth="4"
            fill="none"
            opacity={thin ? 0.2 : 0.09}
            filter={`url(#${g('blur4')})`}
          />
        ))}
      {/* flank / oblique shading */}
      {[1, -1].map((s) => (
        <ellipse key={s} cx={s * (d.waistW - 2)} cy={308} rx={16} ry={48} fill={`url(#${g('dark')})`} opacity="0.35" />
      ))}
      {/* ASIS & iliac crests */}
      {[lm.asisR, lm.asisL].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y - 2} rx={7} ry={9} fill={pal.highlight} opacity={thin ? 0.5 : 0.22} filter={`url(#${g('blur2')})`} />
          <ellipse cx={x + (x < 0 ? 9 : -9)} cy={y + 6} rx={6} ry={12} fill={pal.deep} opacity={thin ? 0.3 : 0.1} filter={`url(#${g('blur4')})`} />
        </g>
      ))}
      {/* inguinal creases */}
      {[1, -1].map((s) => (
        <path
          key={s}
          transform={`scale(${s} 1)`}
          d={smoothPath([
            [d.hipW + 1, 350],
            [d.hipW * 0.8, 359],
            [d.hipW * 0.6, 370],
            [d.hipW * 0.4, 382],
            [d.hipW * 0.2, 394],
          ])}
          stroke={pal.deep}
          strokeWidth="4"
          fill="none"
          opacity={heavy ? 0.32 : 0.22}
          filter={`url(#${g('blur2')})`}
        />
      ))}
      {/* suprapubic pannus in obesity */}
      {obese && (
        <g>
          <path d={`M${-d.hipW + 8} 356 C-40 382 40 382 ${d.hipW - 8} 356`} stroke={pal.deep} strokeWidth="5" fill="none" opacity="0.4" filter={`url(#${g('blur2')})`} />
          <path d={`M${-d.hipW + 10} 351 C-40 376 40 376 ${d.hipW - 10} 351`} stroke={pal.highlight} strokeWidth="4" fill="none" opacity="0.28" filter={`url(#${g('blur2')})`} />
        </g>
      )}
      {/* umbilicus */}
      <Umbilicus a={a} pal={pal} u={u} g={g} />
      {/* gas distension: tense, shiny dome */}
      {dist > 0 && (
        <g>
          <ellipse cx="0" cy={u[1] + 4} rx={d.waistW + 4} ry={78 + dist * 4} fill={`url(#${g('dark')})`} opacity={0.12 + dist * 0.06} />
          <ellipse cx="-6" cy={u[1] - 14} rx={d.waistW * 0.75} ry={46 + dist * 5} fill={`url(#${g('belly')})`} opacity={(0.2 + dist * 0.1) * (a.skinTone >= 5 ? 0.55 : 1)} />
          <ellipse cx="-12" cy={u[1] - 30} rx={16 + dist * 3} ry={10 + dist * 2} fill="#fff" opacity={(0.04 + dist * 0.025) * (a.skinTone >= 5 ? 0.6 : 1)} filter={`url(#${g('blur8')})`} />
        </g>
      )}
    </g>
  )
}

function Umbilicus({ a, pal, u, g }: { a: Appearance; pal: SkinPalette; u: Pt; g: (n: string) => string }) {
  const kind = a.umbilicus ?? (a.habitus === 'obese' ? 'deep' : 'normal')
  if (kind === 'everted')
    return (
      <g>
        <ellipse cx={u[0]} cy={u[1] + 1} rx="7.5" ry="7" fill={pal.deep} opacity="0.25" filter={`url(#${g('blur2')})`} />
        <ellipse cx={u[0]} cy={u[1]} rx="6" ry="5.6" fill={mix(pal.base, pal.highlight, 0.5)} />
        <ellipse cx={u[0] - 1.4} cy={u[1] - 1.6} rx="2.4" ry="1.8" fill="#fff" opacity="0.3" />
        <path d={`M${u[0] - 2} ${u[1] + 0.6} q2 1.2 4 0`} stroke={pal.shadow} strokeWidth="0.7" fill="none" />
      </g>
    )
  const deep = kind === 'deep'
  return (
    <g>
      <ellipse cx={u[0]} cy={u[1]} rx={deep ? 7.5 : 6.4} ry={deep ? 5.5 : 7.4} fill={pal.shadow} opacity="0.5" filter={`url(#${g('blur2')})`} />
      <ellipse cx={u[0]} cy={u[1] + 0.6} rx={deep ? 5 : 3.8} ry={deep ? 2.8 : 5.2} fill={`url(#${g('umb')})`} />
      <path
        d={`M${u[0] - 5} ${u[1] + 4.5} Q${u[0]} ${u[1] + 7.5} ${u[0] + 5} ${u[1] + 4.5}`}
        stroke={pal.highlight}
        strokeWidth="1.2"
        fill="none"
        opacity="0.6"
      />
      {deep && <path d={`M${u[0] - 9} ${u[1] - 4} Q${u[0]} ${u[1] - 7.5} ${u[0] + 9} ${u[1] - 4}`} stroke={pal.deep} strokeWidth="1.2" fill="none" opacity="0.5" />}
    </g>
  )
}

function Leg({ pal, d, sex, id }: { pal: SkinPalette; d: BodyDims; sex: Appearance['sex']; id: string }) {
  const kneeIn = sex === 'female' ? 17 : 21
  const s = d.legScale
  const kx = kneeIn + 22 * s
  return (
    <g>
      {/* kneecap */}
      <ellipse cx={kx} cy={546} rx={11 * s} ry={13} fill={pal.highlight} opacity="0.35" filter={`url(#${id}-blur2)`} />
      <path d={`M${kx - 10 * s} 560 Q${kx} 568 ${kx + 10 * s} 560`} stroke={pal.shadow} strokeWidth="1.5" fill="none" opacity="0.35" filter={`url(#${id}-blur2)`} />
      {/* shin highlight */}
      <path d={`M${kx - 2} 580 C${kx - 3} 620 ${kx - 5} 670 ${kneeIn + 22} 720`} stroke={pal.highlight} strokeWidth="5" fill="none" opacity="0.28" filter={`url(#${id}-blur2)`} />
      {/* thigh muscle hint */}
      <path d={`M${d.trochW - 30} 420 C${kx + 10} 470 ${kx + 6} 510 ${kx + 4} 530`} stroke={pal.shadow} strokeWidth="5" fill="none" opacity="0.12" filter={`url(#${id}-blur4)`} />
      {/* malleoli */}
      <ellipse cx={kneeIn + 35} cy={734} rx="3.5" ry="4.5" fill={pal.highlight} opacity="0.35" />
      <ellipse cx={kneeIn + 12} cy={730} rx="3.5" ry="4.5" fill={pal.highlight} opacity="0.35" />
      {/* toes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const tx = kneeIn + 11 + i * 5.6
        const ty = 792 - Math.abs(i - 1) * 2.4 - i * 0.6
        return (
          <g key={i}>
            <ellipse cx={tx} cy={ty} rx={i === 0 ? 4.6 : 3.2} ry={i === 0 ? 5.6 : 4.4} fill={pal.base} stroke={pal.shadow} strokeWidth="0.5" />
            <ellipse cx={tx} cy={ty + 1.2} rx={i === 0 ? 2.8 : 1.8} ry={i === 0 ? 2.4 : 1.8} fill={lighten(pal.nail, 0.2)} opacity="0.8" />
          </g>
        )
      })}
    </g>
  )
}

/** Palm-down hand (dorsal view) placed at the wrist, pointing along `dir`. */
function Hand({ pal, wrist, dir, scale, id }: { pal: SkinPalette; wrist: Pt; dir: Pt; scale: number; id: string }) {
  const angle = (Math.atan2(dir[0], dir[1]) * 180) / Math.PI
  const s = Math.min(1.15, Math.max(0.9, scale))
  // fingers: [x offset, length, half width]; little finger lateral (+x), thumb medial (−x)
  const fingers: [number, number, number][] = [
    [13.2, 25, 3.5],
    [6.8, 32, 3.9],
    [0, 35, 4.1],
    [-6.9, 31, 4],
  ]
  return (
    <g transform={`translate(${wrist[0]} ${wrist[1]}) rotate(${-angle}) scale(${s})`}>
      <defs>
        <linearGradient id={`${id}-hg`} x1="0" x2="1">
          <stop offset="0" stopColor={pal.shadow} />
          <stop offset="0.35" stopColor={pal.base} />
          <stop offset="0.6" stopColor={mix(pal.base, pal.highlight, 0.5)} />
          <stop offset="1" stopColor={pal.shadow} />
        </linearGradient>
      </defs>
      {/* thumb (medial) */}
      <path d="M-10 10 C-15 14 -19 22 -21 32 C-22.5 40 -21 47 -17.5 48 C-14.5 48.6 -13 45 -12.6 40 C-12 33 -10 28 -8 24 Z" fill={`url(#${id}-hg)`} stroke={pal.shadow} strokeWidth="0.5" />
      <ellipse cx="-18.4" cy="43" rx="2.6" ry="3.4" fill={pal.nail} opacity="0.9" transform="rotate(10 -18.4 43)" />
      {/* palm/back of hand */}
      <path d="M-11.5 0 C-13 10 -12.8 22 -11.4 36 L15.8 36 C17.4 24 16.4 10 11.5 0 Z" fill={`url(#${id}-hg)`} />
      {fingers.map(([x, len, hw], i) => (
        <g key={i}>
          <rect x={x - hw} y={32} width={hw * 2} height={len} rx={hw} fill={`url(#${id}-hg)`} stroke={pal.shadow} strokeWidth="0.45" />
          {/* nail */}
          <rect x={x - hw * 0.62} y={32 + len - 8.5} width={hw * 1.24} height={7} rx={hw * 0.55} fill={pal.nail} opacity="0.92" />
          {/* knuckle crease */}
          <path d={`M${x - hw * 0.6} ${32 + len * 0.45} q${hw * 0.6} 1 ${hw * 1.2} 0`} stroke={pal.shadow} strokeWidth="0.5" fill="none" opacity="0.6" />
        </g>
      ))}
      {/* knuckles */}
      {fingers.map(([x], i) => (
        <ellipse key={i} cx={x} cy={33} rx={3} ry={2.2} fill={pal.highlight} opacity="0.35" />
      ))}
      {/* extensor tendons hint */}
      {fingers.map(([x], i) => (
        <path key={i} d={`M${x * 0.35} 4 L${x} 30`} stroke={pal.highlight} strokeWidth="1.1" opacity="0.18" />
      ))}
    </g>
  )
}

function Breasts({ pal, lm, d, g, lift = 0 }: { pal: SkinPalette; lm: Landmarks; d: BodyDims; g: (n: string) => string; lift?: number }) {
  const r = 30 * (d.chestW / 65)
  // with the arms raised the breasts lift and round out; hanging, the lower pole is fuller
  const ptosis = Math.max(0, 1 - lift / 6)
  return (
    <g>
      <defs>
        <radialGradient id={g('breast')} cx="0.46" cy="0.34" r="0.72">
          <stop offset="0" stopColor={mix(pal.base, pal.highlight, 0.55)} />
          <stop offset="0.55" stopColor={pal.base} />
          <stop offset="0.9" stopColor={mix(pal.base, pal.shadow, 0.55)} />
          <stop offset="1" stopColor={pal.shadow} />
        </radialGradient>
        <radialGradient id={g('areola')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={darken(pal.nipple, 0.08)} />
          <stop offset="0.72" stopColor={pal.nipple} stopOpacity="0.9" />
          <stop offset="1" stopColor={pal.nipple} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('bfade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.42" stopColor="#fff" />
        </linearGradient>
      </defs>
      {[lm.nippleR, lm.nippleL].map(([x, y0], i) => {
        const y = y0 - lift
        const s = x < 0 ? -1 : 1
        const cx = x + s * 3
        const P = (u: number, v: number): Pt => [cx + s * u * r, y + v * r]
        const outline: Pt[] = [
          P(-0.05, -0.95),
          P(0.62, -0.72),
          P(1.02, -0.2),
          P(1.02, 0.22 + ptosis * 0.08),
          P(0.72, 0.72 + ptosis * 0.1),
          P(0.08, 0.95 + ptosis * 0.1),
          P(-0.62, 0.78 + ptosis * 0.08),
          P(-0.95, 0.24),
          P(-0.86, -0.42),
        ]
        const shape = smoothPath(outline, true, 1)
        const fold = smoothPath([P(-0.9, 0.32), P(-0.6, 0.82 + ptosis * 0.08), P(0.08, 1.0 + ptosis * 0.1), P(0.74, 0.76 + ptosis * 0.1), P(1.02, 0.26)])
        const maskId = g(`bm${i}`)
        return (
          <g key={i}>
            <mask id={maskId} maskUnits="userSpaceOnUse" x={cx - r * 1.4} y={y - r * 1.2} width={r * 2.8} height={r * 2.6}>
              <rect x={cx - r * 1.4} y={y - r * 1.2} width={r * 2.8} height={r * 2.6} fill={`url(#${g('bfade')})`} />
            </mask>
            {/* shadow cast onto the chest wall below the breast (inframammary fold) */}
            <path d={fold} stroke={pal.deep} strokeWidth="6" fill="none" opacity="0.4" filter={`url(#${g('blur4')})`} transform="translate(0 3)" />
            <g mask={`url(#${maskId})`}>
              <path d={shape} fill={`url(#${g('breast')})`} />
            </g>
            <path d={fold} stroke={darken(pal.shadow, 0.15)} strokeWidth="1.4" fill="none" opacity="0.45" filter={`url(#${g('blur2')})`} />
            {/* areola and nipple */}
            <circle cx={x} cy={y} r={r * 0.25} fill={`url(#${g('areola')})`} />
            <circle cx={x} cy={y} r={r * 0.085} fill={darken(pal.nipple, 0.18)} />
            <circle cx={x - s * r * 0.03} cy={y - r * 0.035} r={r * 0.03} fill="#fff" opacity="0.35" />
          </g>
        )
      })}
    </g>
  )
}

function Gynaecomastia({ pal, lm, g }: { pal: SkinPalette; lm: Landmarks; g: (n: string) => string }) {
  return (
    <g>
      {[lm.nippleR, lm.nippleL].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y + 8} rx={22} ry={12} fill={pal.deep} opacity="0.28" filter={`url(#${g('blur4')})`} />
          <ellipse cx={x} cy={y - 2} rx={18} ry={14} fill={pal.highlight} opacity="0.22" filter={`url(#${g('blur4')})`} />
          <circle cx={x} cy={y} r={6.5} fill={pal.nipple} opacity="0.85" />
          <circle cx={x} cy={y} r={2.1} fill={darken(pal.nipple, 0.2)} />
        </g>
      ))}
    </g>
  )
}

function Underwear({ a, d, exposure }: { a: Appearance; d: BodyDims; exposure: PatientPose['exposure'] }) {
  const female = a.sex === 'female'
  const color = female ? '#3d3448' : '#27344d'
  const band = female ? '#524661' : '#3a4a68'
  if (exposure === 'groin' || exposure === 'standing-groin') {
    // lowered to the upper thighs, with a modesty drape over the genitals
    const y = 452
    return (
      <g>
        {[1, -1].map((s) => (
          <path
            key={s}
            transform={`scale(${s} 1)`}
            d={`M4 ${y - 4} C20 ${y - 7} 50 ${y - 8} ${d.trochW - 12} ${y - 6} L${d.trochW - 13} ${y + 10} C50 ${y + 7} 20 ${y + 8} 5 ${y + 11} Z`}
            fill={color}
          />
        ))}
        <path d={`M-14 391 C-6 388 6 388 14 391 L19 446 C8 451 -8 451 -19 446 Z`} fill="#f4f6f7" />
        <path d={`M-14 391 C-6 388 6 388 14 391`} stroke="#d8dee2" strokeWidth="1.5" fill="none" />
        <path d="M-6 398 L-8 442 M5 397 L6 443" stroke="#dde3e7" strokeWidth="1" />
        <path d={`M-19 446 C-8 451 8 451 19 446`} stroke="#000" strokeOpacity="0.12" strokeWidth="3" fill="none" />
      </g>
    )
  }
  const top = 371
  return (
    <g>
      <path
        d={`M${-d.trochW + 1} ${top - 4} C-40 ${top + 2} 40 ${top + 2} ${d.trochW - 1} ${top - 4} L${d.trochW - 2} ${top + 16} C${d.trochW - 18} ${top + 24} 26 ${top + 42} 11 ${top + 64} L-11 ${top + 64} C-26 ${top + 42} ${-d.trochW + 18} ${top + 24} ${-d.trochW + 2} ${top + 16} Z`}
        fill={color}
      />
      <path d={`M${-d.trochW + 1} ${top - 4} C-40 ${top + 2} 40 ${top + 2} ${d.trochW - 1} ${top - 4} L${d.trochW - 1} ${top + 1.5} C40 ${top + 7.5} -40 ${top + 7.5} ${-d.trochW + 1} ${top + 1.5} Z`} fill={band} />
      <path d={`M-30 ${top + 22} C-22 ${top + 30} -12 ${top + 34} 0 ${top + 34}`} stroke="#000" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      <path d={`M30 ${top + 22} C22 ${top + 30} 12 ${top + 34} 0 ${top + 34}`} stroke="#000" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
    </g>
  )
}

function Gown({
  d,
  bottom,
  female,
  sex,
  arm,
  exposure,
  g,
}: {
  d: BodyDims
  bottom: number
  female: boolean
  sex: Appearance['sex']
  arm: ReturnType<typeof armOutline>
  exposure: PatientPose['exposure']
  g: (n: string) => string
}) {
  const rolled = exposure === 'abdomen' || exposure === 'groin' || exposure === 'standing-groin'
  // lateral outline only (down the flank, over the hip and thigh) — not the crease
  const lateral: Pt[] = [
    ...torsoContour(d, sex).filter(([, y]) => y >= 128 && y <= 352),
    [d.trochW + 1, 374],
    [d.trochW - 2, 404],
    [d.trochW - 6, 440],
    [d.trochW - 10, 480],
  ]
  const side = lateral.filter(([, y]) => y < bottom)
  let xb = side.length ? side[side.length - 1][0] : d.waistW
  for (let i = 0; i < lateral.length - 1; i++) {
    const [x1, y1] = lateral[i]
    const [x2, y2] = lateral[i + 1]
    if (bottom >= y1 && bottom <= y2) xb = x1 + ((bottom - y1) / (y2 - y1)) * (x2 - x1)
  }
  const off = (y: number) => 6 + Math.max(0, (y - 200) / 30)
  const right: Pt[] = [[d.neckW + 4, 113], [d.neckW + 20, 126], ...side.map(([x, y]) => [x + off(y), y] as Pt), [xb + off(bottom) + 2, bottom]]
  const left = right.map(([x, y]) => [-x, y] as Pt).reverse()
  const body = `${smoothPath([...left, ...right], false, 0.8)} C${xb * 0.5} ${bottom + 5} ${-xb * 0.5} ${bottom + 5} ${-xb - off(bottom) - 2} ${bottom} Z`
  const neckline = `M${-d.neckW - 4} 113 C${-d.neckW + 2} 128 ${d.neckW - 2} 128 ${d.neckW + 4} 113`
  // short sleeves over the upper arms
  const sleeve = smoothPath(
    [
      [arm.inner[0][0] - 6, arm.inner[0][1] - 10],
      [d.shoulderW - 10, 144],
      [arm.outer[0][0] + 4, arm.outer[0][1]],
      [arm.outer[1][0] + 4, arm.outer[1][1] + 4],
      [lerpPt(arm.outer[1], arm.outer[2], 0.6)[0] + 4, lerpPt(arm.outer[1], arm.outer[2], 0.6)[1]],
      [lerpPt(arm.inner[1], arm.inner[2], 0.6)[0] - 3, lerpPt(arm.inner[1], arm.inner[2], 0.6)[1] - 2],
      [arm.inner[1][0] - 4, arm.inner[1][1]],
    ],
    true,
    0.8,
  )
  return (
    <g>
      {/* shadow cast by the gown onto skin below */}
      <path d={`M${-xb - 8} ${bottom - 2} C${-xb * 0.5} ${bottom + 12} ${xb * 0.5} ${bottom + 12} ${xb + 8} ${bottom - 2}`} stroke="#000" strokeOpacity="0.22" strokeWidth="8" fill="none" filter={`url(#${g('blur4')})`} />
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d={sleeve} fill={`url(#${g('gownPat')})`} stroke={GOWN_DARK} strokeWidth="1.2" />
        </g>
      ))}
      <path d={body} fill={`url(#${g('gownPat')})`} />
      {/* soft folds */}
      <g stroke="#5f8aa1" strokeWidth="4" fill="none" opacity="0.22" filter={`url(#${g('blur4')})`}>
        <path d={`M-30 150 C-34 ${Math.min(bottom - 20, 210)} -26 ${bottom - 40} -36 ${bottom - 8}`} />
        <path d={`M28 156 C34 ${Math.min(bottom - 20, 220)} 22 ${bottom - 50} 32 ${bottom - 10}`} />
        {female && <path d={`M-46 176 C-58 196 -60 214 -50 ${Math.min(bottom - 4, 240)} M46 176 C58 196 60 214 50 ${Math.min(bottom - 4, 240)}`} />}
      </g>
      <g stroke="#fff" strokeWidth="5" fill="none" opacity="0.16" filter={`url(#${g('blur4')})`}>
        <path d={`M-14 140 C-16 ${Math.min(bottom - 20, 200)} -10 ${bottom - 30} -16 ${bottom - 6}`} />
        {female && <path d={`M-40 200 C-30 212 -40 226 -36 ${Math.min(bottom - 6, 236)} M40 200 C30 212 40 226 36 ${Math.min(bottom - 6, 236)}`} />}
      </g>
      <path d={neckline} stroke={GOWN_DARK} strokeWidth="3.2" fill="none" />
      {rolled ? (
        <g>
          <path
            d={`M${-xb - off(bottom) - 4} ${bottom - 10} C${-xb * 0.5} ${bottom - 3} ${xb * 0.5} ${bottom - 3} ${xb + off(bottom) + 4} ${bottom - 10} L${xb + off(bottom) + 3} ${bottom + 4} C${xb * 0.5} ${bottom + 11} ${-xb * 0.5} ${bottom + 11} ${-xb - off(bottom) - 3} ${bottom + 4} Z`}
            fill={GOWN}
            stroke={GOWN_DARK}
            strokeWidth="1.2"
          />
          <path d={`M${-xb - 2} ${bottom - 5} C${-xb * 0.5} ${bottom + 1.5} ${xb * 0.5} ${bottom + 1.5} ${xb + 2} ${bottom - 5}`} stroke="#fff" strokeOpacity="0.4" strokeWidth="1.6" fill="none" />
        </g>
      ) : (
        <path d={`M${-xb - off(bottom) - 2} ${bottom} C${-xb * 0.5} ${bottom + 5} ${xb * 0.5} ${bottom + 5} ${xb + off(bottom) + 2} ${bottom}`} stroke={GOWN_DARK} strokeWidth="3" fill="none" />
      )}
    </g>
  )
}

function Blanket({ top, d, g }: { top: number; d: BodyDims; g: (n: string) => string }) {
  const w = 177
  const fold = 20
  const y0 = top + fold
  return (
    <g>
      <rect x={-w} y={top - 8} width={w * 2} height="18" fill="#000" opacity="0.18" filter={`url(#${g('blur4')})`} />
      <path d={`M${-w} ${y0} L${w} ${y0} L${w} 862 Q${w} 874 ${w - 12} 874 L${-w + 12} 874 Q${-w} 874 ${-w} 862 Z`} fill={BLANKET} />
      <path d={`M${-w} ${y0} L${w} ${y0} L${w} 862 Q${w} 874 ${w - 12} 874 L${-w + 12} 874 Q${-w} 874 ${-w} 862 Z`} fill={`url(#${g('blanketPat')})`} opacity="0.5" />
      {/* the legs underneath: raised ridges and a valley between */}
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d={`M${d.trochW * 0.55} ${y0 + 10} C${d.trochW * 0.55} 560 48 690 46 780`} stroke="#fff" strokeWidth="46" fill="none" opacity="0.32" filter={`url(#${g('blur8')})`} />
          <path d={`M${d.trochW + 30} ${y0 + 10} C${d.trochW + 22} 560 100 700 104 850`} stroke="#6b7f8c" strokeWidth="34" fill="none" opacity="0.12" filter={`url(#${g('blur8')})`} />
          {/* feet tenting the blanket */}
          <ellipse cx="44" cy="798" rx="34" ry="30" fill="#fff" opacity="0.3" filter={`url(#${g('blur8')})`} />
          <path d="M16 826 C32 848 60 850 76 828" stroke="#6b7f8c" strokeWidth="12" fill="none" opacity="0.16" filter={`url(#${g('blur8')})`} />
        </g>
      ))}
      <path d={`M0 ${y0 + 30} C-2 560 2 700 0 830`} stroke="#6b7f8c" strokeWidth="22" fill="none" opacity="0.13" filter={`url(#${g('blur8')})`} />
      {/* edges draping over the mattress */}
      <rect x={-w} y={y0} width="18" height={860 - y0} fill="#6b7f8c" opacity="0.18" filter={`url(#${g('blur4')})`} />
      <rect x={w - 18} y={y0} width="18" height={860 - y0} fill="#6b7f8c" opacity="0.18" filter={`url(#${g('blur4')})`} />
      {/* turned-down white sheet */}
      <path d={`M${-w} ${top} C-60 ${top - 3} 60 ${top - 3} ${w} ${top} L${w} ${y0} C60 ${y0 + 3} -60 ${y0 + 3} ${-w} ${y0} Z`} fill="#f8fafb" />
      <path d={`M${-w} ${y0} C-60 ${y0 + 3} 60 ${y0 + 3} ${w} ${y0}`} stroke="#c3cdd4" strokeWidth="1.6" fill="none" />
      <path d={`M${-w} ${y0 + 3} C-60 ${y0 + 6} 60 ${y0 + 6} ${w} ${y0 + 3}`} stroke="#000" strokeOpacity="0.1" strokeWidth="4" fill="none" filter={`url(#${g('blur2')})`} />
      <path d={`M${-w} ${top + 3} C-60 ${top} 60 ${top} ${w} ${top + 3}`} stroke="#fff" strokeWidth="2" fill="none" />
    </g>
  )
}

function Devices({ a, arm, pal }: { a: Appearance; arm: ReturnType<typeof armOutline>; pal: SkinPalette }) {
  const [wx, wy] = arm.wrist
  const angle = (Math.atan2(arm.wristDir[0], arm.wristDir[1]) * 180) / Math.PI
  const cannula = a.lines?.cannula
  return (
    <g>
      {/* ID wristband on the patient's left wrist (viewer's right) */}
      <g transform={`translate(${wx} ${wy - 6}) rotate(${-angle})`}>
        <rect x={-13} y={-3.5} width={26} height={7} rx={2.5} fill="#f6f7f9" stroke="#cfd6dc" strokeWidth="0.6" />
        <rect x={-6} y={-2} width={9} height={4} fill="#fff" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={-5.5 + i * 1.2} y={-1.6} width={0.5 + (i % 2) * 0.3} height={3.2} fill="#445" />
        ))}
      </g>
      {/* SpO2 probe on the patient's right index finger (viewer's left) */}
      <g transform={`scale(-1 1) translate(${wx} ${wy}) rotate(${-angle})`}>
        <rect x={-10.9} y={56} width={8} height={13} rx={3.5} fill="#e8edf0" stroke="#aeb9c1" strokeWidth="0.6" />
        <circle cx={-6.9} cy={63} r={1.6} fill="#ff3b3b" opacity="0.9" />
      </g>
      <path
        d={`M${-wx - 9} ${wy + 58} C${-wx - 30} ${wy + 40} ${-wx - 44} ${wy - 40} -186 ${wy - 140} C-200 ${wy - 180} -214 40 -236 -8`}
        stroke="#4f5b66"
        strokeWidth="1.3"
        fill="none"
        opacity="0.45"
      />
      {cannula && (
        <g transform={`${cannula.startsWith('right') ? 'scale(-1 1) ' : ''}translate(${wx} ${wy}) rotate(${-angle})`}>
          {cannula.endsWith('hand') ? (
            <g transform="translate(2 16)">
              <rect x={-7} y={-8} width={14} height={16} rx={2} fill="#fff" opacity="0.55" stroke="#dfe7ec" strokeWidth="0.5" />
              <rect x={-2.2} y={-7} width={4.4} height={9} rx={1} fill="#f4a3c8" />
              <rect x={-1.5} y={2} width={3} height={5} fill="#fff" />
              <circle cx={0} cy={-8.5} r={2.4} fill="#fff" stroke="#ccd" strokeWidth="0.5" />
            </g>
          ) : (
            <g transform="translate(-1 -40)">
              <rect x={-8} y={-9} width={16} height={18} rx={2} fill="#fff" opacity="0.55" />
              <rect x={-2.4} y={-7} width={4.8} height={10} rx={1} fill="#4bbf73" />
              <circle cx={0} cy={-8.5} r={2.4} fill="#fff" stroke="#ccd" strokeWidth="0.5" />
            </g>
          )}
        </g>
      )}
      {a.lines?.catheter && (
        <path d={`M-10 430 C-20 470 -60 480 -120 470 C-150 465 -175 470 -196 480`} stroke="#e9d9a6" strokeWidth="3" fill="none" opacity="0.9" />
      )}
      {pal && null}
    </g>
  )
}

/* ----------------------------- clinical signs ----------------------------- */

function Signs({
  a,
  pal,
  lm,
  d,
  g,
  seed,
  hr,
}: {
  a: Appearance
  pal: SkinPalette
  lm: Landmarks
  d: BodyDims
  g: (n: string) => string
  seed: string
  hr: number
}) {
  const rnd = seededRandom(hashString(seed))
  const u = lm.umbilicus
  const beat = 60 / Math.max(30, hr)
  return (
    <g>
      {a.striae && (
        <g stroke={mix(pal.base, '#d9c8d8', 0.6)} strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
          {Array.from({ length: 14 }).map((_, i) => {
            const s = i % 2 ? 1 : -1
            const x = s * (d.waistW - 14 - rnd() * 16)
            const y = 312 + rnd() * 50
            return <path key={i} d={`M${x} ${y} q${s * 3} ${6 + rnd() * 5} ${s * 2} ${14 + rnd() * 8}`} fill="none" />
          })}
        </g>
      )}
      {a.caputMedusae && (
        <g fill="none" strokeLinecap="round">
          {Array.from({ length: 7 }).map((_, i) => {
            const ang = (i / 7) * Math.PI * 2 + 0.35 + rnd() * 0.35
            const pts: Pt[] = [[u[0] + Math.cos(ang) * 10, u[1] + Math.sin(ang) * 10]]
            let r = 10
            let a2 = ang
            for (let k = 0; k < 6; k++) {
              r += 7 + rnd() * 6
              a2 += (rnd() - 0.5) * 0.45
              pts.push([u[0] + Math.cos(a2) * r, u[1] + Math.sin(a2) * r * 1.08])
            }
            const path = smoothPath(pts)
            const vein = mix(pal.base, '#46669c', a.skinTone >= 5 ? 0.22 : 0.38)
            return (
              <g key={i}>
                <path d={path} stroke={pal.deep} strokeWidth="2.6" opacity="0.18" transform="translate(0.6 0.9)" filter={`url(#${g('blur2')})`} />
                <path d={path} stroke={vein} strokeWidth="1.7" opacity="0.62" />
                <path d={path} stroke="#fff" strokeWidth="0.45" opacity="0.18" transform="translate(-0.4 -0.4)" />
              </g>
            )
          })}
        </g>
      )}
      {(a.spiderNaevi ?? 0) > 0 && (
        <g>
          {Array.from({ length: a.spiderNaevi ?? 0 }).map((_, i) => {
            const x = (rnd() - 0.5) * 120
            const y = 160 + rnd() * 50
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                {Array.from({ length: 6 }).map((__, k) => {
                  const an = (k / 6) * Math.PI * 2 + rnd()
                  const len = 3 + rnd() * 2.5
                  return <path key={k} d={`M0 0 q${Math.cos(an) * len * 0.6} ${Math.sin(an) * len * 0.3} ${Math.cos(an) * len} ${Math.sin(an) * len}`} stroke="#c0343a" strokeWidth="0.45" fill="none" opacity="0.8" />
                })}
                <circle r="1.3" fill="#c42a33" />
              </g>
            )
          })}
        </g>
      )}
      {a.cullens && (
        <g filter={`url(#${g('blur4')})`} opacity="0.75">
          <ellipse cx={u[0] + 2} cy={u[1] + 1} rx="17" ry="14" fill="#6d4f7d" opacity="0.55" />
          <ellipse cx={u[0] - 4} cy={u[1] + 4} rx="10" ry="8" fill="#7d6b3e" opacity="0.4" />
        </g>
      )}
      {a.greyTurners && (
        <g filter={`url(#${g('blur8')})`} opacity="0.75">
          <ellipse cx={-d.waistW + 4} cy={322} rx="14" ry="30" fill="#5f4a78" opacity="0.6" />
          <ellipse cx={d.waistW - 4} cy={322} rx="14" ry="30" fill="#5f4a78" opacity="0.6" />
          <ellipse cx={-d.waistW + 8} cy={335} rx="9" ry="16" fill="#7d6d3c" opacity="0.4" />
        </g>
      )}
      {a.excoriations && (
        <g stroke="#b24a45" strokeWidth="0.7" strokeLinecap="round" opacity="0.55">
          {Array.from({ length: 10 }).map((_, i) => {
            const x = (rnd() - 0.5) * 110
            const y = 250 + rnd() * 100
            return (
              <g key={i}>
                <path d={`M${x} ${y} l${6 + rnd() * 5} ${-8 - rnd() * 4}`} />
                <path d={`M${x + 3} ${y + 1} l${6 + rnd() * 5} ${-8 - rnd() * 4}`} />
              </g>
            )
          })}
        </g>
      )}
      {a.visiblePeristalsis && (
        <g filter={`url(#${g('blur4')})`}>
          <ellipse rx="26" ry="9" fill={pal.deep} opacity="0.22">
            <animateMotion dur="7s" repeatCount="indefinite" path={`M${40} 272 C${10} 285 ${-20} 300 ${-30} 330`} rotate="auto" />
            <animate attributeName="opacity" values="0;0.28;0.28;0" dur="7s" repeatCount="indefinite" />
          </ellipse>
          <ellipse rx="22" ry="8" fill={pal.highlight} opacity="0.2">
            <animateMotion dur="7s" begin="3.5s" repeatCount="indefinite" path={`M${20} 300 C${0} 312 ${-14} 322 ${-24} 346`} rotate="auto" />
            <animate attributeName="opacity" values="0;0.3;0.3;0" dur="7s" begin="3.5s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )}
      {a.visiblePulsation && (
        <ellipse cx={lm.aorta[0]} cy={lm.aorta[1]} rx="12" ry="16" fill={pal.highlight} opacity="0.2" filter={`url(#${g('blur4')})`}>
          <animate attributeName="opacity" values="0.05;0.32;0.05" dur={`${beat}s`} repeatCount="indefinite" />
        </ellipse>
      )}
    </g>
  )
}

function StomaView({ stoma, lm }: { stoma: NonNullable<Appearance['stoma']>; lm: Landmarks }) {
  const right = stoma.side === 'right'
  const [x, y] = lerpPt(right ? lm.asisR : lm.asisL, lm.umbilicus, 0.45)
  const spout = stoma.type === 'ileostomy' || stoma.type === 'urostomy'
  const r = stoma.type === 'colostomy' ? 8.5 : 7
  return (
    <g transform={`translate(${x} ${y + 4})`}>
      {stoma.bag ? (
        <g>
          <path d="M-22 -18 C-24 -26 24 -26 22 -18 L26 36 C26 52 -26 52 -26 36 Z" fill="#efe6d4" opacity="0.8" stroke="#d8ccb3" strokeWidth="1" />
          <circle r="15" fill="#e7dcc4" stroke="#cfc1a4" strokeWidth="1" />
          <circle r={r + 1} fill="#c9463f" opacity="0.5" />
          <path d="M-20 30 C-10 36 10 36 20 30" stroke="#cdbf9f" strokeWidth="1" fill="none" />
        </g>
      ) : (
        <g>
          <circle r={r + 5} fill="#000" opacity="0.14" />
          <circle r={r} fill={spout ? '#d8584f' : '#c64a44'} />
          <circle r={r * 0.62} fill="#e86f63" opacity={spout ? 0.9 : 0.5} />
          <ellipse cx={-r * 0.3} cy={-r * 0.35} rx={r * 0.35} ry={r * 0.22} fill="#fff" opacity="0.45" />
          {spout && <circle r={1.6} fill="#8e2521" />}
          {stoma.type === 'loop-ileostomy' && <path d={`M${-r} 0 L${r} 0`} stroke="#8e2521" strokeWidth="1.4" />}
        </g>
      )}
    </g>
  )
}

export function herniaPosition(h: HerniaBulge, lm: Landmarks): { at: Pt; rx: number; ry: number; rot: number } {
  const size = h.size === 'large' ? 1.6 : h.size === 'medium' ? 1.15 : 0.8
  const right = h.side !== 'left'
  switch (h.kind) {
    case 'inguinal-indirect': {
      const p = lerpPt(right ? lm.deepRingR : lm.deepRingL, right ? lm.superficialRingR : lm.superficialRingL, 0.55)
      return { at: [p[0], p[1] + 4 * size], rx: 12 * size, ry: 7.5 * size, rot: right ? 32 : -32 }
    }
    case 'inguinal-direct': {
      const p = right ? lm.superficialRingR : lm.superficialRingL
      return { at: [p[0] - (right ? 8 : -8), p[1] - 5], rx: 9 * size, ry: 8.5 * size, rot: 0 }
    }
    case 'femoral': {
      const p = right ? lm.femoralCanalR : lm.femoralCanalL
      return { at: [p[0], p[1] + 5 * size], rx: 8.5 * size, ry: 7.5 * size, rot: 0 }
    }
    case 'umbilical':
      return { at: lm.umbilicus, rx: 10 * size, ry: 10 * size, rot: 0 }
    case 'paraumbilical':
      return { at: [lm.umbilicus[0] + 2, lm.umbilicus[1] - 12], rx: 12 * size, ry: 10 * size, rot: 0 }
    case 'epigastric':
      return { at: [2, (lm.xiphisternum[1] + lm.umbilicus[1]) / 2], rx: 7 * size, ry: 6 * size, rot: 0 }
    case 'incisional':
    default:
      return { at: [0, lm.umbilicus[1] - 22], rx: 20 * size, ry: 17 * size, rot: 0 }
  }
}

function HerniaView({
  h,
  lm,
  pal,
  phase,
  g,
}: {
  h: HerniaBulge
  lm: Landmarks
  pal: SkinPalette
  phase: HerniaPhase
  g: (n: string) => string
}) {
  const groin = h.kind === 'inguinal-indirect' || h.kind === 'inguinal-direct' || h.kind === 'femoral'
  // With the deep ring occluded an indirect hernia is controlled; direct and femoral hernias still bulge
  const ringControlled = phase === 'ring-cough' && h.kind === 'inguinal-indirect'
  const shown =
    !(phase === 'reduced' && groin) &&
    !ringControlled &&
    (h.visible === 'always' ||
      phase === 'ring-cough' ||
      (h.visible === 'cough' && (phase === 'cough' || phase === 'standing')) ||
      (h.visible === 'standing' && (phase === 'standing' || phase === 'cough')))
  if (!shown || h.visible === 'never') return null
  const { at, rx, ry, rot } = herniaPosition(h, lm)
  const grow = phase === 'cough' || phase === 'ring-cough' ? 1.18 : 1
  return (
    <g transform={`translate(${at[0]} ${at[1]}) rotate(${rot}) scale(${grow})`}>
      <ellipse cx="2" cy={ry * 0.5} rx={rx * 1.05} ry={ry * 0.9} fill={pal.deep} opacity="0.35" filter={`url(#${g('blur4')})`} />
      <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={h.tense ? mix(pal.base, '#c9544b', 0.25) : pal.base} />
      <ellipse cx={-rx * 0.25} cy={-ry * 0.3} rx={rx * 0.55} ry={ry * 0.45} fill={pal.highlight} opacity="0.55" filter={`url(#${g('blur2')})`} />
      {h.tense && <ellipse cx="0" cy="0" rx={rx} ry={ry} fill="#d04a3f" opacity="0.12" />}
    </g>
  )
}

export { CM }
