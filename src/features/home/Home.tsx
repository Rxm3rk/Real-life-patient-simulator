import { ArrowRight, BookOpenText, CalendarCheck, ChevronRight, Play, Search, Sparkles, Stethoscope, Timer, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Page } from '../../components/layout/AppShell'
import { PatientAvatar } from '../../components/PatientAvatar'
import { Rich } from '../../components/Rich'
import { ProgressBar } from '../../components/ui/primitives'
import { CASE_META, CASES } from '../../content/cases'
import { DAYS, sessionsOn, TOPIC_BY_ID, type Session } from '../../content/curriculum'
import { dueCount, topicCardIds } from '../../content/quiz'
import { useClaude } from '../../lib/claude'
import { Link, navigate } from '../../lib/router'
import { deckStats } from '../../lib/srs'
import { useCaseDefs } from '../../lib/useCases'
import { cn, hashString, plural } from '../../lib/utils'
import { useEncounter } from '../../store/encounter'
import { useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'
import { useStudy } from '../../store/study'
import { Result } from '../ask/Ask'
import { ClaudeAnswer } from '../ask/ClaudeAnswer'
import { search } from '../ask/search'
import { useSearchIndex } from '../ask/useSearchIndex'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** Cases on the ward for a topic. */
const topicCases = (id: Session['topic']) => TOPIC_BY_ID[id].cases.filter((c) => CASE_META[c])

/**
 * Today: the session day you're on, its two topics with how far you've got,
 * anything due for review, and a search bar that answers as you type.
 */
export default function Home() {
  const name = useSettings((s) => s.studentName)
  const { day, setDay } = useStudy()
  const active = useEncounter((s) => s.s)
  const activeMeta = active && !active.finishedAt ? CASE_META[active.caseId] : null
  const [q, setQ] = useState('')
  const sessions = sessionsOn(day)
  const claude = useClaude()
  const [askClaude, setAskClaude] = useState(0)

  return (
    <Page wide>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold tracking-[0.16em] text-accent uppercase">
            {greeting()}
            {name ? `, ${name}` : ''}
          </div>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">General surgery · Day {day}</h1>
        </div>
        <DayPicker day={day} setDay={setDay} />
      </header>

      <QuickSearch
        q={q}
        setQ={setQ}
        claude={!!claude}
        onEnter={() => (claude ? setAskClaude((n) => n + 1) : navigate(`/ask?q=${encodeURIComponent(q.trim())}`))}
      />

      {q.trim() ? (
        <InlineResults q={q} askClaude={askClaude} />
      ) : (
        <>
          {activeMeta && (
            <button
              onClick={() => navigate('/sim')}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-left text-accent-fg shadow-(--shadow-soft)"
            >
              <Play size={18} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">
                Continue with {activeMeta.patientLabel} — {activeMeta.presenting}
              </span>
              <ChevronRight size={18} className="shrink-0" />
            </button>
          )}

          <ReviewDue />
          <Welcome />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sessions.map((s, i) => (
              <SessionCard key={s.topic} s={s} n={i + 1} />
            ))}
          </div>

          <Practise />

          <Schedule day={day} setDay={setDay} />
        </>
      )}

      <p className="mt-10 text-center text-[12px] leading-relaxed text-faint">
        Examination sequences follow Macleod’s Clinical Examination (14th ed.), paraphrased with page references; management reflects current UK guidance. Always follow local protocols and senior advice.
      </p>
    </Page>
  )
}

function QuickSearch({ q, setQ, claude, onEnter }: { q: string; setQ: (q: string) => void; claude: boolean; onEnter: () => void }) {
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
            if (e.key === 'Enter' && q.trim()) {
              e.currentTarget.blur()
              onEnter()
            }
          }}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search questions, topics and cases"
          placeholder={claude ? 'The doctor asks… type it, Enter asks Claude' : 'The doctor asks… type it here'}
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

function InlineResults({ q, askClaude }: { q: string; askClaude: number }) {
  const idx = useSearchIndex()
  const hits = useMemo(() => (idx ? search(idx, q, { limit: 12 }) : []), [idx, q])
  if (!idx) return null
  return (
    <div className="space-y-2.5 pt-2">
      <ClaudeAnswer q={q} hits={hits} trigger={askClaude} />
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
          More results and filters <ChevronRight size={15} />
        </Link>
      )}
    </div>
  )
}

function DayPicker({ day, setDay }: { day: number; setDay: (d: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Session day" className="grid w-full shrink-0 grid-cols-6 gap-1 rounded-2xl bg-surface-2/70 p-1 ring-1 ring-line sm:w-80">
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
  )
}

/** First visit: what the app is for, in three steps. Dismissed for good with one tap. */
function Welcome() {
  const onboarded = useSettings((s) => s.onboarded)
  const set = useSettings((s) => s.set)
  if (onboarded) return null
  const steps = [
    { icon: BookOpenText, title: 'Before the session', body: 'Open the session guide, then press Quiz me.' },
    { icon: Search, title: 'On the ward round', body: 'Type what the doctor asks into the search bar.' },
    { icon: Stethoscope, title: 'After the session', body: 'See a patient. The debrief tells you what to work on next.' },
  ]
  return (
    <section className="mt-3 rounded-3xl bg-surface-1 p-4 ring-1 ring-accent/30 sm:p-5" aria-labelledby="welcome-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="welcome-title" className="text-[15px] font-semibold text-ink">
          New here? Bedside in three steps
        </h2>
        <button
          onClick={() => set({ onboarded: true })}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-3 rounded-2xl bg-surface-2/60 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <st.icon size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-ink">
                {i + 1}. {st.title}
              </div>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{st.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <button onClick={() => set({ onboarded: true })} className="mt-3 text-[13px] font-medium text-accent hover:underline">
        Got it
      </button>
    </section>
  )
}

/** Shown only when something is due: the questions you're about to forget. */
function ReviewDue() {
  const cards = useStudy((s) => s.cards)
  const due = dueCount(cards)
  if (!due) return null
  return (
    <Link
      to="/quiz?deck=due"
      className="group mt-3 flex items-center gap-3 rounded-2xl bg-warning/10 px-4 py-3 ring-1 ring-warning/30 transition hover:ring-warning/60"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
        <CalendarCheck size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-ink">{plural(due, 'question')} due for review</div>
        <div className="text-[12.5px] text-muted">About {Math.max(1, Math.round(due * 0.3))} min — catch them before you forget.</div>
      </div>
      <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-ink px-3.5 text-[13px] font-semibold text-bg">
        Review <ArrowRight size={14} />
      </span>
    </Link>
  )
}

function SessionCard({ s, n }: { s: Session; n: number }) {
  const t = TOPIC_BY_ID[s.topic]
  const cases = topicCases(t.id)
  const defs = useCaseDefs(cases)
  const cards = useStudy((st) => st.cards)
  const attempts = useProgress((st) => st.attempts)
  const qs = deckStats(topicCardIds(t.id), cards)
  const seen = cases.filter((id) => attempts.some((a) => a.caseId === id)).length

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
          <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">Patients</div>
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

      <div className="mt-4">
        <div className="flex items-center justify-between text-[12px] text-muted">
          <span>
            <b className="font-semibold text-ink tabular">{qs.known}</b> of {qs.total} questions known
          </span>
          {cases.length > 0 && (
            <span>
              <b className="font-semibold text-ink tabular">{seen}</b> of {cases.length} patients seen
            </span>
          )}
        </div>
        <ProgressBar value={qs.total ? qs.known / qs.total : 0} height={5} className="mt-1.5" tone={qs.known === qs.total ? 'success' : 'accent'} />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link to={`/topic/${t.id}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 text-[13.5px] font-semibold text-bg sm:flex-none">
          Open guide <ArrowRight size={15} />
        </Link>
        <Link
          to={`/quiz?deck=topic:${t.id}`}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-4 text-[13.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50 sm:flex-none"
        >
          <Sparkles size={15} className="text-accent" /> Quiz me{qs.due ? ` · ${qs.due} due` : ''}
        </Link>
      </div>
    </article>
  )
}

function Practise() {
  const attempts = useProgress((s) => s.attempts)
  const day = useStudy((s) => s.day)
  // a patient from today's topics you haven't seen, stable for the day
  const next = useMemo(() => {
    const ids = sessionsOn(day).flatMap((s) => topicCases(s.topic))
    const seen = new Set(attempts.map((a) => a.caseId))
    const pool = ids.filter((id) => !seen.has(id))
    const list = pool.length ? pool : ids.length ? ids : CASES.map((c) => c.id)
    return list[hashString(new Date().toDateString()) % list.length]
  }, [attempts, day])

  const tiles = [
    { to: `/case/${next}`, icon: Stethoscope, title: 'See a patient', body: `${CASE_META[next]?.presenting ?? 'A new patient'} — take the history, examine, decide.` },
    { to: '/osce', icon: Timer, title: 'OSCE circuit', body: 'Timed stations with reading time and a bell.' },
    { to: '/learn', icon: BookOpenText, title: 'Examination routines', body: 'Macleod’s sequences, step by step, then drill them.' },
  ]
  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-ink">Practise</h2>
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

/** The six days at a glance, like the timetable on the noticeboard. Tap a day to switch to it. */
function Schedule({ day, setDay }: { day: number; setDay: (d: number) => void }) {
  const cards = useStudy((s) => s.cards)
  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-ink">Your schedule</h2>
      <div className="mt-3 overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-line">
        <div className="hidden grid-cols-[88px_1fr_1fr] border-b border-line bg-surface-2/50 px-2 py-2 text-[11px] font-semibold tracking-[0.1em] text-faint uppercase sm:grid">
          <span className="px-2">Day</span>
          <span className="px-3">8:30–10:30</span>
          <span className="px-3">11:00–1:00</span>
        </div>
        {DAYS.map((d) => (
          <div key={d} className={cn('grid grid-cols-[64px_1fr] border-b border-line last:border-0 sm:grid-cols-[88px_1fr_1fr]', d === day && 'bg-accent-soft/40')}>
            <button
              onClick={() => {
                setDay(d)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              aria-label={`Show day ${d}`}
              aria-pressed={d === day}
              className="row-span-2 flex flex-col items-center justify-center gap-0.5 border-r border-line py-2 transition hover:bg-surface-2/60 sm:row-span-1"
            >
              <span className="text-[10px] font-semibold tracking-wider text-faint uppercase">Day</span>
              <span className={cn('text-[18px] leading-none font-bold tabular', d === day ? 'text-accent' : 'text-ink')}>{d}</span>
            </button>
            {sessionsOn(d).map((s) => {
              const t = TOPIC_BY_ID[s.topic]
              const st = deckStats(topicCardIds(t.id), cards)
              return (
                <Link key={s.topic} to={`/topic/${t.id}`} className="group flex min-w-0 items-center gap-2 px-3 py-2.5 transition hover:bg-surface-2/60 sm:border-l sm:border-line sm:first-of-type:border-l-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink group-hover:text-accent">{t.title}</div>
                    <div className="text-[11.5px] text-muted tabular">
                      <span className="sm:hidden">{s.slot === 'am' ? '8:30' : '11:00'} · </span>
                      {st.known}/{st.total} questions known
                    </div>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-faint" />
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
