import { ArrowLeft, Check, ChevronDown, ClipboardList, Play, Share2, Stethoscope } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { PatientAvatar } from '../../components/PatientAvatar'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/primitives'
import { CASE_META, loadCase } from '../../content/cases'
import { news2 } from '../../engine/news2'
import type { CaseDef, Component, Mode } from '../../engine/types'
import { caseLink } from '../../lib/deeplink'
import { MODE_ORDER, MODES } from '../../lib/modes'
import { goBack, navigate } from '../../lib/router'
import { shareLink } from '../../lib/share'
import { cn } from '../../lib/utils'
import { useEncounter } from '../../store/encounter'
import { useSettings } from '../../store/settings'

const COMPONENTS: { id: Component; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'exam', label: 'Examination' },
  { id: 'investigations', label: 'Investigations' },
  { id: 'diagnosis', label: 'Diagnosis & plan' },
  { id: 'viva', label: 'Viva' },
]

/**
 * The door note: read the station, pick how you want to do it, go in.
 * One decision by default (the mode); the station's parts are there if you want to change them.
 */
export default function CaseBriefing({ id }: { id: string }) {
  const meta = CASE_META[id]
  const [c, setC] = useState<CaseDef | null>(null)
  const [mode, setMode] = useState<Mode>('practice')
  const [comps, setComps] = useState<Component[]>(['history', 'exam', 'investigations', 'diagnosis', 'viva'])
  const [custom, setCustom] = useState(false)
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
  const available = COMPONENTS.filter((k) => !c || c.components.includes(k.id))
  const chosen = available.filter((k) => comps.includes(k.id))

  const begin = () => {
    if (!c) return
    const order: Component[] = ['history', 'exam', 'investigations', 'diagnosis', 'viva']
    const picked = order.filter((k) => comps.includes(k))
    start(id, mode, picked, mode === 'osce' ? minutes * 60 * Math.max(1, Math.ceil(picked.filter((k) => k === 'history' || k === 'exam').length)) : undefined)
    navigate('/sim')
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <button onClick={() => goBack('/ward')} className="mb-4 inline-flex h-9 items-center gap-1.5 text-[13.5px] font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={15} /> Patients
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
        {/* Door note */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-[#fbf8f1] p-6 text-slate-800 shadow-(--shadow-float) ring-1 ring-black/5 sm:p-8 dark:bg-[#f4efe3]">
            <div className="absolute top-0 left-1/2 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-slate-300/70" />
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">Station instructions</div>
              <div className="flex items-center gap-1.5 text-right text-[12px] font-semibold text-slate-500">
                <ClipboardList size={14} className="shrink-0" /> {meta.setting}
              </div>
            </div>
            <h1 className="mt-4 text-[25px] leading-tight font-semibold tracking-tight text-slate-900 sm:text-[30px]">{meta.presenting}</h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-slate-700">{c?.stem ?? '…'}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[12px] font-semibold text-slate-600">{meta.specialty}</span>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[12px] font-semibold text-slate-600">
                Difficulty {'●'.repeat(meta.difficulty)}
                {'○'.repeat(3 - meta.difficulty)}
              </span>
              {mode === 'osce' && <span className="rounded-full bg-rose-600/10 px-3 py-1 text-[12px] font-semibold text-rose-700">{minutes} min per part</span>}
            </div>
          </div>

          {/* Patient card */}
          {c && (
            <div className="mt-4 flex items-center gap-4 rounded-3xl bg-surface-1 p-4 shadow-(--shadow-soft) ring-1 ring-line sm:p-5">
              <PatientAvatar a={c.patient.appearance} caseId={c.id} pain={(c.vitals.pain ?? 0) / 10} id="brief-face" className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[17px] font-semibold text-ink">{c.patient.name}</div>
                  <Badge>
                    {c.patient.age}
                    {c.patient.sex === 'male' ? 'M' : 'F'}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[12.5px] text-ink tabular">
                  <span>HR {c.vitals.hr}</span>
                  <span>
                    BP {c.vitals.sbp}/{c.vitals.dbp}
                  </span>
                  <span>RR {c.vitals.rr}</span>
                  <span>SpO₂ {c.vitals.spo2}%</span>
                  <span>T {c.vitals.temp.toFixed(1)}°</span>
                </div>
              </div>
              {n && (
                <div className="shrink-0 text-center" title="National Early Warning Score 2">
                  <div className={cn('text-2xl font-semibold tabular', n.score >= 5 ? 'text-danger' : n.score >= 1 ? 'text-warning' : 'text-success')}>{n.score}</div>
                  <div className="text-[10px] font-semibold tracking-wider text-faint uppercase">NEWS2</div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* How to do it */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-col">
          <h2 className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">How do you want to do it?</h2>
          <div role="radiogroup" aria-label="Mode" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-line">
            {MODE_ORDER.map((m) => {
              const M = MODES[m]
              const on = m === mode
              return (
                <button
                  key={m}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMode(m)}
                  className={cn(
                    'relative flex h-12 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-colors',
                    on ? 'text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {on && <motion.span layoutId="brief-mode" transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="absolute inset-0 rounded-xl bg-surface-1 shadow-(--shadow-soft) ring-1 ring-line" />}
                  <M.icon size={17} className={cn('relative', on ? 'text-accent' : '')} />
                  <span className="relative">{M.label}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 rounded-2xl bg-surface-1 p-4 ring-1 ring-line">
            <p className="text-[14px] leading-relaxed text-ink">{MODES[mode].blurb}</p>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {MODES[mode].points.map((p) => (
                <li key={p} className="flex items-center gap-1.5 text-[12.5px] text-muted">
                  <Check size={13} className="shrink-0 text-accent" /> {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Station parts: shown as a summary, changeable on request */}
          <div className="mt-4">
            <button onClick={() => setCustom((v) => !v)} aria-expanded={custom} className="flex w-full items-center justify-between gap-3 rounded-2xl px-1 py-1.5 text-left">
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Station parts</span>
                <span className="mt-1 block truncate text-[13.5px] text-ink">{chosen.map((k) => k.label).join(' · ') || 'None chosen'}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent">
                {custom ? 'Done' : 'Change'} <ChevronDown size={15} className={cn('transition', custom && 'rotate-180')} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {custom && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex flex-wrap gap-2 pt-2">
                    {available.map((k) => {
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
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
                    {c && !c.components.includes('history')
                      ? 'This is an examination station — the history is in the instructions.'
                      : 'For pure OSCE examination practice, keep only Examination (and Viva if you like).'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* On phones the start button stays in reach above the tab bar */}
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-5 -mx-4 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-3 pb-1 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-auto lg:bg-none lg:px-0 lg:pt-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="primary" size="lg" className="w-full sm:w-auto sm:flex-1" disabled={!canStart} onClick={begin} leading={<Play size={18} />}>
                {mode === 'osce' ? 'Enter the station' : 'See the patient'}
              </Button>
              {resuming && (
                <Button size="lg" onClick={() => navigate('/sim')} leading={<Stethoscope size={18} />}>
                  Resume attempt
                </Button>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-faint">Examination follows Macleod’s Clinical Examination (14th ed.).</p>
            <Button size="sm" variant="ghost" onClick={share} leading={<Share2 size={15} />}>
              Share
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
