import { ArrowUp, Sparkles, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Rich } from '../../components/Rich'
import { TOPIC_BY_ID } from '../../content/curriculum'
import { describeClaudeError, useClaude, type ModelTier, type Turn } from '../../lib/claude'
import { cn } from '../../lib/utils'
import type { Hit } from './search'

/**
 * Ask Claude the question a doctor just asked — on the viewer's own Claude
 * account (only where the app runs on claude.ai). The best matches from the
 * app's own notes go with the question, so the answer agrees with what the
 * student is revising.
 */

const RULES = `You are helping a final-year medical student on a UK general surgery placement. A doctor has just asked them the question below on a ward round or in a teaching session, and they need to answer it out loud now.

How to answer:
- Start with the direct answer in one or two sentences.
- Then at most 6 short bullet points ("- ") with only the facts that matter: definitions, classification, causes, signs, investigations, management, as relevant.
- Use UK terminology and current UK practice (NICE, BSG, ASGBI). For examination technique follow Macleod's Clinical Examination.
- Bold key terms with **double asterisks**. No headings, no preamble, no disclaimers.
- Keep it under 180 words unless asked for more.
- The student's revision notes that matched the question are below. Use them where relevant; if anything in them is wrong, say so briefly.`

function notesFor(hits: Hit[]): string {
  const lines = hits.slice(0, 8).map((h, i) => {
    const d = h.doc
    const topic = d.topic ? TOPIC_BY_ID[d.topic]?.title : undefined
    const where = [topic, d.sectionTitle].filter(Boolean).join(' › ')
    const body = d.body.replace(/\s+/g, ' ').slice(0, 700)
    if (d.kind === 'qa') return `[${i + 1}] Q: ${d.title}\nA: ${body}`
    if (d.kind === 'case') return `[${i + 1}] Case — ${d.title}: ${body}`
    return `[${i + 1}] ${where ? `(${where}) ` : ''}${body}`
  })
  return lines.length ? lines.join('\n\n') : '(no matching notes)'
}

const DEEPER = 'Go deeper: explain the reasoning (anatomy, physiology or pathology behind it), the important differentials or pitfalls, and how I should say it to the consultant. Up to 350 words, same style.'

type Status = 'idle' | 'thinking' | 'streaming' | 'done' | 'error'

export function ClaudeAnswer({ q, hits, trigger = 0, className }: { q: string; hits: Hit[]; /** bump to ask (e.g. Enter in the search box) */ trigger?: number; className?: string }) {
  const sample = useClaude()
  const [status, setStatus] = useState<Status>('idle')
  const [turns, setTurns] = useState<Turn[]>([])
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [follow, setFollow] = useState('')
  const ctl = useRef<AbortController | null>(null)
  const asked = useRef<string | null>(null)
  const lastTrigger = useRef(trigger)

  // a new question starts afresh
  useEffect(() => {
    if (asked.current === q.trim()) return
    ctl.current?.abort()
    asked.current = null
    setStatus('idle')
    setTurns([])
    setAnswer('')
    setError(null)
    setNote(null)
  }, [q])

  useEffect(() => () => ctl.current?.abort(), [])

  const run = async (history: Turn[], tier: ModelTier) => {
    if (!sample) return
    ctl.current?.abort()
    const c = new AbortController()
    ctl.current = c
    setStatus('thinking')
    setError(null)
    setNote(null)
    setAnswer('')
    try {
      const res = await sample(history, {
        signal: c.signal,
        modelTier: tier,
        // the first answer to a question may be replayed (free) for 5 minutes; follow-ups always ask
        cache: history.length === 1 ? true : false,
        onText: ({ text }) => {
          setStatus('streaming')
          setAnswer(text)
        },
      })
      setAnswer(res.text)
      setTurns([...history, { role: 'assistant', content: res.text }])
      setStatus('done')
      if (res.truncated) setNote('The answer was cut short — ask a narrower follow-up.')
    } catch (e) {
      const partial = (e as { text?: string }).text
      setAnswer(partial ?? '')
      if (partial) setTurns([...history, { role: 'assistant', content: partial }])
      const msg = describeClaudeError(e)
      setError(msg)
      setStatus(msg ? 'error' : partial ? 'done' : 'idle')
    }
  }

  const ask = () => {
    const question = q.trim()
    if (!question) return
    asked.current = question
    run([{ role: 'user', content: `${RULES}\n\nThe student's notes:\n${notesFor(hits)}\n\nThe doctor's question: ${question}` }], 'quick')
  }

  const followUp = (text: string, tier: ModelTier = 'quick') => {
    const t = text.trim()
    if (!t || !turns.length) return
    setFollow('')
    // keep the first turn (rules, notes, question) and the latest exchanges
    const history: Turn[] = [...(turns.length > 7 ? [turns[0], ...turns.slice(-6)] : turns), { role: 'user', content: t }]
    run(history, tier)
  }

  // Enter in the search box asks
  useEffect(() => {
    if (trigger === lastTrigger.current) return
    lastTrigger.current = trigger
    if (sample && q.trim() && asked.current !== q.trim()) ask()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  if (!sample || !q.trim()) return null
  const busy = status === 'thinking' || status === 'streaming'

  if (status === 'idle')
    return (
      <button
        onClick={ask}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl bg-accent-soft/50 px-4 py-3 text-left ring-1 ring-accent/30 transition hover:bg-accent-soft/80',
          className,
        )}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
          <Sparkles size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">Ask Claude</span>
          <span className="block truncate text-[12.5px] text-muted">“{q.trim()}” — answered with your notes</span>
        </span>
        <span className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-fg">Ask</span>
      </button>
    )

  return (
    <section className={cn('rounded-2xl bg-surface-1 p-4 ring-1 ring-accent/35', className)} aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg">
          <Sparkles size={14} />
        </span>
        <span className="text-[12px] font-semibold tracking-[0.1em] text-accent uppercase">Claude</span>
        {busy && (
          <button onClick={() => ctl.current?.abort()} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 text-[12.5px] font-medium text-ink ring-1 ring-line">
            <Square size={11} className="fill-current" /> Stop
          </button>
        )}
      </div>

      {turns.length > 1 && (
        <div className="mt-3 space-y-3 border-b border-line pb-3">
          {pairs(turns).map((p, i) => (
            <div key={i} className="space-y-1.5">
              {i > 0 && <div className="text-[13px] font-semibold text-ink">{p.q}</div>}
              <Markdown text={p.a} muted />
            </div>
          ))}
        </div>
      )}

      {busy && status === 'thinking' ? (
        <div className="mt-3 flex items-center gap-2 text-[13.5px] text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-r-transparent" /> Thinking…
        </div>
      ) : (
        (busy || turns.length <= 1) && answer && (
          <div className="mt-3">
            {busy && turns.length > 0 && <div className="mb-1.5 text-[13px] font-semibold text-ink">{lastQuestion(turns)}</div>}
            <Markdown text={answer} />
          </div>
        )
      )}

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
      {note && <p className="mt-2 text-[12.5px] text-muted">{note}</p>}

      {status === 'error' && !turns.length && (
        <button onClick={ask} className="mt-3 inline-flex h-9 items-center rounded-xl bg-surface-2 px-3 text-[13px] font-medium text-ink ring-1 ring-line">
          Try again
        </button>
      )}

      {status === 'done' && turns.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {turns.length === 2 && (
              <button onClick={() => followUp(DEEPER, 'default')} className="h-8 rounded-full bg-surface-2 px-3 text-[12.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50">
                Go deeper
              </button>
            )}
            <button onClick={() => followUp('Give me a one-sentence version I can say out loud.')} className="h-8 rounded-full bg-surface-2 px-3 text-[12.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50">
              One-liner
            </button>
            <button onClick={() => followUp('What follow-up question is the doctor likely to ask next, and what is the answer?')} className="h-8 rounded-full bg-surface-2 px-3 text-[12.5px] font-medium text-ink ring-1 ring-line hover:ring-accent/50">
              Next question?
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              followUp(follow)
            }}
            className="relative"
          >
            <input
              value={follow}
              onChange={(e) => setFollow(e.target.value)}
              placeholder="Ask a follow-up…"
              enterKeyHint="send"
              className="h-11 w-full rounded-xl bg-surface-2/60 pr-12 pl-3.5 text-[15px] text-ink ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-accent"
            />
            <button type="submit" disabled={!follow.trim()} aria-label="Send follow-up" className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-accent text-accent-fg disabled:opacity-40">
              <ArrowUp size={16} />
            </button>
          </form>
        </div>
      )}

      <p className="mt-3 text-[11px] text-faint">Uses your Claude account. Check anything important against your notes or a senior.</p>
    </section>
  )
}

function pairs(turns: Turn[]) {
  const out: { q: string; a: string }[] = []
  for (let i = 0; i < turns.length; i += 2) {
    const a = turns[i + 1]
    if (!a) break
    out.push({ q: i === 0 ? '' : turns[i].content === DEEPER ? 'Go deeper' : turns[i].content, a: a.content })
  }
  return out
}

function lastQuestion(turns: Turn[]) {
  const last = turns[turns.length - 1]
  if (last?.role !== 'user') return ''
  return last.content === DEEPER ? 'Go deeper' : last.content
}

/** The little Markdown Claude writes here: paragraphs, "- " bullets, numbered lines, **bold**. */
function Markdown({ text, muted }: { text: string; muted?: boolean }) {
  const blocks: { list: 'ul' | 'ol' | null; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      blocks.push({ list: null, lines: [] })
      continue
    }
    const ul = /^\s*[-*•]\s+/.exec(line)
    const ol = /^\s*\d+[.)]\s+/.exec(line)
    const kind = ul ? 'ul' : ol ? 'ol' : null
    const content = (ul ? line.slice(ul[0].length) : ol ? line.slice(ol[0].length) : line).replace(/^#+\s*/, '')
    const last = blocks[blocks.length - 1]
    if (last && last.list === kind && (kind || last.lines.length)) last.lines.push(content)
    else blocks.push({ list: kind, lines: [content] })
  }
  const tone = muted ? 'text-muted' : 'text-ink'
  return (
    <div className={cn('space-y-2 text-[14px] leading-relaxed', tone)}>
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.list ? (
            <ul key={i} className="space-y-1">
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className={cn('mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full', b.list === 'ol' ? 'bg-ink/50' : 'bg-accent')} />
                  <span className="min-w-0">
                    <Rich text={l} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              <Rich text={b.lines.join(' ')} />
            </p>
          ),
        )}
    </div>
  )
}
