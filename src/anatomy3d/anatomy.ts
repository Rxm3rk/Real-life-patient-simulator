import * as THREE from 'three'
import type { RegionId } from '../anatomy/bodyModel'
import type { HumanBase } from './assets'
import type { HumanModel } from './human'

/**
 * Surface anatomy on the rest-pose body (decimetres; patient's left = +x):
 * the nine abdominal regions, the groin (inguinal ligament, deep and
 * superficial rings, femoral canal), pulse points and other examination
 * landmarks, derived from each patient's own mesh.
 */

export interface Anatomy {
  xiphoid: THREE.Vector3
  navel: THREE.Vector3
  pubis: THREE.Vector3
  sternalNotch: THREE.Vector3
  thyroidCartilage: THREE.Vector3
  nippleL: THREE.Vector3
  nippleR: THREE.Vector3
  asisL: THREE.Vector3
  asisR: THREE.Vector3
  pubicTubercleL: THREE.Vector3
  pubicTubercleR: THREE.Vector3
  deepRingL: THREE.Vector3
  deepRingR: THREE.Vector3
  superficialRingL: THREE.Vector3
  superficialRingR: THREE.Vector3
  femoralCanalL: THREE.Vector3
  femoralCanalR: THREE.Vector3
  /** Mid-inguinal point: femoral pulse, halfway between ASIS and pubic symphysis */
  midInguinalL: THREE.Vector3
  midInguinalR: THREE.Vector3
  /** Mid-clavicular line, |x| */
  mcl: number
  subcostalY: number
  transtubercularY: number
  /** Surface point nearest a rest-space position (so markers sit on the skin) */
  onSkin(p: THREE.Vector3): THREE.Vector3
  /** Depth of the front of the body at (x, y): what you see looking at the patient from the front (NaN off the body) */
  front(x: number, y: number): number
  /** The front of the body at (x, y), lifted `lift` off the skin */
  onFront(x: number, y: number, lift?: number): THREE.Vector3
}

/**
 * The front of the rest-pose body as a depth map: body triangles rasterised in
 * x/y keeping the largest z. Signs drawn on the front of the patient (scars,
 * hernias, the region grid) are placed with it, so they land where you'd see
 * them even over a distended abdomen.
 */
function frontMap(h: HumanModel, base: HumanBase) {
  const res = 0.04
  const x0 = -3.2
  const y0 = 0
  const nx = Math.round(6.4 / res) + 1
  const ny = Math.round(19 / res) + 1
  const Z = new Float32Array(nx * ny).fill(-Infinity)
  const part = base.meta.parts.find((p) => p.name === 'body')!
  const P = h.positions
  const r2c = base.renderToCompact
  for (let i = part.start; i < part.start + part.count; i += 3) {
    const a = r2c[base.index[i]] * 3
    const b = r2c[base.index[i + 1]] * 3
    const c = r2c[base.index[i + 2]] * 3
    const ax = (P[a] - x0) / res
    const ay = (P[a + 1] - y0) / res
    const bx = (P[b] - x0) / res
    const by = (P[b + 1] - y0) / res
    const cx = (P[c] - x0) / res
    const cy = (P[c + 1] - y0) / res
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if (Math.abs(den) < 1e-9) continue
    const minX = Math.max(0, Math.ceil(Math.min(ax, bx, cx)))
    const maxX = Math.min(nx - 1, Math.floor(Math.max(ax, bx, cx)))
    const minY = Math.max(0, Math.ceil(Math.min(ay, by, cy)))
    const maxY = Math.min(ny - 1, Math.floor(Math.max(ay, by, cy)))
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den
        const w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den
        const w2 = 1 - w0 - w1
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue
        const z = P[a + 2] * w0 + P[b + 2] * w1 + P[c + 2] * w2
        if (z > Z[y * nx + x]) Z[y * nx + x] = z
      }
  }
  return (x: number, y: number) => {
    const gx = (x - x0) / res
    const gy = (y - y0) / res
    const ix = Math.floor(gx)
    const iy = Math.floor(gy)
    if (ix < 0 || iy < 0 || ix >= nx - 1 || iy >= ny - 1) return NaN
    const fx = gx - ix
    const fy = gy - iy
    const z00 = Z[iy * nx + ix]
    const z10 = Z[iy * nx + ix + 1]
    const z01 = Z[(iy + 1) * nx + ix]
    const z11 = Z[(iy + 1) * nx + ix + 1]
    const all = [z00, z10, z01, z11]
    if (all.every((z) => z === -Infinity)) return NaN
    // near an edge of the body use the cells that are on it
    if (all.some((z) => z === -Infinity)) return Math.max(...all)
    return (z00 * (1 - fx) + z10 * fx) * (1 - fy) + (z01 * (1 - fx) + z11 * fx) * fy
  }
}

export function anatomyOf(h: HumanModel, base: HumanBase): Anatomy {
  const lm = base.meta.landmarks as Record<string, number>
  const P = (name: string) => new THREE.Vector3(h.positions[lm[name] * 3], h.positions[lm[name] * 3 + 1], h.positions[lm[name] * 3 + 2])
  const bodyVerts = (() => {
    const part = base.meta.parts.find((p) => p.name === 'body')!
    const s = new Set<number>()
    for (let i = part.start; i < part.start + part.count; i++) s.add(base.renderToCompact[base.index[i]])
    return [...s]
  })()
  const onSkin = (p: THREE.Vector3) => {
    let best = 0
    let bd = Infinity
    for (const c of bodyVerts) {
      const d = (h.positions[c * 3] - p.x) ** 2 + (h.positions[c * 3 + 1] - p.y) ** 2 + (h.positions[c * 3 + 2] - p.z) ** 2
      if (d < bd) {
        bd = d
        best = c
      }
    }
    return new THREE.Vector3(h.positions[best * 3], h.positions[best * 3 + 1], h.positions[best * 3 + 2])
  }
  const front = frontMap(h, base)
  const onFront = (x: number, y: number, lift = 0) => {
    const z = front(x, y)
    return Number.isFinite(z) ? new THREE.Vector3(x, y, z + lift) : onSkin(new THREE.Vector3(x, y, 1))
  }
  const xiphoid = P('xiphoid')
  const navel = P('navel')
  const pubis = P('pubis')
  const asisL = P('asisL')
  const asisR = P('asisR')
  const side = (s: 1 | -1) => {
    const asis = s === 1 ? asisL : asisR
    const tubercle = onFront(0.24 * s, pubis.y - 0.08)
    const ligamentMid = asis.clone().lerp(tubercle, 0.5)
    const mid = asis.clone().lerp(pubis, 0.5)
    return {
      tubercle,
      // the deep ring lies 1–1.5 cm above the midpoint of the inguinal ligament
      deep: onFront(ligamentMid.x, ligamentMid.y + 0.14),
      // the superficial ring sits just above and lateral to the pubic tubercle
      superficial: onFront(tubercle.x + 0.13 * s, tubercle.y + 0.13),
      // the femoral canal is below the ligament, lateral to the tubercle
      femoral: onFront(tubercle.x + 0.36 * s, tubercle.y - 0.3),
      // femoral pulse at the mid-inguinal point, just below the ligament
      midInguinal: onFront(mid.x, mid.y - 0.14),
    }
  }
  const L = side(1)
  const R = side(-1)
  return {
    xiphoid,
    navel,
    pubis,
    sternalNotch: P('sternalNotch'),
    thyroidCartilage: P('thyroidCartilage'),
    nippleL: P('nippleL'),
    nippleR: P('nippleR'),
    asisL,
    asisR,
    pubicTubercleL: L.tubercle,
    pubicTubercleR: R.tubercle,
    deepRingL: L.deep,
    deepRingR: R.deep,
    superficialRingL: L.superficial,
    superficialRingR: R.superficial,
    femoralCanalL: L.femoral,
    femoralCanalR: R.femoral,
    midInguinalL: L.midInguinal,
    midInguinalR: R.midInguinal,
    mcl: THREE.MathUtils.clamp(h.rest.upperarm_l.head.x * 0.5, 0.75, 1.15),
    // subcostal plane (L3) just above the umbilicus; transtubercular plane (L5) below it
    subcostalY: navel.y + (xiphoid.y - navel.y) * 0.3,
    transtubercularY: navel.y - (navel.y - pubis.y) * 0.3,
    onSkin,
    front,
    onFront,
  }
}

/** Which of the nine abdominal regions a rest-space point on the front of the abdomen lies in. */
export function abdoRegionAt(p: THREE.Vector3, A: Anatomy): RegionId | null {
  if (p.z < A.navel.z - 1.2) return null // the back and flanks behind the mid-axillary line
  // above the costal margin (a V opening down from the xiphoid) is chest wall
  if (p.y > A.xiphoid.y - Math.abs(p.x) * 0.55 + 0.15) return null
  // below the inguinal ligament is groin and thigh
  const asis = p.x >= 0 ? A.asisL : A.asisR
  const lig = A.pubis.y + (asis.y - A.pubis.y) * THREE.MathUtils.clamp(Math.abs(p.x) / Math.abs(asis.x), 0, 1)
  if (p.y < lig - 0.05) return null
  const col = p.x < -A.mcl ? 0 : p.x > A.mcl ? 2 : 1
  const row = p.y > A.subcostalY ? 0 : p.y > A.transtubercularY ? 1 : 2
  return (
    [
      ['RUQ', 'EPI', 'LUQ'],
      ['RF', 'UMB', 'LF'],
      ['RIF', 'SP', 'LIF'],
    ] as RegionId[][]
  )[row][col]
}

/** A representative point in each region (for the region pad and hints), on the skin. */
export function regionCentre(r: RegionId, A: Anatomy): THREE.Vector3 {
  const x = { R: -A.mcl * 1.55, M: 0, L: A.mcl * 1.55 }
  const y = { U: (A.xiphoid.y + A.subcostalY) / 2 - 0.15, M: (A.subcostalY + A.transtubercularY) / 2, B: (A.transtubercularY + A.pubis.y) / 2 + 0.2 }
  const map: Record<RegionId, [number, number]> = {
    RUQ: [x.R, y.U],
    EPI: [x.M, y.U],
    LUQ: [x.L, y.U],
    RF: [x.R, y.M],
    UMB: [x.M, y.M],
    LF: [x.L, y.M],
    RIF: [x.R * 0.85, y.B],
    SP: [x.M, y.B],
    LIF: [x.L * 0.85, y.B],
  }
  const [px, py] = map[r]
  return A.onFront(px, py)
}
