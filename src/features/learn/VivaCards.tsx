import { ArrowLeft, ArrowRight, Brain, Check, Eye, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { uiTick } from '../../audio/engine'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge, ProgressBar } from '../../components/ui/primitives'
import { CASES } from '../../content/cases'
import type { Specialty, VivaQuestion } from '../../engine/types'
import { navigate } from '../../lib/router'
import { useCaseDefs } from '../../lib/useCases'
import { cn, optionOrder, shuffle } from '../../lib/utils'
import { useProgress } from '../../store/progress'

interface Card {
  key: string
  caseId: string
  presenting: string
  title: string
  specialty: Specialty
  q: VivaQuestion
}

export default function VivaCards() {
  const defs = useCaseDefs()
  const drills = useProgress((s) => s.drills)
  const record = useProgress((s) => s.recordDrill)
  const [spec, setSpec] = useState<'All' | Specialty>('All')
  const [deckSeed, setDeckSeed] = useState(0)
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<number | null>(null)
  const [session, setSession] = useState({ right: 0, seen: 0 })

  const all: Card[] = useMemo(() => {
    const out: Card[] = []
    for (const m of CASES) {
      const c = defs[m.id]
      if (!c) continue
      for (const q of c.viva) out.push({ key: `viva:${c.id}:${q.id}`, caseId: c.id, presenting: m.presenting, title: c.title, specialty: c.specialty, q })
    }
    return out
  }, [defs])
  const specialties = useMemo(() => ['All', ...new Set(all.map((c) => c.specialty))] as ('All' | Specialty)[], [all])

  // Weakest first: unseen, then lowest success ratio, then least recently seen
  const deck = useMemo(() => {
    const pool = shuffle(all.filter((c) => spec === 'All' || c.specialty === spec))
    const score = (c: Card) => {
      const d = drills[c.key]
      if (!d) return -1
      return d.correct / Math.max(1, d.seen) + d.last / 1e15
    }
    return pool.sort((a, b) => score(a) - score(b))
    // drills intentionally excluded: re-sorting mid-session would reshuffle the deck
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, spec, deckSeed])

  const card = deck[i % Math.max(1, deck.length)]

  const grade = (ok: boolean) => {
    if (!card) return
    record(card.key, ok)
    setSession((s) => ({ right: s.right + (ok ? 1 : 0), seen: s.seen + 1 }))
    next()
  }
  const next = () => {
    setRevealed(false)
    setChoice(null)
    setI((x) => x + 1)
  }
  const pick = (k: number) => {
    if (!card || choice !== null) return
    setChoice(k)
    setRevealed(true)
    const ok = k === card.q.correct
    uiTick(ok ? 'success' : 'warn')
    record(card.key, ok)
    setSession((s) => ({ right: s.right + (ok ? 1 : 0), seen: s.seen + 1 }))
  }

  // keyboard: space reveals, → next, 1–4 choose
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === ' ' && !card.q.options) {
        e.preventDefault()
        setRevealed(true)
      } else if (e.key === 'ArrowRight' && (choice !== null || !card.q.options)) next()
      else if (card.q.options && /^[1-9]$/.test(e.key)) {
        const order = optionOrder(`${card.key}:${i}`, card.q.options.length)
        const k = order[Number(e.key) - 1]
        if (k !== undefined) pick(k)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const loading = Object.keys(defs).length < CASES.length

  return (
    <Page>
      <button onClick={() => navigate('/learn')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Learn
      </button>
      <PageHeader eyebrow="Viva flashcards" title="What would the examiner ask?" subtitle={`${all.length} examiner questions from every case, weakest first. Answer out loud before you reveal — that’s the skill.`} />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {specialties.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSpec(s)
              setI(0)
              setRevealed(false)
              setChoice(null)
              setDeckSeed((x) => x + 1)
            }}
            className={cn('h-8 rounded-full px-3 text-[12.5px] font-medium ring-1 transition', spec === s ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink')}
          >
            {s === 'All' ? 'All specialties' : s}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3 text-[12.5px] text-muted">
        <Brain size={15} className="text-accent" />
        <span>
          This session: <b className="text-ink">{session.right}</b> / {session.seen}
        </span>
        <ProgressBar value={deck.length ? (i % deck.length) / deck.length : 0} className="max-w-[200px]" height={4} />
      </div>

      {loading && !card ? (
        <div className="h-60 animate-pulse rounded-3xl bg-surface-1 ring-1 ring-line" />
      ) : card ? (
        <AnimatePresence mode="wait">
          <motion.div key={card.key + i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-lift) sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              {card.q.topic && <Badge tone="accent">{card.q.topic}</Badge>}
              <Badge>{card.specialty}</Badge>
              <span className="text-[12px] text-faint">Case: {card.presenting}</span>
            </div>
            <h2 className="mt-4 text-[20px] leading-snug font-semibold text-ink sm:text-[22px]">{card.q.q}</h2>

            {card.q.options ? (
              <div className="mt-5 space-y-2">
                {optionOrder(`${card.key}:${i}`, card.q.options.length).map((k, pos) => {
                  const o = card.q.options![k]
                  const correct = choice !== null && k === card.q.correct
                  const wrong = choice === k && k !== card.q.correct
                  return (
                    <button
                      key={k}
                      onClick={() => pick(k)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-[14.5px] leading-snug ring-1 transition',
                        correct ? 'bg-success/12 ring-success/40' : wrong ? 'bg-danger/10 ring-danger/40' : 'bg-bg/40 ring-line hover:ring-accent/50',
                      )}
                    >
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[11.5px] font-semibold text-muted">{pos + 1}</span>
                      <span className="flex-1 text-ink">{o}</span>
                      {correct && <Check size={17} className="mt-0.5 text-success" />}
                      {wrong && <X size={17} className="mt-0.5 text-danger" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              !revealed && (
                <Button variant="primary" className="mt-6" onClick={() => setRevealed(true)} leading={<Eye size={16} />}>
                  Show model answer
                </Button>
              )
            )}

            {revealed && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-surface-2 p-4">
                <div className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Model answer</div>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">{card.q.answer}</p>
              </motion.div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              {revealed && !card.q.options ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="soft" onClick={() => grade(false)} leading={<X size={15} />}>
                    Didn’t know
                  </Button>
                  <Button variant="primary" onClick={() => grade(true)} leading={<Check size={15} />}>
                    Knew it
                  </Button>
                </div>
              ) : (
                <span className="text-[12px] text-faint">{card.q.options ? 'Pick an answer (keys 1–4)' : 'Answer out loud, then reveal (space)'}</span>
              )}
              {(choice !== null || (!revealed && !card.q.options)) && (
                <Button variant="ghost" onClick={next} trailing={<ArrowRight size={15} />}>
                  {choice !== null ? 'Next question' : 'Skip'}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <p className="text-muted">No questions for this filter.</p>
      )}
    </Page>
  )
}
