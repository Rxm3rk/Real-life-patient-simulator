import { ChevronDown, ChevronRight, Eye, EyeOff, MessageSquareQuote, Search } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PatientAvatar } from '../../components/PatientAvatar'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { CASE_META, cachedCase, loadCase } from '../../content/cases'
import { DIAG_BY_ID } from '../../content/diagnoses'
import { INV_BY_ID, resultFor } from '../../content/investigations'
import { MGMT_BY_ID } from '../../content/management'
import type { CaseDef, RubricItem, Vitals } from '../../engine/types'
import { Link, navigate } from '../../lib/router'
import { cn } from '../../lib/utils'

/**
 * The one-page version of a case, for the ten minutes before a clinical
 * session: who they are, what you find, what you order, what it is and what
 * you do — with the presentation to say out loud and the viva questions.
 */
export default function CaseCard({ id, onClose }: { id: string; onClose: () => void }) {
  const meta = CASE_META[id]
  const [c, setC] = useState<CaseDef | null>(() => cachedCase(id) ?? null)
  const [quiz, setQuiz] = useState(false)

  useEffect(() => {
    let alive = true
    if (!c || c.id !== id) loadCase(id).then((d) => alive && setC(d))
    return () => {
      alive = false
    }
  }, [id, c])

  if (!meta) return null

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title={meta.presenting}
      description={`${meta.patientLabel}, ${meta.age}${meta.sex === 'male' ? 'M' : 'F'} · ${meta.setting}`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 sm:flex-none" leading={quiz ? <Eye size={16} /> : <EyeOff size={16} />} onClick={() => setQuiz((q) => !q)}>
            {quiz ? 'Show all' : 'Quiz me'}
          </Button>
          <Button variant="primary" className="flex-1" trailing={<ChevronRight size={16} />} onClick={() => navigate(`/case/${id}`)}>
            See the patient
          </Button>
        </div>
      }
    >
      {!c ? (
        <div className="grid h-40 place-items-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-r-transparent" />
        </div>
      ) : (
        <Body c={c} quiz={quiz} />
      )}
    </Sheet>
  )
}

function Body({ c, quiz }: { c: CaseDef; quiz: boolean }) {
  const diag = DIAG_BY_ID[c.diagnosis.correct]?.name ?? c.title
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3.5">
        <PatientAvatar a={c.patient.appearance} caseId={c.id} id={`cc-${c.id}`} className="h-16 w-16 shrink-0" />
        <p className="min-w-0 flex-1 text-[14px] leading-relaxed text-muted">{c.stem}</p>
      </div>

      <VitalsRow v={c.vitals} />

      <Block title="What you find" tone="ink">
        <ul className="space-y-1.5">
          {c.teaching.keyFindings.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-ink">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {f}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Diagnosis" tone="accent">
        <Hidden hide={quiz} label="Show diagnosis">
          <div className="text-[17px] font-semibold text-ink">{diag}</div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.teaching.summary}</p>
          {c.diagnosis.differentials.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-semibold tracking-[0.1em] text-faint uppercase">Differentials</div>
              <div className="flex flex-wrap gap-1.5">
                {c.diagnosis.differentials.map((d) => (
                  <span key={d} className="rounded-full bg-surface-2 px-2.5 py-1 text-[12.5px] text-ink ring-1 ring-line">
                    {DIAG_BY_ID[d]?.name ?? d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Hidden>
      </Block>

      <Block title="Investigations">
        <Hidden hide={quiz} label="Show investigations">
          <Rubric
            items={c.investigationRubric.essential}
            name={(id) => INV_BY_ID[id]?.name ?? id}
            detail={(id) => resultFor(id, c).interpretation}
          />
          {!!c.investigationRubric.helpful?.length && <Minor label="Also useful" items={c.investigationRubric.helpful} name={(id) => INV_BY_ID[id]?.name ?? id} />}
          {!!c.investigationRubric.avoid?.length && <Minor label="Avoid" items={c.investigationRubric.avoid} name={(id) => INV_BY_ID[id]?.name ?? id} danger />}
        </Hidden>
      </Block>

      <Block title="Management">
        <Hidden hide={quiz} label="Show management">
          <Rubric items={c.management.essential} name={(id) => MGMT_BY_ID[id]?.label ?? id} numbered />
          {!!c.management.helpful?.length && <Minor label="Also" items={c.management.helpful} name={(id) => MGMT_BY_ID[id]?.label ?? id} />}
          {!!c.management.avoid?.length && <Minor label="Avoid" items={c.management.avoid} name={(id) => MGMT_BY_ID[id]?.label ?? id} danger />}
        </Hidden>
      </Block>

      <Block title="Present it" icon={<MessageSquareQuote size={15} />}>
        <Hidden hide={quiz} label="Show presentation">
          <p className="border-l-2 border-accent/50 pl-3.5 text-[14px] leading-relaxed text-ink italic">{c.teaching.presentation}</p>
        </Hidden>
      </Block>

      {c.teaching.pearls.length > 0 && (
        <Block title="Pearls">
          <ul className="space-y-1.5">
            {c.teaching.pearls.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-muted">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {p}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {c.viva.length > 0 && (
        <Block title={`Viva (${c.viva.length})`}>
          <div className="space-y-2">
            {c.viva.map((v) => (
              <Viva key={v.id} q={v.q} a={v.answer} startOpen={!quiz} />
            ))}
          </div>
        </Block>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[12px] text-faint">
        <div className="min-w-0">{c.teaching.references?.join(' · ')}</div>
        <Link to={`/ask?q=${encodeURIComponent(diag)}`} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
          <Search size={13} /> Ask about {diag.toLowerCase()}
        </Link>
      </div>
    </div>
  )
}

function Block({ title, children, tone, icon }: { title: string; children: ReactNode; tone?: 'accent' | 'ink'; icon?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl p-4 ring-1', tone === 'accent' ? 'bg-accent-soft/35 ring-accent/25' : 'bg-surface-2/40 ring-line')}>
      <h3 className={cn('mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.12em] uppercase', tone === 'accent' ? 'text-accent' : 'text-faint')}>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Covers an answer until tapped (quiz mode). */
function Hidden({ hide, label, children }: { hide: boolean; label: string; children: ReactNode }) {
  const [shown, setShown] = useState(false)
  useEffect(() => setShown(false), [hide])
  if (!hide || shown) return <>{children}</>
  return (
    <button onClick={() => setShown(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-[13.5px] font-medium text-muted hover:text-ink">
      <Eye size={15} /> {label}
    </button>
  )
}

function Rubric({ items, name, detail, numbered }: { items: RubricItem[]; name: (id: string) => string; detail?: (id: string) => string | undefined; numbered?: boolean }) {
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => {
        const d = detail?.(it.id)
        return (
          <li key={it.id} className="flex gap-2.5">
            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold', numbered ? 'bg-ink text-bg' : 'bg-accent/15 text-accent')}>
              {numbered ? i + 1 : '✓'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] leading-snug font-medium text-ink">{name(it.id)}</div>
              {d && <div className="mt-0.5 text-[13px] leading-relaxed text-ink/80">→ {d}</div>}
              {it.why && <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{it.why}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Minor({ label, items, name, danger }: { label: string; items: RubricItem[]; name: (id: string) => string; danger?: boolean }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className={cn('mb-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase', danger ? 'text-danger' : 'text-faint')}>{label}</div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="text-[13px] leading-relaxed text-muted">
            <span className={cn('font-medium', danger ? 'text-danger' : 'text-ink')}>{name(it.id)}</span>
            {it.why && <> — {it.why}</>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Viva({ q, a, startOpen }: { q: string; a: string; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  useEffect(() => setOpen(startOpen), [startOpen])
  return (
    <div className="rounded-xl bg-surface-1 ring-1 ring-line">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-2 px-3.5 py-3 text-left">
        <span className="flex-1 text-[14px] leading-snug font-medium text-ink">{q}</span>
        <ChevronDown size={16} className={cn('mt-0.5 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && <p className="-mt-1 px-3.5 pb-3 text-[13.5px] leading-relaxed text-muted">{a}</p>}
    </div>
  )
}

const flag = {
  hr: (v: number) => v > 100 || v < 50,
  sbp: (v: number) => v < 100 || v > 180,
  rr: (v: number) => v > 20 || v < 10,
  spo2: (v: number) => v < 94,
  temp: (v: number) => v >= 38 || v < 36,
}

function VitalsRow({ v }: { v: Vitals }) {
  const cells: { k: string; val: string; bad: boolean }[] = [
    { k: 'HR', val: `${v.hr}${v.rhythm === 'irregular' ? ' irreg' : ''}`, bad: flag.hr(v.hr) || v.rhythm === 'irregular' },
    { k: 'BP', val: `${v.sbp}/${v.dbp}`, bad: flag.sbp(v.sbp) },
    { k: 'RR', val: `${v.rr}`, bad: flag.rr(v.rr) },
    { k: 'SpO₂', val: `${v.spo2}%${v.o2 ? ` ${v.o2}` : ''}`, bad: flag.spo2(v.spo2) },
    { k: 'Temp', val: `${v.temp.toFixed(1)}°`, bad: flag.temp(v.temp) },
  ]
  if (v.avpu && v.avpu !== 'A') cells.push({ k: 'AVPU', val: v.avpu, bad: true })
  if (v.pain != null) cells.push({ k: 'Pain', val: `${v.pain}/10`, bad: v.pain >= 7 })
  if (v.bm != null) cells.push({ k: 'BM', val: `${v.bm}`, bad: v.bm < 4 || v.bm > 11 })
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      {cells.map((x) => (
        <div key={x.k} className={cn('rounded-xl px-2 py-2 text-center ring-1', x.bad ? 'bg-danger/10 ring-danger/30' : 'bg-surface-2/50 ring-line')}>
          <div className="text-[10.5px] font-semibold tracking-wide text-faint uppercase">{x.k}</div>
          <div className={cn('mt-0.5 truncate font-mono text-[13px] font-semibold tabular-nums', x.bad ? 'text-danger' : 'text-ink')}>{x.val}</div>
        </div>
      ))}
    </div>
  )
}
