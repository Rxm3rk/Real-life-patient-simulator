import { ArrowLeft, BedDouble, BookOpenText, CalendarDays, LineChart, Search, Settings } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, useLocation } from '../../lib/router'
import { cn } from '../../lib/utils'
import { Wordmark } from './Logo'

/** Four places, one search: everything else is a step inside one of them. */
export const NAV = [
  { to: '/', label: 'Today', icon: CalendarDays, match: (p: string) => p === '/' || p.startsWith('/topic') },
  { to: '/ward', label: 'Patients', icon: BedDouble, match: (p: string) => p.startsWith('/ward') || p.startsWith('/case') || p.startsWith('/osce') },
  { to: '/learn', label: 'Learn', icon: BookOpenText, match: (p: string) => p.startsWith('/learn') || p.startsWith('/quiz') },
  { to: '/progress', label: 'Progress', icon: LineChart, match: (p: string) => p.startsWith('/progress') || p.startsWith('/debrief') },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useLocation()
  const searching = path.startsWith('/ask')
  return (
    <div className="min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-bg-elevated px-4 py-5 lg:flex print:hidden">
        <Link to="/" className="px-2">
          <Wordmark />
        </Link>
        <Link
          to="/ask"
          aria-current={searching ? 'page' : undefined}
          className={cn(
            'mt-6 flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13.5px] ring-1 transition',
            searching ? 'bg-surface-1 text-ink ring-accent/50' : 'bg-surface-1/70 text-faint ring-line hover:text-muted hover:ring-line-strong',
          )}
        >
          <Search size={16} />
          <span className="flex-1">Search</span>
          <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-faint ring-1 ring-line">/</kbd>
        </Link>
        <nav className="mt-4 flex flex-col gap-1" aria-label="Main">
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
            aria-current={path.startsWith('/settings') ? 'page' : undefined}
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
      <header className="sticky top-0 z-40 border-b border-line bg-bg safe-top lg:hidden print:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-0.5">
            <Link
              to="/ask"
              aria-label="Search"
              aria-current={searching ? 'page' : undefined}
              className={cn('grid h-10 w-10 place-items-center rounded-full transition hover:bg-surface-2 hover:text-ink', searching ? 'bg-accent-soft text-accent' : 'text-muted')}
            >
              <Search size={20} />
            </Link>
            <Link
              to="/settings"
              aria-label="Settings"
              aria-current={path.startsWith('/settings') ? 'page' : undefined}
              className={cn('grid h-10 w-10 place-items-center rounded-full transition hover:bg-surface-2 hover:text-ink', path.startsWith('/settings') ? 'text-accent' : 'text-muted')}
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:pb-0 lg:pl-64 print:p-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg safe-bottom lg:hidden print:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4">
          {NAV.map((item) => {
            const active = item.match(path)
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className="relative flex flex-col items-center justify-center gap-1">
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="absolute top-1.5 h-8 w-14 rounded-full bg-accent-soft"
                  />
                )}
                <Icon size={21} className={cn('relative mt-1', active ? 'text-accent' : 'text-faint')} strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn('relative text-[11px] font-medium', active ? 'text-ink' : 'text-faint')}>{item.label}</span>
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
    <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10 print:max-w-none print:p-0', wide ? 'max-w-7xl' : 'max-w-5xl', className)}>
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
        {eyebrow && <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A quiet “← Somewhere” link at the top of a sub-page. */
export function BackLink({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick ? (e) => (e.preventDefault(), onClick()) : undefined}
      className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-[13.5px] font-medium text-muted transition hover:text-ink print:hidden"
    >
      <ArrowLeft size={15} />
      {children}
    </Link>
  )
}
