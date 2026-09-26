import { ChevronRight, Filter, Search, Shuffle } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/primitives'
import { CASES } from '../../content/cases'
import type { CaseMeta, ExamKind } from '../../engine/types'
import { Link, navigate } from '../../lib/router'
import { cn, timeAgo } from '../../lib/utils'
import { useProgress } from '../../store/progress'

export const EXAM_LABEL: Record<ExamKind, string> = {
  abdominal: 'Abdomen',
  groin: 'Groin & hernia',
  lump: 'Lump',
  thyroid: 'Neck & thyroid',
  breast: 'Breast',
  arterial: 'Arterial',
  venous: 'Venous',
  scrotal: 'Scrotum',
}

const FILTERS: { id: 'all' | ExamKind; label: string }[] = [
  { id: 'all', label: 'All patients' },
  { id: 'abdominal', label: 'Abdomen' },
  { id: 'groin', label: 'Hernia' },
  { id: 'lump', label: 'Lumps' },
  { id: 'thyroid', label: 'Neck' },
  { id: 'breast', label: 'Breast' },
  { id: 'arterial', label: 'Vascular' },
  { id: 'scrotal', label: 'Scrotal' },
]

export default function Ward() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | ExamKind>('all')
  const attempts = useProgress((s) => s.attempts)

  const best = useMemo(() => {
    const m: Record<string, { pct: number; at: number }> = {}
    for (const a of attempts) if (!m[a.caseId] || a.pct > m[a.caseId].pct) m[a.caseId] = { pct: a.pct, at: a.at }
    return m
  }, [attempts])

  const list = CASES.filter((c) => {
    if (filter !== 'all' && c.exam !== filter && !(filter === 'arterial' && c.exam === 'venous')) return false
    const t = q.trim().toLowerCase()
    return !t || c.presenting.toLowerCase().includes(t) || c.specialty.toLowerCase().includes(t) || c.tags.some((x) => x.includes(t))
  })

  const random = () => {
    const pool = list.length ? list : CASES
    const pick = pool[Math.floor(Math.random() * pool.length)]
    navigate(`/case/${pick.id}`)
  }

  return (
    <Page wide>
      <PageHeader
        eyebrow="Surgical admissions"
        title="The ward"
        subtitle="Every patient is a real clinical scenario. The diagnosis stays hidden until you’ve worked it out."
        actions={
          <Button variant="secondary" onClick={random} leading={<Shuffle size={16} />}>
            Random patient
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-surface-1 px-3 ring-1 ring-line focus-within:ring-accent/60">
          <Search size={16} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search presenting complaints…" className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <Filter size={16} className="mt-2.5 mr-1 hidden shrink-0 text-faint sm:block" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn('h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium ring-1 transition', filter === f.id ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ward board */}
      <div className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-line shadow-(--shadow-soft)">
        <div className="hidden grid-cols-[72px_1.4fr_1fr_1fr_120px_32px] gap-4 border-b border-line bg-surface-2/60 px-5 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase md:grid">
          <span>Bed</span>
          <span>Presenting complaint</span>
          <span>Patient</span>
          <span>Station</span>
          <span>Best</span>
          <span />
        </div>
        <ul>
          {list.map((c, i) => (
            <motion.li key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.3) }}>
              <BedRow c={c} bed={i + 1} best={best[c.id]} />
            </motion.li>
          ))}
        </ul>
        {!list.length && <div className="px-5 py-12 text-center text-sm text-muted">No patients match that search.</div>}
      </div>
    </Page>
  )
}

function BedRow({ c, bed, best }: { c: CaseMeta; bed: number; best?: { pct: number; at: number } }) {
  return (
    <Link
      to={`/case/${c.id}`}
      className="group grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3.5 transition last:border-0 hover:bg-surface-2/50 md:grid-cols-[72px_1.4fr_1fr_1fr_120px_32px] md:gap-4 md:px-5"
    >
      <div className="flex flex-col items-center justify-center rounded-xl bg-surface-2 py-1.5 ring-1 ring-line">
        <span className="text-[9px] font-semibold tracking-widest text-faint">BED</span>
        <span className="font-mono text-[17px] leading-tight font-semibold text-ink tabular">{String(bed).padStart(2, '0')}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold text-ink">{c.presenting}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted md:hidden">
          <span>
            {c.age}
            {c.sex === 'male' ? 'M' : 'F'}
          </span>
          <span>·</span>
          <span>{EXAM_LABEL[c.exam]}</span>
          <span>·</span>
          <span>{'●'.repeat(c.difficulty)}</span>
        </div>
        <div className="mt-0.5 hidden text-[12.5px] text-muted md:block">{c.specialty}</div>
      </div>
      <div className="hidden text-[13.5px] text-ink md:block">
        {c.patientLabel}
        <span className="ml-1.5 text-muted">
          {c.age}
          {c.sex === 'male' ? 'M' : 'F'}
        </span>
        <div className="text-[12px] text-faint">{c.setting}</div>
      </div>
      <div className="hidden md:block">
        <Badge tone="accent">{EXAM_LABEL[c.exam]}</Badge>
        <div className="mt-1 text-[11.5px] text-faint">
          Difficulty {'●'.repeat(c.difficulty)}
          <span className="opacity-40">{'●'.repeat(3 - c.difficulty)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 md:block">
        {best ? (
          <>
            <span className={cn('font-mono text-[14px] font-semibold tabular', best.pct >= 0.72 ? 'text-success' : best.pct >= 0.55 ? 'text-warning' : 'text-danger')}>{Math.round(best.pct * 100)}%</span>
            <div className="hidden text-[11px] text-faint md:block">{timeAgo(best.at)}</div>
          </>
        ) : (
          <span className="text-[12px] text-faint">New</span>
        )}
      </div>
      <ChevronRight size={18} className="hidden text-faint transition group-hover:translate-x-0.5 group-hover:text-ink md:block" />
    </Link>
  )
}
