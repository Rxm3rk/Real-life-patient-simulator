import { AlertTriangle, ArrowLeft, ChevronRight, ListOrdered, Stethoscope } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/primitives'
import { CASES } from '../../content/cases'
import { protocolFor } from '../../engine/protocols'
import type { ExamKind } from '../../engine/types'
import { Link, navigate } from '../../lib/router'
import { cn } from '../../lib/utils'
import { ROUTINE_BY_KIND, ROUTINES, routineTask } from './routines'

export default function Routine({ kind }: { kind?: string }) {
  const meta = kind ? ROUTINE_BY_KIND[kind as ExamKind] : undefined
  const [expanded, setExpanded] = useState<string | null>(null)
  if (!meta)
    return (
      <Page>
        <p className="text-muted">
          Routine not found. <Link to="/learn" className="font-medium text-accent">Back to Learn</Link>
        </p>
      </Page>
    )
  const proto = protocolFor(meta.kind)
  const sections = [...new Set(proto.steps.map((s) => s.section))]
  const cases = CASES.filter((c) => c.exam === meta.kind)
  let n = 0

  return (
    <Page>
      <button onClick={() => navigate('/learn')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Learn
      </button>
      <PageHeader
        eyebrow="Examination routine · Macleod’s"
        title={meta.title}
        subtitle={`“${routineTask(meta.kind)}.” ${meta.blurb}`}
        actions={
          <Button variant="primary" onClick={() => navigate(`/learn/drill/${meta.kind}`)} leading={<ListOrdered size={16} />}>
            Drill the order
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {sections.map((sec) => (
            <section key={sec}>
              <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.14em] text-faint uppercase">{sec}</h2>
              <ol className="space-y-2">
                {proto.steps
                  .filter((s) => s.section === sec)
                  .map((st) => {
                    n++
                    const open = expanded === st.id
                    const more = !!(st.how || st.look)
                    return (
                      <motion.li key={st.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-surface-1 ring-1 ring-line">
                        <button onClick={() => more && setExpanded(open ? null : st.id)} className={cn('flex w-full items-start gap-3 p-4 text-left', !more && 'cursor-default')}>
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[12px] font-semibold text-ink tabular">{n}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-[14.5px] font-semibold text-ink">{st.label}</span>
                              {st.marks >= 2 && <Badge tone="accent">{st.marks} marks</Badge>}
                              {st.applies && <Badge>if relevant</Badge>}
                            </span>
                            <span className="mt-1 block text-[13px] leading-relaxed text-muted">{st.why}</span>
                            {open && st.how && (
                              <span className="mt-2 block text-[13px] leading-relaxed text-ink">
                                <b>How: </b>
                                {st.how}
                              </span>
                            )}
                            {open && st.look && (
                              <span className="mt-1.5 block text-[13px] leading-relaxed text-ink">
                                <b>Look for: </b>
                                {st.look}
                              </span>
                            )}
                          </span>
                          {more && <ChevronRight size={16} className={cn('mt-1 shrink-0 text-faint transition', open && 'rotate-90')} />}
                        </button>
                      </motion.li>
                    )
                  })}
              </ol>
            </section>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {proto.rules.length > 0 && (
            <div className="rounded-2xl bg-warning/8 p-4 ring-1 ring-warning/25">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-warning">
                <AlertTriangle size={15} /> Examiners mark you down for
              </div>
              <ul className="mt-2.5 space-y-2">
                {proto.rules.map((r) => (
                  <li key={r.id} className="text-[12.5px] leading-snug text-ink">
                    {r.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl bg-surface-1 p-4 ring-1 ring-line">
            <div className="text-[13px] font-semibold text-ink">Practise it on a patient</div>
            <ul className="mt-2.5 space-y-1.5">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link to={`/case/${c.id}`} className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-[13px] text-muted transition hover:bg-surface-2 hover:text-ink">
                    <span className="flex min-w-0 items-center gap-2">
                      <Stethoscope size={14} className="shrink-0 text-faint" />
                      <span className="truncate">{c.presenting}</span>
                    </span>
                    <ChevronRight size={14} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-surface-1 p-4 ring-1 ring-line">
            <div className="text-[13px] font-semibold text-ink">Other routines</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROUTINES.filter((r) => r.kind !== meta.kind).map((r) => (
                <Link key={r.kind} to={`/learn/routine/${r.kind}`} className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium text-muted ring-1 ring-line transition hover:text-ink">
                  {r.short}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Page>
  )
}
