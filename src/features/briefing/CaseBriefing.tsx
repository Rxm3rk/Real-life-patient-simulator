import { ArrowLeft, BookOpenCheck, Check, ClipboardList, Dumbbell, GraduationCap, Play, Share2, Stethoscope, Timer } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Face } from '../../anatomy/Face'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/primitives'
import { CASE_META, loadCase } from '../../content/cases'
import { news2 } from '../../engine/news2'
import type { CaseDef, Component, Mode } from '../../engine/types'
import { caseLink } from '../../lib/deeplink'
import { goBack, navigate } from '../../lib/router'
import { shareLink } from '../../lib/share'
import { cn } from '../../lib/utils'
import { useEncounter } from '../../store/encounter'
import { useSettings } from '../../store/settings'

const MODES: { id: Mode; title: string; icon: typeof GraduationCap; blurb: string; points: string[] }[] = [
  {
    id: 'learn',
    title: 'Learn',
    icon: GraduationCap,
    blurb: 'Guided, step by step',
    points: ['Macleod’s checklist beside you', 'Every finding explained', 'Gentle nudges when out of order'],
  },
  {
    id: 'practice',
    title: 'Practice',
    icon: Dumbbell,
    blurb: 'You lead, hints on request',
    points: ['No checklist on screen', 'Reveal interpretations if stuck', 'Full feedback at the end'],
  },
  {
    id: 'osce',
    title: 'OSCE',
    icon: Timer,
    blurb: 'Timed exam conditions',
    points: ['Station timer', 'No hints, raw findings only', 'Examiner viva & global grade'],
  },
]

const COMPONENTS: { id: Component; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'exam', label: 'Examination' },
  { id: 'investigations', label: 'Investigations' },
  { id: 'diagnosis', label: 'Diagnosis & plan' },
  { id: 'viva', label: 'Viva' },
]

export default function CaseBriefing({ id }: { id: string }) {
  const meta = CASE_META[id]
  const [c, setC] = useState<CaseDef | null>(null)
  const [mode, setMode] = useState<Mode>('practice')
  const [comps, setComps] = useState<Component[]>(['history', 'exam', 'investigations', 'diagnosis', 'viva'])
  const minutes = useSettings((s) => Math.round(s.osceStationSeconds / 60))
  const start = useEncounter((s) => s.start)
  const active = useEncounter((s) => s.s)

  useEffect(() => {
    let alive = true
    loadCase(id).then((x) => {
      if (!alive || !x) return
      setC(x)
      // default to the components this station was written for
      setComps(x.components)
    })
    return () => {
      alive = false
    }
  }, [id])

  const share = () =>
    shareLink({
      title: 'Bedside — surgical case',
      text: `Try this surgical case on Bedside: ${meta?.presenting}`,
      url: caseLink(id),
      copied: 'Link copied',
      copiedBody: 'Send it to a friend — it opens this patient directly.',
    })

  if (!meta) return <div className="p-10 text-muted">Case not found.</div>

  const toggle = (k: Component) => setComps((cs) => (cs.includes(k) ? cs.filter((x) => x !== k) : [...cs, k]))
  const canStart = !!c && comps.some((k) => k === 'history' || k === 'exam')
  const n = c ? news2(c.vitals) : null
  const resuming = active && active.caseId === id && !active.finishedAt

  const begin = () => {
    if (!c) return
    const order: Component[] = ['history', 'exam', 'investigations', 'diagnosis', 'viva']
    const chosen = order.filter((k) => comps.includes(k))
    start(id, mode, chosen, mode === 'osce' ? minutes * 60 * Math.max(1, Math.ceil(chosen.filter((k) => k === 'history' || k === 'exam').length)) : undefined)
    navigate('/sim')
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <button onClick={() => goBack('/ward')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Ward
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Door note */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="relative overflow-hidden rounded-3xl bg-[#fbf8f1] p-6 text-slate-800 shadow-(--shadow-float) ring-1 ring-black/5 sm:p-8 dark:bg-[#f4efe3]">
            <div className="absolute top-0 left-1/2 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-slate-300/70" />
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">Station instructions</div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                <ClipboardList size={14} /> {meta.setting}
              </div>
            </div>
            <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-slate-900 sm:text-[30px]">{meta.presenting}</h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-slate-700">{c?.stem ?? '…'}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[12px] font-semibold text-slate-600">{meta.specialty}</span>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[12px] font-semibold text-slate-600">
                Difficulty {'●'.repeat(meta.difficulty)}
                {'○'.repeat(3 - meta.difficulty)}
              </span>
              {mode === 'osce' && (
                <span className="rounded-full bg-rose-600/10 px-3 py-1 text-[12px] font-semibold text-rose-700">
                  {minutes} min per component
                </span>
              )}
            </div>
          </div>

          {/* Patient card */}
          {c && (
            <div className="mt-5 flex items-center gap-4 rounded-3xl bg-surface-1 p-4 ring-1 ring-line shadow-(--shadow-soft) sm:p-5">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-[#dfe7ee] to-[#c6d2dc] ring-1 ring-line dark:from-[#233147] dark:to-[#141d2c]">
                <svg viewBox="-62 -22 124 140" className="h-full w-full">
                  <Face a={c.patient.appearance} pose={{ pain: (c.vitals.pain ?? 0) / 10 }} id="brief-face" bust noLines />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[17px] font-semibold text-ink">{c.patient.name}</div>
                  <Badge>
                    {c.patient.age}
                    {c.patient.sex === 'male' ? 'M' : 'F'}
                  </Badge>
                </div>
                <div className="mt-0.5 text-sm text-muted">Triage observations</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12.5px] text-ink tabular">
                  <span>HR {c.vitals.hr}</span>
                  <span>BP {c.vitals.sbp}/{c.vitals.dbp}</span>
                  <span>RR {c.vitals.rr}</span>
                  <span>SpO₂ {c.vitals.spo2}%</span>
                  <span>T {c.vitals.temp.toFixed(1)}°</span>
                </div>
              </div>
              {n && (
                <div className="hidden shrink-0 text-center sm:block">
                  <div className={cn('text-2xl font-semibold tabular', n.score >= 5 ? 'text-danger' : n.score >= 1 ? 'text-warning' : 'text-success')}>{n.score}</div>
                  <div className="text-[10px] font-semibold tracking-wider text-faint uppercase">NEWS2</div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Mode & components */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="flex flex-col gap-5">
          <div>
            <div className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Choose a mode</div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {MODES.map((m) => {
                const on = m.id === mode
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      'group relative flex flex-col rounded-2xl p-4 text-left ring-1 transition-all',
                      on ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-1 ring-line hover:ring-line-strong',
                    )}
                    aria-pressed={on}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('grid h-9 w-9 place-items-center rounded-xl', on ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted')}>
                        <Icon size={18} />
                      </span>
                      {on && <Check size={18} className="text-accent" />}
                    </div>
                    <div className="mt-3 text-[15px] font-semibold text-ink">{m.title}</div>
                    <div className="text-[13px] text-muted">{m.blurb}</div>
                    <ul className="mt-3 space-y-1">
                      {m.points.map((p) => (
                        <li key={p} className="flex gap-1.5 text-[12px] leading-snug text-muted">
                          <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Station components</div>
            <div className="flex flex-wrap gap-2">
              {COMPONENTS.filter((k) => !c || c.components.includes(k.id)).map((k) => {
                const on = comps.includes(k.id)
                return (
                  <button
                    key={k.id}
                    onClick={() => toggle(k.id)}
                    aria-pressed={on}
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium ring-1 transition',
                      on ? 'bg-surface-1 text-ink ring-accent/60' : 'bg-transparent text-faint ring-line hover:text-muted',
                    )}
                  >
                    <span className={cn('grid h-4.5 w-4.5 place-items-center rounded-md ring-1', on ? 'bg-accent text-accent-fg ring-accent' : 'ring-line-strong')}>
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    {k.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {c && !c.components.includes('history')
                ? 'This is an examination station — the examiner gives you the history in the instructions.'
                : <>Tip: for pure OSCE examination practice, keep only <span className="font-medium text-ink">Examination</span> (and optionally Viva).</>}
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2.5 sm:flex-row">
            <Button variant="primary" size="lg" className="flex-1" disabled={!canStart} onClick={begin} leading={<Play size={18} />}>
              {mode === 'osce' ? 'Enter the station' : 'See the patient'}
            </Button>
            {resuming && (
              <Button size="lg" onClick={() => navigate('/sim')} leading={<Stethoscope size={18} />}>
                Resume attempt
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px] text-faint">
              <BookOpenCheck size={14} className="shrink-0" /> Examination sequence follows Macleod’s Clinical Examination (14th ed.).
            </div>
            <Button size="sm" variant="ghost" onClick={share} leading={<Share2 size={15} />}>
              Share
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
