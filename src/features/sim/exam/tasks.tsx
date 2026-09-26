import { FastForward, Hand, HeartPulse, Square, Stethoscope, Timer, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { startListening, type Listen } from '../../../audio/engine'
import { skinPalette } from '../../../anatomy/palette'
import type { Appearance } from '../../../anatomy/types'
import { Button } from '../../../components/ui/Button'
import { Segmented } from '../../../components/ui/primitives'
import { cn, vibrate } from '../../../lib/utils'
import { useSettings } from '../../../store/settings'

export function TaskCard({ title, icon, children, onClose }: { title: string; icon: ReactNode; children: ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      className="absolute inset-x-3 bottom-3 z-30 mx-auto max-w-md overflow-hidden rounded-3xl shadow-(--shadow-float) ring-1 ring-line glass sm:bottom-5"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <span className="text-accent">{icon}</span>
          {title}
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  )
}

/* ------------------------------ Radial pulse ------------------------------ */

export function PulseTask({
  hr,
  rhythm,
  a,
  onSubmit,
  onClose,
}: {
  hr: number
  rhythm: 'regular' | 'irregular'
  a: Appearance
  onSubmit: (bpm: number | undefined, rhythm: 'regular' | 'irregular' | undefined) => void
  onClose: () => void
}) {
  const [holding, setHolding] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [beat, setBeat] = useState(0)
  const [taps, setTaps] = useState(0)
  const [window15, setWindow15] = useState<15 | 30>(15)
  const [est, setEst] = useState('')
  const [rh, setRh] = useState<'regular' | 'irregular'>('regular')
  const haptics = useSettings((s) => s.haptics)
  const pal = skinPalette(a)
  const done = elapsed >= window15

  useEffect(() => {
    if (!holding || done) return
    let alive = true
    let timer = 0
    const next = () => {
      const base = 60000 / hr
      const ms = rhythm === 'irregular' ? base * (0.5 + Math.random() * 1.0) : base * (0.97 + Math.random() * 0.06)
      timer = window.setTimeout(() => {
        if (!alive) return
        setBeat((b) => b + 1)
        if (haptics) vibrate(rhythm === 'irregular' && Math.random() < 0.3 ? 18 : 32)
        next()
      }, ms)
    }
    next()
    const start = performance.now() - elapsed * 1000
    const iv = window.setInterval(() => setElapsed(Math.min(window15, (performance.now() - start) / 1000)), 100)
    return () => {
      alive = false
      window.clearTimeout(timer)
      window.clearInterval(iv)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding, done, hr, rhythm, haptics, window15])

  return (
    <TaskCard title="Radial pulse" icon={<HeartPulse size={17} />} onClose={onClose}>
      {!done ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Place two fingers over the radial artery (lateral wrist) and <b className="text-ink">press and hold</b>. Count the beats for {window15} seconds.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Segmented
              layoutId="pulsewin"
              size="sm"
              value={String(window15) as '15' | '30'}
              onChange={(v) => {
                setWindow15(Number(v) as 15 | 30)
                setElapsed(0)
                setTaps(0)
              }}
              options={[
                { value: '15', label: '15 s × 4' },
                { value: '30', label: '30 s × 2' },
              ]}
            />
            <span className="font-mono text-[13px] font-semibold text-ink tabular">
              {elapsed.toFixed(1)} / {window15}s
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
            <button
              onPointerDown={() => setHolding(true)}
              onPointerUp={() => setHolding(false)}
              onPointerLeave={() => setHolding(false)}
              onContextMenu={(e) => e.preventDefault()}
              className="relative h-36 overflow-hidden rounded-2xl ring-1 ring-line touch-none-select"
              style={{ background: `linear-gradient(90deg, ${pal.shadow}, ${pal.palm} 35%, ${pal.palm} 70%, ${pal.shadow})` }}
              aria-label="Press and hold to feel the radial pulse"
            >
              <div className="absolute inset-x-0 top-1/2 h-px bg-black/10" />
              <motion.div
                key={beat}
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute top-1/2 left-[28%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/40"
                style={{ display: holding ? 'block' : 'none' }}
              />
              <motion.div
                key={`b${beat}`}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25 }}
                className="absolute top-1/2 left-[28%] -translate-x-1/2 -translate-y-1/2"
              >
                <div className={cn('flex gap-1.5 transition-opacity', holding ? 'opacity-100' : 'opacity-70')}>
                  <div className="h-12 w-5 rounded-full bg-white/85 shadow ring-1 ring-black/10" />
                  <div className="h-12 w-5 rounded-full bg-white/85 shadow ring-1 ring-black/10" />
                </div>
              </motion.div>
              <div className="absolute right-3 bottom-2 text-[11px] font-semibold text-black/50">{holding ? 'Feeling…' : 'Hold here'}</div>
            </button>
            <button
              onClick={() => holding && setTaps((t) => t + 1)}
              className="flex h-36 w-24 flex-col items-center justify-center rounded-2xl bg-surface-2 ring-1 ring-line active:scale-95"
            >
              <span className="font-mono text-3xl font-semibold text-ink tabular">{taps}</span>
              <span className="mt-1 text-center text-[11px] leading-tight text-muted">tap to count</span>
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-faint">On Android phones you’ll feel each beat as a vibration.</p>
        </>
      ) : (
        <>
          <p className="text-[13.5px] text-muted">
            You counted <b className="text-ink">{taps}</b> beats in {window15} s{taps ? ` → about ${taps * (60 / window15)} bpm` : ''}. Record your findings:
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              inputMode="numeric"
              value={est || (taps ? String(taps * (60 / window15)) : '')}
              onChange={(e) => setEst(e.target.value.replace(/\D/g, ''))}
              placeholder="bpm"
              className="h-11 w-28 rounded-xl bg-surface-2 px-3 font-mono text-lg text-ink ring-1 ring-line outline-none focus:ring-accent"
            />
            <Segmented layoutId="rh" value={rh} onChange={setRh} options={[{ value: 'regular', label: 'Regular' }, { value: 'irregular', label: 'Irregular' }]} className="flex-1" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => { setElapsed(0); setTaps(0); setHolding(false) }}>
              Recount
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                const v = Number(est || (taps ? taps * (60 / window15) : 0))
                onSubmit(v > 0 ? v : undefined, rh)
              }}
            >
              Record pulse
            </Button>
          </div>
        </>
      )}
    </TaskCard>
  )
}

/* ------------------------------ Capillary refill ------------------------------ */

export function CrtTask({ crt, onSubmit, onClose, onBlanch }: { crt: number; onSubmit: (estimate: number | undefined) => void; onClose: () => void; onBlanch: (v: number) => void }) {
  const [pressMs, setPressMs] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'pressing' | 'refill' | 'done'>('idle')
  const [refillT, setRefillT] = useState(0)
  const start = useRef(0)
  const REQUIRED = 5000

  useEffect(() => {
    if (phase !== 'pressing') return
    const iv = window.setInterval(() => {
      const ms = performance.now() - start.current
      setPressMs(ms)
      onBlanch(Math.min(1, ms / 900))
    }, 50)
    return () => window.clearInterval(iv)
  }, [phase, onBlanch])

  useEffect(() => {
    if (phase !== 'refill') return
    const t0 = performance.now()
    const iv = window.setInterval(() => {
      const t = (performance.now() - t0) / 1000
      setRefillT(t)
      onBlanch(Math.max(0, 1 - t / crt))
    }, 50)
    return () => window.clearInterval(iv)
  }, [phase, crt, onBlanch])

  return (
    <TaskCard title="Capillary refill time" icon={<Timer size={17} />} onClose={onClose}>
      {phase === 'idle' || phase === 'pressing' ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-muted">
            With the hand at heart level, <b className="text-ink">press and hold</b> the nail bed for 5 seconds, then release and count how long the colour takes to return.
          </p>
          <button
            onPointerDown={() => {
              start.current = performance.now()
              setPhase('pressing')
            }}
            onPointerUp={() => {
              if (performance.now() - start.current >= REQUIRED) {
                setPhase('refill')
              } else {
                setPhase('idle')
                setPressMs(0)
                onBlanch(0)
              }
            }}
            className="mt-3 flex h-24 w-full items-center justify-center gap-3 rounded-2xl bg-surface-2 ring-1 ring-line touch-none-select"
          >
            <Hand size={22} className="text-accent" />
            <div className="w-40">
              <div className="text-[13px] font-semibold text-ink">{phase === 'pressing' ? (pressMs >= REQUIRED ? 'Release now' : 'Keep pressing…') : 'Press & hold the nail'}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, (pressMs / REQUIRED) * 100)}%` }} />
              </div>
            </div>
          </button>
        </>
      ) : phase === 'refill' ? (
        <>
          <p className="text-[13.5px] text-muted">Watch the nail bed — tap as soon as it is pink again.</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="font-mono text-3xl font-semibold text-ink tabular">{refillT.toFixed(1)}s</div>
            <Button variant="primary" className="flex-1" onClick={() => { setPhase('done'); onSubmit(Math.round(refillT * 10) / 10) }}>
              Colour has returned
            </Button>
          </div>
        </>
      ) : null}
    </TaskCard>
  )
}

/* ------------------------------ Stethoscope ------------------------------ */

export function ListenTask({ kind, hr, label, onStop, minSeconds = 0 }: { kind: Listen; hr: number; label: string; onStop: (seconds: number) => void; minSeconds?: number }) {
  const [sec, setSec] = useState(0)
  const [fast, setFast] = useState(false)
  const fastRef = useRef(fast)
  fastRef.current = fast

  useEffect(() => {
    const h = startListening(kind, hr)
    let last = performance.now()
    const iv = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      setSec((s) => s + dt * (fastRef.current ? 8 : 1))
    }, 100)
    return () => {
      window.clearInterval(iv)
      h.stop()
    }
  }, [kind, hr])

  return (
    <TaskCard title={label} icon={<Stethoscope size={17} />} onClose={() => onStop(sec)}>
      <div className="flex items-center gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-[pulse-ring_1.6s_ease-out_infinite] rounded-full bg-accent/25" />
          <span className="relative grid h-12 w-12 place-items-center rounded-full bg-surface-2 ring-2 ring-accent/60">
            <Stethoscope size={20} className="text-accent" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-3xl font-semibold text-ink tabular">
            {Math.floor(sec / 60)}:{String(Math.floor(sec % 60)).padStart(2, '0')}
          </div>
          <div className="text-[12.5px] text-muted">{fast ? 'Time-lapse ×8 — sounds are sampled' : 'Listening… use headphones for best effect'}</div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant={fast ? 'soft' : 'secondary'} onClick={() => setFast((f) => !f)} leading={<FastForward size={16} />}>
          {fast ? 'Real time' : 'Time-lapse'}
        </Button>
        <Button variant="primary" className="flex-1" onClick={() => onStop(sec)} leading={<Square size={14} />}>
          Stop listening{minSeconds && sec < minSeconds ? '' : ''}
        </Button>
      </div>
    </TaskCard>
  )
}

/* ------------------------------ Guided manoeuvre (scripted) ------------------------------ */

export function ManoeuvreCaption({ steps, onDone }: { steps: string[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= steps.length) {
      onDone()
      return
    }
    const id = window.setTimeout(() => setI((x) => x + 1), 1050)
    return () => window.clearTimeout(id)
  }, [i, steps.length, onDone])
  const step = steps[Math.min(i, steps.length - 1)]
  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none absolute top-3 left-1/2 z-30 w-max max-w-[90%] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-[13px] font-medium text-white backdrop-blur"
    >
      {step}
    </motion.div>
  )
}
