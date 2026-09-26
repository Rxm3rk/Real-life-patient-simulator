import { AlertTriangle, ArrowLeft, BookOpen, Check, ChevronDown, Clock, Lightbulb, MessagesSquare, RotateCcw, Share2, Sparkles, Stethoscope, Trophy, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { uiTick } from '../../audio/engine'
import { Button } from '../../components/ui/Button'
import { Badge, ProgressBar, ProgressRing } from '../../components/ui/primitives'
import { toast } from '../../components/ui/Toast'
import { CASES, loadCase } from '../../content/cases'
import { DIAG_BY_ID } from '../../content/diagnoses'
import { abdoFindings } from '../../engine/abdo'
import { protocolFor } from '../../engine/protocols'
import { computeResult, type Domain, type Grade } from '../../engine/scoring'
import type { CaseDef } from '../../engine/types'
import { navigate } from '../../lib/router'
import { cn, formatDuration } from '../../lib/utils'
import { useEncounter } from '../../store/encounter'
import { useProgress } from '../../store/progress'

const GRADE_TONE: Record<Grade, { color: string; bg: string; text: string }> = {
  Excellent: { color: 'var(--success)', bg: 'bg-success/12', text: 'text-success' },
  'Good pass': { color: 'var(--success)', bg: 'bg-success/12', text: 'text-success' },
  Pass: { color: 'var(--info)', bg: 'bg-info/12', text: 'text-info' },
  Borderline: { color: 'var(--warning)', bg: 'bg-warning/12', text: 'text-warning' },
  Fail: { color: 'var(--danger)', bg: 'bg-danger/12', text: 'text-danger' },
}

export default function Debrief({ attemptId }: { attemptId: string }) {
  const rec = useProgress((st) => st.attempts.find((a) => a.attemptId === attemptId))
  const start = useEncounter((st) => st.start)
  const [c, setC] = useState<CaseDef | null>(null)

  useEffect(() => {
    if (!rec) return
    let alive = true
    loadCase(rec.caseId).then((x) => alive && setC(x))
    return () => {
      alive = false
    }
  }, [rec])

  const result = useMemo(() => (c && rec ? computeResult(c, rec.state) : null), [c, rec])

  useEffect(() => {
    if (result && (result.grade === 'Excellent' || result.grade === 'Good pass')) uiTick('success')
  }, [result])

  if (!rec) return <div className="p-10 text-muted">Attempt not found.</div>
  if (!c || !result) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-r-transparent" />
      </div>
    )
  }

  const tone = GRADE_TONE[result.grade]
  const s = rec.state
  const correctDx = s.diagnosis && [c.diagnosis.correct, ...(c.diagnosis.accept ?? [])].includes(s.diagnosis)
  const nextCase = CASES[(CASES.findIndex((x) => x.id === c.id) + 1) % CASES.length]

  const retry = () => {
    start(c.id, s.mode, s.components, s.timeLimit)
    navigate('/sim')
  }
  const share = async () => {
    const text = `I scored ${Math.round(result.pct * 100)}% (${result.grade}) on “${c.presenting}” in Bedside — the surgical patient simulator.`
    const url = `${location.origin}${location.pathname}#/case/${c.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'Bedside', text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        toast({ tone: 'success', title: 'Copied to clipboard', body: 'Send it to a friend and challenge them.' })
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <button onClick={() => navigate('/ward')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Ward
      </button>

      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-line shadow-(--shadow-lift)">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <ProgressRing value={result.pct} size={132} stroke={11} color={tone.color}>
            <div className="text-center">
              <div className="text-[34px] leading-none font-semibold text-ink tabular">{Math.round(result.pct * 100)}</div>
              <div className="mt-1 text-[11px] font-semibold tracking-wider text-faint uppercase">percent</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold', tone.bg, tone.text)}>
                <Trophy size={14} /> {result.grade}
              </span>
              <Badge>{s.mode.toUpperCase()}</Badge>
              <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                <Clock size={13} /> {formatDuration(result.durationSec)}
              </span>
            </div>
            <div className="mt-3 text-[12px] font-semibold tracking-[0.14em] text-faint uppercase">Diagnosis</div>
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink sm:text-[30px]">{c.title}</h1>
            {s.components.includes('diagnosis') && (
              <p className={cn('mt-1 text-[14px]', correctDx ? 'text-success' : 'text-danger')}>
                {correctDx ? '✓ You made the correct diagnosis.' : s.diagnosis ? `✗ You diagnosed: ${DIAG_BY_ID[s.diagnosis]?.name ?? s.diagnosis}` : '✗ No working diagnosis committed.'}
              </p>
            )}
            <p className="mt-3 text-[14px] leading-relaxed text-muted">{c.teaching.summary}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line bg-surface-2/50 px-6 py-3 sm:px-8">
          <Button variant="primary" size="sm" onClick={retry} leading={<RotateCcw size={15} />}>
            Try again
          </Button>
          {nextCase && nextCase.id !== c.id && (
            <Button size="sm" onClick={() => navigate(`/case/${nextCase.id}`)} leading={<Stethoscope size={15} />}>
              Next patient
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={share} leading={<Share2 size={15} />}>
            Challenge a friend
          </Button>
        </div>
      </motion.section>

      {/* Critical */}
      {result.criticalMissed.length > 0 && (
        <section className="mt-5 rounded-3xl bg-danger/8 p-5 ring-1 ring-danger/25">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-danger">
            <AlertTriangle size={18} /> Critical omissions
          </div>
          <p className="mt-1 text-[13px] text-muted">In a real OSCE these can fail the station regardless of the rest.</p>
          <ul className="mt-3 space-y-1.5">
            {result.criticalMissed.map((m) => (
              <li key={m} className="flex gap-2 text-[14px] text-ink">
                <X size={16} className="mt-0.5 shrink-0 text-danger" />
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Domains */}
      <section className="mt-6">
        <h2 className="mb-3 text-[17px] font-semibold text-ink">Mark sheet</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {result.domains.map((d) => (
            <DomainCard key={d.id} d={d} />
          ))}
        </div>
      </section>

      {/* Violations */}
      {result.violations.length > 0 && (
        <section className="mt-6 rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
            <AlertTriangle size={17} className="text-warning" /> Technique & sequence
          </h2>
          <ul className="mt-3 space-y-2">
            {result.violations.map((v) => (
              <li key={v.id} className="flex gap-2 rounded-xl bg-warning/8 px-3 py-2.5 text-[13.5px] leading-snug text-ink ring-1 ring-warning/20">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {v.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Model sequence */}
      {s.components.includes('exam') && <ModelSequence c={c} s={s} />}

      {/* Teaching */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
            <Sparkles size={17} className="text-accent" /> Key findings in this patient
          </h2>
          <ul className="mt-3 space-y-2">
            {c.teaching.keyFindings.map((k) => (
              <li key={k} className="flex gap-2 text-[13.5px] leading-snug text-ink">
                <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                {k}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
            <Lightbulb size={17} className="text-violet" /> Exam pearls
          </h2>
          <ul className="mt-3 space-y-2">
            {c.teaching.pearls.map((k) => (
              <li key={k} className="flex gap-2 text-[13.5px] leading-snug text-ink">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
                {k}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Presentation */}
      <section className="mt-6 rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
          <BookOpen size={17} className="text-accent" /> Model presentation
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink">{c.teaching.presentation}</p>
        {s.presentation.trim() && (
          <div className="mt-5 rounded-2xl bg-surface-2 p-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">Your presentation</div>
            <p className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap text-muted">{s.presentation}</p>
          </div>
        )}
        {c.teaching.references && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">References</div>
            <ul className="mt-1.5 space-y-1">
              {c.teaching.references.map((r) => (
                <li key={r} className="text-[12.5px] text-muted">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Transcript */}
      {s.chat.length > 0 && <Transcript s={s} />}
      <div className="h-10" />
    </div>
  )
}

function DomainCard({ d }: { d: Domain }) {
  const [open, setOpen] = useState(false)
  const pct = d.max ? d.earned / d.max : 0
  const tone = pct >= 0.8 ? 'success' : pct >= 0.6 ? 'info' : pct >= 0.45 ? 'warning' : 'danger'
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-1 ring-1 ring-line">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3.5 text-left">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14.5px] font-semibold text-ink">{d.label}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-muted tabular">
              {Math.round(d.earned * 10) / 10}/{Math.round(d.max * 10) / 10}
            </span>
            <ChevronDown size={16} className={cn('text-faint transition', open && 'rotate-180')} />
          </span>
        </div>
        <ProgressBar value={pct} tone={tone} className="mt-2.5" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
            <div className="max-h-[420px] space-y-1 overflow-y-auto p-3 scrollbar-thin">
              {d.items.map((it) => {
                const full = it.max > 0 ? it.earned >= it.max * 0.99 : it.earned >= 0
                const neg = it.earned < 0
                return (
                  <li key={it.id} className="flex gap-2.5 rounded-lg px-2 py-1.5">
                    <span
                      className={cn(
                        'mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                        neg ? 'bg-danger text-white' : full ? 'bg-success text-white' : it.earned > 0 ? 'bg-warning text-white' : 'bg-surface-3 text-faint',
                      )}
                    >
                      {neg ? '−' : full ? '✓' : it.earned > 0 ? '½' : '✗'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[13px] leading-snug', full && !neg ? 'text-muted' : 'text-ink')}>
                        {it.label}
                        {it.critical && !full && (
                          <Badge tone="danger" className="ml-1.5">
                            critical
                          </Badge>
                        )}
                      </div>
                      {it.note && (!full || neg) && <div className="mt-0.5 text-[12px] leading-snug text-faint">{it.note.replace(/^!/, '')}</div>}
                    </div>
                  </li>
                )
              })}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function ModelSequence({ c, s }: { c: CaseDef; s: import('../../engine/encounter').EncounterState }) {
  const [open, setOpen] = useState(false)
  const proto = protocolFor(c.exam)
  const f = abdoFindings(c)
  const x = { c, f, log: s.log, asked: new Set(s.asked), ordered: new Set(s.ordered) }
  const steps = proto.steps.filter((st) => !st.applies || st.applies(x))
  const sections = [...new Set(steps.map((st) => st.section))]
  return (
    <section className="mt-6 rounded-3xl bg-surface-1 ring-1 ring-line">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
            <Stethoscope size={17} className="text-accent" /> The model examination
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">Macleod’s sequence, step by step — with what you did.</p>
        </div>
        <ChevronDown size={18} className={cn('text-faint transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-5 border-t border-line px-5 py-5">
          {sections.map((sec) => (
            <div key={sec}>
              <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">{sec}</div>
              <ol className="space-y-2">
                {steps
                  .filter((st) => st.section === sec)
                  .map((st) => {
                    const d = st.done(x)
                    const v = typeof d === 'number' ? d : d ? 1 : 0
                    return (
                      <li key={st.id} className="flex gap-3">
                        <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', v >= 0.99 ? 'bg-success text-white' : v > 0 ? 'bg-warning text-white' : 'bg-danger/80 text-white')}>
                          {v >= 0.99 ? '✓' : v > 0 ? '½' : '✗'}
                        </span>
                        <div>
                          <div className="text-[14px] font-medium text-ink">{st.label}</div>
                          <div className="text-[12.5px] leading-snug text-muted">{st.why}</div>
                          {st.how && <div className="mt-0.5 text-[12.5px] leading-snug text-faint">How: {st.how}</div>}
                        </div>
                      </li>
                    )
                  })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Transcript({ s }: { s: import('../../engine/encounter').EncounterState }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="mt-6 rounded-3xl bg-surface-1 ring-1 ring-line">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
          <MessagesSquare size={17} className="text-accent" /> History transcript
        </h2>
        <ChevronDown size={18} className={cn('text-faint transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line px-5 py-4">
          {s.chat.map((t) => (
            <div key={t.id} className={cn('text-[13.5px] leading-relaxed', t.role === 'student' ? 'text-accent' : 'text-ink')}>
              <span className="mr-2 text-[11px] font-semibold tracking-wide text-faint uppercase">{t.role === 'student' ? 'You' : 'Patient'}</span>
              {t.text}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
