import { ArrowRight, ClipboardCheck, Link2, Play, Shuffle, Timer, Trash2, Trophy, Users, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge, Segmented } from '../../components/ui/primitives'
import { toast } from '../../components/ui/Toast'
import { CASE_META, CASES } from '../../content/cases'
import { STATIONS } from '../../engine/stations'
import type { ExamKind, Specialty } from '../../engine/types'
import { Link, navigate, useLocation } from '../../lib/router'
import { useCaseDefs } from '../../lib/useCases'
import { cn, shuffle, timeAgo } from '../../lib/utils'
import { challengeLink, passed, useOsce } from '../../store/osce'
import { useSettings } from '../../store/settings'
import { EXAM_LABEL } from '../ward/Ward'

type StationType = 'exam' | 'history' | 'mixed'

const SPECIALTIES: ('All' | Specialty)[] = [
  'All',
  'Emergency general surgery',
  'Hernia & abdominal wall',
  'Upper GI',
  'Hepatobiliary',
  'Colorectal',
  'Vascular',
  'Breast',
  'Endocrine',
  'Urology',
  'Skin & soft tissue',
]

export const EXAMINER_KINDS: ExamKind[] = ['abdominal', 'groin', 'lump', 'thyroid', 'breast', 'arterial', 'venous', 'scrotal']

export default function OsceHome() {
  const { query } = useLocation()
  const defs = useCaseDefs()
  const circuit = useOsce((s) => s.circuit)
  const history = useOsce((s) => s.history)
  const create = useOsce((s) => s.create)
  const abandon = useOsce((s) => s.abandon)
  const removeHistory = useOsce((s) => s.removeHistory)
  const defaultSeconds = useSettings((s) => s.osceStationSeconds)

  const [count, setCount] = useState<'3' | '5' | '8'>('5')
  const [minutes, setMinutes] = useState<'6' | '8' | '10' | '12'>(String(Math.min(12, Math.max(6, Math.round(defaultSeconds / 60 / 2) * 2))) as '8')
  const [type, setType] = useState<StationType>('exam')
  const [spec, setSpec] = useState<'All' | Specialty>('All')

  // A friend's challenge link: #/osce?c=id1,id2&t=480
  const challenge = useMemo(() => {
    const ids = (query.get('c') ?? '').split(',').filter((id) => CASE_META[id])
    const t = Number(query.get('t')) || 480
    return ids.length ? { ids, t } : null
  }, [query])

  const pool = useMemo(() => {
    return CASES.filter((m) => {
      if (spec !== 'All' && m.specialty !== spec) return false
      const d = defs[m.id]
      if (!d) return true
      if (type === 'history') return d.components.includes('history')
      if (type === 'exam') return d.components.includes('exam')
      return true
    })
  }, [defs, spec, type])

  const start = (ids: string[], seconds: number, fromChallenge = false) => {
    if (circuit && !circuit.finishedAt) abandon()
    create(ids, seconds, fromChallenge ? 'exam' : type, fromChallenge)
    navigate('/osce/run')
  }

  const startRandom = () => {
    if (!pool.length) {
      toast({ tone: 'warning', title: 'No stations match', body: 'Widen the specialty filter.' })
      return
    }
    // prefer variety of examination systems
    const byKind = new Map<string, string[]>()
    for (const m of shuffle(pool)) byKind.set(m.exam, [...(byKind.get(m.exam) ?? []), m.id])
    const picked: string[] = []
    const n = Math.min(Number(count), pool.length)
    while (picked.length < n) {
      for (const list of byKind.values()) {
        const id = list.shift()
        if (id && picked.length < n) picked.push(id)
      }
      if ([...byKind.values()].every((l) => !l.length)) break
    }
    start(picked, Number(minutes) * 60)
  }

  return (
    <Page wide>
      <PageHeader
        eyebrow="Exam conditions"
        title="OSCE"
        subtitle="Timed circuits of stations under exam conditions, a peer-examiner mark sheet for practising on each other, and challenge links to send to friends."
      />

      {/* Active circuit */}
      {circuit && !circuit.finishedAt && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-3 rounded-3xl bg-accent-soft p-5 ring-1 ring-accent/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-fg">
              <Timer size={20} />
            </span>
            <div>
              <div className="text-[15px] font-semibold text-ink">Circuit in progress</div>
              <div className="text-[13px] text-muted">
                Station {circuit.index + 1} of {circuit.stations.length} · {Math.round(circuit.seconds / 60)} min per station
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={abandon} leading={<X size={15} />}>
              Abandon
            </Button>
            <Button variant="primary" onClick={() => navigate('/osce/run')} trailing={<ArrowRight size={16} />}>
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Challenge from a friend */}
      {challenge && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-3xl bg-violet/10 p-5 ring-1 ring-violet/25">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet/20 text-violet">
              <Trophy size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-ink">You’ve been challenged to a circuit</div>
              <div className="mt-0.5 text-[13px] text-muted">
                {challenge.ids.length} stations · {Math.round(challenge.t / 60)} min each. Same patients, same marking — compare your scores.
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {challenge.ids.map((id, i) => (
                  <Badge key={id}>
                    {i + 1}. {EXAM_LABEL[CASE_META[id].exam]}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="primary" onClick={() => start(challenge.ids, challenge.t, true)} leading={<Play size={16} />}>
              Accept
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Circuit builder */}
        <section className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-soft) sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <Timer size={19} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Mock OSCE circuit</h2>
              <p className="text-[13px] text-muted">Random stations, reading time, a bell, and a score sheet at the end.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Stations">
              <Segmented layoutId="osce-count" value={count} onChange={setCount} options={[{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '8', label: '8' }]} />
            </Field>
            <Field label="Minutes per station">
              <Segmented
                layoutId="osce-min"
                value={minutes}
                onChange={setMinutes}
                options={[
                  { value: '6', label: '6' },
                  { value: '8', label: '8' },
                  { value: '10', label: '10' },
                  { value: '12', label: '12' },
                ]}
              />
            </Field>
            <Field label="Station type">
              <Segmented
                layoutId="osce-type"
                value={type}
                onChange={setType}
                options={[
                  { value: 'exam', label: 'Examination' },
                  { value: 'history', label: 'History' },
                  { value: 'mixed', label: 'Full clerking' },
                ]}
              />
            </Field>
            <Field label="Focus">
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpec(s)}
                    className={cn(
                      'h-8 rounded-full px-3 text-[12.5px] font-medium ring-1 transition',
                      spec === s ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink',
                    )}
                  >
                    {s === 'All' ? 'All specialties' : s}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[13px] text-muted">
              {pool.length} matching {pool.length === 1 ? 'station' : 'stations'} · about {Math.round((Number(count) * (Number(minutes) + 1)) / 5) * 5} minutes in total
            </div>
            <Button variant="primary" size="lg" onClick={startRandom} leading={<Shuffle size={17} />}>
              Start circuit
            </Button>
          </div>
        </section>

        {/* Examiner mode */}
        <section className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-soft) sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet/12 text-violet">
              <Users size={19} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Practise on each other</h2>
              <p className="text-[13px] text-muted">One of you examines a friend; the other holds the Macleod’s mark sheet on their phone.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {EXAMINER_KINDS.map((k) => {
              const title = k === 'abdominal' ? 'Abdominal examination' : STATIONS[k]?.title ?? k
              return (
                <Link
                  key={k}
                  to={`/osce/examiner/${k}`}
                  className="group flex items-center justify-between gap-2 rounded-2xl bg-bg/50 px-3.5 py-3 ring-1 ring-line transition hover:ring-violet/40"
                >
                  <span className="text-[13.5px] leading-snug font-medium text-ink">{title.replace(' examination', '')}</span>
                  <ClipboardCheck size={16} className="shrink-0 text-faint transition group-hover:text-violet" />
                </Link>
              )
            })}
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
            Tip: examine a willing friend or family member only with their consent, keep intimate examinations to the simulator, and swap roles after each station.
          </p>
        </section>
      </div>

      {/* Past circuits */}
      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[17px] font-semibold text-ink">Past circuits</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h) => {
              const done = h.stations.filter((s) => s.pct !== undefined)
              const avg = done.length ? done.reduce((a, s) => a + (s.pct ?? 0), 0) / done.length : 0
              const pass = h.stations.filter((s) => passed(s.grade)).length
              return (
                <div key={h.id} className="group relative rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-accent/40">
                  <Link to={`/osce/results/${h.id}`} className="absolute inset-0 rounded-2xl" aria-label="Open circuit results" />
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-medium text-faint">{timeAgo(h.finishedAt ?? h.createdAt)}</div>
                    <button
                      onClick={() => removeHistory(h.id)}
                      className="relative z-10 grid h-7 w-7 place-items-center rounded-full text-faint opacity-0 transition group-hover:opacity-100 hover:bg-surface-2 hover:text-ink"
                      aria-label="Delete circuit"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold text-ink tabular">{Math.round(avg * 100)}%</span>
                    <span className="text-[13px] text-muted">
                      {pass}/{h.stations.length} passed
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {h.stations.map((s, i) => (
                      <span key={i} className={cn('h-1.5 flex-1 rounded-full', s.pct === undefined ? 'bg-surface-3' : passed(s.grade) ? 'bg-success' : 'bg-danger')} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Share */}
      <section className="mt-8 flex flex-col gap-3 rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-info/12 text-info">
            <Link2 size={18} />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-ink">Challenge a friend</div>
            <div className="text-[13px] text-muted">Send a link to the same random circuit — you’ll both face identical patients.</div>
          </div>
        </div>
        <Button
          onClick={async () => {
            const ids = shuffle(pool)
              .slice(0, Number(count))
              .map((m) => m.id)
            const url = challengeLink(ids, Number(minutes) * 60)
            try {
              if (navigator.share) await navigator.share({ title: 'Bedside OSCE challenge', text: `Can you beat me on these ${ids.length} surgical OSCE stations?`, url })
              else {
                await navigator.clipboard.writeText(url)
                toast({ tone: 'success', title: 'Challenge link copied', body: 'Paste it to a friend — then take the same circuit yourself.' })
              }
            } catch {
              /* dismissed */
            }
          }}
          leading={<Link2 size={16} />}
        >
          Copy challenge link
        </Button>
      </section>
    </Page>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">{label}</div>
      {children}
    </div>
  )
}

