import { ArrowLeft, Check, ChevronDown, ClipboardCheck, Pause, Play, RotateCcw, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { uiTick } from '../../audio/engine'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge, ProgressBar, Segmented } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { protocolFor } from '../../engine/protocols'
import { STATIONS } from '../../engine/stations'
import type { ExamKind } from '../../engine/types'
import { Link, navigate } from '../../lib/router'
import { cn, formatClock, vibrate } from '../../lib/utils'
import { useSettings } from '../../store/settings'
import { EXAMINER_KINDS } from './OsceHome'

type Mark = 0 | 0.5 | 1
type Global = 'fail' | 'borderline' | 'pass' | 'good' | 'excellent'

const GLOBAL_LABEL: Record<Global, string> = { fail: 'Clear fail', borderline: 'Borderline', pass: 'Pass', good: 'Good', excellent: 'Excellent' }

const titleOf = (k: ExamKind) => (k === 'abdominal' ? 'Abdominal examination' : STATIONS[k]?.title ?? k)
const taskOf = (k: ExamKind) => (k === 'abdominal' ? 'Examine this patient’s abdomen' : STATIONS[k]?.task ?? '')

export default function Examiner({ kind }: { kind?: string }) {
  if (!kind || !EXAMINER_KINDS.includes(kind as ExamKind)) return <Picker />
  return <Sheet_ kind={kind as ExamKind} key={kind} />
}

function Picker() {
  return (
    <Page>
      <button onClick={() => navigate('/osce')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> OSCE
      </button>
      <PageHeader eyebrow="Peer practice" title="Examiner mode" subtitle="Choose the station your friend will perform. You’ll get the mark sheet, a timer and instant feedback." />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {EXAMINER_KINDS.map((k) => (
          <Link key={k} to={`/osce/examiner/${k}`} className="flex items-center justify-between rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-violet/40">
            <div>
              <div className="text-[15px] font-semibold text-ink">{titleOf(k)}</div>
              <div className="text-[13px] text-muted">{protocolFor(k).steps.length} marking points</div>
            </div>
            <ClipboardCheck size={18} className="text-faint" />
          </Link>
        ))}
      </div>
    </Page>
  )
}

function Sheet_({ kind }: { kind: ExamKind }) {
  const proto = protocolFor(kind)
  const defaultSeconds = useSettings((s) => s.osceStationSeconds)
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [deductions, setDeductions] = useState<Set<string>>(new Set())
  const [global, setGlobal] = useState<Global | null>(null)
  const [open, setOpen] = useState<string | null>(proto.steps[0]?.section ?? null)
  const [seconds, setSeconds] = useState(defaultSeconds)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const warned = useRef(false)

  // station timer
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setSeconds((s) => {
        const n = Math.max(0, s - 1)
        if (n === 60 && !warned.current) {
          warned.current = true
          uiTick('warn')
          vibrate([80, 60, 80])
        }
        if (n === 0) {
          uiTick('warn')
          vibrate([200, 100, 200, 100, 400])
          setRunning(false)
        }
        return n
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const sections = useMemo(() => [...new Set(proto.steps.map((s) => s.section))], [proto])
  const max = proto.steps.reduce((a, s) => a + s.marks, 0)
  const earnedRaw = proto.steps.reduce((a, s) => a + (marks[s.id] ?? 0) * s.marks, 0)
  const penalty = proto.rules.filter((r) => deductions.has(r.id)).reduce((a, r) => a + r.penalty * 0.5, 0)
  const earned = Math.max(0, earnedRaw - penalty)
  const pct = max ? earned / max : 0
  const cycle = (id: string) => setMarks((m) => ({ ...m, [id]: (m[id] ?? 0) === 0 ? 1 : m[id] === 1 ? 0.5 : 0 }))
  const reset = () => {
    setMarks({})
    setDeductions(new Set())
    setGlobal(null)
    setSeconds(defaultSeconds)
    setRunning(false)
    setDone(false)
    warned.current = false
  }
  const grade = pct >= 0.85 ? 'Excellent' : pct >= 0.72 ? 'Good pass' : pct >= 0.6 ? 'Pass' : pct >= 0.48 ? 'Borderline' : 'Fail'
  const missed = proto.steps.filter((s) => (marks[s.id] ?? 0) < 1)

  return (
    <Page className="pb-40">
      <button onClick={() => navigate('/osce')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> OSCE
      </button>
      <PageHeader eyebrow="Examiner mode · peer practice" title={titleOf(kind)} subtitle="Read the instruction to the candidate, start the clock, and tick each step as it is performed. Tap twice for a partial mark." />

      {/* Instructions + timer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-3xl bg-[#fbf8f1] p-5 text-slate-800 ring-1 ring-black/5 dark:bg-[#f4efe3]">
          <div className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">Read to the candidate</div>
          <p className="mt-2 text-[17px] font-semibold text-slate-900">“{taskOf(kind)}, and present your findings.”</p>
          <p className="mt-1 text-[13px] text-slate-600">The candidate should examine you (or a volunteer) as they would a patient, talking through what they find.</p>
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-surface-1 p-4 ring-1 ring-line">
          <div className={cn('font-mono text-[34px] font-semibold tabular', seconds <= 60 ? 'text-danger' : 'text-ink')}>{formatClock(seconds)}</div>
          <div className="flex flex-col gap-1.5">
            <Button size="sm" variant={running ? 'secondary' : 'primary'} onClick={() => setRunning((r) => !r)} leading={running ? <Pause size={14} /> : <Play size={14} />}>
              {running ? 'Pause' : 'Start'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSeconds(defaultSeconds)} leading={<RotateCcw size={14} />}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Mark sheet */}
      <div className="mt-6 space-y-2">
        {sections.map((sec) => {
          const items = proto.steps.filter((s) => s.section === sec)
          const got = items.reduce((a, s) => a + (marks[s.id] ?? 0) * s.marks, 0)
          const tot = items.reduce((a, s) => a + s.marks, 0)
          const isOpen = open === sec
          return (
            <div key={sec} className="overflow-hidden rounded-2xl bg-surface-1 ring-1 ring-line">
              <button onClick={() => setOpen(isOpen ? null : sec)} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
                <span className="text-[14.5px] font-semibold text-ink">{sec}</span>
                <span className="flex items-center gap-2">
                  <span className={cn('font-mono text-[12.5px] tabular', got >= tot ? 'text-success' : 'text-faint')}>
                    {got}/{tot}
                  </span>
                  <ChevronDown size={16} className={cn('text-faint transition', isOpen && 'rotate-180')} />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    {items.map((st) => {
                      const m = marks[st.id] ?? 0
                      return (
                        <li key={st.id} className="border-t border-line">
                          <button onClick={() => cycle(st.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-surface-2">
                            <span
                              className={cn(
                                'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold transition',
                                m === 1 ? 'bg-success text-white' : m === 0.5 ? 'bg-warning text-white' : 'ring-2 ring-line-strong',
                              )}
                            >
                              {m === 1 ? <Check size={14} strokeWidth={3} /> : m === 0.5 ? '½' : ''}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14px] leading-snug text-ink">
                                {st.label}
                                {st.applies && <span className="ml-1.5 text-[11px] font-medium text-faint">(if relevant)</span>}
                              </span>
                              <span className="mt-0.5 block text-[12px] leading-snug text-muted">{st.look ?? st.why}</span>
                            </span>
                            <span className="shrink-0 font-mono text-[11.5px] text-faint tabular">{st.marks}</span>
                          </button>
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Deductions */}
      {proto.rules.length > 0 && (
        <div className="mt-6 rounded-2xl bg-surface-1 p-4 ring-1 ring-line">
          <div className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Deduct if…</div>
          <div className="space-y-1.5">
            {proto.rules.map((r) => {
              const on = deductions.has(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() =>
                    setDeductions((d) => {
                      const n = new Set(d)
                      if (on) n.delete(r.id)
                      else n.add(r.id)
                      return n
                    })
                  }
                  className={cn('flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] ring-1 transition', on ? 'bg-danger/10 text-ink ring-danger/30' : 'text-muted ring-transparent hover:bg-surface-2')}
                >
                  <span className={cn('mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md ring-1', on ? 'bg-danger text-white ring-danger' : 'ring-line-strong')}>{on && <Check size={11} strokeWidth={3} />}</span>
                  {r.message}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Global rating */}
      <div className="mt-6">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Examiner’s global rating</div>
        <Segmented
          layoutId="global"
          value={global ?? ('' as Global)}
          onChange={setGlobal}
          options={(Object.keys(GLOBAL_LABEL) as Global[]).map((g) => ({ value: g, label: GLOBAL_LABEL[g] }))}
          size="sm"
        />
      </div>

      {/* Sticky score bar */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-30 border-t border-line bg-bg/90 backdrop-blur-xl lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold tracking-wider text-faint uppercase">Score</span>
              <span className="font-mono text-[14px] font-semibold text-ink tabular">
                {earned.toFixed(1)} / {max} · {Math.round(pct * 100)}%
              </span>
            </div>
            <ProgressBar value={pct} className="mt-1.5" tone={pct >= 0.6 ? 'success' : pct >= 0.48 ? 'warning' : 'danger'} />
          </div>
          <Button variant="primary" onClick={() => setDone(true)} leading={<Users size={16} />}>
            Finish
          </Button>
        </div>
      </div>

      <Sheet open={done} onClose={() => setDone(false)} title={`${grade} · ${Math.round(pct * 100)}%`} description={global ? `Examiner’s global rating: ${GLOBAL_LABEL[global]}` : 'Share this feedback with your partner, then swap roles.'}>
        <div className="space-y-4">
          {deductions.size > 0 && (
            <div>
              <div className="mb-1.5 text-[12px] font-semibold tracking-wider text-danger uppercase">Sequence and safety errors</div>
              <ul className="space-y-1">
                {proto.rules
                  .filter((r) => deductions.has(r.id))
                  .map((r) => (
                    <li key={r.id} className="text-[13.5px] text-ink">
                      • {r.message}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div>
            <div className="mb-1.5 text-[12px] font-semibold tracking-wider text-faint uppercase">To work on ({missed.length})</div>
            {missed.length === 0 ? (
              <p className="text-[13.5px] text-success">Every marking point achieved — superb.</p>
            ) : (
              <ul className="space-y-2">
                {missed.map((m) => (
                  <li key={m.id} className="rounded-xl bg-surface-2 px-3 py-2">
                    <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                      {m.label}
                      {(marks[m.id] ?? 0) === 0.5 && <Badge tone="warning">partial</Badge>}
                    </div>
                    <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{m.why}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              reset()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            leading={<RotateCcw size={16} />}
          >
            Swap roles & reset
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
