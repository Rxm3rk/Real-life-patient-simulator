import { ArrowLeft, BookOpen, ChevronRight, Eye, EyeOff, Lightbulb, Search, Star, Stethoscope } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Page } from '../../components/layout/AppShell'
import { PatientAvatar } from '../../components/PatientAvatar'
import { Rich } from '../../components/Rich'
import { CASE_META } from '../../content/cases'
import { sessionOf, TOPIC_BY_ID, type Bullet, type Section, type TopicId } from '../../content/curriculum'
import { Link, navigate, useLocation } from '../../lib/router'
import { useCaseDefs } from '../../lib/useCases'
import { cn } from '../../lib/utils'
import { useStudy } from '../../store/study'

const CaseCard = lazy(() => import('./CaseCard'))

export default function TopicPage({ id, caseId }: { id: string; caseId?: string }) {
  const topic = TOPIC_BY_ID[id as TopicId]
  const { query } = useLocation()
  const session = topic ? sessionOf(topic.id) : null
  const cases = useMemo(() => (topic ? topic.cases.filter((c) => CASE_META[c]) : []), [topic])

  // jump to a section (?s=…) from search results
  const target = query.get('s')
  useEffect(() => {
    if (!target) return
    const t = window.setTimeout(() => document.getElementById(`sec-${target}`)?.scrollIntoView({ block: 'start' }), 60)
    return () => window.clearTimeout(t)
  }, [target, id])

  const nav = useMemo(
    () =>
      topic
        ? [
            { id: 'key', label: 'Key points' },
            ...topic.sections.map((s) => ({ id: s.id, label: s.title })),
            ...(cases.length ? [{ id: 'cases', label: 'Cases' }] : []),
            { id: 'qa', label: `Questions (${topic.qa.length})` },
          ]
        : [],
    [topic, cases],
  )

  if (!topic || !session) return <Page>Topic not found.</Page>

  return (
    <Page>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> Today
      </Link>
      <header>
        <div className="text-[11.5px] font-semibold tracking-[0.14em] text-accent uppercase">
          Day {session.day} · {session.time}
        </div>
        <h1 className="mt-1.5 text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[34px]">{topic.title}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{topic.blurb}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/ask?t=${topic.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-1 px-4 text-[13.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50">
            <Search size={15} /> Search this topic
          </Link>
          <a href={`#/topic/${topic.id}?s=qa`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-1 px-4 text-[13.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50">
            <Lightbulb size={15} /> {topic.qa.length} questions
          </a>
          {cases.length > 0 && (
            <a href={`#/topic/${topic.id}?s=cases`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-1 px-4 text-[13.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50">
              <Stethoscope size={15} /> {cases.length} cases
            </a>
          )}
        </div>
      </header>

      <JumpBar items={nav} />

      <section id="sec-key" className="mt-5 scroll-mt-32 rounded-2xl bg-accent-soft/40 p-5 ring-1 ring-accent/25">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.1em] text-accent uppercase">
          <Lightbulb size={15} /> Key points
        </h2>
        <ol className="mt-3 space-y-2">
          {topic.keyPoints.map((p, i) => (
            <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-ink">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">{i + 1}</span>
              <span>
                <Rich text={p} />
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 space-y-4">
        {topic.sections.map((s) => (
          <SectionCard key={s.id} s={s} />
        ))}
      </div>

      {cases.length > 0 && <CasesBlock topicId={topic.id} ids={cases} />}

      <Questions topicId={topic.id} />

      {caseId && (
        <Suspense fallback={null}>
          <CaseCard id={caseId} onClose={() => navigate(`/topic/${topic.id}`, { replace: true })} />
        </Suspense>
      )}
    </Page>
  )
}

/** Sticky section chips; the one you're reading lights up and stays in view. */
function JumpBar({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const els = items.map((n) => document.getElementById(`sec-${n.id}`)).filter((e): e is HTMLElement => !!e)
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id.slice(4), e.isIntersecting)
        const first = items.find((n) => seen.get(n.id))
        if (first) setActive(first.id)
      },
      // a band just under the sticky bars
      { rootMargin: '-120px 0px -55% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [items])

  useEffect(() => {
    const chip = bar.current?.querySelector<HTMLElement>(`[data-id="${active}"]`)
    const box = bar.current
    if (chip && box) box.scrollTo({ left: chip.offsetLeft - box.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
  }, [active])

  return (
    <nav className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 mt-5 border-b border-line bg-bg px-4 py-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10" aria-label="Sections">
      <div ref={bar} className="relative flex gap-1.5 overflow-x-auto no-scrollbar">
        {items.map((n) => (
          <button
            key={n.id}
            data-id={n.id}
            onClick={() => document.getElementById(`sec-${n.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-current={active === n.id ? 'location' : undefined}
            className={cn(
              'h-8 max-w-[15rem] shrink-0 truncate rounded-full px-3 text-[12.5px] font-medium ring-1 transition-colors',
              active === n.id ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink',
            )}
          >
            {n.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

function SectionCard({ s }: { s: Section }) {
  return (
    <section id={`sec-${s.id}`} className="scroll-mt-32 rounded-2xl bg-surface-1 p-5 ring-1 ring-line">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{s.title}</h2>
      {s.intro && <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.intro}</p>}
      {s.items && <Points items={s.items} steps={s.kind === 'steps'} />}
      {s.table && <Table head={s.table.head} rows={s.table.rows} />}
      {s.note && <p className="mt-3 rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-muted ring-1 ring-line">{s.note}</p>}
      {s.source && (
        <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-faint">
          <BookOpen size={12} /> {s.source}
        </div>
      )}
    </section>
  )
}

function Points({ items, steps }: { items: Bullet[]; steps?: boolean }) {
  const List = steps ? 'ol' : 'ul'
  return (
    <List className="mt-3 space-y-2">
      {items.map((b, i) => {
        const text = typeof b === 'string' ? b : b.t
        return (
          <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-muted">
            {steps ? (
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 font-mono text-[11px] font-semibold text-ink ring-1 ring-line">{i + 1}</span>
            ) : (
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
            )}
            <div className="min-w-0 flex-1">
              <Rich text={text} />
              {typeof b !== 'string' && (
                <ul className="mt-1.5 space-y-1.5 border-l-2 border-line pl-3">
                  {b.sub.map((x, j) => (
                    <li key={j}>
                      <Rich text={x} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </List>
  )
}

/** A table on wide screens; one card per row on phones (no sideways scrolling). */
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <>
      <div className="mt-3 hidden overflow-hidden rounded-xl ring-1 ring-line md:block">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-surface-2/70 text-[12px] font-semibold text-faint">
            <tr>
              {head.map((h, i) => (
                <th key={i} className="px-3.5 py-2.5 align-bottom">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i} className="align-top">
                {r.map((c, j) => (
                  <td key={j} className={cn('px-3.5 py-2.5 leading-relaxed', j === 0 ? 'font-semibold text-ink' : 'text-muted')}>
                    <Rich text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-2 md:hidden">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl bg-surface-2/50 p-3 ring-1 ring-line">
            <div className="text-[14px] font-semibold text-ink">
              <Rich text={r[0]} />
            </div>
            {r.slice(1).map((c, j) => (
              <div key={j} className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                {head[j + 1] && <span className="mr-1 text-[11.5px] font-semibold tracking-wide text-faint uppercase">{head[j + 1]}:</span>}
                <Rich text={c} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function CasesBlock({ topicId, ids }: { topicId: TopicId; ids: string[] }) {
  const defs = useCaseDefs(ids)
  return (
    <section id="sec-cases" className="mt-8 scroll-mt-32">
      <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Cases</h2>
      <p className="mt-1 text-[13.5px] text-muted">Open a case card for the one-page summary, or see the patient and examine them yourself.</p>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ids.map((id) => {
          const m = CASE_META[id]
          const d = defs[id]
          return (
            <div key={id} className="flex items-center gap-3 rounded-2xl bg-surface-1 p-3 ring-1 ring-line">
              <PatientAvatar a={d?.patient.appearance} caseId={id} id={`tc-${id}`} className="h-14 w-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{d?.title ?? m.presenting}</div>
                <div className="truncate text-[12.5px] text-muted">
                  {m.patientLabel}, {m.age}
                  {m.sex === 'male' ? 'M' : 'F'} · {m.presenting}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Link to={`/topic/${topicId}/case/${id}`} className="inline-flex h-8 items-center rounded-lg bg-surface-2 px-3 text-[12.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50">
                    Case card
                  </Link>
                  <Link to={`/case/${id}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-accent-fg">
                    See patient <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Questions({ topicId }: { topicId: TopicId }) {
  const topic = TOPIC_BY_ID[topicId]
  const { hideAnswers, setHideAnswers, starred, toggleStar } = useStudy()
  const [shown, setShown] = useState<Set<number>>(new Set())
  const [onlyStarred, setOnlyStarred] = useState(false)
  const list = topic.qa.map((qa, i) => ({ qa, i, id: `${topicId}:qa:${i}` })).filter((x) => !onlyStarred || starred.includes(x.id))
  return (
    <section id="sec-qa" className="mt-8 scroll-mt-32 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Questions the doctors ask</h2>
          <p className="mt-1 text-[13.5px] text-muted">Hide the answers to test yourself; star the ones to revise.</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setOnlyStarred((v) => !v)}
            aria-pressed={onlyStarred}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium ring-1', onlyStarred ? 'bg-warning/15 text-ink ring-warning/40' : 'bg-surface-1 text-muted ring-line hover:text-ink')}
          >
            <Star size={14} className={cn(onlyStarred && 'fill-warning text-warning')} /> Starred
          </button>
          <button
            onClick={() => {
              setHideAnswers(!hideAnswers)
              setShown(new Set())
            }}
            aria-pressed={hideAnswers}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium ring-1', hideAnswers ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink')}
          >
            {hideAnswers ? <EyeOff size={14} /> : <Eye size={14} />} {hideAnswers ? 'Answers hidden' : 'Hide answers'}
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {list.length === 0 && <p className="py-6 text-center text-[13.5px] text-muted">No starred questions yet.</p>}
        {list.map(({ qa, i, id }) => {
          const reveal = !hideAnswers || shown.has(i)
          const isStar = starred.includes(id)
          return (
            <article key={i} className="rounded-2xl bg-surface-1 p-4 ring-1 ring-line">
              <div className="flex items-start gap-3">
                <h3 className="flex-1 text-[14.5px] leading-snug font-semibold text-ink">{qa.q}</h3>
                <button onClick={() => toggleStar(id)} aria-label={isStar ? 'Unstar' : 'Star'} aria-pressed={isStar} className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint hover:text-warning">
                  <Star size={16} className={cn(isStar && 'fill-warning text-warning')} />
                </button>
              </div>
              {reveal ? (
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                  <Rich text={qa.a} />
                </p>
              ) : (
                <button onClick={() => setShown((s) => new Set(s).add(i))} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-2 px-3 text-[12.5px] font-medium text-ink ring-1 ring-line">
                  <Eye size={13} /> Show answer
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
