import { memo, type ReactNode } from 'react'
import { Body, type BodyProps } from './Body'

export interface BedsideItems {
  vomitBowl?: 'bilious' | 'feculent' | 'coffee-ground' | 'clear' | 'empty'
  catheterUrine?: 'normal' | 'concentrated' | 'tea' | 'haematuria'
  ngDrainage?: 'bilious' | 'feculent'
  drip?: boolean
  walkingFrame?: boolean
  flowers?: boolean
  inhaler?: boolean
}

export const SCENE_VIEWBOX = { x: -300, y: -150, w: 600, h: 1120 }

const URINE: Record<NonNullable<BedsideItems['catheterUrine']>, string> = {
  normal: '#e9cf52',
  concentrated: '#d69a1f',
  tea: '#7a4a1c',
  haematuria: '#b3312b',
}

const VOMIT: Record<NonNullable<BedsideItems['vomitBowl']>, string> = {
  bilious: '#6f8a2a',
  feculent: '#6b4b22',
  'coffee-ground': '#3b2618',
  clear: '#d8d4c2',
  empty: 'transparent',
}

export const BedScene = memo(function BedScene({
  body,
  items = {},
  children,
  id,
}: {
  body: BodyProps
  items?: BedsideItems
  children?: ReactNode
  id: string
}) {
  const g = (n: string) => `${id}-${n}`
  return (
    <g>
      <defs>
        <radialGradient id={g('floor')} cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="var(--stage-2)" />
          <stop offset="1" stopColor="var(--stage)" />
        </radialGradient>
        <linearGradient id={g('mattress')} x1="0" x2="1">
          <stop offset="0" stopColor="#c9d1d8" />
          <stop offset="0.06" stopColor="#eef2f4" />
          <stop offset="0.5" stopColor="#f8fafb" />
          <stop offset="0.94" stopColor="#eef2f4" />
          <stop offset="1" stopColor="#c3ccd4" />
        </linearGradient>
        <linearGradient id={g('pillow')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#eef2f5" />
          <stop offset="1" stopColor="#d5dde3" />
        </linearGradient>
        <linearGradient id={g('frame')} x1="0" x2="1">
          <stop offset="0" stopColor="#5d6875" />
          <stop offset="0.5" stopColor="#8b96a3" />
          <stop offset="1" stopColor="#5d6875" />
        </linearGradient>
        <filter id={g('shadow')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={g('soft')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Floor */}
      <rect x={SCENE_VIEWBOX.x - 400} y={SCENE_VIEWBOX.y - 400} width={SCENE_VIEWBOX.w + 800} height={SCENE_VIEWBOX.h + 800} fill={`url(#${g('floor')})`} />
      <g opacity="0.05" stroke="currentColor">
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={i} d={`M${-700} ${-150 + i * 90} L${700} ${-150 + i * 90}`} strokeWidth="1" />
        ))}
      </g>

      {/* Bed shadow */}
      <rect x={-205} y={-90} width={410} height={1010} rx={30} fill="#000" opacity="0.45" filter={`url(#${g('shadow')})`} />

      {/* Bedside locker (patient's right = viewer's left) */}
      <g transform="translate(-262 -40)">
        <rect x={-38} y={-40} width={76} height={92} rx={8} fill="#c7b69a" />
        <rect x={-38} y={-40} width={76} height={92} rx={8} fill="url(#none)" stroke="#a9987c" strokeWidth="2" />
        <rect x={-30} y={-32} width={60} height={76} rx={5} fill="#d6c7ad" />
        {/* water jug & cup */}
        <circle cx={-12} cy={-12} r={11} fill="#dbe9f0" stroke="#a9c0cc" strokeWidth="1.5" />
        <circle cx={-12} cy={-12} r={7} fill="#bcd9e6" opacity="0.8" />
        <circle cx={12} cy={-16} r={6} fill="#fff" stroke="#c9d3d9" strokeWidth="1.2" />
        {/* kidney dish */}
        {items.vomitBowl && (
          <g transform="translate(2 18)">
            <path d="M-22 0 C-22 -12 -8 -14 0 -7 C8 -14 22 -12 22 0 C22 12 8 14 0 7 C-8 14 -22 12 -22 0 Z" fill="#9fb4c9" />
            <path d="M-18 0 C-18 -9 -7 -10 0 -4.5 C7 -10 18 -9 18 0 C18 9 7 10 0 4.5 C-7 10 -18 9 -18 0 Z" fill="#b7c9da" />
            {items.vomitBowl !== 'empty' && <ellipse cx="0" cy="1" rx="12" ry="5" fill={VOMIT[items.vomitBowl]} opacity="0.9" />}
          </g>
        )}
        {items.inhaler && <rect x={16} y={4} width={8} height={16} rx={3} fill="#3b82f6" />}
      </g>

      {/* Drip stand (viewer's right, by the head) */}
      {items.drip && (
        <g transform="translate(248 -10)">
          <g stroke="#7a8793" strokeWidth="4" strokeLinecap="round">
            {[0, 72, 144, 216, 288].map((a) => (
              <path key={a} d={`M0 0 L${Math.cos((a * Math.PI) / 180) * 26} ${Math.sin((a * Math.PI) / 180) * 26}`} />
            ))}
          </g>
          <circle r="7" fill="#aab4bd" />
          <rect x={-18} y={-44} width={36} height={52} rx={8} fill="#e6f3f8" opacity="0.92" stroke="#b8d3de" strokeWidth="1.5" />
          <rect x={-12} y={-34} width={24} height={16} rx={2} fill="#fff" />
          <path d="M-8 -30 L8 -30 M-8 -26 L4 -26 M-8 -22 L6 -22" stroke="#3a7ca5" strokeWidth="1.4" />
          <path d="M0 8 C-10 60 -40 150 -95 260" stroke="#c8e3ee" strokeWidth="2.2" fill="none" opacity="0.9" />
        </g>
      )}

      {/* Walking frame at the foot */}
      {items.walkingFrame && (
        <g transform="translate(240 820)" stroke="#9aa6b2" strokeWidth="6" fill="none" strokeLinecap="round">
          <path d="M-30 -40 L-30 40 M30 -40 L30 40 M-30 -40 L30 -40" />
          <circle cx="-30" cy="40" r="5" fill="#556" />
          <circle cx="30" cy="40" r="5" fill="#556" />
        </g>
      )}

      {/* Bed frame */}
      <rect x={-196} y={-96} width={392} height={1000} rx={26} fill={`url(#${g('frame')})`} />
      {/* Headboard & footboard */}
      <rect x={-188} y={-112} width={376} height={34} rx={14} fill="#dfe4e8" stroke="#b7c0c8" strokeWidth="2" />
      <rect x={-188} y={884} width={376} height={34} rx={14} fill="#dfe4e8" stroke="#b7c0c8" strokeWidth="2" />
      <rect x={-40} y={890} width={80} height={20} rx={5} fill="#23303d" />
      <rect x={-34} y={894} width={30} height={12} rx={2} fill="#2fd07a" opacity="0.7" />

      {/* Mattress with sheet */}
      <rect x={-182} y={-80} width={364} height={960} rx={20} fill={`url(#${g('mattress')})`} />
      <g stroke="#d4dbe1" strokeWidth="2" fill="none" opacity="0.8">
        <path d="M-150 120 C-120 128 -140 150 -110 160" />
        <path d="M150 140 C124 146 138 170 112 176" />
        <path d="M-160 620 C-140 612 -150 600 -128 596" />
      </g>

      {/* Side rails */}
      {[-1, 1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <rect x={186} y={40} width={12} height={330} rx={6} fill="#aeb8c2" stroke="#7f8b97" strokeWidth="1.5" />
          <rect x={186} y={430} width={12} height={250} rx={6} fill="#aeb8c2" stroke="#7f8b97" strokeWidth="1.5" />
        </g>
      ))}

      {/* Catheter bag hanging on the rail */}
      {items.catheterUrine && (
        <g transform="translate(-224 470)">
          <rect x={-22} y={-10} width={44} height={70} rx={10} fill="#f2f6f8" opacity="0.9" stroke="#c3d0d8" strokeWidth="1.5" />
          <rect x={-18} y={22} width={36} height={34} rx={7} fill={URINE[items.catheterUrine]} opacity="0.85" />
          <path d="M-16 6 L16 6 M-16 14 L16 14" stroke="#9fb0bc" strokeWidth="1" />
          <path d="M0 -10 C10 -30 30 -40 40 -46" stroke="#e9d9a6" strokeWidth="3" fill="none" />
        </g>
      )}
      {items.ngDrainage && (
        <g transform="translate(-226 230)">
          <rect x={-20} y={-8} width={40} height={60} rx={10} fill="#f2f6f8" opacity="0.9" stroke="#c3d0d8" strokeWidth="1.5" />
          <rect x={-16} y={18} width={32} height={30} rx={7} fill={items.ngDrainage === 'bilious' ? '#5f7f22' : '#6b4b22'} opacity="0.85" />
          <path d="M0 -8 C6 -40 24 -90 60 -110" stroke="#e8dca0" strokeWidth="2.4" fill="none" />
        </g>
      )}

      {/* Pillow */}
      <g>
        <rect x={-120} y={-58} width={240} height={150} rx={46} fill="#000" opacity="0.18" filter={`url(#${g('soft')})`} transform="translate(0 8)" />
        <rect x={-120} y={-58} width={240} height={150} rx={46} fill={`url(#${g('pillow')})`} />
        <path d="M-100 -40 C-60 -50 60 -50 100 -40" stroke="#dfe6eb" strokeWidth="2" fill="none" />
        <ellipse cx="0" cy="40" rx="70" ry="52" fill="#b9c4cd" opacity="0.35" filter={`url(#${g('soft')})`} />
      </g>

      {/* Observation chart clipped to the foot of the bed */}
      <g transform="translate(118 842)">
        <rect x={-26} y={-30} width={52} height={64} rx={4} fill="#355c8c" />
        <rect x={-22} y={-24} width={44} height={54} rx={2} fill="#fdfdfb" />
        <rect x={-10} y={-34} width={20} height={9} rx={2} fill="#9aa5b1" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M-17 ${-14 + i * 7} L17 ${-14 + i * 7}`} stroke="#c8d0d8" strokeWidth="1" />
        ))}
        <path d="M-16 8 L-9 2 L-2 6 L6 -4 L14 0" stroke="#e25d5d" strokeWidth="1.6" fill="none" />
      </g>

      <Body {...body} />
      {children}
    </g>
  )
})
