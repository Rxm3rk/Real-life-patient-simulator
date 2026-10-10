import { ArrowLeft, ArrowRight, Brain, CalendarCheck, Check, ChevronDown, ChevronRight, Eye, Layers, PartyPopper, RotateCcw, Star, Stethoscope, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { uiTick } from '../../audio/engine'
import { Page } from '../../components/layout/AppShell'
import { Rich } from '../../components/Rich'
import { Button } from '../../components/ui/Button'
import { ProgressBar, ProgressRing } from '../../components/ui/primitives'
import { CASES } from '../../content/cases'
import { sessionOf, TOPICS } from '../../content/curriculum'
import { buildDeck, deckNeedsCases, dueCount, GENERAL_IDS, todayCardIds, todayTopics, topicCardIds, type DeckId, type QuizCard } from '../../content/quiz'
import { goBack, Link, navigate, useLocation } from '../../lib/router'
import { buildSession, deckStats, requeue, untilLabel } from '../../lib/srs'
import { useCaseDefs } from '../../lib/useCases'
import { cn, optionOrder, plural, shuffle } from '../../lib/utils'
import { useStudy } from '../../store/study'

export default function Quiz({ deck }: { deck?: DeckId }) {
  const { query } = useLocation()
  const id = deck ?? (query.get('deck') as DeckId | null)
  return id ? <Session deckId={id} key={id} /> : <QuizHub />
}

/* ------------------------------------------------------------------ */
/* The decks                                                            */
/* ------------------------------------------------------------------ */

function QuizHub() {
  const { day, cards, starred } = useStudy()
  const due = dueCount(cards)
  const today = deckStats(todayCardIds(day), cards)
  const general = deckStats(GENERAL_IDS, cards)
  const topics = todayTopics(day).map((t) => TOPICS.find((x) => x.id === t)!)

  return (
    <Page>
      <button onClick={() => navigate('/learn')} className="mb-4 inline-flex h-9 items-center gap-1.5 text-[13.5px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> Learn
      </button>
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[32px]">Quiz</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
        Say the answer out loud, then check. What you miss comes back in a few minutes; what you know comes back days later, just before you’d forget it.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          to="/quiz?deck=due"
          className={cn('group flex items-center gap-4 rounded-3xl p-5 ring-1 transition', due ? 'bg-accent text-accent-fg ring-accent shadow-(--shadow-lift)' : 'bg-surface-1 ring-line hover:ring-accent/40')}
        >
          <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', due ? 'bg-white/20' : 'bg-accent-soft text-accent')}>
            <CalendarCheck size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className={cn('text-[16px] font-semibold', !due && 'text-ink')}>{due ? `${plural(due, 'question')} to review` : 'Nothing due for review'}</div>
            <div className={cn('mt-0.5 text-[13px]', due ? 'opacity-85' : 'text-muted')}>{due ? 'Clear these first — they’re the ones you’re about to forget.' : 'You’re up to date. Start something new below.'}</div>
          </div>
          {due > 0 && <ChevronRight size={20} className="shrink-0 transition group-hover:translate-x-0.5" />}
        </Link>
        <Link to="/quiz?deck=today" className="group flex items-center gap-4 rounded-3xl bg-surface-1 p-5 ring-1 ring-line transition hover:ring-accent/40">
          <ProgressRing value={today.total ? today.known / today.total : 0} size={48} stroke={5}>
            <span className="text-[11px] font-semibold text-ink tabular">{today.total ? Math.round((today.known / today.total) * 100) : 0}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold text-ink">Today · Day {day}</div>
            <div className="mt-0.5 truncate text-[13px] text-muted">{topics.map((t) => t.short).join(' & ')} · {today.known}/{today.total} known</div>
          </div>
          <ChevronRight size={20} className="shrink-0 text-faint transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <h2 className="mt-8 mb-2 text-[12px] font-semibold tracking-[0.12em] text-faint uppercase">By session</h2>
      <div className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-line">
        {TOPICS.map((t) => {
          const st = deckStats(topicCardIds(t.id), cards)
          const s = sessionOf(t.id)
          return (
            <Link key={t.id} to={`/quiz?deck=topic:${t.id}`} className="group flex items-center gap-3 border-b border-line px-4 py-3 transition last:border-0 hover:bg-surface-2/50 sm:px-5">
              <span className="w-10 shrink-0 text-[11px] font-semibold text-faint uppercase">Day {s.day}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-semibold text-ink">{t.title}</div>
                <ProgressBar value={st.total ? st.known / st.total : 0} height={4} className="mt-1.5 max-w-md" tone={st.mastered === st.total && st.total ? 'success' : 'accent'} />
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[12.5px] text-muted tabular">
                  {st.known}/{st.total}
                </div>
                {st.due > 0 && <div className="text-[11px] font-semibold text-warning">{st.due} due</div>}
              </div>
              <ChevronRight size={16} className="shrink-0 text-faint" />
            </Link>
          )
        })}
      </div>

      <h2 className="mt-8 mb-2 text-[12px] font-semibold tracking-[0.12em] text-faint uppercase">More decks</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <DeckTile to="/quiz?deck=general" icon={<Stethoscope size={18} />} title="Examination & signs" body={`${general.total} questions · ${general.known} known`} />
        <DeckTile to="/quiz?deck=viva" icon={<Brain size={18} />} title="Examiner viva" body="The viva questions from every case" />
        <DeckTile to="/quiz?deck=starred" icon={<Star size={18} />} title="Starred" body={starred.length ? plural(starred.length, 'question') : 'Star questions to collect them here'} />
      </div>
      <Link to="/quiz?deck=all" className="mt-3 inline-flex h-10 items-center gap-1.5 text-[13.5px] font-medium text-accent hover:underline">
        <Layers size={15} /> Mix everything
      </Link>
    </Page>
  )
}

function DeckTile({ to, icon, title, body }: { to: string; icon: ReactNode; title: string; body: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-accent/40">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</span>
      <div className="min-w-0">
        <div className="text-[14.5px] font-semibold text-ink">{title}</div>
        <div className="truncate text-[12.5px] text-muted">{body}</div>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* A sitting                                                            */
/* ------------------------------------------------------------------ */

interface Sitting {
  queue: string[]
  byId: Record<string, QuizCard>
  pos: number
  /** First answer to each card this sitting */
  first: Record<string, boolean>
}

const SITTING = 15

function Session({ deckId }: { deckId: DeckId }) {
  const needsCases = deckNeedsCases(deckId)
  const defs = useCaseDefs(needsCases ? undefined : [])
  const casesReady = !needsCases || Object.keys(defs).length >= CASES.length
  const { day, cards, starred, review, toggleStar } = useStudy()

  const [sit, setSit] = useState<Sitting | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [empty, setEmpty] = useState(false)

  const begin = useCallback(
    (extra: boolean) => {
      const st = useStudy.getState()
      const deck = buildDeck(deckId, { day: st.day, starred: st.starred, cards: st.cards, defs })
      if (!deck) {
        setEmpty(true)
        setSit({ queue: [], byId: {}, pos: 0, first: {} })
        return
      }
      setTitle(deck.title)
      // guides keep their own order; decks drawn from many cases are mixed so one case doesn't dominate a sitting
      const ids = deck.cards.map((c) => c.id)
      const queue = buildSession(deckId === 'viva' || deckId === 'all' ? shuffle(ids) : ids, st.cards, { limit: SITTING, extra })
      setEmpty(!queue.length)
      setSit({ queue, byId: Object.fromEntries(deck.cards.map((c) => [c.id, c])), pos: 0, first: {} })
      setRevealed(false)
      setChoice(null)
    },
    [deckId, defs],
  )

  // a deck opened from further down the list starts at the top
  useEffect(() => window.scrollTo({ top: 0 }), [])

  // start once the deck can be built (the viva questions live in the case files)
  useEffect(() => {
    if (casesReady && !sit) begin(false)
  }, [casesReady, sit, begin])

  const id = sit?.queue[sit.pos]
  const card = id ? sit.byId[id] : undefined
  const finished = !!sit && sit.pos >= sit.queue.length && sit.queue.length > 0

  const answer = useCallback(
    (knew: boolean) => {
      if (!sit || !id) return
      review(id, knew)
      setSit((s) => {
        if (!s) return s
        const first = id in s.first ? s.first : { ...s.first, [id]: knew }
        // a card you didn't know comes back a few cards later, until you know it
        const queue = knew ? s.queue : requeue(s.queue, s.pos, id)
        return { ...s, queue, first, pos: s.pos + 1 }
      })
      setRevealed(false)
      setChoice(null)
    },
    [sit, id, review],
  )

  const pick = useCallback(
    (k: number) => {
      if (!card || choice !== null) return
      setChoice(k)
      setRevealed(true)
      uiTick(k === card.correct ? 'success' : 'warn')
    },
    [card, choice],
  )

  // keyboard: Space shows the answer, 1 / 2 grade it, 1–4 pick an option, Enter moves on
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (!card || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) || e.metaKey || e.ctrlKey || e.altKey) return
      if (card.options) {
        if (choice === null && /^[1-9]$/.test(e.key)) {
          const k = optionOrder(card.id, card.options.length)[Number(e.key) - 1]
          if (k !== undefined) pick(k)
        } else if (choice !== null && (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ')) {
          e.preventDefault()
          answer(choice === card.correct)
        }
        return
      }
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
      } else if (revealed && e.key === '1') answer(false)
      else if (revealed && e.key === '2') answer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, choice, revealed, pick, answer])

  const total = sit ? new Set(sit.queue).size : 0
  const done = sit ? Object.keys(sit.first).length : 0

  return (
    <Page className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => goBack('/quiz')} className="inline-flex h-9 items-center gap-1.5 text-[13.5px] font-medium text-muted hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>
        <Link to="/quiz" className="text-[13px] font-medium text-accent hover:underline">
          All decks
        </Link>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11.5px] font-semibold tracking-[0.14em] text-accent uppercase">Quiz</div>
          <h1 className="truncate text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">{title || ' '}</h1>
        </div>
        {sit && !finished && !empty && (
          <div className="shrink-0 font-mono text-[13px] text-muted tabular" aria-label={`Card ${Math.min(done + 1, total)} of ${total}`}>
            {Math.min(done + 1, total)} / {total}
          </div>
        )}
      </div>
      {sit && !empty && <ProgressBar value={total ? done / total : 0} height={5} className="mt-3" />}

      <div className="mt-5">
        {!sit ? (
          <div className="h-64 animate-pulse rounded-3xl bg-surface-1 ring-1 ring-line" />
        ) : empty ? (
          <EmptyDeck deckId={deckId} />
        ) : finished ? (
          <Summary sit={sit} deckId={deckId} onMore={() => begin(true)} />
        ) : card ? (
          <AnimatePresence mode="wait">
            <motion.article
              key={`${card.id}:${sit.pos}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-lift) sm:p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11.5px] font-semibold tracking-[0.1em] text-faint uppercase">
                  <span className="truncate">{card.source}</span>
                  {id && id in sit.first && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[10.5px] tracking-normal text-warning normal-case">Again</span>}
                </div>
                <button
                  onClick={() => toggleStar(card.id)}
                  aria-label={starred.includes(card.id) ? 'Unstar' : 'Star'}
                  aria-pressed={starred.includes(card.id)}
                  className="-mt-1.5 -mr-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint hover:text-warning"
                >
                  <Star size={17} className={cn(starred.includes(card.id) && 'fill-warning text-warning')} />
                </button>
              </div>
              <h2 className="mt-2 text-[20px] leading-snug font-semibold text-ink sm:text-[23px]">{card.q}</h2>

              {card.options ? (
                <div className="mt-5 space-y-2">
                  {optionOrder(card.id, card.options.length).map((k, n) => {
                    const right = choice !== null && k === card.correct
                    const wrong = choice === k && k !== card.correct
                    return (
                      <button
                        key={k}
                        onClick={() => pick(k)}
                        disabled={choice !== null}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-[15px] leading-snug ring-1 transition disabled:cursor-default',
                          right ? 'bg-success/12 ring-success/40' : wrong ? 'bg-danger/10 ring-danger/40' : 'bg-bg/40 ring-line hover:ring-accent/50',
                        )}
                      >
                        <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[11.5px] font-semibold text-muted">{n + 1}</span>
                        <span className="flex-1 text-ink">{card.options![k]}</span>
                        {right && <Check size={17} className="mt-0.5 text-success" />}
                        {wrong && <X size={17} className="mt-0.5 text-danger" />}
                      </button>
                    )
                  })}
                </div>
              ) : (
                !revealed && (
                  <Button variant="primary" size="lg" className="mt-6 w-full sm:w-auto" onClick={() => setRevealed(true)} leading={<Eye size={18} />}>
                    Show answer
                  </Button>
                )
              )}

              {revealed && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-surface-2/70 p-4 ring-1 ring-line sm:p-5">
                  <div className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">{card.options ? 'Why' : 'Answer'}</div>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
                    <Rich text={card.a} />
                  </p>
                </motion.div>
              )}

              {revealed &&
                (card.options ? (
                  <div className="mt-5 flex justify-end">
                    <Button variant="primary" size="lg" onClick={() => answer(choice === card.correct)} trailing={<ArrowRight size={17} />}>
                      Next
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <Button size="lg" variant="danger" onClick={() => answer(false)} leading={<RotateCcw size={17} />}>
                      Didn’t know
                    </Button>
                    <Button size="lg" variant="primary" onClick={() => answer(true)} leading={<Check size={17} />}>
                      Knew it
                    </Button>
                  </div>
                ))}

              <p className="mt-4 hidden text-center text-[11.5px] text-faint sm:block">
                {card.options ? 'Keys 1–4 to answer, Enter for the next card' : revealed ? 'Keys: 1 didn’t know · 2 knew it' : 'Answer out loud first. Space shows the answer.'}
              </p>
            </motion.article>
          </AnimatePresence>
        ) : null}
      </div>

      {sit && !finished && !empty && <SessionFooter cards={cards} deckId={deckId} day={day} />}
    </Page>
  )
}

/** A quiet line under the card: how this deck is going overall. */
function SessionFooter({ cards, deckId, day }: { cards: ReturnType<typeof useStudy.getState>['cards']; deckId: DeckId; day: number }) {
  const ids = deckId === 'today' ? todayCardIds(day) : deckId.startsWith('topic:') ? topicCardIds(deckId.slice(6) as never) : deckId === 'general' ? GENERAL_IDS : null
  if (!ids) return null
  const st = deckStats(ids, cards)
  return (
    <p className="mt-4 text-center text-[12.5px] text-muted">
      {st.known} of {st.total} known in this deck{st.mastered ? ` · ${st.mastered} mastered` : ''}
    </p>
  )
}

function Summary({ sit, deckId, onMore }: { sit: Sitting; deckId: DeckId; onMore: () => void }) {
  const cards = useStudy((s) => s.cards)
  const day = useStudy((s) => s.day)
  const ids = Object.keys(sit.first)
  const knew = ids.filter((i) => sit.first[i]).length
  const missed = ids.filter((i) => !sit.first[i])
  // the soonest the deck asks for you again
  const next = Math.min(...Object.keys(sit.byId).map((i) => cards[i]?.due ?? Infinity))
  const more = deckId !== 'due' || dueCount(cards) > 0
  const [open, setOpen] = useState<string | null>(null)
  const pct = ids.length ? knew / ids.length : 0

  useEffect(() => {
    uiTick('success')
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col items-center rounded-3xl bg-surface-1 p-6 text-center ring-1 ring-line shadow-(--shadow-lift) sm:p-8">
        <ProgressRing value={pct} size={112} stroke={9} color={pct >= 0.8 ? 'var(--success)' : pct >= 0.5 ? 'var(--accent)' : 'var(--warning)'}>
          <PartyPopper size={30} className="text-accent" />
        </ProgressRing>
        <h2 className="mt-4 text-[22px] font-semibold text-ink">
          You knew {knew} of {ids.length}
        </h2>
        <p className="mt-1 max-w-md text-[14px] text-muted">
          {missed.length ? 'The ones you missed will come back soon — that’s how they stick.' : 'A clean sweep. These will come back in a few days to keep them fresh.'}
          {Number.isFinite(next) && ` Next review ${untilLabel(next)}.`}
        </p>
        <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {more && (
            <Button variant="primary" size="lg" onClick={onMore} leading={<RotateCcw size={17} />}>
              Keep going
            </Button>
          )}
          <Button size="lg" onClick={() => navigate(deckId === 'today' || deckId === 'due' ? '/' : '/quiz')}>
            {deckId === 'today' || deckId === 'due' ? 'Back to Today' : 'All decks'}
          </Button>
        </div>
        {deckId === 'due' && !more && <p className="mt-3 text-[12.5px] text-muted">All reviews done. Try Day {day} next.</p>}
      </div>

      {missed.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-faint uppercase">To revise</h3>
          <div className="space-y-2">
            {missed.map((i) => {
              const c = sit.byId[i]
              const on = open === i
              return (
                <div key={i} className="overflow-hidden rounded-2xl bg-surface-1 ring-1 ring-line">
                  <button onClick={() => setOpen(on ? null : i)} className="flex w-full items-start gap-3 px-4 py-3 text-left" aria-expanded={on}>
                    <span className="flex-1 text-[14px] leading-snug font-medium text-ink">{c.q}</span>
                    <ChevronDown size={16} className={cn('mt-0.5 shrink-0 text-faint transition', on && 'rotate-180')} />
                  </button>
                  {on && (
                    <p className="border-t border-line px-4 py-3 text-[13.5px] leading-relaxed text-muted">
                      <Rich text={c.a} />
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </motion.div>
  )
}

function EmptyDeck({ deckId }: { deckId: DeckId }) {
  const day = useStudy((s) => s.day)
  const text =
    deckId === 'due'
      ? { title: 'Nothing due for review', body: 'You’re up to date. Questions you answer come back here when it’s time to see them again.' }
      : deckId === 'starred'
        ? { title: 'No starred questions yet', body: 'Tap the star on any question — in a quiz, a topic guide or a search result — to collect it here.' }
        : { title: 'No questions here yet', body: 'Try another deck.' }
  return (
    <div className="flex flex-col items-center rounded-3xl bg-surface-1 px-6 py-12 text-center ring-1 ring-line">
      <CalendarCheck size={30} className="text-accent" />
      <h2 className="mt-3 text-[18px] font-semibold text-ink">{text.title}</h2>
      <p className="mt-1 max-w-sm text-[14px] text-muted">{text.body}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" onClick={() => navigate('/quiz?deck=today')}>
          Quiz Day {day}
        </Button>
        <Button onClick={() => navigate('/quiz')}>All decks</Button>
      </div>
    </div>
  )
}
