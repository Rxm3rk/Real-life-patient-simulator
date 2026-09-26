import { ArrowRight, Check, Clock, FlaskConical, Search, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Badge, Segmented } from '../../../components/ui/primitives'
import { formatTat, INV_BY_ID, INVESTIGATIONS, resultFor, type InvCategory } from '../../../content/investigations'
import type { CaseDef, InvestigationResult } from '../../../engine/types'
import { useMediaQuery } from '../../../lib/hooks'
import { cn } from '../../../lib/utils'
import { useEncounter } from '../../../store/encounter'

const CATS: InvCategory[] = ['Bedside', 'Bloods', 'Imaging', 'Endoscopy & tissue']

export default function InvestigationsPhase({ c, onNext }: { c: CaseDef; onNext?: () => void }) {
  const s = useEncounter((st) => st.s)!
  const toggle = useEncounter((st) => st.toggleOrder)
  const view = useEncounter((st) => st.viewResult)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'order' | 'results'>('order')
  const [fresh, setFresh] = useState<Set<string>>(new Set())

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return INVESTIGATIONS.filter((i) => (!i.sex || i.sex === c.patient.sex) && (!term || i.name.toLowerCase().includes(term) || i.short?.toLowerCase().includes(term)))
  }, [q, c.patient.sex])

  const order = (id: string) => {
    const wasOrdered = s.ordered.includes(id)
    toggle(id)
    if (!wasOrdered) {
      setFresh((f) => new Set(f).add(id))
      window.setTimeout(() => {
        setFresh((f) => {
          const n = new Set(f)
          n.delete(id)
          return n
        })
        view(id)
      }, 900)
    }
  }

  const catalog = (
    <div className="space-y-5">
      <div className="flex h-11 items-center gap-2 rounded-xl bg-surface-1 px-3 ring-1 ring-line focus-within:ring-accent/60">
        <Search size={16} className="text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests…" className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint" />
      </div>
      {CATS.map((cat) => {
        const items = list.filter((i) => i.cat === cat)
        if (!items.length) return null
        return (
          <div key={cat}>
            <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">{cat}</div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {items.map((i) => {
                const on = s.ordered.includes(i.id)
                return (
                  <button
                    key={i.id}
                    onClick={() => order(i.id)}
                    className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition active:scale-[0.99]', on ? 'bg-accent-soft ring-accent/40' : 'bg-surface-1 ring-line hover:ring-line-strong')}
                  >
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1', on ? 'bg-accent text-accent-fg ring-accent' : 'ring-line-strong')}>{on && <Check size={13} strokeWidth={3} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{i.name}</span>
                      <span className="flex items-center gap-1 text-[11.5px] text-faint">
                        <Clock size={11} /> {formatTat(i.tat)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  const results = (
    <div className="space-y-3">
      {s.ordered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
          <FlaskConical size={24} className="text-faint" />
          <div className="text-[14px] font-medium text-ink">No investigations requested yet</div>
          <p className="max-w-xs text-[13px] text-muted">Think about what will confirm your diagnosis, exclude dangerous alternatives, and prepare the patient for treatment.</p>
        </div>
      )}
      <AnimatePresence initial={false}>
        {[...s.ordered].reverse().map((id) => (
          <motion.div key={id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <ResultCard id={id} c={c} pending={fresh.has(id)} learn={s.mode === 'learn'} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  useEffect(() => {
    if (!desktop && s.ordered.length && tab === 'order') return
  }, [desktop, s.ordered.length, tab])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!desktop && (
        <div className="border-b border-line p-3">
          <Segmented
            layoutId="invtab"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'order', label: 'Request' },
              { value: 'results', label: `Results${s.ordered.length ? ` · ${s.ordered.length}` : ''}` },
            ]}
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {(desktop || tab === 'order') && <div className={cn('min-h-0 overflow-y-auto p-4 scrollbar-thin sm:p-6', desktop ? 'w-[440px] shrink-0 border-r border-line' : 'flex-1')}>{catalog}</div>}
        {(desktop || tab === 'results') && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin sm:p-6">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-ink">Results</h2>
                <span className="text-[12px] text-faint">Electronic patient record · {c.patient.name}</span>
              </div>
              {results}
            </div>
          </div>
        )}
      </div>
      {onNext && (
        <div className="flex justify-end border-t border-line px-4 py-3 safe-bottom">
          <Button variant="primary" size="sm" onClick={onNext} trailing={<ArrowRight size={15} />}>
            Diagnosis & plan
          </Button>
        </div>
      )}
    </div>
  )
}

function ResultCard({ id, c, pending, learn }: { id: string; c: CaseDef; pending: boolean; learn: boolean }) {
  const def = INV_BY_ID[id]
  const r: InvestigationResult = resultFor(id, c)
  const abnormal = r.abnormal ?? !!r.values?.some((v) => v.flag)
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-1 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-ink">{def?.name ?? id}</div>
          <div className="text-[11.5px] text-faint">{def?.cat}</div>
        </div>
        {pending ? (
          <Badge tone="info">Processing…</Badge>
        ) : abnormal ? (
          <Badge tone="warning" dot>
            Abnormal
          </Badge>
        ) : (
          <Badge tone="success">Reported</Badge>
        )}
      </div>
      {pending ? (
        <div className="space-y-2 p-4">
          {[0.9, 0.7, 0.8].map((w, i) => (
            <div key={i} className="h-3 animate-[shimmer_1.2s_linear_infinite] rounded-full bg-[linear-gradient(90deg,var(--surface-2),var(--surface-3),var(--surface-2))] bg-[length:200%_100%]" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      ) : (
        <div className="p-4">
          {r.values && (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-faint uppercase">
                  <th className="pb-1.5 font-semibold">Test</th>
                  <th className="pb-1.5 text-right font-semibold">Result</th>
                  <th className="hidden pb-1.5 pl-3 font-semibold sm:table-cell">Units</th>
                  <th className="pb-1.5 pl-3 text-right font-semibold">Range</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular">
                {r.values.map((v) => (
                  <tr key={v.name} className="border-t border-line/60">
                    <td className="py-1.5 font-sans text-ink">{v.name}</td>
                    <td className={cn('py-1.5 text-right font-semibold', v.flag?.startsWith('H') ? 'text-danger' : v.flag?.startsWith('L') ? 'text-info' : 'text-ink')}>
                      {v.value}
                      {v.flag && <span className="ml-1 text-[10px]">{v.flag}</span>}
                    </td>
                    <td className="hidden py-1.5 pl-3 text-muted sm:table-cell">{v.unit}</td>
                    <td className="py-1.5 pl-3 text-right text-faint">{v.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {r.report && <p className="text-[13.5px] leading-relaxed text-ink">{r.report}</p>}
          {learn && r.interpretation && (
            <p className="mt-3 flex gap-1.5 rounded-xl bg-violet/8 px-3 py-2 text-[12.5px] leading-snug text-violet">
              <Sparkles size={13} className="mt-0.5 shrink-0" />
              {r.interpretation}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
