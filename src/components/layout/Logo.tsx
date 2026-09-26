import { cn } from '../../lib/utils'

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id="bs-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ee3cf" />
          <stop offset="1" stopColor="#0b8277" />
        </linearGradient>
        <linearGradient id="bs-logo-h" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#bs-logo-g)" />
      <rect width="32" height="32" rx="9" fill="url(#bs-logo-h)" />
      {/* bed */}
      <path d="M6.5 22.5v-9M6.5 19.5h19v3" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.95" />
      {/* pulse line over the bed */}
      <path
        d="M9 16.2h3.2l1.5-4.2 2.4 7 1.8-4.6 1.1 1.8H24"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-none">
        <div className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Bedside</div>
        <div className="mt-0.5 text-[10.5px] font-medium tracking-wide text-faint">Surgical patient simulator</div>
      </div>
    </div>
  )
}
