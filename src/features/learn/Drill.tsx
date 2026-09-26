import { ArrowLeft, BookOpenText, Check, Lightbulb, RotateCcw, Shuffle, Timer, Trophy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { uiTick } from '../../audio/engine'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { ProgressBar, Segmented } from '../../components/ui/primitives'
import { protocolFor } from '../../engine/protocols'
import type { ProtocolStep } from '../../engine/protocols/abdominal'
import type { ExamKind } from '../../engine/types'
import { useTicker } from '../../lib/hooks'
import { Link, navigate } from '../../lib/router'
import { cn, formatClock, shuffle, vibrate } from '../../lib/utils'
import { useProgress } from '../../store/progress'
import { ROUTINE_BY_KIND, ROUTINES } from './routines'

type Mode = 'chunk' | 'section' | 'full'
const CHUNK = 6

export default function Drill({ kind }: { kind?: string }) {
  const meta = kind ? ROUTINE_BY_KIND[kind as ExamKind] : undefined
  if (!meta) return <Picker />
  return <Game kind={meta.kind} key={meta.kind} />
}

function Picker() {
  const drills = useProgress((s) => s.drills)
  return (
    <Page>
      <button onClick={() => navigate('/learn')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Learn
      </button>
      <PageHeader
        eyebrow="Sequence drills"
        title="Put the steps in order"
        subtitle="Examiners mark the order as well as the content. Tap each step in Macleod’s sequence — do it until it’s automatic."
        actions={
          <Button variant="primary" onClick={() => navigate(`/learn/drill/${ROUTINES[Math.floor(Math.random() * ROUTINES.length)].kind}`)} leading={<Shuffle size={16} />}>
            Surprise me
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ROUTINES.map((r) => {
          const d = drills[`drill:${r.kind}`]
          const Icon = r.icon
          return (
            <Link key={r.kind} to={`/learn/drill/${r.kind}`} className="flex items-center gap-3 rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold text-ink">{r.title}</div>
                <div className="text-[12.5px] text-muted">{d ? `${d.correct} perfect of ${d.seen} rounds` : 'Not drilled yet'}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}

function Game({ kind }: { kind: ExamKind }) {
  const meta = ROUTINE_BY_KIND[kind]
  const all = protocolFor(kind).steps
  const sections = useMemo(() => [...new Set(all.map((s) => s.section))], [all])
  const record = useProgress((s) => s.recordDrill)
  const [mode, setMode] = useState<Mode>('chunk')
  const [round, setRound] = useState(0)
  const [placed, setPlaced] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const now = useTicker(500, !finishedAt)

  // the steps to order this round
  const target: ProtocolStep[] = useMemo(() => {
    if (mode === 'full') return all
    if (mode === 'section') {
      // the order of the sections themselves, represented by their first step
      return sections.map((sec) => ({ ...all.find((s) => s.section === sec)!, id: `sec:${sec}`, label: sec }))
    }
    const start = Math.floor(Math.random() * Math.max(1, all.length - CHUNK + 1))
    return all.slice(start, start + CHUNK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, round, all, sections])
  const pool = useMemo(() => shuffle(target), [target])

  useEffect(() => {
    setPlaced([])
    setMistakes(0)
    setWrong(null)
    setStartedAt(Date.now())
    setFinishedAt(null)
  }, [target])

  const expected = target[placed.length]
  const done = placed.length === target.length
  const elapsed = Math.floor(((finishedAt ?? now) - startedAt) / 1000)

  const tap = (st: ProtocolStep) => {
    if (done || placed.includes(st.id)) return
    if (st.id === expected.id) {
      const next = [...placed, st.id]
      setPlaced(next)
      uiTick('soft')
      if (next.length === target.length) {
        setFinishedAt(Date.now())
        record(`drill:${kind}`, mistakes === 0)
        uiTick(mistakes === 0 ? 'success' : 'soft')
      }
    } else {
      setMistakes((m) => m + 1)
      setWrong(st.id)
      vibrate(40)
      uiTick('warn')
      window.setTimeout(() => setWrong((w) => (w === st.id ? null : w)), 500)
    }
  }

  const hintOn = mistakes >= 2 && !done

  return (
    <Page>
      <button onClick={() => navigate('/learn/drill')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Drills
      </button>
      <PageHeader eyebrow="Sequence drill" title={meta.title} subtitle="Tap the steps in the order you would perform them." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          layoutId="drill-mode"
          value={mode}
          onChange={(m) => {
            setMode(m)
            setRound((r) => r + 1)
          }}
          options={[
            { value: 'chunk', label: `${CHUNK} steps` },
            { value: 'section', label: 'Sections' },
            { value: 'full', label: `Whole routine (${all.length})` },
          ]}
          className="sm:w-[440px]"
        />
        <div className="flex items-center gap-4 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5 font-mono tabular">
            <Timer size={14} /> {formatClock(elapsed)}
          </span>
          <span className={cn('font-medium', mistakes ? 'text-warning' : 'text-muted')}>
            {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}
          </span>
        </div>
      </div>

      <ProgressBar value={placed.length / target.length} className="mb-5" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ordered answer */}
        <div className="rounded-3xl bg-surface-1 p-4 ring-1 ring-line">
          <div className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Your sequence</div>
          <ol className="space-y-1.5">
            {target.map((st, i) => {
              const filled = i < placed.length
              return (
                <li
                  key={st.id}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 transition',
                    filled ? 'border-success/25 bg-success/8' : i === placed.length ? 'border-dashed border-accent/60 bg-accent-soft/40' : 'border-dashed border-line',
                  )}
                >
                  <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold tabular', filled ? 'bg-success text-white' : 'bg-surface-2 text-faint')}>
                    {filled ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <AnimatePresence>
                    {filled && (
                      <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="min-w-0 text-[13.5px] leading-snug text-ink">
                        {st.label}
                        {mode !== 'section' && <span className="ml-2 text-[11px] text-faint">{st.section}</span>}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ol>
        </div>

        {/* shuffled pool */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Tap the next step</div>
            {hintOn && expected && (
              <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet">
                <Lightbulb size={13} /> Next is in “{mode === 'section' ? 'the next section' : expected.section}”
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {pool
              .filter((st) => !placed.includes(st.id))
              .map((st) => (
                <motion.button
                  layout
                  key={st.id}
                  onClick={() => tap(st)}
                  className={cn(
                    'rounded-xl px-3.5 py-2.5 text-left text-[13.5px] leading-snug font-medium ring-1 transition active:scale-[0.98]',
                    wrong === st.id ? 'bg-danger/12 text-danger ring-danger/40' : 'bg-surface-1 text-ink ring-line hover:ring-accent/50',
                  )}
                  style={wrong === st.id ? { animation: 'bs-shake 0.4s ease' } : undefined}
                >
                  {st.label}
                </motion.button>
              ))}
          </div>

          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-lift)">
                <div className="flex items-center gap-3">
                  <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', mistakes === 0 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
                    <Trophy size={22} />
                  </span>
                  <div>
                    <div className="text-[17px] font-semibold text-ink">{mistakes === 0 ? 'Perfect sequence' : `${mistakes} ${mistakes === 1 ? 'slip' : 'slips'} — nearly there`}</div>
                    <div className="text-[13px] text-muted">
                      {target.length} steps in {formatClock(elapsed)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => setRound((r) => r + 1)} leading={<RotateCcw size={15} />}>
                    Another round
                  </Button>
                  {mode !== 'full' && (
                    <Button
                      onClick={() => {
                        setMode('full')
                        setRound((r) => r + 1)
                      }}
                    >
                      Whole routine
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => navigate(`/learn/routine/${kind}`)} leading={<BookOpenText size={15} />}>
                    Study the routine
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Page>
  )
}
