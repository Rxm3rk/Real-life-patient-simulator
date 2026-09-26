import { memo, type ReactNode } from 'react'
import { Body, type BodyProps } from './Body'

/**
 * Outpatient clinic room for upright examinations (groin, varicose veins,
 * breast). Same body units as the bed scene: the patient's soles rest on the
 * floor line at y ≈ 804.
 */
export const FLOOR_Y = 804

export const ClinicScene = memo(function ClinicScene({ body, id, children, back }: { body?: BodyProps; id: string; children?: ReactNode; back?: ReactNode }) {
  const g = (n: string) => `${id}-${n}`
  return (
    <g>
      <defs>
        <linearGradient id={g('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stage-2)" />
          <stop offset="1" stopColor="var(--stage)" />
        </linearGradient>
        <linearGradient id={g('floor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8e9aa6" />
          <stop offset="1" stopColor="#6f7b87" />
        </linearGradient>
        <linearGradient id={g('curtain')} x1="0" x2="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <stop key={i} offset={i / 8} stopColor={i % 2 ? '#7fa9bd' : '#9cc3d4'} />
          ))}
        </linearGradient>
        <radialGradient id={g('contact')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('spot')} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* wall */}
      <rect x={-900} y={-600} width={1800} height={FLOOR_Y + 600} fill={`url(#${g('wall')})`} />
      <ellipse cx="0" cy="260" rx="420" ry="520" fill={`url(#${g('spot')})`} />
      {/* dado rail */}
      <rect x={-900} y={486} width={1800} height={6} fill="#000" opacity="0.07" />
      <rect x={-900} y={492} width={1800} height={FLOOR_Y - 492} fill="#000" opacity="0.035" />
      {/* skirting */}
      <rect x={-900} y={FLOOR_Y - 18} width={1800} height={18} fill="#cfd6dc" opacity="0.55" />
      {/* floor */}
      <rect x={-900} y={FLOOR_Y} width={1800} height={500} fill={`url(#${g('floor')})`} opacity="0.55" />
      <path d={`M-900 ${FLOOR_Y + 0.5} L900 ${FLOOR_Y + 0.5}`} stroke="#000" strokeOpacity="0.18" strokeWidth="1.5" />

      {/* privacy curtain (patient's right) */}
      <g>
        <rect x={-560} y={-560} width={1120} height={10} rx={5} fill="#9aa5b0" opacity="0.8" />
        <path
          d={`M-560 -552 L-250 -552 C-246 -300 -262 120 -238 ${FLOOR_Y - 40} L-560 ${FLOOR_Y - 40} Z`}
          fill={`url(#${g('curtain')})`}
          opacity="0.85"
        />
        <path d={`M-252 -552 C-248 -300 -264 120 -240 ${FLOOR_Y - 40}`} stroke="#000" strokeOpacity="0.12" strokeWidth="6" fill="none" />
      </g>

      {/* hand-gel dispenser */}
      <g transform="translate(250 120)">
        <rect x={-15} y={-26} width={30} height={52} rx={6} fill="#eef3f6" stroke="#b9c6cf" strokeWidth="1.5" />
        <rect x={-10} y={-18} width={20} height={16} rx={3} fill="#4aa3c9" opacity="0.8" />
        <rect x={-6} y={24} width={12} height={8} rx={2} fill="#9aa8b3" />
      </g>

      {back}

      {/* contact shadow under the feet */}
      <ellipse cx="0" cy={FLOOR_Y + 4} rx="120" ry="14" fill={`url(#${g('contact')})`} />

      {body && <Body {...body} standing clinic />}
      {children}
    </g>
  )
})
