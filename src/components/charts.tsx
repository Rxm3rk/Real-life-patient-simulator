import { useMemo, useRef, useState } from 'react'
import { useElementSize } from '../lib/hooks'

/**
 * Minimal, accessible charts following the app's data-viz rules: one series,
 * 2px line, 10% area wash, ≥ 8px end marker with a surface ring, hairline solid
 * grid, crosshair + tooltip, text in text tokens (never the series colour).
 */

export interface LinePoint {
  x: number
  y: number // 0..1
  label: string
  sub?: string
}

export function ScoreLine({ points, height = 220, reference = 0.6, referenceLabel = 'Pass mark' }: { points: LinePoint[]; height?: number; reference?: number; referenceLabel?: string }) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const w = Math.max(280, size.width)
  const pad = { l: 36, r: 44, t: 16, b: 26 }
  const iw = w - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const n = points.length
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => pad.t + (1 - v) * ih
  const path = useMemo(() => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' '), [points, w])
  const area = n ? `${path} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : ''
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const last = points[n - 1]

  const onMove = (e: React.PointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || !n) return
    const px = e.clientX - r.left
    const i = Math.round(((px - pad.l) / iw) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        ref={svgRef}
        width={w}
        height={height}
        className="block"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Score over your last ${n} stations`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1))
          if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1))
        }}
        onBlur={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-faint)" className="tabular">
              {Math.round(t * 100)}
            </text>
          </g>
        ))}
        {/* reference line: the pass mark */}
        <line x1={pad.l} x2={w - pad.r} y1={y(reference)} y2={y(reference)} stroke="var(--text-faint)" strokeWidth="1" opacity="0.6" />
        <text x={w - pad.r + 6} y={y(reference) + 4} fontSize="10.5" fill="var(--text-faint)">
          {referenceLabel}
        </text>
        {n > 0 && (
          <>
            <path d={area} fill="var(--chart-1)" opacity="0.1" />
            <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {/* end marker with a surface ring + direct label */}
            <circle cx={x(n - 1)} cy={y(last.y)} r="6" fill="var(--surface-1)" />
            <circle cx={x(n - 1)} cy={y(last.y)} r="4" fill="var(--chart-1)" />
            <text x={x(n - 1) + 9} y={y(last.y) + 4} fontSize="12" fontWeight="600" fill="var(--text)">
              {Math.round(last.y * 100)}%
            </text>
          </>
        )}
        {hover !== null && points[hover] && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--text-faint)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(points[hover].y)} r="6" fill="var(--surface-1)" />
            <circle cx={x(hover)} cy={y(points[hover].y)} r="4" fill="var(--chart-1)" />
          </g>
        )}
        <text x={pad.l} y={height - 6} fontSize="11" fill="var(--text-faint)">
          Oldest
        </text>
        <text x={w - pad.r} y={height - 6} fontSize="11" fill="var(--text-faint)" textAnchor="end">
          Latest
        </text>
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 rounded-xl bg-surface-1 px-3 py-2 shadow-(--shadow-float) ring-1 ring-line"
          style={{ left: Math.min(Math.max(x(hover), 80), w - 80), top: Math.max(0, y(points[hover].y) - 70) }}
        >
          <div className="text-[15px] font-semibold text-ink">{Math.round(points[hover].y * 100)}%</div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className="h-0.5 w-3 rounded-full bg-chart-1" />
            {points[hover].label}
          </div>
          {points[hover].sub && <div className="text-[11.5px] text-faint">{points[hover].sub}</div>}
        </div>
      )}
    </div>
  )
}

export function BarList({ items, format = (v: number) => `${Math.round(v * 100)}%`, max = 1 }: { items: { label: string; value: number; hint?: string }[]; format?: (v: number) => string; max?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <ul className="space-y-2.5" role="list">
      {items.map((it, i) => (
        <li
          key={it.label}
          className="group"
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          tabIndex={0}
          aria-label={`${it.label}: ${format(it.value)}`}
        >
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-ink">{it.label}</span>
            <span className="shrink-0 font-medium text-muted tabular">{format(it.value)}</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-[4px] bg-[var(--chart-grid)]">
            <div
              className="h-full rounded-r-[4px] transition-[width,filter] duration-500"
              style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: 'var(--chart-1)', filter: hover === i ? 'brightness(1.15)' : undefined }}
            />
          </div>
          {hover === i && it.hint && <div className="mt-1 text-[11.5px] text-faint">{it.hint}</div>}
        </li>
      ))}
    </ul>
  )
}
