import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { monitorBeep } from '../../audio/engine'
import type { CaseDef, Vitals } from '../../engine/types'
import { cn } from '../../lib/utils'

/**
 * A bedside monitor in the style of the ones on every surgical ward: ECG and
 * plethysmograph traces drawn on canvas, numeric parameters in the classic
 * colour coding. The trace is generated from the heart rate and rhythm (an
 * irregularly irregular pattern for AF).
 */
export function VitalsMonitor({
  v,
  compact,
  className,
  label = 'BED 7 · MONITOR',
}: {
  v: Vitals
  compact?: boolean
  className?: string
  label?: string
}) {
  const ecgRef = useRef<HTMLCanvasElement>(null)
  const plethRef = useRef<HTMLCanvasElement>(null)
  const [muted, setMuted] = useState(true)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const [hr, setHr] = useState(v.hr)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const ecg = ecgRef.current
    const pleth = plethRef.current
    if (!ecg || !pleth) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const setup = (cv: HTMLCanvasElement) => {
      const r = cv.getBoundingClientRect()
      cv.width = Math.max(1, r.width * dpr)
      cv.height = Math.max(1, r.height * dpr)
      const g = cv.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { g, w: r.width, h: r.height }
    }
    let E = setup(ecg)
    let P = setup(pleth)
    const ro = new ResizeObserver(() => {
      E = setup(ecg)
      P = setup(pleth)
      x = 0
    })
    ro.observe(ecg)

    const speed = 60 // px per second
    let x = 0
    let last = performance.now()
    let nextBeat = 0.3
    let t = 0
    let beatStart = -10
    let prevE = { x: 0, y: 0 }
    let prevP = { x: 0, y: 0 }
    let raf = 0
    let counted = 0
    let windowStart = 0
    const irregular = v.rhythm === 'irregular'

    const ecgAt = (dt: number): number => {
      // dt: seconds since beat start. PQRST template (~0.6 s).
      if (dt < 0) return 0
      const gauss = (m: number, s: number, a: number) => a * Math.exp(-((dt - m) ** 2) / (2 * s * s))
      const p = irregular ? Math.sin(dt * 47) * 0.04 : gauss(0.08, 0.025, 0.12)
      return p + gauss(0.2, 0.008, -0.12) + gauss(0.22, 0.01, 1) + gauss(0.245, 0.01, -0.25) + gauss(0.45, 0.05, 0.25)
    }
    const plethAt = (dt: number): number => {
      if (dt < 0.12) return 0
      const u = dt - 0.12
      return Math.exp(-((u - 0.12) ** 2) / 0.006) * 0.9 + Math.exp(-((u - 0.34) ** 2) / 0.01) * 0.3
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      if (t >= nextBeat) {
        beatStart = nextBeat
        const base = 60 / Math.max(30, v.hr)
        const jitter = irregular ? base * (0.55 + Math.random() * 0.9) : base * (0.98 + Math.random() * 0.04)
        nextBeat += jitter
        counted++
        setFlash(true)
        window.setTimeout(() => setFlash(false), 110)
        if (!mutedRef.current) monitorBeep(v.spo2)
      }
      if (t - windowStart > 6) {
        setHr(Math.round((counted / (t - windowStart)) * 60 * 0.5 + v.hr * 0.5))
        counted = 0
        windowStart = t
      }
      const nx = x + speed * dt
      const drawTrace = (C: { g: CanvasRenderingContext2D; w: number; h: number }, val: number, prev: { x: number; y: number }, color: string, amp: number, base: number) => {
        const g = C.g
        const y = C.h * base - val * C.h * amp
        g.clearRect(nx % C.w, 0, 14, C.h)
        if (nx % C.w < x % C.w) {
          prev.x = 0
          prev.y = y
        }
        g.strokeStyle = color
        g.lineWidth = 1.6
        g.lineJoin = 'round'
        g.shadowColor = color
        g.shadowBlur = 4
        g.beginPath()
        g.moveTo(prev.x, prev.y)
        g.lineTo(nx % C.w, y)
        g.stroke()
        prev.x = nx % C.w
        prev.y = y
      }
      drawTrace(E, ecgAt(t - beatStart), prevE, '#3bf07a', 0.55, 0.68)
      drawTrace(P, plethAt(t - beatStart), prevP, '#3fd6ff', 0.6, 0.85)
      x = nx
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [v.hr, v.rhythm, v.spo2])

  const hrAlarm = v.hr > 110 || v.hr < 50
  const bpAlarm = v.sbp < 100 || v.sbp > 180
  const spo2Alarm = v.spo2 < 94
  const rrAlarm = v.rr > 20 || v.rr < 10
  const tAlarm = v.temp >= 38 || v.temp < 36

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-mon-bg font-mono text-white shadow-(--shadow-float) ring-1 ring-white/10',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <span className="text-[10px] font-semibold tracking-[0.18em] text-white/45">{label}</span>
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute monitor' : 'Mute monitor'}
          className="text-white/50 transition hover:text-white"
        >
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      </div>
      <div className={cn('grid', compact ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_auto]')}>
        <div className="flex min-w-0 flex-col">
          <canvas ref={ecgRef} className={cn('w-full', compact ? 'h-9' : 'h-14')} />
          <canvas ref={plethRef} className={cn('w-full', compact ? 'h-7' : 'h-11')} />
        </div>
        <div className={cn('flex flex-col items-end justify-center pr-3', compact ? 'min-w-[72px]' : 'min-w-[96px]')}>
          <div className={cn('flex items-baseline gap-1 text-mon-hr', hrAlarm && 'animate-[blink-soft_1s_ease-in-out_infinite]')}>
            <span className="text-[9px] font-semibold opacity-70">HR</span>
            <span className={cn('font-semibold tabular leading-none', compact ? 'text-2xl' : 'text-[34px]')}>{hr}</span>
            <span className={cn('ml-0.5 text-[9px] transition-opacity', flash ? 'opacity-100' : 'opacity-20')}>♥</span>
          </div>
          <div className={cn('flex items-baseline gap-1 text-mon-spo2', spo2Alarm && 'animate-[blink-soft_1s_ease-in-out_infinite]')}>
            <span className="text-[9px] font-semibold opacity-70">SpO₂</span>
            <span className={cn('font-semibold tabular leading-none', compact ? 'text-lg' : 'text-2xl')}>{v.spo2}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px border-t border-white/5 bg-white/5">
        <div className={cn('bg-mon-bg px-2.5 py-1.5 text-mon-bp', bpAlarm && 'animate-[blink-soft_1s_ease-in-out_infinite]')}>
          <div className="text-[9px] font-semibold opacity-70">NIBP</div>
          <div className={cn('font-semibold tabular leading-tight', compact ? 'text-sm' : 'text-lg')}>
            {v.sbp}/{v.dbp}
          </div>
        </div>
        <div className={cn('bg-mon-bg px-2.5 py-1.5 text-mon-rr', rrAlarm && 'animate-[blink-soft_1s_ease-in-out_infinite]')}>
          <div className="text-[9px] font-semibold opacity-70">RESP</div>
          <div className={cn('font-semibold tabular leading-tight', compact ? 'text-sm' : 'text-lg')}>{v.rr}</div>
        </div>
        <div className={cn('bg-mon-bg px-2.5 py-1.5 text-mon-temp', tAlarm && 'animate-[blink-soft_1s_ease-in-out_infinite]')}>
          <div className="text-[9px] font-semibold opacity-70">TEMP</div>
          <div className={cn('font-semibold tabular leading-tight', compact ? 'text-sm' : 'text-lg')}>{v.temp.toFixed(1)}°</div>
        </div>
      </div>
    </div>
  )
}

/** Where the monitor is: the header strip reads like the real one in that area. */
export function monitorLabel(setting: CaseDef['setting']): string {
  if (setting === 'Emergency department') return 'MAJORS 4 · MONITOR'
  if (setting === 'Surgical assessment unit') return 'SAU BAY 2 · MONITOR'
  return 'BED 7 · MONITOR'
}

/**
 * Outpatients don't sit on a cardiac monitor: the healthcare assistant takes a
 * set of observations at check-in and they're written on the clinic sheet.
 */
export function ClinicObs({ v, className }: { v: Vitals; className?: string }) {
  const rows: { k: string; v: string; flag?: boolean }[] = [
    { k: 'Pulse', v: `${v.hr} ${v.rhythm === 'irregular' ? 'irreg.' : 'reg.'}`, flag: v.hr > 100 || v.hr < 50 || v.rhythm === 'irregular' },
    { k: 'BP', v: `${v.sbp}/${v.dbp}`, flag: v.sbp >= 160 || v.sbp < 100 },
    { k: 'Resp', v: `${v.rr}`, flag: v.rr > 20 || v.rr < 10 },
    { k: 'SpO₂', v: `${v.spo2}% ${v.o2 ?? 'air'}`, flag: v.spo2 < 94 },
    { k: 'Temp', v: `${v.temp.toFixed(1)} °C`, flag: v.temp >= 38 || v.temp < 36 },
  ]
  return (
    <div className={cn('rounded-3xl bg-surface-1 p-4 ring-1 ring-line shadow-(--shadow-soft)', className)}>
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Clinic observations</div>
        <div className="text-[11px] text-faint">at check-in</div>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {rows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-2 border-b border-line/60 pb-1 last:col-span-2 last:border-0 last:pb-0">
            <dt className="text-[12.5px] text-muted">{r.k}</dt>
            <dd className={cn('font-mono text-[13px] font-semibold tabular', r.flag ? 'text-warning' : 'text-ink')}>{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
