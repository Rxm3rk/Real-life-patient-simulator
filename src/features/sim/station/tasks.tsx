import { Activity, ArrowDownToLine, Footprints, Radio, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { dopplerVelocity, startDoppler, type DopplerHandle, type DopplerKind } from '../../../audio/engine'
import type { Pt } from '../../../anatomy/geometry'
import { Button } from '../../../components/ui/Button'
import type { PulseGrade } from '../../../engine/types'
import { cn, vibrate } from '../../../lib/utils'
import { useSettings } from '../../../store/settings'
import { TaskCard } from '../exam/tasks'
import type { SceneExtra } from './types'

/* ------------------------------ Buerger's test ------------------------------ */

export function BuergerTask({
  angleTarget,
  learn,
  onState,
  onDone,
  onClose,
}: {
  /** Case Buerger's angle (undefined = no pallor on elevation) */
  angleTarget?: number
  learn: boolean
  onState: (b: NonNullable<SceneExtra['buerger']>) => void
  onDone: () => void
  onClose: () => void
}) {
  const [angle, setAngle] = useState(0)
  const [dependent, setDependent] = useState(false)
  const st = useRef({ pallor: 0, rubor: 0 })
  const [, force] = useState(0)

  // colour changes lag behind position, as they do in a real limb
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const pTarget = !dependent && angleTarget !== undefined ? Math.max(0, Math.min(1, (angle - angleTarget + 6) / 10)) : 0
      const rTarget = dependent && angleTarget !== undefined ? 1 : 0
      const s = st.current
      s.pallor += (pTarget - s.pallor) * Math.min(1, dt * 1.6)
      s.rubor += (rTarget - s.rubor) * Math.min(1, dt * 0.45)
      onState({ angle, dependent, pallor: s.pallor, rubor: s.rubor })
      force((n) => (n + 1) % 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle, dependent, angleTarget])

  const pale = st.current.pallor > 0.5
  return (
    <TaskCard title="Buerger’s test" icon={<Footprints size={17} />} onClose={onClose}>
      {!dependent ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-muted">
            With the patient supine, <b className="text-ink">slowly raise both legs</b> (knees straight). Watch the soles: note the angle at which they go pale.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={90}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              aria-label="Leg elevation angle"
              className="h-2 flex-1 cursor-pointer accent-[var(--accent)]"
            />
            <span className="w-12 text-right font-mono text-[15px] font-semibold text-ink tabular">{angle}°</span>
          </div>
          <div className={cn('mt-2 text-[12.5px] font-medium', pale ? 'text-warning' : 'text-faint')}>{pale ? 'The feet have gone pale.' : 'Feet still pink.'}</div>
          {learn && angleTarget !== undefined && <p className="mt-1 text-[12px] text-violet">Buerger’s angle &lt; 20° indicates severe ischaemia.</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" leading={<ArrowDownToLine size={15} />} onClick={() => setDependent(true)} disabled={angle < 30}>
              Hang legs over the side
            </Button>
          </div>
          {angle < 30 && <p className="mt-1.5 text-[11.5px] text-faint">Raise to at least 45° (or until pallor) first.</p>}
        </>
      ) : (
        <>
          <p className="text-[13.5px] leading-relaxed text-muted">
            The patient sits up and hangs the legs over the side of the couch. Watch the colour return over a minute or so.
          </p>
          <div className={cn('mt-2 text-[12.5px] font-medium', st.current.rubor > 0.5 ? 'text-danger' : 'text-faint')}>
            {st.current.rubor > 0.5 ? 'Reactive hyperaemia: the feet turn a dusky red (“sunset foot”).' : 'Watching the feet…'}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setDependent(false)}>
              Repeat
            </Button>
            <Button variant="primary" className="flex-1" onClick={onDone}>
              Record the result
            </Button>
          </div>
        </>
      )}
    </TaskCard>
  )
}

/* ------------------------------ Handheld Doppler ------------------------------ */

export function DopplerTask({
  kind,
  hr,
  label,
  venous,
  reflux,
  onDone,
  onClose,
}: {
  kind: DopplerKind
  hr: number
  label: string
  venous?: boolean
  reflux?: boolean
  onDone: () => void
  onClose: () => void
}) {
  const handle = useRef<DopplerHandle | null>(null)
  const squeezes = useRef<number[]>([])
  const clock0 = useRef(performance.now() / 1000)
  const [path, setPath] = useState('')
  const [squeezed, setSqueezed] = useState(false)
  const W = 300
  const H = 84
  const span = 3 // seconds on screen

  useEffect(() => {
    handle.current = startDoppler(venous ? 'venous' : kind, hr)
    return () => handle.current?.stop()
  }, [kind, hr, venous])

  useEffect(() => {
    let raf = 0
    const period = 60 / Math.max(40, hr)
    const loop = () => {
      const now = performance.now() / 1000 - clock0.current
      const pts: string[] = []
      for (let i = 0; i <= 150; i++) {
        const t = now - span + (i / 150) * span
        let v = 0
        if (t > 0) {
          if (venous) {
            v = dopplerVelocity('venous', t)
            for (const s of squeezes.current) {
              const u = t - s
              if (u >= 0 && u < 0.5) v += Math.sin((u / 0.5) * Math.PI) * 0.9
              if (reflux && u >= 0.75 && u < 2.15) v -= Math.sin(Math.min(1, ((u - 0.75) / 1.4) * 1.3) * Math.PI) * 0.6
            }
          } else v = dopplerVelocity(kind, t % period)
        }
        pts.push(`${((i / 150) * W).toFixed(1)},${(H / 2 - v * (H * 0.42)).toFixed(1)}`)
      }
      setPath(pts.join(' '))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [kind, hr, venous, reflux])

  return (
    <TaskCard title={label} icon={<Radio size={17} />} onClose={onClose}>
      <p className="text-[13px] leading-relaxed text-muted">
        {venous
          ? 'Probe at 45° over the saphenofemoral junction. Squeeze the calf and listen on release: reflux lasting more than 0.5 s means an incompetent valve.'
          : 'Gel on, probe at 45° to the vessel, pointing towards the heart. Listen to the signal: triphasic is normal, biphasic or monophasic indicates disease.'}
      </p>
      <div className="mt-3 overflow-hidden rounded-xl bg-[#0b1220] ring-1 ring-white/10">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-[84px] w-full" role="img" aria-label="Doppler velocity trace">
          <path d={`M0 ${H / 2} L${W} ${H / 2}`} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />
          {path && <polyline points={`0,${H / 2} ${path} ${W},${H / 2}`} fill="#22a898" fillOpacity="0.12" stroke="none" />}
          {path && <polyline points={path} fill="none" stroke="#34d3c0" strokeWidth="2" strokeLinejoin="round" />}
        </svg>
      </div>
      <div className="mt-4 flex gap-2">
        {venous && (
          <Button
            variant="secondary"
            leading={<Activity size={15} />}
            onClick={() => {
              squeezes.current = [...squeezes.current.slice(-2), performance.now() / 1000 - clock0.current]
              setSqueezed(true)
              handle.current?.squeeze(!!reflux)
            }}
          >
            Squeeze calf
          </Button>
        )}
        <Button variant="primary" className="flex-1" leading={<Square size={14} />} onClick={onDone} disabled={venous && !squeezed}>
          Stop & record
        </Button>
      </div>
    </TaskCard>
  )
}

/* ------------------------------ Tourniquet test ------------------------------ */

export type TqStage = 'start' | 'elevated' | 'tourniquet' | 'standing' | 'released'

export function TourniquetTask({
  controlled,
  onState,
  onDone,
  onClose,
}: {
  controlled: boolean
  onState: (s: { stage: TqStage; veinFill: number; tourniquet: boolean; view: 'standing' | 'lying' }) => void
  onDone: () => void
  onClose: () => void
}) {
  const [stage, setStage] = useState<TqStage>('start')
  const fill = useRef(1)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const target = stage === 'start' ? 1 : stage === 'elevated' || stage === 'tourniquet' ? 0.04 : stage === 'standing' ? (controlled ? 0.08 : 1) : 1
      const rate = stage === 'released' ? 3 : stage === 'standing' ? 0.45 : 1.4
      fill.current += (target - fill.current) * Math.min(1, dt * rate)
      onState({ stage, veinFill: fill.current, tourniquet: stage === 'tourniquet' || stage === 'standing', view: stage === 'elevated' || stage === 'tourniquet' ? 'lying' : 'standing' })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, controlled])

  const steps: { id: TqStage; label: string; hint: string }[] = [
    { id: 'elevated', label: 'Lie down & elevate the leg', hint: 'Raise the leg to empty the superficial veins.' },
    { id: 'tourniquet', label: 'Apply the tourniquet', hint: 'High on the thigh, just below the saphenofemoral junction.' },
    { id: 'standing', label: 'Ask the patient to stand', hint: 'Watch the varicosities for 20–30 seconds.' },
    { id: 'released', label: 'Release the tourniquet', hint: 'Rapid filling from above confirms SFJ incompetence.' },
  ]
  const idx = steps.findIndex((s) => s.id === stage)
  const next = steps[idx + 1]
  return (
    <TaskCard title="Tourniquet test" icon={<Footprints size={17} />} onClose={onClose}>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.id} className={cn('flex gap-2 text-[13px] leading-snug', i <= idx ? 'text-ink' : 'text-faint')}>
            <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold', i <= idx ? 'bg-accent text-accent-fg' : 'ring-1 ring-line-strong')}>{i + 1}</span>
            <span>
              <b className="font-semibold">{s.label}.</b> <span className="text-muted">{s.hint}</span>
            </span>
          </li>
        ))}
      </ol>
      {stage === 'standing' && <p className="mt-2 text-[12.5px] font-medium text-ink">Are the veins below the tourniquet refilling?</p>}
      <div className="mt-4 flex gap-2">
        {next ? (
          <Button variant="primary" className="flex-1" onClick={() => setStage(next.id)}>
            {next.label}
          </Button>
        ) : (
          <Button variant="primary" className="flex-1" onClick={onDone}>
            Record the result
          </Button>
        )}
      </div>
    </TaskCard>
  )
}

/* ------------------------------ Feeling a pulse ------------------------------ */

/** Fingertips on a pulse point; rings throb with each beat unless the pulse is absent. */
export function PulseFeel({ at, grade, hr, scale = 1 }: { at: Pt; grade: PulseGrade; hr: number; scale?: number }) {
  const haptics = useSettings((s) => s.haptics)
  const beat = 60 / Math.max(40, hr)
  useEffect(() => {
    if (!haptics || grade === 'absent') return
    const ms = Math.round(beat * 1000)
    const pulse = grade === 'weak' ? 12 : grade === 'prominent' ? 45 : 28
    vibrate([pulse, ms - pulse, pulse, ms - pulse, pulse, ms - pulse, pulse])
  }, [haptics, grade, beat])
  const amp = grade === 'prominent' ? 1.35 : grade === 'weak' ? 0.6 : 1
  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${scale})`} pointerEvents="none">
      {grade !== 'absent' &&
        [0, 0.5].map((d) => (
          <circle
            key={d}
            r={9 * amp}
            fill="none"
            stroke="#ff5a6e"
            strokeWidth={grade === 'weak' ? 0.8 : 1.6}
            opacity={grade === 'weak' ? 0.55 : 0.9}
            style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `bs-throb ${beat.toFixed(2)}s ${d * beat}s ease-out infinite` }}
          />
        ))}
      {[-3.4, 0, 3.4].map((x, i) => (
        <ellipse key={i} cx={x} cy={i === 1 ? -1 : 0} rx={2.3} ry={3.8} fill="#f7fbff" stroke="#9fb6cc" strokeWidth="0.5" opacity="0.95" />
      ))}
      {grade === 'absent' && (
        <text y={-9} textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,28,0.6)', strokeWidth: 1.4 }}>
          …
        </text>
      )}
    </g>
  )
}
