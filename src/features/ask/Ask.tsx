import { BookOpen, ChevronRight, Clock, Search, Star, Stethoscope, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Page } from '../../components/layout/AppShell'
import { Rich } from '../../components/Rich'
import { sessionsOn, TOPIC_BY_ID, TOPICS, type TopicId } from '../../content/curriculum'
import { Link, navigate, useLocation } from '../../lib/router'
import { cn } from '../../lib/utils'
import { useStudy } from '../../store/study'
import { search, type Hit } from './search'
import { useSearchIndex } from './useSearchIndex'

const EXAMPLES = [
  'Charcot’s triad',
  'causes of dysphagia',
  'Goodsall’s rule',
  'Forrest classification',
  'signs of a strangulated hernia',
  'indications for bariatric surgery',
  'post-op fever',
  'blood-stained nipple discharge',
  'how to examine the thyroid',
  'shifting dullness',
]

type Scope = 'all' | 'today' | TopicId

export default function Ask() {
  const { query } = useLocation()
  const [q, setQ] = useState(query.get('q') ?? '')
  const [scope, setScope] = useState<Scope>((query.get('t') as Scope) || 'all')
  const idx = useSearchIndex()
  const { day, recent, addRecent, clearRecent } = useStudy()
  const input = useRef<HTMLInputElement>(null)

  const topics = useMemo(() => {
    if (scope === 'all') return undefined
    if (scope === 'today') return new Set(sessionsOn(day).map((s) => s.topic))
    return new Set<TopicId>([scope])
  }, [scope, day])

  const hits = useMemo(() => (idx && q.trim() ? search(idx, q, { limit: 40, topics }) : []), [idx, q, topics])

  // keep the URL in step (so Back returns to these results) and remember the search once it settles
  useEffect(() => {
    const t = window.setTimeout(() => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (scope !== 'all') params.set('t', scope)
      const qs = params.toString()
      navigate(`/ask${qs ? `?${qs}` : ''}`, { replace: true })
      if (hits.length) addRecent(q)
    }, 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, scope])

  useEffect(() => {
    // on a laptop, start typing straight away
    if (window.matchMedia('(min-width: 768px)').matches) input.current?.focus()
  }, [])

  const chips: { value: Scope; label: string }[] = [
    { value: 'all', label: 'Everything' },
    { value: 'today', label: `Day ${day}` },
    ...TOPICS.map((t) => ({ value: t.id as Scope, label: t.short })),
  ]

  return (
    <Page>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 bg-bg px-4 pt-1 pb-3 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10 lg:pt-4">
        <h1 className="mb-3 hidden text-[26px] font-semibold tracking-[-0.025em] text-ink lg:block">Ask</h1>
        <div className="relative">
          <Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addRecent(q)
                input.current?.blur()
              }
              if (e.key === 'Escape') setQ('')
            }}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search questions, topics and cases"
            placeholder="Ask anything — e.g. causes of dysphagia"
            className="h-14 w-full rounded-2xl bg-surface-1 pr-12 pl-12 text-[16px] text-ink shadow-(--shadow-soft) ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-accent"
          />
          {q && (
            <button
              onClick={() => {
                setQ('')
                input.current?.focus()
              }}
              aria-label="Clear"
              className="absolute top-1/2 right-3 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mt-3 -mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          {chips.map((c) => (
            <button
              key={c.value}
              onClick={() => setScope(c.value)}
              className={cn(
                'h-8 shrink-0 rounded-full px-3 text-[12.5px] font-medium ring-1 transition-colors',
                scope === c.value ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {!q.trim() ? (
        <Suggestions recent={recent} onPick={setQ} onClear={clearRecent} />
      ) : !idx ? null : hits.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-[15px] font-medium text-ink">Nothing found for “{q}”.</div>
          <p className="mt-1 text-[13.5px] text-muted">Try fewer words, another spelling, or search everything.</p>
          {scope !== 'all' && (
            <button onClick={() => setScope('all')} className="mt-4 text-[13.5px] font-medium text-accent hover:underline">
              Search everything
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          <div className="text-[12px] text-faint">
            {hits.length === 40 ? 'Top 40' : hits.length} result{hits.length === 1 ? '' : 's'}
          </div>
          {hits.map((h) => (
            <Result key={h.doc.id} hit={h} />
          ))}
        </div>
      )}
    </Page>
  )
}

function Suggestions({ recent, onPick, onClear }: { recent: string[]; onPick: (q: string) => void; onClear: () => void }) {
  return (
    <div className="space-y-6 pt-2">
      {recent.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">
              <Clock size={13} /> Recent
            </div>
            <button onClick={onClear} className="text-[12px] text-faint hover:text-ink">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r) => (
              <button key={r} onClick={() => onPick(r)} className="h-9 rounded-full bg-surface-1 px-3.5 text-[13px] text-ink ring-1 ring-line hover:ring-accent/50">
                {r}
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">Try asking</div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((r) => (
            <button key={r} onClick={() => onPick(r)} className="h-9 rounded-full bg-surface-1 px-3.5 text-[13px] text-muted ring-1 ring-line hover:text-ink hover:ring-accent/50">
              {r}
            </button>
          ))}
        </div>
      </section>
      <p className="text-[13px] leading-relaxed text-muted">
        Searches every ward-round question and answer, every point of the twelve session guides and the cases — offline, as you type. Abbreviations work (UGIB, GORD, Mx, DRE), and so do British or American spellings.
      </p>
    </div>
  )
}

export function Result({ hit }: { hit: Hit }) {
  const { doc, terms } = hit
  const topic = doc.topic ? TOPIC_BY_ID[doc.topic] : null
  const starred = useStudy((s) => s.starred.includes(doc.id))
  const toggleStar = useStudy((s) => s.toggleStar)

  if (doc.kind === 'qa')
    return (
      <article className="rounded-2xl bg-surface-1 p-4 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <h3 className="flex-1 text-[15px] leading-snug font-semibold text-ink">
            <Rich text={doc.title} terms={terms} />
          </h3>
          <button onClick={() => toggleStar(doc.id)} aria-label={starred ? 'Unstar' : 'Star'} aria-pressed={starred} className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint hover:text-warning">
            <Star size={16} className={cn(starred && 'fill-warning text-warning')} />
          </button>
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          <Rich text={doc.body} terms={terms} />
        </p>
        {topic && (
          <Link to={`/topic/${topic.id}?s=qa`} className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
            {topic.title} <ChevronRight size={13} />
          </Link>
        )}
      </article>
    )

  if (doc.kind === 'case')
    return (
      <Link
        to={topic ? `/topic/${topic.id}/case/${doc.caseId}` : `/case/${doc.caseId}`}
        className="flex items-start gap-3 rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-accent/40"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet/12 text-violet">
          <Stethoscope size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-[0.1em] text-violet uppercase">Case</div>
          <div className="mt-0.5 text-[14.5px] leading-snug font-semibold text-ink">
            <Rich text={doc.title} terms={terms} />
          </div>
          <p className="mt-1 line-clamp-3 text-[13.5px] leading-relaxed text-muted">
            <Rich text={doc.body} terms={terms} />
          </p>
        </div>
        <ChevronRight size={16} className="mt-1 shrink-0 text-faint" />
      </Link>
    )

  return (
    <Link
      to={topic ? `/topic/${topic.id}?s=${doc.section}` : '/ask'}
      className="block rounded-2xl bg-surface-1/60 p-4 ring-1 ring-line transition hover:ring-accent/40"
    >
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-faint">
        <BookOpen size={13} />
        {topic?.short}
        <ChevronRight size={12} />
        <span className="truncate">{doc.sectionTitle}</span>
      </div>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
        <Rich text={doc.body} terms={terms} />
      </p>
    </Link>
  )
}
