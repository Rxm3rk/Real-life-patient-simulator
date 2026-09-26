import { memo } from 'react'
import { darken, lighten, mix } from './color'
import { smoothPath, type Pt } from './geometry'
import { hairColor, IRIS, skinPalette } from './palette'
import type { Appearance, PatientPose } from './types'

/**
 * Frontal face in canonical units: vertex y = 0, chin y = 100, midline x = 0.
 * The supine patient looks at the ceiling, so the same drawing serves both the
 * bed view and the close-up "face cam".
 *
 * Expressions follow the facial action units used in pain scoring (PSPI):
 * brow lowering (AU4), orbital tightening (AU6/7), levator contraction /
 * upper-lip raise (AU9/10) and eye closure (AU43).
 */
export interface FaceProps {
  a: Appearance
  pose: Partial<Pick<PatientPose, 'pain' | 'wince' | 'eyesClosed' | 'mouthOpen' | 'lookAt' | 'coughing' | 'speaking'>>
  id: string
  /** Render neck, shoulders and gown collar (for portraits) */
  bust?: boolean
  /** Hide lines/tubes (e.g. thumbnails) */
  noLines?: boolean
  /** Worry (inner brow raise) 0..1 — anxious patients */
  worry?: number
}

const HIJAB_COLORS = ['#2d3b55', '#5b2a3a', '#4a5a3c', '#8a7a64', '#3b3f46']

function headContour(a: Appearance): Pt[] {
  const female = a.sex === 'female'
  const wide = a.habitus === 'obese' ? 3.2 : a.habitus === 'overweight' ? 1.6 : a.habitus === 'thin' || a.cachexia ? -1.2 : 0
  const jowl = a.age > 65 ? 1.2 : 0
  const pts: Pt[] = female
    ? [
        [0, 0.5],
        [17, 2.8],
        [28.5, 10],
        [34.8, 22],
        [36, 36],
        [35.6 + wide * 0.3, 48],
        [34.2 + wide * 0.6, 58],
        [31.4 + wide + jowl * 0.4, 68],
        [27 + wide + jowl, 78.5],
        [20.5 + wide * 0.8 + jowl * 0.6, 87.5],
        [12.5 + wide * 0.4, 95],
        [5, 99.2],
        [0, 100],
      ]
    : [
        [0, 0],
        [18.5, 2.3],
        [30, 9.5],
        [36.4, 22],
        [37.8, 36],
        [37.6 + wide * 0.3, 48],
        [36.3 + wide * 0.6, 58],
        [34 + wide + jowl * 0.4, 68],
        [30.6 + wide + jowl, 77.5],
        [25 + wide * 0.8 + jowl, 86.5],
        [17 + wide * 0.4, 93.6],
        [8.5, 98.6],
        [0, 100],
      ]
  return pts
}

function symmetric(right: Pt[]): string {
  const left = right.map(([x, y]) => [-x, y] as Pt).reverse()
  return smoothPath([...right, ...left.slice(1, -1)], true)
}

export const Face = memo(function Face({ a, pose, id, bust, noLines, worry = 0 }: FaceProps) {
  const pal = skinPalette(a)
  const hair = hairColor(a)
  const female = a.sex === 'female'
  const e = Math.max(0, Math.min(1, Math.max((pose.pain ?? 0) * 0.62, pose.wince ?? 0, pose.coughing ? 0.55 : 0)))
  const wr = Math.max(0, Math.min(1, worry)) * (1 - e * 0.6)
  const openBase = pose.eyesClosed ? 0.05 : 1
  const open = Math.max(0.04, openBase * (1 - 0.82 * e) - (pose.wince ?? 0) * 0.15)
  const gazeX = pose.lookAt === 'examiner' ? -1.3 : 0
  const gazeY = pose.lookAt === 'down' ? 1 : pose.lookAt === 'examiner' ? 0.2 : -0.2
  const age = a.age
  const irisColor = IRIS[a.eyeColor ?? (a.skinTone >= 3 ? 'brown' : 'hazel')]
  const hijab = a.hair === 'hijab'
  const hijabColor = HIJAB_COLORS[(a.age + a.skinTone) % HIJAB_COLORS.length]
  const browColor = age >= 70 ? mix(hair, '#b5b0a8', 0.55) : darken(hair, a.hairColor === 'blonde' ? 0.2 : 0)

  const head = symmetric(headContour(a))
  const g = (n: string) => `${id}-${n}`

  // mouth geometry
  const mouthHalf = female ? 9.6 : 10.6
  const grimace = Math.max(0, e - 0.25) / 0.75
  const jaw = Math.max(pose.mouthOpen ?? 0, pose.coughing ? 0.9 : 0)
  const cornerY = 79 + grimace * 1.2 - (pose.speaking ? 0 : 0)
  const cornerX = mouthHalf + grimace * 2.6
  const upperLipLift = grimace * 2.2
  const lowerDrop = jaw * 5 + grimace * 0.8
  const mouthOpenAmt = Math.max(jaw * 5.5, grimace > 0.35 ? grimace * 2.6 : 0)

  return (
    <g>
      <defs>
        <radialGradient id={g('skin')} cx="0.46" cy="0.4" r="0.72">
          <stop offset="0" stopColor={lighten(pal.highlight, 0.06)} />
          <stop offset="0.55" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.shadow} />
        </radialGradient>
        <linearGradient id={g('neck')} x1="0" x2="1">
          <stop offset="0" stopColor={pal.deep} />
          <stop offset="0.25" stopColor={pal.shadow} />
          <stop offset="0.5" stopColor={pal.base} />
          <stop offset="0.75" stopColor={pal.shadow} />
          <stop offset="1" stopColor={pal.deep} />
        </linearGradient>
        <radialGradient id={g('cheek')}>
          <stop offset="0" stopColor={pal.blush} stopOpacity="0.55" />
          <stop offset="1" stopColor={pal.blush} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('shade')}>
          <stop offset="0" stopColor={pal.deep} stopOpacity="0.5" />
          <stop offset="1" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('iris')} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor={lighten(irisColor, 0.25)} />
          <stop offset="0.7" stopColor={irisColor} />
          <stop offset="1" stopColor={darken(irisColor, 0.45)} />
        </radialGradient>
        <linearGradient id={g('hair')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(hair, 0.12)} />
          <stop offset="1" stopColor={darken(hair, 0.25)} />
        </linearGradient>
        <radialGradient id={g('stubble')} cx="0.5" cy="0.35" r="0.75">
          <stop offset="0.35" stopColor={darken(hair, 0.05)} stopOpacity="0" />
          <stop offset="0.75" stopColor={darken(hair, 0.05)} stopOpacity="0.55" />
          <stop offset="1" stopColor={darken(hair, 0.05)} stopOpacity="0.75" />
        </radialGradient>
        <clipPath id={g('head')}>
          <path d={head} />
        </clipPath>
        <filter id={g('soft')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* Long hair spreading over the pillow behind the head */}
      {!hijab && (a.hair === 'long' || a.hair === 'curly' || a.hair === 'bun' || a.hair === 'bob') && (
        <HairBack a={a} fill={`url(#${g('hair')})`} color={hair} />
      )}
      {hijab && (
        <path
          d="M-50 30 C-52 -8 -24 -18 0 -18 C24 -18 52 -8 50 30 C49 62 46 96 40 128 L-40 128 C-46 96 -49 62 -50 30 Z"
          fill={hijabColor}
        />
      )}

      {/* Neck & shoulders for portraits */}
      {bust && (
        <g>
          <path
            d={`M${-(female ? 17 : 21)} 80 L${-(female ? 18 : 22.5)} 118 L${female ? 18 : 22.5} 118 L${female ? 17 : 21} 80 Z`}
            fill={`url(#${g('neck')})`}
          />
          <path d="M-20 100 Q0 112 20 100 L20 104 Q0 116 -20 104 Z" fill={pal.deep} opacity="0.18" />
          {/* Gown on shoulders */}
          <path
            d={`M-80 175 C-80 140 -70 124 -46 116 C-34 112 -24 110 ${female ? -17 : -21} 110 C-10 122 10 122 ${female ? 17 : 21} 110 C24 110 34 112 46 116 C70 124 80 140 80 175 Z`}
            fill="#9ec3d6"
          />
          <path
            d={`M${female ? -17 : -21} 110 C-10 122 10 122 ${female ? 17 : 21} 110`}
            fill="none"
            stroke="#7ea6bb"
            strokeWidth="2.2"
          />
          <path d="M-60 150 C-50 135 -40 130 -30 128 M60 150 C50 135 40 130 30 128" stroke="#86adc1" strokeWidth="1.2" fill="none" />
          {Array.from({ length: 22 }).map((_, i) => (
            <circle
              key={i}
              cx={-70 + ((i * 37) % 140)}
              cy={130 + ((i * 17) % 40)}
              r="0.9"
              fill="#6f96ab"
              opacity="0.55"
            />
          ))}
        </g>
      )}

      {/* Ears */}
      {!hijab && (
        <g>
          {[1, -1].map((s) => (
            <g key={s} transform={`scale(${s} 1)`}>
              <path
                d="M35.6 44.5 C39.5 42.5 43 45 43 51 C43 57 41 63 38.2 66.5 C37 68 35.4 67.8 34.8 66"
                fill={pal.base}
                stroke={pal.shadow}
                strokeWidth="0.5"
              />
              <path d="M37.4 48 C40 47.5 40.8 51 40 55.5 C39.4 59 38.4 61 37 62" fill="none" stroke={pal.shadow} strokeWidth="0.9" opacity="0.75" />
            </g>
          ))}
        </g>
      )}

      {/* Head */}
      <path d={head} fill={`url(#${g('skin')})`} />

      <g clipPath={`url(#${g('head')})`}>
        {/* soft form shading */}
        <ellipse cx="-33" cy="56" rx="10" ry="30" fill={`url(#${g('shade')})`} opacity="0.55" />
        <ellipse cx="33" cy="56" rx="10" ry="30" fill={`url(#${g('shade')})`} opacity="0.55" />
        <ellipse cx="0" cy="104" rx="30" ry="9" fill={`url(#${g('shade')})`} opacity="0.5" />
        {/* cheeks */}
        <ellipse cx="-19" cy="64" rx="9" ry="6.5" fill={`url(#${g('cheek')})`} opacity={0.7 - (a.pallor ?? 0) * 0.6} />
        <ellipse cx="19" cy="64" rx="9" ry="6.5" fill={`url(#${g('cheek')})`} opacity={0.7 - (a.pallor ?? 0) * 0.6} />
        {/* hollow cheeks / temporal wasting */}
        {(a.cachexia || a.habitus === 'thin') && (
          <g opacity={a.cachexia ? 0.55 : 0.28}>
            <ellipse cx="-24" cy="72" rx="6" ry="9" fill={`url(#${g('shade')})`} />
            <ellipse cx="24" cy="72" rx="6" ry="9" fill={`url(#${g('shade')})`} />
            <ellipse cx="-33" cy="34" rx="5" ry="8" fill={`url(#${g('shade')})`} />
            <ellipse cx="33" cy="34" rx="5" ry="8" fill={`url(#${g('shade')})`} />
          </g>
        )}
        {/* stubble / beard */}
        {!female && (a.facialHair === 'stubble' || a.facialHair === 'beard') && (
          <path
            d="M-35 62 C-33 80 -22 96 0 100 C22 96 33 80 35 62 C30 70 24 74 16 76 C10 72 -10 72 -16 76 C-24 74 -30 70 -35 62 Z"
            fill={`url(#${g('stubble')})`}
            opacity={a.facialHair === 'beard' ? 0.9 : 0.42}
            filter={`url(#${g('soft')})`}
          />
        )}
        {!female && a.facialHair === 'beard' && (
          <path
            d="M-35.5 60 C-34 82 -22 101 0 103 C22 101 34 82 35.5 60 C31 70 25 76 17 80 C14 85 -14 85 -17 80 C-25 76 -31 70 -35.5 60 Z"
            fill={hair}
            opacity="0.82"
          />
        )}
        {/* under-eye shadows (tired, unwell, older) */}
        <ellipse cx="-15.5" cy="52.5" rx="7" ry="2.6" fill={pal.deep} opacity={0.08 + (age > 55 ? 0.08 : 0) + (pose.pain ?? 0) * 0.08} filter={`url(#${g('soft')})`} />
        <ellipse cx="15.5" cy="52.5" rx="7" ry="2.6" fill={pal.deep} opacity={0.08 + (age > 55 ? 0.08 : 0) + (pose.pain ?? 0) * 0.08} filter={`url(#${g('soft')})`} />
      </g>

      {/* Forehead lines: age and pain */}
      {(age > 42 || e > 0.5 || wr > 0.3) && (
        <g stroke={pal.deep} strokeLinecap="round" fill="none" opacity={Math.min(0.5, (age > 42 ? 0.2 : 0) + Math.max(0, e - 0.35) * 0.45 + wr * 0.3)}>
          <path d="M-14 25 Q0 22.8 14 25" strokeWidth="0.6" />
          <path d="M-11 29 Q0 27.2 11 29" strokeWidth="0.55" />
        </g>
      )}
      {/* Corrugator lines between brows (pain) */}
      {e > 0.38 && (
        <g stroke={pal.deep} strokeLinecap="round" opacity={Math.min(0.55, (e - 0.3) * 0.8)} fill="none">
          <path d="M-2.4 35 Q-3 38.5 -2.2 41.5" strokeWidth="0.6" />
          <path d="M2.4 35 Q3 38.5 2.2 41.5" strokeWidth="0.6" />
        </g>
      )}

      {/* Eyes */}
      {[-1, 1].map((s) => (
        <Eye
          key={s}
          side={s}
          open={open}
          raise={e}
          gazeX={gazeX}
          gazeY={gazeY}
          pal={pal}
          iris={`url(#${g('iris')})`}
          female={female}
          age={age}
          id={`${id}-eye${s}`}
        />
      ))}

      {/* Brows */}
      {[-1, 1].map((s) => {
        const lower = e * 2.6
        const inward = e * 1.6
        const innerRaise = wr * 2.4
        const inner: Pt = [s * (6.8 - inward), 38.6 + lower - innerRaise]
        const mid: Pt = [s * 15, 35.6 + lower * 0.6 - innerRaise * 0.3]
        const outer: Pt = [s * 25.5, 37.8 + lower * 0.1]
        const t = female ? 1.5 : 2.1
        return (
          <path
            key={s}
            d={`M${inner[0]} ${inner[1] + t * 0.5} Q${mid[0]} ${mid[1] - t * 0.6} ${outer[0]} ${outer[1]} Q${mid[0]} ${mid[1] + t * 0.5} ${inner[0]} ${inner[1] + t * 1.3} Z`}
            fill={browColor}
            opacity={0.92}
          />
        )
      })}

      {/* Nose */}
      <g>
        <path d="M-1 45 C-1.6 52 -3.2 58 -4.4 62.5" fill="none" stroke={pal.shadow} strokeWidth="0.9" opacity="0.45" strokeLinecap="round" />
        <path d="M0.4 46 C0.6 52 0.8 58 0.6 63" fill="none" stroke={pal.highlight} strokeWidth="1.3" opacity="0.5" strokeLinecap="round" />
        <path d={`M-7.2 64.5 C-8.2 67 -6.4 69.4 -3.6 68.6 C-2.2 69.8 2.2 69.8 3.6 68.6 C6.4 69.4 8.2 67 7.2 64.5`} fill="none" stroke={pal.shadow} strokeWidth="0.9" strokeLinecap="round" />
        <ellipse cx="-3.6" cy="67.6" rx="1.7" ry="0.95" fill={pal.deep} opacity="0.75" transform="rotate(12 -3.6 67.6)" />
        <ellipse cx="3.6" cy="67.6" rx="1.7" ry="0.95" fill={pal.deep} opacity="0.75" transform="rotate(-12 3.6 67.6)" />
        <ellipse cx="0" cy="64.2" rx="2.4" ry="1.6" fill={pal.highlight} opacity="0.35" />
        {e > 0.62 && (
          <g stroke={pal.deep} strokeWidth="0.5" opacity={(e - 0.62) * 1.2} fill="none">
            <path d="M-3 50 Q0 51.2 3 50" />
            <path d="M-3.4 52.4 Q0 53.4 3.4 52.4" />
          </g>
        )}
      </g>

      {/* Nasolabial folds */}
      <g fill="none" stroke={pal.shadow} strokeLinecap="round" opacity={Math.min(0.65, 0.12 + (age > 40 ? 0.22 : 0) + e * 0.3)}>
        <path d={`M-8.2 64.5 C-11 69 -12.2 74 ${-cornerX - 1.6} ${cornerY + 1.5}`} strokeWidth="0.8" />
        <path d={`M8.2 64.5 C11 69 12.2 74 ${cornerX + 1.6} ${cornerY + 1.5}`} strokeWidth="0.8" />
      </g>

      {/* Mouth */}
      <g>
        {mouthOpenAmt > 0.4 && (
          <path
            d={`M${-cornerX + 1} ${cornerY} C-5 ${76.8 - upperLipLift} 5 ${76.8 - upperLipLift} ${cornerX - 1} ${cornerY} C6 ${80 + lowerDrop} -6 ${80 + lowerDrop} ${-cornerX + 1} ${cornerY} Z`}
            fill="#3a1514"
          />
        )}
        {mouthOpenAmt > 0.4 && grimace > 0.3 && (
          <path
            d={`M${-cornerX + 2.5} ${cornerY - 0.6} C-4 ${77.4 - upperLipLift} 4 ${77.4 - upperLipLift} ${cornerX - 2.5} ${cornerY - 0.6} L${cornerX - 2.8} ${cornerY + 1.4} C4 ${79.4 + lowerDrop * 0.3} -4 ${79.4 + lowerDrop * 0.3} ${-cornerX + 2.8} ${cornerY + 1.4} Z`}
            fill="#f3eee6"
          />
        )}
        {/* upper lip */}
        <path
          d={`M${-cornerX} ${cornerY} C-6.5 ${76.2 - upperLipLift} -3 ${75.6 - upperLipLift} 0 ${77 - upperLipLift} C3 ${75.6 - upperLipLift} 6.5 ${76.2 - upperLipLift} ${cornerX} ${cornerY} C5 ${78.6 - upperLipLift * 0.6 + (mouthOpenAmt > 0.4 ? 0 : 0.4)} -5 ${78.6 - upperLipLift * 0.6 + (mouthOpenAmt > 0.4 ? 0 : 0.4)} ${-cornerX} ${cornerY} Z`}
          fill={darken(pal.lip, 0.08)}
        />
        {/* lower lip */}
        <path
          d={`M${-cornerX + 0.8} ${cornerY + 0.2} C-5 ${79.6 + lowerDrop} 5 ${79.6 + lowerDrop} ${cornerX - 0.8} ${cornerY + 0.2} C6 ${84.2 + lowerDrop} -6 ${84.2 + lowerDrop} ${-cornerX + 0.8} ${cornerY + 0.2} Z`}
          fill={pal.lip}
        />
        <ellipse cx="0" cy={82 + lowerDrop} rx="4" ry="0.9" fill="#fff" opacity="0.18" />
        {mouthOpenAmt <= 0.4 && (
          <path
            d={`M${-cornerX} ${cornerY} C-5 ${79.8 - upperLipLift * 0.2} 5 ${79.8 - upperLipLift * 0.2} ${cornerX} ${cornerY}`}
            fill="none"
            stroke={darken(pal.lip, 0.45)}
            strokeWidth="0.75"
            strokeLinecap="round"
          />
        )}
        {/* chin shadow */}
        <path d="M-6 90.5 Q0 92.2 6 90.5" fill="none" stroke={pal.shadow} strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />
        {!female && a.facialHair === 'moustache' && (
          <path d="M-12 76 C-8 72.5 -2.5 72.5 0 74 C2.5 72.5 8 72.5 12 76 C8 75.4 3 76.2 0 76.6 C-3 76.2 -8 75.4 -12 76 Z" fill={hair} />
        )}
      </g>

      {/* Front hair */}
      {!hijab && <HairFront a={a} fill={`url(#${g('hair')})`} color={hair} />}
      {hijab && (
        <path
          d="M-38 40 C-40 6 -20 -4 0 -4 C20 -4 40 6 38 40 C37 30 30 17 0 15 C-30 17 -37 30 -38 40 Z"
          fill={lighten(hijabColor, 0.05)}
        />
      )}

      {/* Sweat */}
      {a.sweaty && (
        <g fill="#fff" opacity="0.55">
          <ellipse cx="-12" cy="21" rx="1" ry="1.5" />
          <ellipse cx="9" cy="18.5" rx="0.9" ry="1.4" />
          <ellipse cx="22" cy="27" rx="0.8" ry="1.2" />
          <ellipse cx="-24" cy="31" rx="0.8" ry="1.2" />
          <ellipse cx="-4" cy="26" rx="0.7" ry="1" />
        </g>
      )}

      {/* Glasses */}
      {a.glasses && (
        <g fill="none" stroke="#2a2d33" strokeWidth="1.1" opacity="0.9">
          <rect x="-25" y="41" width="18" height="12.5" rx="4.5" />
          <rect x="7" y="41" width="18" height="12.5" rx="4.5" />
          <path d="M-7 45.5 Q0 43 7 45.5 M-25 45 L-35 43 M25 45 L35 43" />
        </g>
      )}

      {/* Tubes & oxygen */}
      {!noLines && a.lines?.ngTube && (
        <g>
          <path d="M-3.6 67.6 C-5 72 -9 76 -20 82 C-34 90 -44 96 -52 118" fill="none" stroke="#e8dca0" strokeWidth="2" opacity="0.95" />
          <path d="M-3.6 67.6 C-5 72 -9 76 -20 82 C-34 90 -44 96 -52 118" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.5" />
          <rect x="-7" y="52" width="7" height="12" rx="1.6" fill="#f2efe6" opacity="0.85" transform="rotate(8 -3.5 58)" />
        </g>
      )}
      {!noLines && a.lines?.oxygen === 'nasal' && (
        <g fill="none" stroke="#bfe6ef" strokeWidth="1.6" opacity="0.95">
          <path d="M-3.6 67.8 C-10 70 -24 70 -36 62 C-40 59 -44 70 -40 88 C-36 100 -18 110 0 112" />
          <path d="M3.6 67.8 C10 70 24 70 36 62 C40 59 44 70 40 88 C36 100 18 110 0 112" />
        </g>
      )}
      {!noLines && a.lines?.oxygen === 'mask' && (
        <g>
          <path d="M-15 56 C-16 50 -8 46 0 46 C8 46 16 50 15 56 L18 82 C18 92 10 97 0 97 C-10 97 -18 92 -18 82 Z" fill="#dff3f7" opacity="0.42" stroke="#c6e8ef" strokeWidth="1" />
          <path d="M-18 70 L-40 64 M18 70 L40 64" stroke="#7fb3c2" strokeWidth="1.2" />
        </g>
      )}
    </g>
  )
})

function Eye({
  side,
  open,
  raise,
  gazeX,
  gazeY,
  pal,
  iris,
  female,
  age,
  id,
}: {
  side: number
  open: number
  raise: number
  gazeX: number
  gazeY: number
  pal: ReturnType<typeof skinPalette>
  iris: string
  female: boolean
  age: number
  id: string
}) {
  const cx = side * 15.5
  const inner = side * 8.6
  const outer = side * 22.6
  const cy = 47
  const top = cy - 3.6 * open
  const lowerLift = raise * 1.1
  const bottom = cy + 2.6 - lowerLift * 0.6
  const upper = `M${inner} ${cy + 0.4} C${inner + side * 3} ${top - 0.2} ${outer - side * 4} ${top - 0.2} ${outer} ${cy - 0.5}`
  const lower = `C${outer - side * 4} ${bottom + 0.4} ${inner + side * 3} ${bottom + 0.4} ${inner} ${cy + 0.4} Z`
  const shape = `${upper} ${lower}`
  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={shape} />
        </clipPath>
      </defs>
      {/* socket shadow */}
      <ellipse cx={cx} cy={cy - 1} rx="9.4" ry="5.8" fill={pal.shadow} opacity="0.22" />
      {open > 0.12 ? (
        <>
          <path d={shape} fill={pal.sclera} />
          <g clipPath={`url(#${id}-clip)`}>
            <circle cx={cx + gazeX} cy={cy - 0.3 + gazeY} r="3.25" fill={iris} />
            <circle cx={cx + gazeX} cy={cy - 0.3 + gazeY} r="1.35" fill="#0d0a09" />
            <circle cx={cx + gazeX + 0.95} cy={cy - 1.25 + gazeY} r="0.7" fill="#fff" opacity="0.85" />
            {/* upper lid shadow on the eyeball */}
            <path d={`M${inner} ${cy - 5} L${outer} ${cy - 5} L${outer} ${top + 1.2} C${outer - side * 4} ${top + 0.8} ${inner + side * 3} ${top + 0.8} ${inner} ${cy + 0.4} Z`} fill="#000" opacity="0.13" />
          </g>
          <path d={upper} fill="none" stroke="#1d1411" strokeWidth={female ? 1.05 : 0.9} strokeLinecap="round" />
          {female && (
            <path d={`M${outer - side * 0.4} ${cy - 0.6} l${side * 1.6} -1.1`} stroke="#1d1411" strokeWidth="0.8" strokeLinecap="round" />
          )}
          <path d={`M${outer} ${cy - 0.5} ${lower.replace(' Z', '')}`} fill="none" stroke={pal.shadow} strokeWidth="0.45" opacity="0.7" />
        </>
      ) : (
        <path d={`M${inner} ${cy + 0.6} C${inner + side * 3} ${cy + 1.8 + raise} ${outer - side * 4} ${cy + 1.8 + raise} ${outer} ${cy - 0.1}`} fill="none" stroke="#2a1b16" strokeWidth="0.95" strokeLinecap="round" />
      )}
      {/* lid crease */}
      <path
        d={`M${inner + side * 0.8} ${cy - 2.6} C${inner + side * 3.5} ${cy - 5.6 - open * 0.4} ${outer - side * 4} ${cy - 5.6 - open * 0.4} ${outer - side * 0.4} ${cy - 2.8}`}
        fill="none"
        stroke={pal.shadow}
        strokeWidth="0.6"
        opacity={0.55 + (age > 60 ? 0.2 : 0)}
      />
      {/* crow's feet */}
      {(raise > 0.45 || age > 55) && (
        <g stroke={pal.deep} strokeWidth="0.45" opacity={Math.min(0.55, raise * 0.6 + (age > 55 ? 0.18 : 0))} fill="none" strokeLinecap="round">
          <path d={`M${outer + side * 1.2} ${cy - 1.4} l${side * 3} -1.6`} />
          <path d={`M${outer + side * 1.4} ${cy + 0.4} l${side * 3.2} 0.3`} />
          <path d={`M${outer + side * 1} ${cy + 2} l${side * 2.8} 1.6`} />
        </g>
      )}
    </g>
  )
}

function HairBack({ a, fill, color }: { a: Appearance; fill: string; color: string }) {
  if (a.hair === 'long')
    return (
      <g>
        <path
          d="M-44 30 C-52 60 -58 100 -64 140 C-50 150 -30 146 -20 118 L20 118 C30 146 50 150 64 140 C58 100 52 60 44 30 C40 0 20 -12 0 -12 C-20 -12 -40 0 -44 30 Z"
          fill={fill}
        />
        <path d="M-50 60 C-54 90 -56 110 -58 132 M50 60 C54 90 56 110 58 132" stroke={darken(color, 0.3)} strokeWidth="1.2" fill="none" opacity="0.5" />
      </g>
    )
  if (a.hair === 'bob')
    return <path d="M-44 28 C-50 58 -48 84 -40 98 L40 98 C48 84 50 58 44 28 C40 0 20 -10 0 -10 C-20 -10 -40 0 -44 28 Z" fill={fill} />
  if (a.hair === 'bun')
    return (
      <g>
        <ellipse cx="0" cy="-10" rx="18" ry="12" fill={fill} />
        <path d="M-10 -12 Q0 -18 10 -12" stroke={darken(color, 0.3)} strokeWidth="1" fill="none" />
      </g>
    )
  if (a.hair === 'curly')
    return (
      <path
        d="M-46 40 C-56 32 -54 12 -44 6 C-44 -8 -30 -18 -18 -16 C-12 -24 12 -24 18 -16 C30 -18 44 -8 44 6 C54 12 56 32 46 40 C52 52 46 64 40 60 L-40 60 C-46 64 -52 52 -46 40 Z"
        fill={fill}
      />
    )
  return null
}

function HairFront({ a, fill, color }: { a: Appearance; fill: string; color: string }) {
  const dark = darken(color, 0.35)
  switch (a.hair) {
    case 'short':
      return (
        <g>
          <path
            d="M-38 38 C-40 18 -30 -1 0 -2.5 C30 -1 40 18 38 38 C36 30 34 26 31 24 C25 20 14 18 6 19.5 C-4 16 -18 17 -26 21 C-31 24 -35 30 -38 38 Z"
            fill={fill}
          />
          <path d="M-14 18 C-8 10 6 6 18 9 M-24 22 C-20 12 -8 6 4 5" stroke={dark} strokeWidth="0.7" fill="none" opacity="0.45" />
        </g>
      )
    case 'crop':
      return (
        <path
          d="M-37.6 34 C-39 16 -28 -0.5 0 -1.5 C28 -0.5 39 16 37.6 34 C35 26 32 22 26 20 C16 17 -16 17 -26 20 C-32 22 -35 26 -37.6 34 Z"
          fill={fill}
          opacity="0.88"
        />
      )
    case 'receding':
      return (
        <g>
          <path
            d="M-38 40 C-40 22 -34 6 -22 1 C-12 -2 12 -2 22 1 C34 6 40 22 38 40 C36 32 33 27 28 25 C24 20 22 12 16 11 C8 12 -8 12 -16 11 C-22 12 -24 20 -28 25 C-33 27 -36 32 -38 40 Z"
            fill={fill}
            opacity="0.92"
          />
        </g>
      )
    case 'bald':
      return (
        <g opacity="0.9">
          <path d="M-38.5 46 C-39.5 36 -37 28 -32 24 C-33 30 -34 38 -33.5 47 Z" fill={fill} />
          <path d="M38.5 46 C39.5 36 37 28 32 24 C33 30 34 38 33.5 47 Z" fill={fill} />
          <ellipse cx="-4" cy="10" rx="12" ry="6" fill="#fff" opacity="0.12" />
        </g>
      )
    case 'long':
    case 'bob':
      return (
        <g>
          <path
            d="M-39 50 C-42 20 -28 -3 0 -4 C28 -3 42 20 39 50 C37 36 32 26 24 21 C16 17 6 16 1 16 C-2 22 -10 26 -20 26 C-28 28 -35 36 -39 50 Z"
            fill={fill}
          />
          <path d="M1 16 C-4 8 -16 4 -26 10 M1 16 C8 8 20 6 28 12" stroke={dark} strokeWidth="0.8" fill="none" opacity="0.5" />
        </g>
      )
    case 'bun':
      return (
        <g>
          <path
            d="M-38.4 40 C-40 16 -28 -2.5 0 -3 C28 -2.5 40 16 38.4 40 C36 30 32 24 24 21 C12 16 -12 16 -24 21 C-32 24 -36 30 -38.4 40 Z"
            fill={fill}
          />
          <path d="M-22 14 C-12 6 12 6 22 14" stroke={dark} strokeWidth="0.7" fill="none" opacity="0.4" />
        </g>
      )
    case 'curly':
      return (
        <path
          d="M-39 40 C-44 30 -40 14 -32 10 C-30 0 -18 -6 -8 -4 C0 -9 12 -7 18 -3 C28 -4 36 4 36 12 C42 18 44 30 39 40 C36 30 30 24 22 22 C10 18 -10 18 -22 22 C-30 24 -36 30 -39 40 Z"
          fill={fill}
        />
      )
    default:
      return null
  }
}
