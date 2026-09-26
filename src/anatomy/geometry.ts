export type Pt = readonly [number, number]

/**
 * Catmull–Rom spline through points → SVG cubic Bézier path.
 * `tension` 1 = standard Catmull–Rom, lower = tighter curves.
 */
export function smoothPath(points: readonly Pt[], closed = false, tension = 1): string {
  const n = points.length
  if (n < 2) return ''
  const p = (i: number): Pt => {
    if (closed) return points[(i + n) % n]
    return points[Math.max(0, Math.min(n - 1, i))]
  }
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = p(i - 1)
    const p1 = p(i)
    const p2 = p(i + 1)
    const p3 = p(i + 2)
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`
  }
  if (closed) d += ' Z'
  return d
}

/** Continue an existing path with a smooth spline (no initial M). */
export function smoothSegments(points: readonly Pt[], tension = 1): string {
  return smoothPath(points, false, tension).replace(/^M[^C]*/, '')
}

const f = (v: number) => (Math.round(v * 100) / 100).toString()

/** Mirror a list of right-half points (x ≥ 0 is the viewer's right) to the left. */
export const mirror = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [-x, y] as Pt)

/**
 * Build a symmetric closed outline from the right-half contour ordered from
 * top-midline down to bottom-midline.
 */
export function symmetricOutline(rightHalf: readonly Pt[], tension = 1): string {
  const left = mirror(rightHalf).reverse()
  return smoothPath([...rightHalf, ...left.slice(1, -1)], true, tension)
}

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export function dist(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Point-in-polygon (ray casting). */
export function pointInPolygon(pt: Pt, poly: readonly Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersect = yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Polyline through points (straight segments). */
export function polyline(points: readonly Pt[], closed = false): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join(' ') + (closed ? ' Z' : '')
}

/** Ellipse as path (useful for clip paths and morphing). */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0 Z`
}
