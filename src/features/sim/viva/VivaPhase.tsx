import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { uiTick } from '../../../audio/engine'
import { Button } from '../../../components/ui/Button'
import type { CaseDef } from '../../../engine/types'
import { cn } from '../../../lib/utils'
import { useEncounter } from '../../../store/encounter'

export default function VivaPhase({ c, onDone }: { c: CaseDef; onDone: () => void }) {
  const s = useEncounter((st) => st.s)!
  const answer = useEncounter((st) => st.answerViva)
  const [i, setI] = useState(() => Math.max(0, c.viva.findIndex((q) => !s.viva[q.id])))
  const q = c.viva[i]
  const a = s.viva[q?.id]
  const [draft, setDraft] = useState('')
  const [shown, setShown] = useState(false)
  if (!q) return null

  const isMcq = !!q.options
  const answered = isMcq ? a?.choice !== undefined : a?.self !== undefined
  const reveal = isMcq ? answered : shown || answered

  const go = (n: number) => {
    setI(n)
    setDraft(s.viva[c.viva[n]?.id]?.text ?? '')
    setShown(false)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet/12 text-violet ring-1 ring-violet/25">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-ink">The examiner has some questions</div>
            <div className="text-[13px] text-muted">
              Question {i + 1} of {c.viva.length}
              {q.topic ? ` · ${q.topic}` : ''}
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-1.5">
          {c.viva.map((qq, k) => {
            const aa = s.viva[qq.id]
            const ok = qq.options ? aa?.choice === qq.correct : (aa?.self ?? 0) >= 0.5
            const done = qq.options ? aa?.choice !== undefined : aa?.self !== undefined
            return (
              <button
                key={qq.id}
                onClick={() => go(k)}
                className={cn('h-1.5 flex-1 rounded-full transition', k === i ? 'bg-ink' : done ? (ok ? 'bg-success' : 'bg-danger/70') : 'bg-surface-3')}
                aria-label={`Question ${k + 1}`}
              />
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            <h2 className="text-[20px] leading-snug font-semibold text-ink sm:text-[22px]">“{q.q}”</h2>

            {isMcq ? (
              <div className="mt-5 space-y-2">
                {q.options!.map((opt, k) => {
                  const chosen = a?.choice === k
                  const correct = q.correct === k
                  return (
                    <button
                      key={k}
                      disabled={answered}
                      onClick={() => {
                        answer(q.id, { choice: k })
                        uiTick(k === q.correct ? 'success' : 'warn')
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[14.5px] ring-1 transition',
                        !answered && 'bg-surface-1 text-ink ring-line hover:ring-accent/50',
                        answered && correct && 'bg-success/10 text-ink ring-success/40',
                        answered && chosen && !correct && 'bg-danger/10 text-ink ring-danger/40',
                        answered && !chosen && !correct && 'bg-surface-1 text-muted ring-line',
                      )}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-bold text-muted ring-1 ring-line">{String.fromCharCode(65 + k)}</span>
                      <span className="flex-1">{opt}</span>
                      {answered && correct && <CheckCircle2 size={18} className="text-success" />}
                      {answered && chosen && !correct && <XCircle size={18} className="text-danger" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-5">
                <textarea
                  value={draft || a?.text || ''}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  placeholder="Answer as you would out loud to the examiner…"
                  disabled={reveal}
                  className="w-full resize-y rounded-2xl bg-surface-1 px-4 py-3 text-[14.5px] leading-relaxed text-ink ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/50 disabled:opacity-80"
                />
                {!reveal && (
                  <Button
                    className="mt-3"
                    variant="primary"
                    onClick={() => {
                      answer(q.id, { text: draft })
                      setShown(true)
                    }}
                  >
                    Reveal model answer
                  </Button>
                )}
              </div>
            )}

            {reveal && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-violet/8 p-4 ring-1 ring-violet/20">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-violet uppercase">Model answer</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{q.answer}</p>
                {!isMcq && (
                  <div className="mt-4">
                    <div className="mb-2 text-[12.5px] font-medium text-muted">How did you do?</div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        [0, 'Missed it'],
                        [0.5, 'Partly'],
                        [1, 'Got it'],
                      ] as const).map(([v, label]) => (
                        <button
                          key={label}
                          onClick={() => answer(q.id, { self: v })}
                          className={cn(
                            'h-10 rounded-xl text-[13px] font-semibold ring-1 transition',
                            a?.self === v ? (v === 1 ? 'bg-success text-white ring-success' : v === 0.5 ? 'bg-warning text-white ring-warning' : 'bg-danger text-white ring-danger') : 'bg-surface-1 text-ink ring-line hover:ring-line-strong',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between safe-bottom">
          <Button variant="ghost" onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} leading={<ArrowLeft size={16} />}>
            Back
          </Button>
          {i < c.viva.length - 1 ? (
            <Button variant="primary" onClick={() => go(i + 1)} trailing={<ArrowRight size={16} />} disabled={!answered && isMcq}>
              Next question
            </Button>
          ) : (
            <Button variant="primary" onClick={onDone} trailing={<ArrowRight size={16} />}>
              Finish station
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
