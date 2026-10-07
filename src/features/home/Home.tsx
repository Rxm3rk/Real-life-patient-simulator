import { ArrowRight, BookOpenText, ChevronRight, Lightbulb, Play, Search, Stethoscope, Timer, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Page } from '../../components/layout/AppShell'
import { PatientAvatar } from '../../components/PatientAvatar'
import { Rich } from '../../components/Rich'
import { CASE_META, CASES } from '../../content/cases'
import { DAYS, SCHEDULE, sessionsOn, TOPIC_BY_ID, type Session, type Topic } from '../../content/curriculum'
import { Link, navigate } from '../../lib/router'
import { useCaseDefs } from '../../lib/useCases'
import { cn, hashString } from '../../lib/utils'
import { useEncounter } from '../../store/encounter'
import { useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'
import { useStudy } from '../../store/study'
import { Result } from '../ask/Ask'
import { search } from '../ask/search'
import { useSearchIndex } from '../ask/useSearchIndex'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/**
 * Today: the clinical-session day you're on, its two topics and their cases,
 * and a search bar that answers as you type.
 */
export default function Home() {
  const name = useSettings((s) => s.studentName)
  const { day, setDay } = useStudy()
  const active = useEncounter((s) => s.s)
  const activeMeta = active && !active.finishedAt ? CASE_META[active.caseId] : null
  const [q, setQ] = useState('')
  const sessions = sessionsOn(day)

  return (
    <Page wide>
      <header className="flex flex-col gap-1">
        <div className="text-[12px] font-semibold tracking-[0.16em] text-accent uppercase">
          {greeting()}
          {name ? `, ${name}` : ''}
        </div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">General surgery · Day {day}</h1>
      </header>

      <QuickSearch q={q} setQ={setQ} />

      {q.trim() ? (
        <InlineResults q={q} />
      ) : (
        <>
          {activeMeta && (
            <button
              onClick={() => navigate('/sim')}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-left text-accent-fg shadow-(--shadow-soft)"
            >
              <Play size={18} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">
                Continue with {activeMeta.patientLabel} — {activeMeta.presenting}
              </span>
              <ChevronRight size={18} className="shrink-0" />
            </button>
          )}

          <DayPicker day={day} setDay={setDay} />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sessions.map((s, i) => (
              <SessionCard key={s.topic} s={s} n={i + 1} />
            ))}
          </div>

          <AllTopics day={day} />

          <Practice />
        </>
      )}

      <p className="mt-10 text-center text-[12px] leading-relaxed text-faint">
        Examination sequences follow Macleod’s Clinical Examination (14th ed.), paraphrased with page references; management reflects current UK guidance. Always follow local protocols and senior advice.
      </p>
    </Page>
  )
}

function QuickSearch({ q, setQ }: { q: string; setQ: (q: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 mt-4 bg-bg px-4 py-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
      <div className="relative">
        <Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQ('')
            if (e.key === 'Enter' && q.trim()) navigate(`/ask?q=${encodeURIComponent(q.trim())}`)
          }}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search questions, topics and cases"
          placeholder="The doctor asks… type it here"
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
    </div>
  )
}

function InlineResults({ q }: { q: string }) {
  const idx = useSearchIndex()
  const hits = useMemo(() => (idx ? search(idx, q, { limit: 12 }) : []), [idx, q])
  if (!idx) return null
  return (
    <div className="space-y-2.5 pt-2">
      {hits.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-[15px] font-medium text-ink">Nothing found for “{q}”.</div>
          <p className="mt-1 text-[13.5px] text-muted">Try fewer words or another spelling.</p>
        </div>
      ) : (
        hits.map((h) => <Result key={h.doc.id} hit={h} />)
      )}
      {hits.length > 0 && (
        <Link to={`/ask?q=${encodeURIComponent(q.trim())}`} className="flex h-11 items-center justify-center gap-1 rounded-xl text-[13.5px] font-medium text-accent hover:bg-accent-soft/40">
          More results and filters in Ask <ChevronRight size={15} />
        </Link>
      )}
    </div>
  )
}

function DayPicker({ day, setDay }: { day: number; setDay: (d: number) => void }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <span className="hidden text-[12.5px] font-medium text-muted sm:inline">Session day</span>
      <div role="radiogroup" aria-label="Session day" className="grid w-full grid-cols-6 gap-1 rounded-2xl bg-surface-2/70 p-1 ring-1 ring-line sm:w-96">
        {DAYS.map((d) => (
          <button
            key={d}
            role="radio"
            aria-checked={d === day}
            onClick={() => setDay(d)}
            className={cn(
              'h-10 rounded-xl text-[14px] font-semibold tabular-nums transition-colors',
              d === day ? 'bg-surface-1 text-ink shadow-(--shadow-soft) ring-1 ring-line' : 'text-muted hover:text-ink',
            )}
          >
            <span className="sr-only">Day </span>
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

function SessionCard({ s, n }: { s: Session; n: number }) {
  const t = TOPIC_BY_ID[s.topic]
  const cases = t.cases.filter((c) => CASE_META[c])
  const defs = useCaseDefs(cases)
  return (
    <article className="flex flex-col rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:p-6">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.12em] text-faint uppercase">
        <span className="grid h-5 min-w-5 place-items-center rounded-md bg-accent px-1 text-[11px] text-accent-fg">{n}</span>
        Session {n} · {s.time}
      </div>
      <Link to={`/topic/${t.id}`} className="group mt-2 block">
        <h2 className="text-[21px] leading-snug font-semibold tracking-[-0.02em] text-ink group-hover:text-accent">{t.title}</h2>
      </Link>
      <ul className="mt-3 space-y-1.5">
        {t.keyPoints.slice(0, 3).map((p, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-muted">
            <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
            <span>
              <Rich text={p} />
            </span>
          </li>
        ))}
      </ul>

      {cases.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">Cases</div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            {cases.map((id) => (
              <Link
                key={id}
                to={`/topic/${t.id}/case/${id}`}
                className="flex w-[13.5rem] shrink-0 items-center gap-2.5 rounded-2xl bg-surface-2/50 p-2 ring-1 ring-line transition hover:ring-accent/40"
              >
                <PatientAvatar a={defs[id]?.patient.appearance} caseId={id} id={`s-${id}`} className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">{defs[id]?.title ?? CASE_META[id].presenting}</div>
                  <div className="truncate text-[11.5px] text-muted">
                    {CASE_META[id].patientLabel}, {CASE_META[id].age}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link to={`/topic/${t.id}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 text-[13.5px] font-semibold text-bg sm:flex-none">
          Open guide <ArrowRight size={15} />
        </Link>
        <Link to={`/topic/${t.id}?s=qa`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-4 text-[13.5px] font-medium text-ink ring-1 ring-line sm:flex-none">
          <Lightbulb size={15} /> {t.qa.length} questions
        </Link>
      </div>
    </article>
  )
}

function AllTopics({ day }: { day: number }) {
  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-ink">All twelve sessions</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SCHEDULE.map((s) => {
          const t: Topic = TOPIC_BY_ID[s.topic]
          return (
            <Link
              key={s.topic}
              to={`/topic/${t.id}`}
              className={cn(
                'flex items-center gap-3 rounded-2xl p-3 ring-1 transition hover:ring-accent/40',
                s.day === day ? 'bg-accent-soft/40 ring-accent/30' : 'bg-surface-1 ring-line',
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-center ring-1 ring-line">
                <span className="text-[10px] leading-none font-semibold text-faint uppercase">Day</span>
                <span className="-mt-1 text-[15px] leading-none font-bold text-ink">{s.day}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{t.title}</div>
                <div className="truncate text-[12px] text-muted">
                  {s.slot === 'am' ? 'Session 1' : 'Session 2'} · {t.cases.filter((c) => CASE_META[c]).length} cases · {t.qa.length} Qs
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-faint" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function Practice() {
  const attempts = useProgress((s) => s.attempts)
  const day = useStudy((s) => s.day)
  // a patient from today's topics, stable for the day
  const next = useMemo(() => {
    const ids = sessionsOn(day).flatMap((s) => TOPIC_BY_ID[s.topic].cases.filter((c) => CASE_META[c]))
    const seen = new Set(attempts.map((a) => a.caseId))
    const pool = ids.filter((id) => !seen.has(id))
    const list = pool.length ? pool : ids.length ? ids : CASES.map((c) => c.id)
    return list[hashString(new Date().toDateString()) % list.length]
  }, [attempts, day])
  const n = attempts.length
  const avg = n ? Math.round((attempts.reduce((a, x) => a + x.pct, 0) / n) * 100) : null

  const tiles = [
    { to: `/case/${next}`, icon: Stethoscope, title: 'See a patient', body: `${CASE_META[next]?.presenting ?? 'A new patient'} — history, examination, plan.` },
    { to: '/osce', icon: Timer, title: 'OSCE circuit', body: 'Timed stations with an examiner’s mark sheet.' },
    { to: '/learn', icon: BookOpenText, title: 'Examination routines', body: 'Macleod’s sequences, step by step.' },
  ]
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between">
        <h2 className="text-[18px] font-semibold text-ink">Practise</h2>
        <Link to="/progress" className="text-[13px] font-medium text-accent hover:underline">
          {n ? `${n} station${n === 1 ? '' : 's'} · avg ${avg}%` : 'Progress'}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.title} to={t.to} className="flex items-start gap-3 rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-accent/40">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <t.icon size={17} />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink">{t.title}</div>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{t.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
