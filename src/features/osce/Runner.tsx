import { ArrowRight, Bell, ClipboardList, DoorOpen, Flag, Play, Timer, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { uiTick } from '../../audio/engine'
import { Page } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge, ProgressRing } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { CASE_META, loadCase } from '../../content/cases'
import type { CaseDef, Component } from '../../engine/types'
import { navigate } from '../../lib/router'
import { cn, formatClock } from '../../lib/utils'
import { useEncounter } from '../../store/encounter'
import { passed, useOsce, type Circuit } from '../../store/osce'
import { EXAM_LABEL } from '../ward/Ward'

const READING_SECONDS = 60

/** Which components of a case make up the station for a given circuit type. */
export function stationComponents(c: CaseDef, type: Circuit['type']): Component[] {
  const want: Component[] = type === 'exam' ? ['exam', 'diagnosis', 'viva'] : type === 'history' ? ['history', 'diagnosis'] : c.components
  const out = c.components.filter((k) => want.includes(k))
  return out.some((k) => k === 'exam' || k === 'history') ? out : c.components
}

export default function Runner() {
  const circuit = useOsce((s) => s.circuit)
  const attach = useOsce((s) => s.attach)
  const advance = useOsce((s) => s.advance)
  const abandon = useOsce((s) => s.abandon)
  const start = useEncounter((s) => s.start)
  const active = useEncounter((s) => s.s)
  const [c, setC] = useState<CaseDef | null>(null)
  const [left, setLeft] = useState(READING_SECONDS)
  const [confirm, setConfirm] = useState(false)

  const station = circuit?.stations[circuit.index]
  const meta = station ? CASE_META[station.caseId] : null

  useEffect(() => {
    if (!circuit) navigate('/osce', { replace: true })
  }, [circuit])

  useEffect(() => {
    if (!station) return
    let alive = true
    setC(null)
    loadCase(station.caseId).then((x) => alive && setC(x))
    return () => {
      alive = false
    }
  }, [station?.caseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const reading = !!station && station.pct === undefined && !station.attemptId
  useEffect(() => {
    if (!reading) return
    setLeft(READING_SECONDS)
    const t0 = Date.now()
    const id = window.setInterval(() => {
      const l = Math.max(0, READING_SECONDS - Math.floor((Date.now() - t0) / 1000))
      setLeft(l)
      if (l === 0) {
        uiTick('warn')
        window.clearInterval(id)
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [reading, circuit?.index])

  const inProgress = !!station?.attemptId && station.pct === undefined && active?.attemptId === station.attemptId && !active.finishedAt

  const enter = () => {
    if (!c || !circuit) return
    start(c.id, 'osce', stationComponents(c, circuit.type), circuit.seconds)
    const s = useEncounter.getState().s
    if (s) attach(s.attemptId)
    navigate('/sim')
  }

  const next = () => {
    if (!circuit) return
    const last = circuit.index + 1 >= circuit.stations.length
    const id = circuit.id
    advance()
    if (last) navigate(`/osce/results/${id}`, { replace: true })
  }

  const dots = useMemo(() => circuit?.stations ?? [], [circuit])
  if (!circuit || !station || !meta) return null

  return (
    <Page>
      {/* Circuit progress */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <Timer size={18} />
          </span>
          <div>
            <div className="text-[12px] font-semibold tracking-[0.14em] text-faint uppercase">OSCE circuit</div>
            <div className="text-[15px] font-semibold text-ink">
              Station {circuit.index + 1} of {circuit.stations.length}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} leading={<X size={15} />}>
          Abandon
        </Button>
      </div>
      <div className="mb-8 flex gap-1.5" aria-label="Circuit progress">
        {dots.map((d, i) => (
          <div key={i} className="flex-1">
            <div
              className={cn(
                'h-2 rounded-full transition-colors',
                d.pct !== undefined ? (passed(d.grade) ? 'bg-success' : 'bg-danger') : i === circuit.index ? 'bg-accent' : 'bg-surface-3',
              )}
            />
            <div className={cn('mt-1.5 truncate text-[11px] font-medium', i === circuit.index ? 'text-ink' : 'text-faint')}>{EXAM_LABEL[CASE_META[d.caseId].exam]}</div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {station.pct !== undefined ? (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-xl rounded-3xl bg-surface-1 p-6 text-center ring-1 ring-line shadow-(--shadow-lift) sm:p-8">
            <ProgressRing value={station.pct} size={112} stroke={9} color={passed(station.grade) ? 'var(--success)' : 'var(--danger)'}>
              <div>
                <div className="font-mono text-2xl font-semibold text-ink tabular">{Math.round(station.pct * 100)}%</div>
                <div className="text-[11px] font-semibold text-faint uppercase">{station.grade}</div>
              </div>
            </ProgressRing>
            <h2 className="mt-5 text-[22px] font-semibold text-ink">Station {circuit.index + 1} complete</h2>
            <p className="mt-2 text-[14px] text-muted">Take a breath. The next station starts with a minute of reading time.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {station.attemptId && (
                <Button onClick={() => navigate(`/debrief/${station.attemptId}`)} leading={<Flag size={16} />}>
                  Review feedback
                </Button>
              )}
              <Button variant="primary" onClick={next} trailing={<ArrowRight size={16} />}>
                {circuit.index + 1 >= circuit.stations.length ? 'See circuit results' : 'Next station'}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key={`read-${circuit.index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="relative overflow-hidden rounded-3xl bg-[#fbf8f1] p-6 text-slate-800 shadow-(--shadow-float) ring-1 ring-black/5 sm:p-8 dark:bg-[#f4efe3]">
              <div className="absolute top-0 left-1/2 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-slate-300/70" />
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">Candidate instructions</div>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                  <ClipboardList size={14} /> {meta.setting}
                </div>
              </div>
              <h1 className="mt-4 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[28px]">{meta.presenting}</h1>
              <p className="mt-3 text-[15.5px] leading-relaxed text-slate-700">{c?.stem ?? '…'}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[12px] font-semibold text-slate-600">{EXAM_LABEL[meta.exam]}</span>
                <span className="rounded-full bg-rose-600/10 px-3 py-1 text-[12px] font-semibold text-rose-700">{Math.round(circuit.seconds / 60)} minutes</span>
                {c && (
                  <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[12px] font-semibold text-slate-600">
                    {stationComponents(c, circuit.type)
                      .map((k) => ({ history: 'History', exam: 'Examination', investigations: 'Tests', diagnosis: 'Plan', viva: 'Questions' })[k])
                      .join(' · ')}
                  </span>
                )}
              </div>
              {c && c.components.includes('history') && !stationComponents(c, circuit.type).includes('history') && (
                <p className="mt-4 text-[13px] font-medium text-slate-600">In this circuit the history is taken as read — go straight to your examination.</p>
              )}
            </div>

            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-surface-1 p-6 ring-1 ring-line shadow-(--shadow-soft)">
              {inProgress ? (
                <>
                  <Badge tone="warning" dot>
                    Station in progress
                  </Badge>
                  <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/sim')} leading={<Play size={17} />}>
                    Return to station
                  </Button>
                </>
              ) : (
                <>
                  <ProgressRing value={left / READING_SECONDS} size={120} stroke={8} color={left === 0 ? 'var(--warning)' : 'var(--accent)'}>
                    <div className="text-center">
                      {left === 0 ? <Bell size={26} className="mx-auto text-warning" /> : <div className="font-mono text-3xl font-semibold text-ink tabular">{formatClock(left)}</div>}
                      <div className="mt-0.5 text-[10.5px] font-semibold tracking-wider text-faint uppercase">{left === 0 ? 'Bell' : 'Reading'}</div>
                    </div>
                  </ProgressRing>
                  <p className="text-center text-[13px] leading-relaxed text-muted">{left === 0 ? 'Enter the station.' : 'Read the instructions and plan your approach.'}</p>
                  <Button variant="primary" size="lg" className="w-full" disabled={!c} onClick={enter} leading={<DoorOpen size={17} />}>
                    Enter station
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Abandon this circuit?"
        description="Stations you have finished stay in your progress, but the circuit won’t be scored."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setConfirm(false)}>Keep going</Button>
            <Button
              variant="danger"
              onClick={() => {
                abandon()
                navigate('/osce', { replace: true })
              }}
            >
              Abandon circuit
            </Button>
          </div>
        }
      >
        <div />
      </Sheet>
    </Page>
  )
}
