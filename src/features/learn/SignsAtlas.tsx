import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { navigate } from '../../lib/router'
import { cn } from '../../lib/utils'
import { SIGN_BY_ID, SIGN_SYSTEMS, SIGNS, type SignDef, type SignSystem } from './signs'

/** Renders children only once scrolled near the viewport (the illustrations are heavy SVG). */
function LazyRender({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || show) return
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [show])
  return (
    <div ref={ref} className={className}>
      {show ? children : <div className="h-full w-full animate-pulse bg-surface-2/40" />}
    </div>
  )
}

function Illustration({ sign, id, className }: { sign: SignDef; id: string; className?: string }) {
  return (
    <svg viewBox={sign.viewBox} className={cn('h-full w-full', className)} preserveAspectRatio="xMidYMid slice" role="img" aria-label={sign.name}>
      <rect x="-2000" y="-2000" width="4000" height="4000" fill="var(--stage)" />
      <g className="text-ink">{sign.render(id)}</g>
    </svg>
  )
}

export default function SignsAtlas({ id }: { id?: string }) {
  const [system, setSystem] = useState<'All' | SignSystem>('All')
  const [q, setQ] = useState('')
  const list = useMemo(
    () =>
      SIGNS.filter((s) => (system === 'All' || s.system === system) && (!q.trim() || `${s.name} ${s.what} ${s.causes.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [system, q],
  )
  const open = id ? SIGN_BY_ID[id] : undefined
  const idx = open ? SIGNS.indexOf(open) : -1

  return (
    <Page wide>
      <button onClick={() => navigate('/learn')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Learn
      </button>
      <PageHeader
        eyebrow="Signs atlas"
        title="Recognise it on sight"
        subtitle="Each sign is drawn by the same anatomy engine you examine with in the stations — learn what it looks like, what it means and how to elicit it."
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...SIGN_SYSTEMS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSystem(s)}
              className={cn('h-8 rounded-full px-3 text-[12.5px] font-medium ring-1 transition', system === s ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink')}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search signs or causes…"
            className="h-10 w-full rounded-xl bg-surface-1 pr-3 pl-9 text-[14px] text-ink ring-1 ring-line outline-none placeholder:text-faint focus:ring-accent"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.03 }}
            onClick={() => navigate(`/learn/signs/${s.id}`)}
            className="group overflow-hidden rounded-2xl bg-surface-1 text-left ring-1 ring-line shadow-(--shadow-soft) transition hover:ring-accent/40"
          >
            <LazyRender className="aspect-[16/10] w-full overflow-hidden bg-stage">
              <Illustration sign={s} id={`sg-${s.id}`} className="transition duration-500 group-hover:scale-[1.03]" />
            </LazyRender>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[15px] font-semibold text-ink">{s.name}</div>
                <Badge>{s.system}</Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{s.what}</p>
            </div>
          </motion.button>
        ))}
      </div>
      {list.length === 0 && <p className="mt-10 text-center text-muted">No signs match.</p>}

      <Sheet open={!!open} onClose={() => navigate('/learn/signs', { replace: true })} title={open?.name ?? ''} description={open?.system} size="lg">
        {open && (
          <div className="space-y-4">
            <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-stage ring-1 ring-line">
              <Illustration sign={open} id={`sgd-${open.id}`} />
            </div>
            <Block title="What you see" icon={<Eye size={14} />}>
              {open.what}
            </Block>
            <Block title="What it means">{open.meaning}</Block>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Causes & associations</div>
              <ul className="space-y-1">
                {open.causes.map((c) => (
                  <li key={c} className="flex gap-2 text-[14px] leading-snug text-ink">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            {open.elicit && <Block title="How to elicit">{open.elicit}</Block>}
            <div className="flex justify-between gap-2 border-t border-line pt-4">
              <Button size="sm" variant="ghost" disabled={idx <= 0} onClick={() => navigate(`/learn/signs/${SIGNS[idx - 1].id}`, { replace: true })} leading={<ChevronLeft size={15} />}>
                Previous
              </Button>
              <Button size="sm" variant="ghost" disabled={idx >= SIGNS.length - 1} onClick={() => navigate(`/learn/signs/${SIGNS[idx + 1].id}`, { replace: true })} trailing={<ChevronRight size={15} />}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </Page>
  )
}

function Block({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">
        {icon}
        {title}
      </div>
      <p className="text-[14.5px] leading-relaxed text-ink">{children}</p>
    </div>
  )
}
