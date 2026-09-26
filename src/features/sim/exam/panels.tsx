import { AlertCircle, Check, ChevronRight, Eye, Lightbulb, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { REGION_LABEL, REGION_ORDER, REGION_SHORT, type RegionId } from '../../../anatomy/bodyModel'
import { Button } from '../../../components/ui/Button'
import { Badge, ProgressBar } from '../../../components/ui/primitives'
import { ACTION_BY_ID, type ViewId } from '../../../engine/abdoActions'
import type { EncounterState } from '../../../engine/encounter'
import type { ProtocolStep, StepCtx } from '../../../engine/protocols/abdominal'
import type { Mode } from '../../../engine/types'
import { cn } from '../../../lib/utils'

export const VIEW_ACTIONS: Record<ViewId, { title: string; ids: string[] }[]> = {
  bed: [{ title: 'General inspection', ids: ['gen.endOfBed', 'gen.obs'] }],
  hands: [{ title: 'Hands & arms', ids: ['hands.inspect', 'hands.clubbing', 'hands.temp', 'hands.crt', 'hands.flap', 'hands.pulse', 'arms.inspect'] }],
  face: [{ title: 'Face', ids: ['face.eyes', 'face.mouth', 'face.fetor'] }],
  neck: [{ title: 'Neck', ids: ['neck.nodes'] }],
  chest: [{ title: 'Chest', ids: ['chest.inspect'] }],
  abdomen: [
    { title: 'Inspection', ids: ['abdo.inspect', 'abdo.inspectSide', 'abdo.cough', 'abdo.headLift'] },
    { title: 'Organs', ids: ['abdo.liver', 'abdo.liverSpan', 'abdo.murphy', 'abdo.murphyLeft', 'abdo.spleen', 'abdo.kidneys', 'abdo.aorta', 'abdo.bladder'] },
    { title: 'Auscultation', ids: ['abdo.bowel', 'abdo.bruitAortic', 'abdo.bruitRenal'] },
    { title: 'Special tests', ids: ['abdo.shifting', 'abdo.thrill', 'abdo.rovsing', 'abdo.psoas', 'abdo.obturator', 'abdo.carnett', 'abdo.succussion'] },
  ],
  groin: [{ title: 'Hernial orifices', ids: ['groin.expose', 'groin.inguinalR', 'groin.inguinalL', 'groin.femoralR', 'groin.femoralL', 'groin.umbilical', 'groin.cough', 'groin.femoralPulses'] }],
  legs: [{ title: 'Legs', ids: ['legs.oedema'] }],
}

export const PREP_IDS = ['comm.wash', 'comm.intro', 'comm.identity', 'comm.consent', 'comm.chaperone', 'comm.pain', 'comm.position', 'comm.expose', 'comm.analgesia']
export const FINISH_IDS = ['comm.thank', 'comm.wash', 'complete.hernial', 'complete.dre', 'complete.genitalia', 'complete.urinalysis', 'complete.pregnancy', 'complete.cvsResp']

export function ActionButton({ id, done, highlight, onClick, compact }: { id: string; done: boolean; highlight?: boolean; onClick: () => void; compact?: boolean }) {
  const a = ACTION_BY_ID[id]
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-2 rounded-xl text-left ring-1 transition active:scale-[0.98]',
        compact ? 'h-9 px-3 text-[12.5px]' : 'min-h-10 px-3 py-2 text-[13px]',
        done ? 'bg-surface-2/70 text-muted ring-transparent' : 'bg-surface-1 text-ink ring-line hover:ring-accent/50',
        highlight && 'ring-2 ring-accent',
      )}
      title={a?.label}
    >
      {highlight && <span className="absolute -inset-0.5 animate-[blink-soft_1.4s_ease-in-out_infinite] rounded-xl ring-2 ring-accent/60" />}
      <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full', done ? 'bg-success text-white' : 'ring-1 ring-line-strong')}>{done && <Check size={10} strokeWidth={3.5} />}</span>
      <span className="leading-tight">{compact ? a?.short ?? a?.label : a?.label}</span>
    </button>
  )
}

export function RegionPad({ onPick, state, disabled }: { onPick: (r: RegionId) => void; state?: Partial<Record<RegionId, 'light' | 'deep'>>; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {REGION_ORDER.map((r) => (
        <button
          key={r}
          disabled={disabled}
          onClick={() => onPick(r)}
          title={REGION_LABEL[r]}
          className={cn(
            'h-11 rounded-xl px-1 text-[11.5px] font-medium ring-1 transition active:scale-95 disabled:opacity-40',
            state?.[r] === 'deep' ? 'bg-accent/15 text-ink ring-accent/40' : state?.[r] === 'light' ? 'bg-info/10 text-ink ring-info/30' : 'bg-surface-1 text-muted ring-line hover:text-ink',
          )}
        >
          {REGION_SHORT[r]}
        </button>
      ))}
    </div>
  )
}

export function FindingsLog({ s, mode, revealed, onReveal }: { s: EncounterState; mode: Mode; revealed: Set<number>; onReveal: (t: number) => void }) {
  const items = useMemo(() => s.log.filter((e) => e.obs && !e.action.startsWith('comm.') && e.action !== 'groin.expose').slice().reverse(), [s.log])
  if (!items.length)
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Eye size={22} className="text-faint" />
        <div className="text-[13px] text-muted">Your findings will appear here as you examine.</div>
      </div>
    )
  return (
    <ol className="space-y-2">
      {items.map((e) => {
        const a = ACTION_BY_ID[e.action]
        const label = e.region ? `${a?.short ?? a?.label} · ${REGION_SHORT[e.region]}` : a?.label ?? e.action
        const showMeaning = !!e.obs?.meaning && (mode === 'learn' || revealed.has(e.t))
        return (
          <motion.li key={`${e.t}-${e.action}`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-surface-1 p-3 ring-1 ring-line">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold tracking-wide text-faint uppercase">{label}</div>
              {e.obs?.abnormal && mode !== 'osce' && (
                <Badge tone="warning" dot>
                  abnormal
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[13.5px] leading-snug text-ink">{e.obs?.text}</p>
            {showMeaning && (
              <p className="mt-1.5 flex gap-1.5 text-[12.5px] leading-snug text-violet">
                <Sparkles size={13} className="mt-0.5 shrink-0" />
                {e.obs?.meaning}
              </p>
            )}
            {!showMeaning && e.obs?.meaning && mode === 'practice' && (
              <button onClick={() => onReveal(e.t)} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-violet hover:underline">
                <Lightbulb size={12} /> What does this mean?
              </button>
            )}
          </motion.li>
        )
      })}
    </ol>
  )
}

export function GuidePanel({
  steps,
  x,
  onGo,
}: {
  steps: ProtocolStep[]
  x: StepCtx
  onGo: (st: ProtocolStep) => void
}) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const applicable = steps.filter((st) => !st.applies || st.applies(x))
  const status = (st: ProtocolStep) => {
    const d = st.done(x)
    const v = typeof d === 'number' ? d : d ? 1 : 0
    return v
  }
  const next = applicable.find((st) => status(st) < 0.99)
  const done = applicable.filter((st) => status(st) >= 0.99).length
  const sections = [...new Set(applicable.map((s) => s.section))]
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-[12px] text-muted">
          <span>Macleod’s sequence</span>
          <span className="font-mono tabular">
            {done}/{applicable.length}
          </span>
        </div>
        <ProgressBar value={done / applicable.length} className="mt-1.5" />
      </div>
      {next && (
        <div className="rounded-2xl bg-accent-soft p-4 ring-1 ring-accent/25">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-accent uppercase">Next step · {next.section}</div>
          <div className="mt-1 text-[15px] font-semibold text-ink">{next.label}</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{next.why}</p>
          {next.how && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              <b className="text-ink">How: </b>
              {next.how}
            </p>
          )}
          {next.look && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              <b className="text-ink">Look for: </b>
              {next.look}
            </p>
          )}
          <Button size="sm" variant="primary" className="mt-3" onClick={() => onGo(next)} trailing={<ChevronRight size={15} />}>
            Show me
          </Button>
        </div>
      )}
      <div className="space-y-1">
        {sections.map((sec) => {
          const items = applicable.filter((s) => s.section === sec)
          const secDone = items.filter((s) => status(s) >= 0.99).length
          const open = openSection === sec || (openSection === null && next?.section === sec)
          return (
            <div key={sec} className="rounded-xl ring-1 ring-line">
              <button onClick={() => setOpenSection(open ? '' : sec)} className="flex w-full items-center justify-between px-3 py-2.5 text-left">
                <span className="text-[13px] font-semibold text-ink">{sec}</span>
                <span className={cn('font-mono text-[11.5px] tabular', secDone === items.length ? 'text-success' : 'text-faint')}>
                  {secDone}/{items.length}
                </span>
              </button>
              {open && (
                <ul className="space-y-0.5 px-2 pb-2">
                  {items.map((st) => {
                    const v = status(st)
                    return (
                      <li key={st.id}>
                        <button onClick={() => onGo(st)} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] hover:bg-surface-2">
                          <span
                            className={cn(
                              'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px]',
                              v >= 0.99 ? 'bg-success text-white' : v > 0 ? 'bg-warning/80 text-white' : 'ring-1 ring-line-strong',
                            )}
                          >
                            {v >= 0.99 ? <Check size={10} strokeWidth={3.5} /> : v > 0 ? '½' : ''}
                          </span>
                          <span className={cn(v >= 0.99 ? 'text-muted' : 'text-ink')}>{st.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function OrderWarning({ messages }: { messages: string[] }) {
  if (!messages.length) return null
  return (
    <div className="space-y-1.5">
      {messages.map((m) => (
        <div key={m} className="flex gap-2 rounded-xl bg-warning/10 px-3 py-2 text-[12.5px] leading-snug text-warning ring-1 ring-warning/20">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {m}
        </div>
      ))}
    </div>
  )
}
