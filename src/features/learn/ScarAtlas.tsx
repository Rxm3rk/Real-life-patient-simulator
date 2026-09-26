import { ArrowLeft, Check, HelpCircle, Layers, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { uiTick } from '../../audio/engine'
import { Body } from '../../anatomy/Body'
import { bodyDims, landmarks } from '../../anatomy/bodyModel'
import { SCAR_INFO, scarAnchor } from '../../anatomy/Scars'
import type { Appearance, ScarId } from '../../anatomy/types'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/primitives'
import { navigate } from '../../lib/router'
import { cn, shuffle } from '../../lib/utils'
import { useProgress } from '../../store/progress'

const TORSO: Appearance = { sex: 'male', age: 50, skinTone: 2, habitus: 'average', hair: 'short', hairColor: 'brown', eyeColor: 'brown', facialHair: 'none' }
const ALL = Object.keys(SCAR_INFO) as ScarId[]

export default function ScarAtlas() {
  const [mode, setMode] = useState<'explore' | 'quiz'>('explore')
  const [sel, setSel] = useState<ScarId>('midline')
  const [quiz, setQuiz] = useState(() => newQuestion())
  const [answer, setAnswer] = useState<ScarId | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const record = useProgress((s) => s.recordDrill)
  const d = useMemo(() => bodyDims(TORSO), [])
  const lm = useMemo(() => landmarks(TORSO, d), [d])

  const shown: ScarId = mode === 'quiz' ? quiz.scar : sel
  const a = useMemo(() => ({ ...TORSO, scars: [shown] }), [shown])
  const info = SCAR_INFO[sel]

  const choose = (id: ScarId) => {
    if (answer) return
    setAnswer(id)
    const ok = id === quiz.scar
    record(`scar:${quiz.scar}`, ok)
    uiTick(ok ? 'success' : 'warn')
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }))
  }

  return (
    <Page wide>
      <button onClick={() => navigate('/learn')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Learn
      </button>
      <PageHeader
        eyebrow="Scar atlas"
        title="Read the abdomen like a history"
        subtitle="Scars tell you what operations a patient has had before they say a word. Explore every classic incision, then test yourself."
        actions={
          <Segmented
            layoutId="scar-mode"
            value={mode}
            onChange={(m) => {
              setMode(m)
              setAnswer(null)
            }}
            options={[
              { value: 'explore', label: 'Explore', icon: <Layers size={14} /> },
              { value: 'quiz', label: 'Quiz me', icon: <HelpCircle size={14} /> },
            ]}
            className="w-[240px] whitespace-nowrap"
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative overflow-hidden rounded-3xl bg-stage ring-1 ring-line">
          <svg viewBox="-125 105 250 300" className="block aspect-[5/6] w-full" role="img" aria-label="Torso showing a surgical scar">
            <rect x="-400" y="-400" width="800" height="1200" fill="var(--stage)" />
            <Body a={a} pose={{ exposure: 'abdomen', pain: 0, wince: 0 }} id="scaratlas" standing clinic />
            {mode === 'explore' &&
              ALL.map((id) => {
                const [x, y] = scarAnchor(id, lm)
                const on = id === sel
                return (
                  <g key={id} transform={`translate(${x} ${y})`} onClick={() => setSel(id)} style={{ cursor: 'pointer' }}>
                    <circle r="9" fill="transparent" />
                    <circle r={on ? 3.6 : 2.6} fill={on ? 'var(--accent)' : '#fbbf3c'} stroke="#fff" strokeWidth="0.9" />
                  </g>
                )
              })}
          </svg>
          {mode === 'explore' && <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur">Tap a marker or pick from the list</div>}
        </div>

        <div className="space-y-4">
          {mode === 'explore' ? (
            <>
              <AnimatePresence mode="wait">
                <motion.div key={sel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-soft)">
                  <div className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">Incision</div>
                  <h2 className="mt-1 text-[20px] font-semibold text-ink">{info.name}</h2>
                  <div className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Typical operation</div>
                  <p className="mt-0.5 text-[14.5px] text-ink">{info.operation}</p>
                  {info.note && <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{info.note}</p>}
                </motion.div>
              </AnimatePresence>
              <div className="rounded-3xl bg-surface-1 p-2 ring-1 ring-line">
                {ALL.map((id) => (
                  <button
                    key={id}
                    onClick={() => setSel(id)}
                    className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13.5px] transition', id === sel ? 'bg-accent-soft font-semibold text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink')}
                  >
                    {SCAR_INFO[id].name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-soft)">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-semibold text-ink">Which incision is this?</div>
                <div className="font-mono text-[13px] text-muted tabular">
                  {score.right}/{score.total}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {quiz.options.map((id) => {
                  const correct = answer && id === quiz.scar
                  const wrong = answer === id && id !== quiz.scar
                  return (
                    <button
                      key={id}
                      onClick={() => choose(id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-[14px] ring-1 transition',
                        correct ? 'bg-success/12 text-ink ring-success/40' : wrong ? 'bg-danger/10 text-ink ring-danger/40' : 'bg-bg/40 text-ink ring-line hover:ring-accent/50',
                      )}
                    >
                      {SCAR_INFO[id].name}
                      {correct && <Check size={16} className="text-success" />}
                      {wrong && <X size={16} className="text-danger" />}
                    </button>
                  )
                })}
              </div>
              {answer && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-surface-2 p-4">
                  <div className="text-[13px] font-semibold text-ink">{SCAR_INFO[quiz.scar].operation}</div>
                  {SCAR_INFO[quiz.scar].note && <p className="mt-1 text-[13px] leading-relaxed text-muted">{SCAR_INFO[quiz.scar].note}</p>}
                  <Button
                    variant="primary"
                    className="mt-3 w-full"
                    onClick={() => {
                      setQuiz(newQuestion(quiz.scar))
                      setAnswer(null)
                    }}
                  >
                    Next scar
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

function newQuestion(prev?: ScarId): { scar: ScarId; options: ScarId[] } {
  const pool = ALL.filter((s) => s !== prev)
  const scar = pool[Math.floor(Math.random() * pool.length)]
  // distractors: prefer scars in a similar area, but any will do
  const others = shuffle(ALL.filter((s) => s !== scar)).slice(0, 3)
  return { scar, options: shuffle([scar, ...others]) }
}
