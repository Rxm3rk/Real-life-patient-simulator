import { ClipboardCheck, FlaskConical, MessagesSquare, Stethoscope, Trophy, X, Brain } from 'lucide-react'
import { motion } from 'motion/react'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { unlockAudio } from '../../audio/engine'
import { PatientAvatar } from '../../components/PatientAvatar'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import type { CaseDef, Phase } from '../../engine/types'
import { useTicker } from '../../lib/hooks'
import { navigate } from '../../lib/router'
import { cn, formatClock } from '../../lib/utils'
import { ensureCaseLoaded, useEncounter } from '../../store/encounter'

const HistoryPhase = lazy(() => import('./history/HistoryPhase'))
const ExamPhase = lazy(() => import('./exam/ExamPhase'))
const StationExamPhase = lazy(() => import('./station/StationExamPhase'))
const InvestigationsPhase = lazy(() => import('./investigations/InvestigationsPhase'))
const DiagnosisPhase = lazy(() => import('./diagnosis/DiagnosisPhase'))
const VivaPhase = lazy(() => import('./viva/VivaPhase'))

const PHASE_META: Record<Exclude<Phase, 'debrief'>, { label: string; icon: typeof Stethoscope }> = {
  history: { label: 'History', icon: MessagesSquare },
  exam: { label: 'Examine', icon: Stethoscope },
  investigations: { label: 'Tests', icon: FlaskConical },
  diagnosis: { label: 'Plan', icon: Brain },
  viva: { label: 'Viva', icon: ClipboardCheck },
}

export default function SimScreen() {
  const s = useEncounter((st) => st.s)
  const setPhase = useEncounter((st) => st.setPhase)
  const finish = useEncounter((st) => st.finish)
  const abandon = useEncounter((st) => st.abandon)
  const [c, setC] = useState<CaseDef | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const now = useTicker(1000, !!s && !s.finishedAt)

  useEffect(() => {
    let alive = true
    ensureCaseLoaded().then((x) => alive && setC(x))
    return () => {
      alive = false
    }
  }, [s?.caseId])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // redirect when there is no active encounter
  useEffect(() => {
    if (!s) navigate('/ward', { replace: true })
    else if (s.finishedAt) navigate(`/debrief/${s.attemptId}`, { replace: true })
  }, [s])

  const elapsed = s ? Math.floor((now - s.startedAt) / 1000) : 0
  const remaining = s?.timeLimit ? s.timeLimit - elapsed : undefined
  const overtime = remaining !== undefined && remaining <= 0

  useEffect(() => {
    if (remaining === 60) toast({ tone: 'warning', title: 'One minute remaining', body: 'Start drawing your station to a close.' })
    if (remaining === 0) toast({ tone: 'danger', title: 'Time’s up', body: 'The examiner asks you to stop. You can still finish your plan.' })
  }, [remaining])

  // tips drop in below the header, so its tabs and Finish button stay free to press
  const headerRef = useRef<HTMLElement>(null)
  const loaded = !!s && !!c
  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const root = document.documentElement
    const set = () => root.style.setProperty('--toast-top', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--toast-top')
    }
  }, [loaded])

  if (!s || !c) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-r-transparent" />
      </div>
    )
  }

  const phases = s.components.map((k) => (k === 'exam' ? 'exam' : k)) as Exclude<Phase, 'debrief'>[]
  const idx = phases.indexOf(s.phase as Exclude<Phase, 'debrief'>)
  const next = phases[idx + 1]

  const doFinish = () => {
    const r = finish()
    setConfirmFinish(false)
    if (r) navigate(`/debrief/${s.attemptId}`, { replace: true })
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      {/* Header */}
      <header ref={headerRef} className="relative z-30 shrink-0 border-b border-line bg-bg safe-top">
        <div className="flex h-14 items-center gap-2 px-2 sm:gap-3 sm:px-4">
          <button
            onClick={() => setConfirmExit(true)}
            aria-label="Leave station"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <X size={20} />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <PatientAvatar a={c.patient.appearance} caseId={c.id} pain={(c.vitals.pain ?? 0) / 12} id="hdr-face" className="hidden h-9 w-9 shrink-0 rounded-xl sm:block" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[14px] font-semibold text-ink">{c.patient.name}</div>
              <div className="truncate text-[11.5px] text-muted">
                {c.patient.age}
                {c.patient.sex === 'male' ? 'M' : 'F'} · {c.presenting}
              </div>
            </div>
          </div>

          {/* Phase stepper (desktop) */}
          <nav className="mx-auto hidden items-center gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-line md:flex" aria-label="Station phases">
            {phases.map((p) => {
              const M = PHASE_META[p]
              const on = s.phase === p
              return (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={cn('relative flex h-9 items-center gap-2 rounded-xl px-3.5 text-[13.5px] font-medium transition-colors', on ? 'text-ink' : 'text-muted hover:text-ink')}
                >
                  {on && <motion.span layoutId="phase-pill" className="absolute inset-0 rounded-xl bg-surface-1 shadow-(--shadow-soft) ring-1 ring-line" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <M.icon size={16} className="relative" />
                  <span className="relative">{M.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-xl px-2.5 font-mono text-[13px] font-semibold tabular ring-1',
                overtime ? 'bg-danger/10 text-danger ring-danger/30' : remaining !== undefined && remaining < 60 ? 'bg-warning/10 text-warning ring-warning/30' : 'bg-surface-2 text-ink ring-line',
              )}
              title={remaining !== undefined ? 'Time remaining' : 'Time elapsed'}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', overtime ? 'bg-danger' : 'bg-accent', 'animate-[blink-soft_2s_ease-in-out_infinite]')} />
              {remaining !== undefined ? (overtime ? `+${formatClock(-remaining)}` : formatClock(remaining)) : formatClock(elapsed)}
            </div>
            <span className="hidden rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-semibold tracking-wide text-muted uppercase ring-1 ring-line sm:inline">
              {s.mode}
            </span>
            <Button variant="primary" size="sm" onClick={() => setConfirmFinish(true)} leading={<Trophy size={15} />}>
              <span className="hidden sm:inline">Finish</span>
            </Button>
          </div>
        </div>

        {/* Phase stepper (mobile) */}
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 no-scrollbar md:hidden" aria-label="Station phases">
          {phases.map((p) => {
            const M = PHASE_META[p]
            const on = s.phase === p
            return (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium ring-1 transition',
                  on ? 'bg-accent text-accent-fg ring-accent' : 'bg-surface-1 text-muted ring-line',
                )}
              >
                <M.icon size={14} />
                {M.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="relative min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="grid h-full place-items-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-r-transparent" />
            </div>
          }
        >
          {s.phase === 'history' && <HistoryPhase c={c} onNext={next ? () => setPhase(next) : undefined} />}
          {s.phase === 'exam' &&
            (c.exam === 'abdominal' ? (
              <ExamPhase c={c} onNext={next ? () => setPhase(next) : undefined} />
            ) : (
              <StationExamPhase c={c} onNext={next ? () => setPhase(next) : undefined} />
            ))}
          {s.phase === 'investigations' && <InvestigationsPhase c={c} onNext={next ? () => setPhase(next) : undefined} />}
          {s.phase === 'diagnosis' && <DiagnosisPhase c={c} onNext={next ? () => setPhase(next) : () => setConfirmFinish(true)} />}
          {s.phase === 'viva' && <VivaPhase c={c} onDone={() => setConfirmFinish(true)} />}
        </Suspense>
      </main>

      <Sheet
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="Leave the station?"
        description="Your attempt is saved on this device — you can resume it later from the ward or home screen."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="danger"
              onClick={() => {
                abandon()
                navigate('/ward', { replace: true })
              }}
            >
              Discard attempt
            </Button>
            <Button onClick={() => navigate('/')}>Save & leave</Button>
            <Button variant="primary" onClick={() => setConfirmExit(false)}>
              Keep going
            </Button>
          </div>
        }
      >
        <div />
      </Sheet>

      <Sheet
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title="Finish and get your feedback?"
        description={
          phases.includes('diagnosis') && !s.diagnosis
            ? 'You haven’t committed to a working diagnosis yet — the diagnosis and plan will score zero.'
            : 'You’ll get a full OSCE-style breakdown: what you did well, what you missed, and the model approach.'
        }
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setConfirmFinish(false)}>Not yet</Button>
            <Button variant="primary" onClick={doFinish} leading={<Trophy size={16} />}>
              Finish station
            </Button>
          </div>
        }
      >
        <div />
      </Sheet>
    </div>
  )
}
