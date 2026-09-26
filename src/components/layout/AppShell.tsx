import { BedDouble, BookOpenText, Home, LineChart, Settings, Timer } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, useLocation } from '../../lib/router'
import { cn } from '../../lib/utils'
import { Wordmark } from './Logo'

export const NAV = [
  { to: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { to: '/ward', label: 'Ward', icon: BedDouble, match: (p: string) => p.startsWith('/ward') || p.startsWith('/case') },
  { to: '/osce', label: 'OSCE', icon: Timer, match: (p: string) => p.startsWith('/osce') },
  { to: '/learn', label: 'Learn', icon: BookOpenText, match: (p: string) => p.startsWith('/learn') },
  { to: '/progress', label: 'Progress', icon: LineChart, match: (p: string) => p.startsWith('/progress') || p.startsWith('/attempt') },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useLocation()
  return (
    <div className="min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-bg-elevated/70 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link to="/" className="px-2">
          <Wordmark />
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV.map((item) => {
            const active = item.match(path)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors',
                  active ? 'text-ink' : 'text-muted hover:bg-surface-2/70 hover:text-ink',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="absolute inset-0 rounded-xl bg-surface-1 shadow-(--shadow-soft) ring-1 ring-line"
                  />
                )}
                <Icon size={19} className={cn('relative', active ? 'text-accent' : 'text-faint group-hover:text-muted')} />
                <span className="relative">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto">
          <Link
            to="/settings"
            className={cn(
              'flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors',
              path.startsWith('/settings') ? 'bg-surface-1 text-ink ring-1 ring-line' : 'text-muted hover:bg-surface-2/70 hover:text-ink',
            )}
          >
            <Settings size={19} className="text-faint" />
            Settings
          </Link>
          <p className="mt-4 px-3 text-[11px] leading-relaxed text-faint">
            Educational simulator. Not a substitute for supervised clinical practice.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl safe-top lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/">
            <Wordmark />
          </Link>
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <main className="pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:pb-0 lg:pl-64">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl safe-bottom lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const active = item.match(path)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center gap-1"
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="absolute top-1.5 h-8 w-14 rounded-full bg-accent-soft"
                  />
                )}
                <Icon size={21} className={cn('relative mt-1', active ? 'text-accent' : 'text-faint')} strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn('relative text-[10.5px] font-medium', active ? 'text-ink' : 'text-faint')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10', wide ? 'max-w-7xl' : 'max-w-5xl', className)}>
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</div>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
