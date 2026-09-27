import { ArrowRight, BookOpenText, ChevronRight, Hand, MessagesSquare, Play, Stethoscope, Timer, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Page } from '../../components/layout/AppShell'
import { PatientAvatar } from '../../components/PatientAvatar'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/primitives'
import { CASE_META, CASES } from '../../content/cases'
import { Link, navigate } from '../../lib/router'
import { useCaseDefs } from '../../lib/useCases'
import { cn, formatDuration, hashString, timeAgo } from '../../lib/utils'
import { useEncounter } from '../../store/encounter'
import { useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function streak(days: number[]): number {
  const set = new Set(days.map((t) => new Date(t).toDateString()))
  let n = 0
  const d = new Date()
  if (!set.has(d.toDateString())) d.setDate(d.getDate() - 1)
  while (set.has(d.toDateString())) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export default function Home() {
  const name = useSettings((s) => s.studentName)
  const attempts = useProgress((s) => s.attempts)
  const active = useEncounter((s) => s.s)
  const defs = useCaseDefs()

  const stats = useMemo(() => {
    const n = attempts.length
    const avg = n ? attempts.reduce((a, x) => a + x.pct, 0) / n : 0
    const best = n ? Math.max(...attempts.map((a) => a.pct)) : 0
    const time = attempts.reduce((a, x) => a + x.durationSec, 0)
    return { n, avg, best, time, streak: streak(attempts.map((a) => a.at)) }
  }, [attempts])

  const weak = useMemo(() => {
    const counts = new Map<string, { label: string; n: number }>()
    for (const a of attempts.slice(0, 12))
      for (const m of a.missedSteps) {
        const c = counts.get(m.id) ?? { label: m.label, n: 0 }
        c.n++
        counts.set(m.id, c)
      }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 4)
  }, [attempts])

  // today's ward: a stable daily selection
  const today = useMemo(() => {
    const seed = hashString(new Date().toDateString())
    const seen = new Set(attempts.map((a) => a.caseId))
    const fresh = CASES.filter((c) => !seen.has(c.id))
    const pool = (fresh.length >= 4 ? fresh : CASES).slice()
    pool.sort((a, b) => (hashString(a.id + seed) % 997) - (hashString(b.id + seed) % 997))
    return pool.slice(0, 4)
  }, [attempts])

  const nextCase = today[0]
  const activeMeta = active && !active.finishedAt ? CASE_META[active.caseId] : null

  return (
    <Page wide>
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-surface-1 p-6 ring-1 ring-line shadow-(--shadow-lift) sm:p-9">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-info/10 blur-3xl" />
        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="text-[12px] font-semibold tracking-[0.16em] text-accent uppercase">
              {greeting()}
              {name ? `, ${name}` : ', doctor'}
            </div>
            <h1 className="mt-3 text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] text-ink sm:text-[40px]">
              Your patients are waiting on the surgical ward.
            </h1>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted">
              Take the history in your own words, examine with your own hands — palpate, percuss and listen — then investigate, diagnose and get marked like an OSCE, step by step against Macleod’s.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {activeMeta ? (
                <Button variant="primary" size="lg" onClick={() => navigate('/sim')} leading={<Play size={18} />}>
                  Continue with {activeMeta.patientLabel.split(' ')[0]}
                </Button>
              ) : (
                <Button variant="primary" size="lg" onClick={() => navigate(`/case/${nextCase.id}`)} leading={<Stethoscope size={18} />}>
                  See your next patient
                </Button>
              )}
              <Button size="lg" onClick={() => navigate('/osce')} leading={<Timer size={18} />}>
                OSCE circuit
              </Button>
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-3 lg:grid">
            {today.slice(0, 4).map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06 }}
                onClick={() => navigate(`/case/${c.id}`)}
                className="group flex items-center gap-3 rounded-2xl bg-bg/60 p-3 text-left ring-1 ring-line transition hover:ring-accent/40"
              >
                <PatientAvatar a={defs[c.id]?.patient.appearance} caseId={c.id} id={`hero-${c.id}`} className="h-14 w-14 shrink-0" pain={(defs[c.id]?.vitals.pain ?? 2) / 12} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{c.patientLabel}</div>
                  <div className="truncate text-[12px] text-muted">{c.presenting}</div>
                  <div className="mt-1 text-[10.5px] font-semibold tracking-wide text-faint uppercase">Bed {String(CASES.indexOf(c) + 1).padStart(2, '0')}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Stations completed" value={String(stats.n)} />
        <Stat label="Average score" value={stats.n ? `${Math.round(stats.avg * 100)}%` : '—'} />
        <Stat label="Best score" value={stats.n ? `${Math.round(stats.best * 100)}%` : '—'} />
        <Stat label="Day streak" value={String(stats.streak)} sub={stats.time ? `${formatDuration(stats.time)} practised` : 'Start today'} />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Ward preview (mobile shows here) */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[18px] font-semibold text-ink">On the ward today</h2>
            <Link to="/ward" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              All {CASES.length}
              <span className="hidden sm:inline"> patients</span> <ChevronRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {today.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/case/${c.id}`)}
                className="group flex items-center gap-3.5 rounded-2xl bg-surface-1 p-3.5 text-left ring-1 ring-line transition hover:ring-accent/40"
              >
                <PatientAvatar a={defs[c.id]?.patient.appearance} caseId={c.id} id={`ward-${c.id}`} className="h-16 w-16 shrink-0" pain={(defs[c.id]?.vitals.pain ?? 2) / 12} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold text-ink">{c.presenting}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {c.patientLabel}, {c.age}
                    {c.sex === 'male' ? 'M' : 'F'} · {c.setting}
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge tone="accent">{c.specialty}</Badge>
                  </div>
                </div>
                <ArrowRight size={17} className="shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </button>
            ))}
          </div>
        </section>

        {/* Right column */}
        <section className="space-y-6">
          {attempts.length === 0 ? (
            <div className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
              <h2 className="text-[16px] font-semibold text-ink">How Bedside works</h2>
              <ol className="mt-4 space-y-4">
                {[
                  { icon: MessagesSquare, t: 'Take the history', d: 'Type or speak your questions naturally. The patient answers — and remembers what you asked.' },
                  { icon: Hand, t: 'Examine with your hands', d: 'Wash, consent, expose, then inspect, palpate, percuss and auscultate. Watch the patient’s face as you press.' },
                  { icon: Trophy, t: 'Get marked like an OSCE', d: 'Every step, its order and your reasoning are scored, with the model examination to learn from.' },
                ].map((s, i) => (
                  <li key={s.t} className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                      <s.icon size={17} />
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-ink">
                        {i + 1}. {s.t}
                      </div>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Button className="mt-5" variant="soft" onClick={() => navigate(`/case/appendicitis`)} trailing={<ArrowRight size={15} />}>
                Start with the first patient
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-ink">Recent stations</h2>
                <Link to="/progress" className="text-[13px] font-medium text-accent hover:underline">
                  Progress
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-line">
                {attempts.slice(0, 5).map((a) => (
                  <li key={a.attemptId}>
                    <Link to={`/debrief/${a.attemptId}`} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-medium text-ink">{CASE_META[a.caseId]?.presenting ?? a.caseId}</div>
                        <div className="text-[12px] text-faint">
                          {timeAgo(a.at)} · {a.mode}
                        </div>
                      </div>
                      <span className={cn('font-mono text-[14px] font-semibold tabular', a.pct >= 0.72 ? 'text-success' : a.pct >= 0.55 ? 'text-warning' : 'text-danger')}>{Math.round(a.pct * 100)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {weak.length > 0 && (
            <div className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
              <h2 className="text-[16px] font-semibold text-ink">Steps you keep missing</h2>
              <p className="mt-1 text-[13px] text-muted">From your recent stations — drill these next.</p>
              <ul className="mt-3 space-y-2">
                {weak.map(([id, w]) => (
                  <li key={id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                    <span className="text-[13px] text-ink">{w.label}</span>
                    <span className="shrink-0 font-mono text-[12px] text-faint">×{w.n}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-4" size="sm" variant="soft" onClick={() => navigate('/learn')} leading={<BookOpenText size={15} />}>
                Revise the routines
              </Button>
            </div>
          )}
        </section>
      </div>

      <p className="mt-10 text-center text-[12px] leading-relaxed text-faint">
        Educational simulator for medical students. Examination sequences follow Macleod’s Clinical Examination (14th ed.); management reflects current UK guidance (NICE, WSES, Tokyo). Always follow local protocols and senior advice.
      </p>
    </Page>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface-1 px-4 py-3.5 ring-1 ring-line">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-1 text-[26px] leading-none font-semibold tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-faint">{sub}</div>}
    </div>
  )
}
