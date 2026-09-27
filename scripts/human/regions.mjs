// Region maps for the skin shader, baked from the neutral MakeHuman mesh.
//
//   regionsA (2048², RGBA): R eyebrows (with hair-direction strokes), G beard area,
//                           B scalp field (0.5 = hairline, 1 = 4 cm inside),
//                           A scalp azimuth (0 = forehead, 1 = nape)
//   regionsB (1024², RGBA): R lips, G areolae, B nails, A palms and soles
//   per vertex (Uint8):     ambient occlusion, flush (ears, cheeks, nose, hands,
//                           knees, elbows), eyelids, body hair density, scalp field
//                           and azimuth (for cutting the hair mesh)
//
// Coordinates are the neutral base mesh (decimetres, y up, +z forward, +x = left).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const MPFB_TEX = (mpfb) => `${mpfb}/textures/`

/* ------------------------------------------------------------------ helpers */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
const mix = (a, b, t) => a + (b - a) * t
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const vnoise = (x, y) => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return mix(mix(a, b, sx), mix(c, d, sx), sy)
}
/** Piecewise-linear lookup through [x, y] knots (x ascending). */
const lerpTable = (table, x) => {
  if (x <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++)
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1]
      const [x1, y1] = table[i]
      return mix(y0, y1, smooth(0, 1, (x - x0) / (x1 - x0)))
    }
  return table[table.length - 1][1]
}

/* ------------------------------------------------------------- the regions */

const EYE_Y = 7.284

// Eyebrow as a quadratic Bézier in the frontal plane, medial → peak → tail
function browAt(px, py, pz, nz) {
  if (pz < 0.95 || nz < 0.15 || py < 7.3 || py > 7.62) return 0
  const s = Math.sign(px) || 1
  const M = [s * 0.1, 7.44]
  const L = [s * 0.61, 7.42]
  const P = [s * 0.41, 7.51]
  const tp = 0.55
  const C = [0, 1].map((k) => (P[k] - (1 - tp) ** 2 * M[k] - tp ** 2 * L[k]) / (2 * (1 - tp) * tp))
  let best = Infinity
  let bt = 0
  let bx = 0
  let by = 0
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const x = (1 - t) ** 2 * M[0] + 2 * (1 - t) * t * C[0] + t * t * L[0]
    const y = (1 - t) ** 2 * M[1] + 2 * (1 - t) * t * C[1] + t * t * L[1]
    const d = Math.hypot(px - x, py - y)
    if (d < best) {
      best = d
      bt = t
      bx = x
      by = y
    }
  }
  const halfWidth = mix(0.06, 0.022, bt)
  // medial end fades in, tail thins out
  const ends = smooth(-0.05, 0.08, bt) * (1 - smooth(0.9, 1.02, bt) * 0.7)
  const edge = best / halfWidth
  const body = smooth(1, 0.5, edge + (vnoise(bt * 40, s * 3) - 0.5) * 0.35) * ends
  if (body <= 0) return 0
  // hair texture: medial hairs point up, the rest sweep laterally; irregular, overlapping strokes
  const ang = (mix(70, 14, smooth(0.05, 0.45, bt)) * Math.PI) / 180
  const dx = Math.cos(ang) * s
  const dy = Math.sin(ang)
  const across = (px - bx) * -dy + (py - by) * dx
  const along = (px - bx) * dx + (py - by) * dy
  const strokes = vnoise(across * 260 + vnoise(along * 30, bt * 5) * 3, along * 18) * 0.6 + vnoise(across * 520, along * 40 + 9) * 0.4
  // denser along the lower border, sparser and lighter at the top edge and tail
  const density = 0.62 + 0.38 * smooth(1, 0.2, edge)
  return clamp(body * density * (0.55 + 0.6 * strokes))
}

// Beard area: moustache, chin, jaw and upper neck, bounded by a cheek line
function beardAt(px, py, pz, lips) {
  const ax = Math.abs(px)
  if (py < 5.85 || py > 7.05 || pz < 0.15 || ax > 0.82) return 0
  const top =
    ax < 0.26
      ? mix(6.8, 6.74, smooth(0.16, 0.26, ax))
      : lerpTable(
          [
            [0.26, 6.74],
            [0.4, 6.72],
            [0.58, 6.86],
            [0.76, 7.02],
          ],
          ax,
        )
  const bottom = lerpTable(
    [
      [0, 5.98],
      [0.3, 6.04],
      [0.55, 6.22],
      [0.8, 6.46],
    ],
    ax,
  )
  // the back edge follows the jaw angle towards the ear lobe
  const back = lerpTable(
    [
      [5.9, 0.62],
      [6.4, 0.4],
      [6.8, 0.52],
      [7.05, 0.62],
    ],
    py,
  )
  const inTop = smooth(top + 0.03, top - 0.03, py)
  const inBottom = smooth(bottom - 0.05, bottom + 0.05, py)
  const inFront = smooth(back - 0.12, back + 0.05, pz)
  return clamp(inTop * inBottom * inFront * (1 - lips))
}

// Scalp: signed height above an azimuthal hairline
const HEAD_C = [0, 0.55]
function scalpAt(px, py, pz, ear) {
  if (py < 6.55 || Math.hypot(px, pz - HEAD_C[1]) > 1.25) return [0, 0]
  const phi = Math.abs(Math.atan2(px, pz - HEAD_C[1])) // 0 front .. π back
  const h = lerpTable(
    [
      [0, 8.02],
      [0.35, 8.0],
      [0.55, 7.9],
      [0.8, 7.6],
      [1.02, 7.05],
      [1.2, 7.3],
      [1.42, 7.43],
      [1.72, 7.05],
      [2.2, 6.82],
      [Math.PI, 6.7],
    ],
    phi,
  )
  const field = clamp(0.5 + (py - h) / 0.8) * (1 - ear)
  return [field, phi / Math.PI]
}

function palmSoleAt(px, py, pz, nx, ny, nz, handW) {
  // soles face down; palms face the thigh/inwards and slightly down in the A-pose
  const sole = py < -7.85 ? smooth(-0.35, -0.75, ny) : 0
  const inward = -Math.sign(px) * nx
  // fades in across the wrist crease rather than stopping at a hard line
  const palm = smooth(0.1, 0.55, inward * 0.75 - ny * 0.45 - nz * 0.1) * smooth(0.3, 0.85, handW)
  return Math.max(sole, palm)
}

/* ---------------------------------------------------------- rasterisation */

/** tris: flat list of corners {vert, u, v}, three per triangle */
function rasterise(size, tris, positions, normals, evalFn, channels = 4) {
  const out = new Float32Array(size * size * channels)
  const written = new Uint8Array(size * size)
  const val = new Float32Array(channels)
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]]
    const ax = a.u * size
    const ay = (1 - a.v) * size
    const bx = b.u * size
    const by = (1 - b.v) * size
    const cx = c.u * size
    const cy = (1 - c.v) * size
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)))
    const maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)))
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)))
    const maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)))
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if (Math.abs(den) < 1e-12) continue
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5
        const py = y + 0.5
        const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den
        const w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den
        const w2 = 1 - w0 - w1
        if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue
        const P = [0, 1, 2].map((k) => positions[a.vert * 3 + k] * w0 + positions[b.vert * 3 + k] * w1 + positions[c.vert * 3 + k] * w2)
        const N = [0, 1, 2].map((k) => normals[a.vert * 3 + k] * w0 + normals[b.vert * 3 + k] * w1 + normals[c.vert * 3 + k] * w2)
        const l = Math.hypot(...N) || 1
        evalFn(
          P,
          N.map((n) => n / l),
          [a, b, c],
          [w0, w1, w2],
          val,
        )
        const i = y * size + x
        written[i] = 1
        for (let k = 0; k < channels; k++) out[i * channels + k] = Math.max(out[i * channels + k], val[k])
      }
  }
  // grow islands outwards so filtering and mipmaps never pull in empty texels
  for (let pass = 0; pass < 6; pass++) {
    const next = written.slice()
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x
        if (written[i]) continue
        let n = 0
        const acc = new Float32Array(channels)
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue
          const j = yy * size + xx
          if (!written[j]) continue
          n++
          for (let k = 0; k < channels; k++) acc[k] += out[j * channels + k]
        }
        if (n) {
          next[i] = 1
          for (let k = 0; k < channels; k++) out[i * channels + k] = acc[k] / n
        }
      }
    written.set(next)
  }
  return out
}

/* ------------------------------------------------------ ambient occlusion */

function buildBVH(pos, tris) {
  const n = tris.length / 3
  const cent = new Float32Array(n * 3)
  const bmin = new Float32Array(n * 3)
  const bmax = new Float32Array(n * 3)
  for (let t = 0; t < n; t++)
    for (let k = 0; k < 3; k++) {
      const a = pos[tris[t * 3] * 3 + k]
      const b = pos[tris[t * 3 + 1] * 3 + k]
      const c = pos[tris[t * 3 + 2] * 3 + k]
      bmin[t * 3 + k] = Math.min(a, b, c)
      bmax[t * 3 + k] = Math.max(a, b, c)
      cent[t * 3 + k] = (a + b + c) / 3
    }
  const order = Uint32Array.from({ length: n }, (_, i) => i)
  const nodes = []
  const build = (lo, hi) => {
    const mn = [Infinity, Infinity, Infinity]
    const mx = [-Infinity, -Infinity, -Infinity]
    for (let i = lo; i < hi; i++)
      for (let k = 0; k < 3; k++) {
        mn[k] = Math.min(mn[k], bmin[order[i] * 3 + k])
        mx[k] = Math.max(mx[k], bmax[order[i] * 3 + k])
      }
    const node = { mn, mx, lo, hi, l: null, r: null }
    nodes.push(node)
    if (hi - lo > 6) {
      const ext = [0, 1, 2].map((k) => mx[k] - mn[k])
      const axis = ext.indexOf(Math.max(...ext))
      const sub = Array.from(order.subarray(lo, hi)).sort((a, b) => cent[a * 3 + axis] - cent[b * 3 + axis])
      order.set(sub, lo)
      const mid = (lo + hi) >> 1
      node.l = build(lo, mid)
      node.r = build(mid, hi)
    }
    return node
  }
  const root = build(0, n)
  return { root, order, pos, tris }
}

function occluded(bvh, o, d, maxT) {
  const { pos, tris, order } = bvh
  const inv = d.map((x) => 1 / x)
  const stack = [bvh.root]
  while (stack.length) {
    const node = stack.pop()
    let t0 = 0
    let t1 = maxT
    for (let k = 0; k < 3; k++) {
      let ta = (node.mn[k] - o[k]) * inv[k]
      let tb = (node.mx[k] - o[k]) * inv[k]
      if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta)
      t1 = Math.min(t1, tb)
      if (t0 > t1) break
    }
    if (t0 > t1) continue
    if (node.l) {
      stack.push(node.l, node.r)
      continue
    }
    for (let i = node.lo; i < node.hi; i++) {
      const t = order[i]
      const a = tris[t * 3] * 3
      const b = tris[t * 3 + 1] * 3
      const c = tris[t * 3 + 2] * 3
      const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]]
      const e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]]
      const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]]
      const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2]
      if (Math.abs(det) < 1e-12) continue
      const s = [o[0] - pos[a], o[1] - pos[a + 1], o[2] - pos[a + 2]]
      const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) / det
      if (u < 0 || u > 1) continue
      const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]]
      const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det
      if (v < 0 || u + v > 1) continue
      const t2 = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det
      if (t2 > 1e-4 && t2 < maxT) return true
    }
  }
  return false
}

/** Local occlusion (≤ 3.5 cm): navel, ears, nostrils, lid folds, finger webs. */
function vertexAO(pos, normals, tris, count, rays = 40, maxT = 0.35) {
  const bvh = buildBVH(pos, tris)
  const ao = new Uint8Array(count)
  const dirs = []
  // fixed cosine-weighted hemisphere samples (golden spiral)
  for (let i = 0; i < rays; i++) {
    const u = (i + 0.5) / rays
    const r = Math.sqrt(u)
    const th = i * 2.399963
    dirs.push([r * Math.cos(th), r * Math.sin(th), Math.sqrt(1 - u)])
  }
  for (let v = 0; v < count; v++) {
    const n = [normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]]
    const t = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
    const b1 = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]]
    const l1 = Math.hypot(...b1)
    for (let k = 0; k < 3; k++) b1[k] /= l1
    const b2 = [n[1] * b1[2] - n[2] * b1[1], n[2] * b1[0] - n[0] * b1[2], n[0] * b1[1] - n[1] * b1[0]]
    const o = [0, 1, 2].map((k) => pos[v * 3 + k] + n[k] * 0.002)
    let hit = 0
    for (const [x, y, z] of dirs) {
      const d = [0, 1, 2].map((k) => b1[k] * x + b2[k] * y + n[k] * z)
      if (occluded(bvh, o, d, maxT)) hit++
    }
    ao[v] = Math.round((1 - hit / rays) * 255)
  }
  return ao
}

/* --------------------------------------------------------------------- bake */

async function mpfbMask(mpfb, name, size) {
  const { data } = await sharp(MPFB_TEX(mpfb) + name)
    .greyscale()
    .resize(size, size)
    .raw()
    .toBuffer({ resolveWithObject: true })
  return data
}

/**
 * @param pos     compact neutral positions (Float64/Float32, decimetres, unshifted)
 * @param normals compact smooth normals
 * @param bodyTris compact-vertex triangles of the body part
 * @param renderTris [{vert, uv}] render triangles of the body part (for UVs)
 */
export async function bakeRegions({ mpfb, pos, normals, bodyTris, renderTris, compactCount, handWeight, legWeight, forearmWeight, out }) {
  const t0 = Date.now()
  const lipsTex = await mpfbMask(mpfb, 'mpfb_lips.jpg', 1024)
  const earsTex = await mpfbMask(mpfb, 'mpfb_ears.jpg', 1024)
  const lidsTex = await mpfbMask(mpfb, 'mpfb_eyelids.jpg', 1024)
  const sampler = (tex) => (u, v) => tex[Math.min(1023, Math.floor((1 - v) * 1024)) * 1024 + Math.min(1023, Math.floor(u * 1024))] / 255

  const lipsAt = sampler(lipsTex)
  const earAt = sampler(earsTex)
  const lidAt = sampler(lidsTex)

  // --- regionsA (2048)
  const A = rasterise(2048, renderTris, pos, normals, (P, N, tri, w, val) => {
    const u = tri[0].u * w[0] + tri[1].u * w[1] + tri[2].u * w[2]
    const v = tri[0].v * w[0] + tri[1].v * w[1] + tri[2].v * w[2]
    const lips = lipsAt(u, v)
    const ear = earAt(u, v)
    val[0] = browAt(P[0], P[1], P[2], N[2])
    val[1] = beardAt(P[0], P[1], P[2], lips)
    const [field, az] = scalpAt(P[0], P[1], P[2], ear)
    val[2] = field
    val[3] = field > 0 ? az : 0
  })
  // --- regionsB (1024): MPFB masks + palms/soles
  const nails = await Promise.all(['mpfb_fingernails.jpg', 'mpfb_toenails.jpg'].map((n) => mpfbMask(mpfb, n, 1024)))
  const areola = await mpfbMask(mpfb, 'mpfb_aureolae.jpg', 1024)
  const palms = rasterise(
    1024,
    renderTris,
    pos,
    normals,
    (P, N, tri, w, val) => {
      const hw = handWeight[tri[0].vert] * w[0] + handWeight[tri[1].vert] * w[1] + handWeight[tri[2].vert] * w[2]
      val[0] = palmSoleAt(P[0], P[1], P[2], N[0], N[1], N[2], hw)
    },
    1,
  )
  const B = Buffer.alloc(1024 * 1024 * 4)
  for (let i = 0; i < 1024 * 1024; i++) {
    B[i * 4] = lipsTex[i]
    B[i * 4 + 1] = areola[i]
    B[i * 4 + 2] = Math.max(nails[0][i], nails[1][i])
    B[i * 4 + 3] = Math.round(palms[i] * 255)
  }
  const Abuf = Buffer.alloc(2048 * 2048 * 4)
  for (let i = 0; i < A.length; i++) Abuf[i] = Math.round(clamp(A[i]) * 255)
  await sharp(Abuf, { raw: { width: 2048, height: 2048, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(`${out}regionsA.png`)
  await sharp(B, { raw: { width: 1024, height: 1024, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(`${out}regionsB.png`)

  // --- per-vertex attributes (AO is slow and depends only on the base mesh: cache it)
  const cacheFile = new URL(`./.cache/ao-${compactCount}.bin`, import.meta.url)
  let ao
  if (existsSync(cacheFile)) ao = new Uint8Array(readFileSync(cacheFile))
  else {
    ao = vertexAO(pos, normals, bodyTris, compactCount)
    mkdirSync(new URL('./.cache/', import.meta.url), { recursive: true })
    writeFileSync(cacheFile, ao)
  }
  const flush = new Uint8Array(compactCount)
  const lids = new Uint8Array(compactCount)
  const bodyHair = new Uint8Array(compactCount)
  const scalp = new Uint8Array(compactCount)
  const scalpAz = new Uint8Array(compactCount)
  const g = (P, c, r) => Math.exp(-((P[0] - c[0]) ** 2 + (P[1] - c[1]) ** 2 + (P[2] - c[2]) ** 2) / (r * r))
  const firstUV = new Map()
  for (const t of renderTris) if (!firstUV.has(t.vert)) firstUV.set(t.vert, [t.u, t.v])
  // (vertices on UV seams have several UVs; the first is fine for these soft masks)
  for (let c = 0; c < compactCount; c++) {
    const P = [pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]]
    const uv = firstUV.get(c)
    const ear = uv ? earAt(uv[0], uv[1]) : 0
    const s = Math.sign(P[0]) || 1
    let f = ear * 0.8
    f = Math.max(f, g(P, [s * 0.42, 6.93, 1.34], 0.2) * 0.65) // cheeks
    f = Math.max(f, g(P, [0, 6.91, 1.66], 0.13) * 0.55) // nose
    f = Math.max(f, g(P, [s * 1.62, -3.65, 0.62], 0.35) * 0.35) // knees
    f = Math.max(f, handWeight[c] * 0.4) // hands and fingers
    f = Math.max(f, P[1] < -7.4 ? 0.35 : 0) // feet
    flush[c] = Math.round(clamp(f) * 255)
    lids[c] = Math.round(clamp((uv ? lidAt(uv[0], uv[1]) : 0) * 0.9 + g(P, [s * 0.31, EYE_Y - 0.12, 1.33], 0.12) * 0.35) * 255)
    // hair-bearing skin (density scaled per patient): shins, thighs, forearms, chest and midline
    const shin = legWeight[c] * smooth(-7.6, -6.9, P[1]) * smooth(0.3, 0.9, P[2] - (P[1] < -3.6 ? 0 : 0.3))
    const thigh = legWeight[c] * smooth(-3.5, -3.0, P[1]) * 0.6
    const arm = forearmWeight[c] * 0.7
    const chest = smooth(4.5, 4.1, P[1]) * smooth(3.3, 3.7, P[1]) * smooth(0.55, 0.15, Math.abs(P[0])) * smooth(1.0, 1.4, P[2])
    const trail = smooth(0.18, 0.05, Math.abs(P[0])) * smooth(0.7, 1.1, P[1]) * smooth(3.3, 2.9, P[1]) * smooth(1.0, 1.3, P[2])
    bodyHair[c] = Math.round(clamp(Math.max(shin, thigh, arm, chest * 0.9, trail * 0.8)) * 255)
    const [field, az] = scalpAt(P[0], P[1], P[2], ear)
    scalp[c] = Math.round(field * 255)
    scalpAz[c] = Math.round(az * 255)
  }
  console.log(`regions baked in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  return { ao, flush, lids, bodyHair, scalp, scalpAz }
}
