import { ArrowRight, BookOpen, Lightbulb, ListChecks, Mic, MicOff, Search, SendHorizontal, Volume2, VolumeX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { speak } from '../../../audio/engine'
import { Button } from '../../../components/ui/Button'
import { Badge, ProgressBar } from '../../../components/ui/primitives'
import { Sheet } from '../../../components/ui/Sheet'
import { toast } from '../../../components/ui/Toast'
import { CATEGORY_ORDER, INTENT_BY_ID, INTENTS } from '../../../content/intents'
import { suggest } from '../../../engine/matcher'
import { isClinic } from '../../../engine/setting'
import type { CaseDef, ChatTurn } from '../../../engine/types'
import { useMediaQuery } from '../../../lib/hooks'
import { use3dPatients } from '../../../lib/webgl'
import { PatientAvatar } from '../../../components/PatientAvatar'
import { useSpeechRecognition } from '../../../lib/speech'
import { cn } from '../../../lib/utils'
import { useEncounter } from '../../../store/encounter'
import { useSettings } from '../../../store/settings'
import { FaceCam } from '../FaceCam'
import { ClinicObs, monitorLabel, VitalsMonitor } from '../VitalsMonitor'

// three.js and the 3D patient load only when they're used
const PatientTalk3D = lazy(() => import('./PatientTalk3D'))

const SOCRATES: [string, string][] = [
  ['S', 'pain.site'],
  ['O', 'pain.onset'],
  ['C', 'pain.character'],
  ['R', 'pain.radiation'],
  ['A', 'comm.anything_else'],
  ['T', 'pain.timing'],
  ['E', 'pain.exacerbating'],
  ['S', 'pain.severity'],
]

export default function HistoryPhase({ c, onNext }: { c: CaseDef; onNext?: () => void }) {
  const s = useEncounter((st) => st.s)!
  const ask = useEncounter((st) => st.ask)
  const askIntent = useEncounter((st) => st.askIntent)
  const voice = useSettings((st) => st.patientVoice)
  const patients3d = useSettings((st) => st.patients3d)
  const setSettings = useSettings((st) => st.set)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [fail3d, setFail3d] = useState(false)
  const use3d = !fail3d && use3dPatients(patients3d)
  // lips keep moving for a moment after a reply appears (as if speaking it)
  const [talking, setTalking] = useState(false)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string[]>([])
  const [bankOpen, setBankOpen] = useState(false)
  const [coverageOpen, setCoverageOpen] = useState(false)
  const [revealed, setRevealed] = useState(s.chat.length)
  const [typing, setTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const pain = ((c.vitals.pain ?? 0) / 10) * (s.analgesia ? 0.55 : 1)

  // Reveal patient replies after a short, human "thinking" delay
  useEffect(() => {
    if (revealed >= s.chat.length) return
    const next = s.chat[revealed]
    if (next.role !== 'patient') {
      setRevealed((r) => r + 1)
      return
    }
    setTyping(true)
    const delay = Math.min(1400, 450 + next.text.length * 9)
    let talkEnd = 0
    const id = window.setTimeout(() => {
      setTyping(false)
      setRevealed((r) => r + 1)
      speak(next.text, c.patient.sex, c.patient.age)
      setTalking(true)
      talkEnd = window.setTimeout(() => setTalking(false), Math.min(6000, 700 + next.text.length * 45))
    }, delay)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(talkEnd)
    }
  }, [revealed, s.chat, c.patient.sex, c.patient.age])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [revealed, typing])

  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    const r = ask(t)
    setInput('')
    setPending(r.matched.length ? [] : r.suggestions)
  }

  const mic = useSpeechRecognition((t) => send(t))
  useEffect(() => {
    if (mic.error === 'not-allowed' || mic.error === 'service-not-allowed')
      toast({ tone: 'warning', title: 'Microphone blocked', body: 'Allow microphone access for this site in your browser settings, or type your question.' })
    else if (mic.error === 'network') toast({ tone: 'warning', title: 'Speech recognition is offline', body: 'It needs an internet connection. Type your question instead.' })
  }, [mic.error])
  const live = useMemo(() => (input.trim().length > 2 ? suggest(input, 3) : []), [input])

  const visible = s.chat.slice(0, revealed)
  const lastPatient = [...visible].reverse().find((t) => t.role === 'patient')
  const keyAsked = c.history.key.filter((k) => s.asked.includes(k)).length
  const showCoverage = s.mode !== 'osce'

  const coverage = (
    <Coverage c={c} asked={s.asked} mode={s.mode} onAsk={(id) => askIntent(id)} />
  )

  return (
    <div className="flex h-full min-h-0">
      {/* Patient panel (desktop) */}
      {desktop && (
        <aside className="flex w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line p-5 scrollbar-thin xl:w-[360px]">
          <div className="flex flex-col items-center rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-soft)">
            {use3d ? (
              <Suspense fallback={<PatientAvatar a={c.patient.appearance} caseId={c.id} id="hx-3d" className="h-[250px] w-full rounded-2xl" />}>
                <PatientTalk3D c={c} pain={pain} speaking={talking} onUnavailable={() => setFail3d(true)} className="h-[250px] w-full rounded-2xl bg-gradient-to-b from-[#dfe7ee] to-[#c6d2dc] dark:from-[#233147] dark:to-[#141d2c]" />
              </Suspense>
            ) : (
              <FaceCam a={c.patient.appearance} pain={pain} wince={0} winceKey={0} size="lg" speaking={typing} />
            )}
            <div className="mt-3 text-center">
              <div className="text-[17px] font-semibold text-ink">{c.patient.name}</div>
              <div className="text-[13px] text-muted">
                {c.patient.age}-year-old {c.patient.sex} · {c.patient.occupation.replace(/^an? /, '')}
              </div>
            </div>
            {lastPatient?.cue && (
              <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-[12.5px] text-muted italic">*{lastPatient.cue}*</div>
            )}
          </div>
          {isClinic(c.setting) ? <ClinicObs v={c.vitals} /> : <VitalsMonitor v={c.vitals} compact label={monitorLabel(c.setting)} />}
          {showCoverage && <div className="rounded-3xl bg-surface-1 p-4 ring-1 ring-line">{coverage}</div>}
        </aside>
      )}

      {/* Chat */}
      <section className="flex min-w-0 flex-1 flex-col">
        {!desktop && (
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            {use3d ? (
              <PatientAvatar a={c.patient.appearance} caseId={c.id} id="hx-sm" className={cn('h-16 w-16 shrink-0 transition', talking && 'ring-2 ring-accent')} />
            ) : (
              <FaceCam a={c.patient.appearance} pain={pain} wince={0} winceKey={0} size="sm" speaking={typing} />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-ink">{c.patient.title}</div>
              <div className="font-mono text-[11.5px] text-muted tabular">
                HR {c.vitals.hr} · BP {c.vitals.sbp}/{c.vitals.dbp} · T {c.vitals.temp.toFixed(1)}°
              </div>
            </div>
            {showCoverage && (
              <Button size="sm" variant="soft" onClick={() => setCoverageOpen(true)} leading={<ListChecks size={15} />}>
                {keyAsked}/{c.history.key.length}
              </Button>
            )}
          </div>
        )}

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 scrollbar-thin sm:px-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {visible.length === 0 && <Intro c={c} onAsk={send} />}
            {visible.map((t) => (
              <Bubble key={t.id} t={t} />
            ))}
            <AnimatePresence>
              {typing && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 self-start rounded-2xl rounded-bl-md bg-surface-1 px-4 py-3 ring-1 ring-line">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-faint"
                      animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-line bg-bg/90 px-3 pt-2.5 pb-3 safe-bottom sm:px-6">
          <div className="mx-auto max-w-2xl">
            <AnimatePresence initial={false}>
              {(pending.length > 0 || live.length > 0) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2 flex flex-wrap gap-1.5 overflow-hidden">
                  {pending.length > 0 && <span className="self-center text-[12px] font-medium text-warning">Did you mean:</span>}
                  {(pending.length ? pending : live).map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        askIntent(id)
                        setPending([])
                        setInput('')
                      }}
                      className="rounded-full bg-surface-1 px-3 py-1.5 text-left text-[12.5px] text-ink ring-1 ring-line transition hover:ring-accent/50"
                    >
                      {INTENT_BY_ID[id]?.q}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-end gap-2">
              <Button variant="secondary" size="icon" onClick={() => setBankOpen(true)} aria-label="Question bank" title="Question bank">
                <BookOpen size={18} />
              </Button>
              <div className="relative flex min-h-11 flex-1 items-end rounded-2xl bg-surface-1 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent/60">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={mic.listening ? mic.interim || input : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send(input)
                    }
                  }}
                  placeholder={mic.listening ? 'Listening…' : `Ask ${c.patient.title} a question…`}
                  className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint"
                  aria-label="Ask the patient"
                />
                {mic.supported && (
                  <button
                    onClick={() => (mic.listening ? mic.stop() : mic.start())}
                    className={cn('m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl transition', mic.listening ? 'bg-danger text-white' : 'text-muted hover:bg-surface-2 hover:text-ink')}
                    aria-label={mic.listening ? 'Stop listening' : 'Speak your question'}
                  >
                    {mic.listening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
              </div>
              <Button variant="primary" size="icon" onClick={() => send(input)} aria-label="Send" disabled={!input.trim()}>
                <SendHorizontal size={18} />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setSettings({ patientVoice: !voice })}
                className="inline-flex items-center gap-1.5 text-[12px] text-faint transition hover:text-muted"
              >
                {voice ? <Volume2 size={14} /> : <VolumeX size={14} />} Patient voice {voice ? 'on' : 'off'}
              </button>
              {onNext && (
                <Button size="sm" variant="ghost" onClick={onNext} trailing={<ArrowRight size={15} />}>
                  Move on to examination
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <QuestionBank open={bankOpen} onClose={() => setBankOpen(false)} c={c} asked={s.asked} onAsk={(id) => askIntent(id)} />
      <Sheet open={coverageOpen} onClose={() => setCoverageOpen(false)} title="History coverage">
        {coverage}
      </Sheet>
    </div>
  )
}

function Intro({ c, onAsk }: { c: CaseDef; onAsk: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="max-w-md text-[14px] leading-relaxed text-muted">
        {isClinic(c.setting) ? `You call ${c.patient.title} in from the waiting room and offer a seat.` : `You pull the curtain round. ${c.patient.title} looks up at you.`} Type or speak naturally —
        introduce yourself, confirm who they are, then ask an open question.
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {['Hello, I’m one of the doctors on the surgical team.', 'Can you confirm your full name and date of birth?', 'What’s brought you in today?'].map((q) => (
          <button key={q} onClick={() => onAsk(q)} className="rounded-full bg-surface-1 px-3.5 py-2 text-[13px] text-ink ring-1 ring-line transition hover:ring-accent/50">
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ t }: { t: ChatTurn }) {
  const student = t.role === 'student'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
      className={cn('flex max-w-[86%] flex-col gap-1', student ? 'self-end items-end' : 'self-start items-start')}
    >
      {t.cue && !student && <div className="px-1 text-[12px] text-faint italic">*{t.cue}*</div>}
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
          student ? 'rounded-br-md bg-accent text-accent-fg' : 'rounded-bl-md bg-surface-1 text-ink ring-1 ring-line',
        )}
      >
        {t.text}
      </div>
    </motion.div>
  )
}

function Coverage({ c, asked, mode, onAsk }: { c: CaseDef; asked: string[]; mode: string; onAsk: (id: string) => void }) {
  const set = new Set(asked)
  const keyDone = c.history.key.filter((k) => set.has(k)).length
  const painCase = c.history.key.some((k) => k.startsWith('pain.'))
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">Key history</div>
        <div className="font-mono text-[12px] text-muted tabular">
          {keyDone}/{c.history.key.length}
        </div>
      </div>
      <ProgressBar value={keyDone / c.history.key.length} className="mt-2" />
      {painCase && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">SOCRATES</div>
          <div className="flex gap-1">
            {SOCRATES.map(([l, id], i) => {
              const on = set.has(id) || (id === 'comm.anything_else' && ['gi.nausea', 'gi.vomiting', 'sys.fever'].some((x) => set.has(x)))
              return (
                <span
                  key={i}
                  title={INTENT_BY_ID[id]?.q}
                  className={cn('grid h-8 flex-1 place-items-center rounded-lg text-[13px] font-bold transition', on ? 'bg-success/15 text-success ring-1 ring-success/30' : 'bg-surface-2 text-faint ring-1 ring-line')}
                >
                  {l}
                </span>
              )
            })}
          </div>
        </div>
      )}
      {mode === 'learn' ? (
        <ul className="mt-4 space-y-1">
          {c.history.key.map((k) => {
            const on = set.has(k)
            return (
              <li key={k}>
                <button
                  onClick={() => !on && onAsk(k)}
                  className={cn('flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition', on ? 'text-muted' : 'text-ink hover:bg-surface-2')}
                >
                  <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px]', on ? 'bg-success text-white' : 'ring-1 ring-line-strong')}>{on ? '✓' : ''}</span>
                  <span className={cn(on && 'line-through decoration-faint/60')}>{INTENT_BY_ID[k]?.q}</span>
                  {c.history.critical?.includes(k) && !on && <Badge tone="danger">must ask</Badge>}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-4 flex gap-2 text-[12.5px] leading-snug text-muted">
          <Lightbulb size={15} className="mt-0.5 shrink-0 text-violet" /> Practice mode shows only your coverage. Switch to Learn mode to see the checklist.
        </p>
      )}
    </div>
  )
}

function QuestionBank({ open, onClose, c, asked, onAsk }: { open: boolean; onClose: () => void; c: CaseDef; asked: string[]; onAsk: (id: string) => void }) {
  const [q, setQ] = useState('')
  const set = new Set(asked)
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: INTENTS.filter(
        (i) =>
          i.cat === cat &&
          !i.hidden &&
          (!i.sex || i.sex === c.patient.sex) &&
          (!i.exams || i.exams.includes(c.exam) || term) &&
          (!term || i.q.toLowerCase().includes(term) || i.ex.some((e) => e.includes(term))),
      ),
    })).filter((g) => g.items.length)
  }, [q, c.patient.sex, c.exam])
  return (
    <Sheet open={open} onClose={onClose} title="Question bank" description="Structured questions by topic. Tap to ask." size="lg">
      <div className="sticky top-0 z-10 -mx-1 mb-3 bg-surface-1 px-1 pb-2">
        <div className="flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 ring-1 ring-line focus-within:ring-accent/60">
          <Search size={16} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…" className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint" />
        </div>
      </div>
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.cat}>
            <div className="mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">{g.cat}</div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {g.items.map((i) => {
                const on = set.has(i.id)
                return (
                  <button
                    key={i.id}
                    onClick={() => {
                      onAsk(i.id)
                      onClose()
                    }}
                    className={cn('flex items-start gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] ring-1 transition', on ? 'bg-surface-2 text-faint ring-transparent' : 'bg-surface-1 text-ink ring-line hover:ring-accent/40')}
                  >
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', on ? 'bg-success' : 'bg-line-strong')} />
                    {i.q}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
