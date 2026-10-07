import { ChevronRight, Search, Shuffle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/primitives'
import { CASE_META, CASES } from '../../content/cases'
import { sessionOf, sessionsOn, TOPICS, type TopicId } from '../../content/curriculum'
import type { CaseMeta, ExamKind } from '../../engine/types'
import { Link, navigate } from '../../lib/router'
import { cn, timeAgo } from '../../lib/utils'
import { useProgress } from '../../store/progress'
import { useStudy } from '../../store/study'

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

type Filter = 'all' | 'today' | TopicId | 'other'

interface Group {
  key: TopicId | 'other'
  title: string
  sub: string
  ids: string[]
}

const IN_SCHEDULE = new Set(TOPICS.flatMap((t) => t.cases))

const GROUPS: Group[] = [
  ...TOPICS.map((t) => {
    const s = sessionOf(t.id)
    return { key: t.id, title: t.title, sub: `Day ${s.day} · Session ${s.slot === 'am' ? 1 : 2}`, ids: t.cases.filter((id) => CASE_META[id]) }
  }),
  { key: 'other', title: 'Beyond your schedule', sub: 'Vascular, scrotal and lump stations — kept for OSCE practice', ids: CASES.filter((c) => !IN_SCHEDULE.has(c.id)).map((c) => c.id) },
]

const BED = Object.fromEntries(CASES.map((c, i) => [c.id, i + 1]))

export default function Ward() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const attempts = useProgress((s) => s.attempts)
  const day = useStudy((s) => s.day)

  const best = useMemo(() => {
    const m: Record<string, { pct: number; at: number }> = {}
    for (const a of attempts) if (!m[a.caseId] || a.pct > m[a.caseId].pct) m[a.caseId] = { pct: a.pct, at: a.at }
    return m
  }, [attempts])

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase()
    const today = new Set<string>(sessionsOn(day).map((s) => s.topic))
    const match = (c: CaseMeta) =>
      !t || c.presenting.toLowerCase().includes(t) || c.specialty.toLowerCase().includes(t) || c.patientLabel.toLowerCase().includes(t) || c.tags.some((x) => x.includes(t))
    return GROUPS.filter((g) => filter === 'all' || g.key === filter || (filter === 'today' && today.has(g.key)))
      .map((g) => ({ ...g, ids: g.ids.filter((id) => match(CASE_META[id])) }))
      .filter((g) => g.ids.length)
  }, [q, filter, day])

  const random = () => {
    const pool = groups.flatMap((g) => g.ids)
    const ids = pool.length ? pool : CASES.map((c) => c.id)
    navigate(`/case/${ids[Math.floor(Math.random() * ids.length)]}`)
  }

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All patients' },
    { id: 'today', label: `Day ${day}` },
    ...TOPICS.map((t) => ({ id: t.id as Filter, label: t.short })),
    { id: 'other', label: 'Beyond schedule' },
  ]

  return (
    <Page wide>
      <PageHeader
        eyebrow="Surgical admissions"
        title="The ward"
        subtitle="Patients grouped by your clinical sessions. The diagnosis stays hidden until you’ve worked it out."
        actions={
          <Button variant="secondary" onClick={random} leading={<Shuffle size={16} />}>
            Random patient
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex h-11 items-center gap-2 rounded-xl bg-surface-1 px-3 ring-1 ring-line focus-within:ring-accent/60">
          <Search size={16} className="text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Search presenting complaints…"
            className="flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint sm:text-[15px]"
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
          {chips.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn('h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium ring-1 transition-colors', filter === f.id ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="mb-2 flex items-end justify-between gap-3 px-1">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">{g.sub}</div>
                <h2 className="truncate text-[17px] font-semibold text-ink">{g.title}</h2>
              </div>
              {g.key !== 'other' && (
                <Link to={`/topic/${g.key}`} className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-accent hover:underline">
                  Guide <ChevronRight size={14} />
                </Link>
              )}
            </div>
            <div className="overflow-hidden rounded-3xl bg-surface-1 shadow-(--shadow-soft) ring-1 ring-line">
              <ul>
                {g.ids.map((id) => (
                  <li key={id}>
                    <BedRow c={CASE_META[id]} bed={BED[id]} best={best[id]} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
        {!groups.length && <div className="rounded-3xl bg-surface-1 px-5 py-12 text-center text-sm text-muted ring-1 ring-line">No patients match that search.</div>}
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
