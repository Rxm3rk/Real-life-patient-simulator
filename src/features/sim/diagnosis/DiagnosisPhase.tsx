import { ArrowRight, Check, ChevronDown, FileText, Plus, Search, Target, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { DIAG_BY_ID, DIAGNOSES } from '../../../content/diagnoses'
import { MANAGEMENT, type MgmtDef } from '../../../content/management'
import type { CaseDef } from '../../../engine/types'
import { cn } from '../../../lib/utils'
import { useEncounter } from '../../../store/encounter'

const GROUPS: MgmtDef['group'][] = ['Resuscitation & supportive', 'Medication', 'Escalation & referral', 'Procedures & operations', 'Conservative & follow-up']

export default function DiagnosisPhase({ c, onNext }: { c: CaseDef; onNext: () => void }) {
  const s = useEncounter((st) => st.s)!
  const setDiagnosis = useEncounter((st) => st.setDiagnosis)
  const toggleDiff = useEncounter((st) => st.toggleDifferential)
  const toggleMgmt = useEncounter((st) => st.toggleManagement)
  const setPresentation = useEncounter((st) => st.setPresentation)
  const [open, setOpen] = useState<string | null>('Resuscitation & supportive')

  const template = `${c.patient.title} is a ${c.patient.age}-year-old ${c.patient.sex === 'male' ? 'man' : 'woman'} presenting with …
Associated symptoms: … Relevant background: …
On examination: … (general, observations, key positive and negative findings)
Investigations show: …
The most likely diagnosis is …, with differentials of …
My plan is: …`

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section>
          <SectionHead n={1} title="Working diagnosis" subtitle="Commit to the single most likely diagnosis." />
          {s.diagnosis ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 ring-1 ring-accent/30">
              <div className="flex items-center gap-2.5">
                <Target size={18} className="text-accent" />
                <span className="text-[15px] font-semibold text-ink">{DIAG_BY_ID[s.diagnosis]?.name}</span>
              </div>
              <Button size="xs" variant="ghost" onClick={() => setDiagnosis('')}>
                Change
              </Button>
            </div>
          ) : (
            <DiagnosisPicker onPick={(id) => setDiagnosis(id)} exclude={s.differentials} placeholder="Search diagnoses (e.g. appendicitis, cholecystitis)…" />
          )}
        </section>

        <section>
          <SectionHead n={2} title="Differential diagnoses" subtitle="Up to five important alternatives — especially the dangerous ones." />
          <div className="mb-3 flex flex-wrap gap-2">
            {s.differentials.map((d) => (
              <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-surface-1 py-1.5 pr-1.5 pl-3 text-[13px] text-ink ring-1 ring-line">
                {DIAG_BY_ID[d]?.name}
                <button onClick={() => toggleDiff(d)} className="grid h-5 w-5 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-ink" aria-label={`Remove ${DIAG_BY_ID[d]?.name}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          {s.differentials.length < 5 && <DiagnosisPicker onPick={(id) => toggleDiff(id)} exclude={[...s.differentials, s.diagnosis ?? '']} placeholder="Add a differential…" compact />}
        </section>

        <section>
          <SectionHead n={3} title="Management plan" subtitle="Select everything you would do. Some options are wrong for this patient." />
          <div className="space-y-2">
            {GROUPS.map((g) => {
              const items = MANAGEMENT.filter((m) => m.group === g)
              const chosen = items.filter((m) => s.management.includes(m.id)).length
              const isOpen = open === g
              return (
                <div key={g} className="overflow-hidden rounded-2xl bg-surface-1 ring-1 ring-line">
                  <button onClick={() => setOpen(isOpen ? null : g)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                    <span className="text-[14px] font-semibold text-ink">{g}</span>
                    <span className="flex items-center gap-2">
                      {chosen > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">{chosen}</span>}
                      <ChevronDown size={16} className={cn('text-faint transition', isOpen && 'rotate-180')} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="grid gap-1.5 px-3 pb-3 sm:grid-cols-2">
                          {items.map((m) => {
                            const on = s.management.includes(m.id)
                            return (
                              <button
                                key={m.id}
                                onClick={() => toggleMgmt(m.id)}
                                className={cn('flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] ring-1 transition', on ? 'bg-accent-soft text-ink ring-accent/40' : 'bg-bg text-muted ring-line hover:text-ink')}
                              >
                                <span className={cn('mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md ring-1', on ? 'bg-accent text-accent-fg ring-accent' : 'ring-line-strong')}>{on && <Check size={12} strokeWidth={3} />}</span>
                                {m.label}
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <SectionHead n={4} title="Present your patient" subtitle="As you would to your registrar or the examiner. You’ll compare it with a model presentation." />
          <div className="rounded-2xl bg-surface-1 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent/50">
            <textarea
              value={s.presentation}
              onChange={(e) => setPresentation(e.target.value)}
              rows={8}
              placeholder={`${c.patient.title} is a ${c.patient.age}-year-old…`}
              className="w-full resize-y rounded-2xl bg-transparent px-4 py-3 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-faint"
            />
            <div className="flex items-center justify-between border-t border-line px-3 py-2">
              <span className="text-[12px] text-faint">{s.presentation.trim().split(/\s+/).filter(Boolean).length} words</span>
              {!s.presentation && (
                <Button size="xs" variant="ghost" onClick={() => setPresentation(template)} leading={<FileText size={13} />}>
                  Use a template
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end pb-6 safe-bottom">
          <Button variant="primary" size="lg" onClick={onNext} trailing={<ArrowRight size={17} />} disabled={!s.diagnosis}>
            {s.components.includes('viva') ? 'Face the examiner' : 'Finish station'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionHead({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-bold text-muted ring-1 ring-line">{n}</span>
      <div>
        <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        <p className="text-[13px] text-muted">{subtitle}</p>
      </div>
    </div>
  )
}

function DiagnosisPicker({ onPick, exclude, placeholder, compact }: { onPick: (id: string) => void; exclude: string[]; placeholder: string; compact?: boolean }) {
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return DIAGNOSES.filter((d) => !exclude.includes(d.id) && (d.name.toLowerCase().includes(t) || d.group.toLowerCase().includes(t) || d.aka?.some((a) => a.toLowerCase().includes(t)))).slice(0, 8)
  }, [q, exclude])
  return (
    <div className="relative">
      <div className={cn('flex items-center gap-2 rounded-2xl bg-surface-1 px-3.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent/50', compact ? 'h-11' : 'h-13')}>
        {compact ? <Plus size={16} className="text-faint" /> : <Search size={17} className="text-faint" />}
        <input
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => window.setTimeout(() => setFocus(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              onPick(results[0].id)
              setQ('')
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
        />
      </div>
      <AnimatePresence>
        {focus && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl bg-surface-1 p-1.5 shadow-(--shadow-float) ring-1 ring-line"
          >
            {results.map((d) => (
              <li key={d.id}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(d.id)
                    setQ('')
                    ref.current?.blur()
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="text-[14px] text-ink">{d.name}</span>
                  <span className="shrink-0 text-[11px] text-faint">{d.group}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
