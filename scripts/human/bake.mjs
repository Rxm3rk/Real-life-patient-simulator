// Offline bake of the 3D patients from MakeHuman CC0 assets.
//
//   node scripts/human/appearances.mjs          (after changing a case's appearance)
//   node scripts/human/bake.mjs                 (writes src/assets/human/)
//
// Needs local copies of the MakeHuman and MPFB2 repositories (see README.md here).
// Everything read from them is CC0; none of their program code is used.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import { createServer } from 'vite'
import { bakeRegions } from './regions.mjs'

const ROOT = new URL('../../', import.meta.url).pathname
const MH = process.env.MH_DATA ?? '/home/user/makehumancommunity/makehuman/makehuman/data'
const MPFB = process.env.MPFB_DATA ?? '/home/user/makehumancommunity/mpfb2/src/mpfb/data'
const OUT = `${ROOT}src/assets/human/`
for (const p of [MH, MPFB]) if (!existsSync(p)) throw new Error(`Missing ${p} — see scripts/human/README.md`)

/* ---------------------------------------------------------------- parsers */

function parseObj(text) {
  const v = []
  const vt = []
  const faces = []
  let g = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/)
      v.push(+x, +y, +z)
    } else if (line.startsWith('vt ')) {
      const [, a, b] = line.split(/\s+/)
      vt.push(+a, +b)
    } else if (line.startsWith('g ')) g = line.split(/\s+/)[1]
    else if (line.startsWith('f ')) {
      const parts = line.split(/\s+/).slice(1)
      faces.push({ g, v: parts.map((p) => +p.split('/')[0] - 1), t: parts.map((p) => +p.split('/')[1] - 1) })
    }
  }
  return { v: Float64Array.from(v), vt: Float64Array.from(vt), faces }
}

const targetCache = new Map()
/** A MakeHuman .target: sparse "index dx dy dz" lines. Returns a flat [i, x, y, z, ...] array. */
function readTarget(rel) {
  if (targetCache.has(rel)) return targetCache.get(rel)
  const path = `${MH}/targets/${rel}`
  const out = []
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line || line[0] === '#') continue
      const [i, x, y, z] = line.trim().split(/\s+/)
      if (z !== undefined) out.push(+i, +x, +y, +z)
    }
  }
  targetCache.set(rel, out)
  return out
}

/* ------------------------------------------------------- macro weighting */

// MakeHuman human.py: piecewise-linear weights for each macro variable
function ageVals(age) {
  if (age < 0.5) {
    const young = Math.max(0, (age - 0.1875) * 3.2)
    return { baby: Math.max(0, 1 - age * 5.333), child: Math.max(0, Math.min(1, 5.333 * age) - young), young, old: 0 }
  }
  const old = Math.max(0, age * 2 - 1)
  return { baby: 0, child: 0, young: 1 - old, old }
}
function triVals(x, lo, mid, hi) {
  if (x < 0.5) {
    const l = Math.max(0, 1 - x * 2)
    return { [lo]: l, [mid]: 1 - l, [hi]: 0 }
  }
  const h = Math.max(0, x * 2 - 1)
  return { [lo]: 0, [mid]: 1 - h, [hi]: h }
}

/** The weighted list of targets that shape a body with these macro settings. */
function macroTargets(m) {
  const gender = { female: 1 - m.gender, male: m.gender }
  const age = ageVals(m.age)
  const muscle = triVals(m.muscle, 'minmuscle', 'averagemuscle', 'maxmuscle')
  const weight = triVals(m.weight, 'minweight', 'averageweight', 'maxweight')
  const cup = triVals(m.breastSize, 'mincup', 'averagecup', 'maxcup')
  const firm = triVals(m.breastFirmness, 'minfirmness', 'averagefirmness', 'maxfirmness')
  const race = { african: m.african, asian: m.asian, caucasian: m.caucasian }
  const out = []
  const add = (rel, w) => w > 1e-4 && out.push([rel, w])
  for (const [g, gw] of Object.entries(gender))
    for (const [a, aw] of Object.entries(age)) {
      for (const [mu, mw] of Object.entries(muscle))
        for (const [we, ww] of Object.entries(weight)) {
          add(`macrodetails/universal-${g}-${a}-${mu}-${we}.target`, gw * aw * mw * ww)
          for (const [c, cw] of Object.entries(cup))
            for (const [f, fw] of Object.entries(firm))
              if (!(c === 'averagecup' && f === 'averagefirmness')) add(`breast/${g}-${a}-${mu}-${we}-${c}-${f}.target`, gw * aw * mw * ww * cw * fw)
        }
      for (const [r, rw] of Object.entries(race)) add(`macrodetails/${r}-${g}-${a}.target`, rw * gw * aw)
    }
  return out
}

/* ------------------------------------------------------------- base mesh */

const obj = parseObj(readFileSync(`${MH}/3dobjs/base.obj`, 'utf8'))
const NV = obj.v.length / 3

// Which parts of the base mesh are rendered, in draw order
const PARTS = [
  { name: 'body', groups: ['body'] },
  { name: 'tongue', groups: ['helper-tongue'] },
  { name: 'teeth', groups: ['helper-upper-teeth', 'helper-lower-teeth'] },
  { name: 'lashes', groups: ['helper-l-eyelashes-1', 'helper-l-eyelashes-2', 'helper-r-eyelashes-1', 'helper-r-eyelashes-2'] },
  { name: 'hairCap', groups: ['helper-hair'] },
  { name: 'tights', groups: ['helper-tights'] },
  { name: 'skirt', groups: ['helper-skirt'] },
]

const groupVerts = new Map()
for (const f of obj.faces) {
  if (!groupVerts.has(f.g)) groupVerts.set(f.g, new Set())
  for (const i of f.v) groupVerts.get(f.g).add(i)
}

// Compact original-vertex numbering: only vertices used by rendered faces
const compactOf = new Int32Array(NV).fill(-1)
const origOf = []
for (const part of PARTS)
  for (const f of obj.faces)
    if (part.groups.includes(f.g))
      for (const i of f.v)
        if (compactOf[i] < 0) {
          compactOf[i] = origOf.length
          origOf.push(i)
        }
const NC = origOf.length

// Split vertices on UV seams: one render vertex per (vertex, uv) pair
const renderKey = new Map()
const renderToCompact = []
const renderUV = []
const indices = []
const partRanges = []
const vx = (i, k) => obj.v[i * 3 + k]
const dist2 = (a, b) => (vx(a, 0) - vx(b, 0)) ** 2 + (vx(a, 1) - vx(b, 1)) ** 2 + (vx(a, 2) - vx(b, 2)) ** 2
for (const part of PARTS) {
  const start = indices.length
  for (const f of obj.faces) {
    if (!part.groups.includes(f.g)) continue
    const rv = f.v.map((vi, k) => {
      const key = `${vi}/${f.t[k]}`
      let r = renderKey.get(key)
      if (r === undefined) {
        r = renderToCompact.length
        renderKey.set(key, r)
        renderToCompact.push(compactOf[vi])
        renderUV.push(obj.vt[f.t[k] * 2], obj.vt[f.t[k] * 2 + 1])
      }
      return r
    })
    // split the quad along its shorter diagonal
    if (dist2(f.v[0], f.v[2]) <= dist2(f.v[1], f.v[3])) indices.push(rv[0], rv[1], rv[2], rv[0], rv[2], rv[3])
    else indices.push(rv[0], rv[1], rv[3], rv[1], rv[2], rv[3])
  }
  partRanges.push({ name: part.name, start, count: indices.length - start })
}
const NR = renderToCompact.length
if (NR > 65535) throw new Error(`too many render vertices for 16-bit indices: ${NR}`)

/* ---------------------------------------------------------------- skeleton */

const rig = JSON.parse(readFileSync(`${MPFB}/rigs/standard/rig.game_engine.json`, 'utf8'))
// parents before children
const boneNames = []
const visit = (name) => {
  if (boneNames.includes(name)) return
  const p = rig[name].parent
  if (p) visit(p)
  boneNames.push(name)
}
for (const n of Object.keys(rig)) visit(n)
const boneIndex = new Map(boneNames.map((n, i) => [n, i]))
const boneParents = boneNames.map((n) => (rig[n].parent ? boneIndex.get(rig[n].parent) : -1))

function jointPos(pos, end) {
  const idx = end.strategy === 'CUBE' ? [...groupVerts.get(end.cube_name)] : end.vertex_indices
  const s = [0, 0, 0]
  for (const i of idx) for (let k = 0; k < 3; k++) s[k] += pos[i * 3 + k]
  return s.map((x) => x / idx.length)
}

/* ------------------------------------------------------------ skin weights */

const weightsJson = JSON.parse(readFileSync(`${MPFB}/rigs/standard/weights.game_engine.json`, 'utf8')).weights
const perVertex = Array.from({ length: NV }, () => [])
for (const [bone, list] of Object.entries(weightsJson)) for (const [v, w] of list) perVertex[v].push([boneIndex.get(bone), w])
const skinIndex = new Uint8Array(NC * 4)
const skinWeight = new Uint8Array(NC * 4)
for (let c = 0; c < NC; c++) {
  const top = perVertex[origOf[c]].sort((a, b) => b[1] - a[1]).slice(0, 4)
  const sum = top.reduce((s, [, w]) => s + w, 0) || 1
  // quantise to bytes that sum to exactly 255; the rounding error goes on the largest weight
  const q = top.map(([, w]) => Math.round((w / sum) * 255))
  if (q.length) q[0] += 255 - q.reduce((s, x) => s + x, 0)
  top.forEach(([b], k) => {
    skinIndex[c * 4 + k] = b
    skinWeight[c * 4 + k] = q[k]
  })
  if (!top.length) {
    skinIndex[c * 4] = boneIndex.get('head')
    skinWeight[c * 4] = 255
  }
}

/* -------------------------------------------------------- runtime morphs */

// Expression units drive the face (pain, speech, tongue out); the stomach
// targets give distension and umbilical changes.
const MORPHS = [
  ...readdirSync(`${MH}/targets/expression/units/caucasian`)
    .filter((f) => f.endsWith('.target'))
    .sort()
    .map((f) => [`expr:${f.replace('.target', '')}`, `expression/units/caucasian/${f}`]),
  ['distend', 'stomach/stomach-pregnant-incr.target'],
  ['navelOut', 'stomach/stomach-navel-out.target'],
  ['navelIn', 'stomach/stomach-navel-in.target'],
]

/* ------------------------------------------------------------------ bodies */

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', root: ROOT })
const { macroFor, bodyKey } = await server.ssrLoadModule('/src/anatomy3d/macro.ts')
await server.close()
const appearances = JSON.parse(readFileSync(new URL('./appearances.json', import.meta.url), 'utf8'))

const QUANT = 1000 // positions in 1/1000 dm = 0.1 mm
// The neutral base mesh, stood on the floor: bodies are stored as offsets from it
const neutral = new Int16Array(NC * 3)
{
  const g = jointPos(obj.v, { strategy: 'CUBE', cube_name: 'joint-ground' })
  for (let c = 0; c < NC; c++) for (let k = 0; k < 3; k++) neutral[c * 3 + k] = Math.round((obj.v[origOf[c] * 3 + k] - (k === 1 ? g[1] : 0)) * QUANT)
}
function bakeBody(macro) {
  const pos = Float64Array.from(obj.v)
  for (const [rel, w] of macroTargets(macro)) {
    const t = readTarget(rel)
    for (let j = 0; j < t.length; j += 4) {
      const i = t[j]
      pos[i * 3] += t[j + 1] * w
      pos[i * 3 + 1] += t[j + 2] * w
      pos[i * 3 + 2] += t[j + 3] * w
    }
  }
  // stand the body on the floor: joint-ground at y = 0
  const ground = jointPos(pos, { strategy: 'CUBE', cube_name: 'joint-ground' })
  for (let i = 0; i < NV; i++) pos[i * 3 + 1] -= ground[1]
  const joints = new Float32Array(boneNames.length * 6)
  boneNames.forEach((n, b) => {
    joints.set(jointPos(pos, rig[n].head), b * 6)
    joints.set(jointPos(pos, rig[n].tail), b * 6 + 3)
  })
  // eye centres (rotation pivots) and radii from the eye helper spheres
  const eyes = new Float32Array(8)
  ;['helper-l-eye', 'helper-r-eye'].forEach((g, e) => {
    const idx = [...groupVerts.get(g)]
    const c = [0, 0, 0]
    for (const i of idx) for (let k = 0; k < 3; k++) c[k] += pos[i * 3 + k] / idx.length
    let r = 0
    for (const i of idx) r += Math.hypot(pos[i * 3] - c[0], pos[i * 3 + 1] - c[1], pos[i * 3 + 2] - c[2]) / idx.length
    eyes.set([...c, r], e * 4)
  })
  const q = new Int16Array(NC * 3)
  for (let c = 0; c < NC; c++) for (let k = 0; k < 3; k++) q[c * 3 + k] = Math.round(pos[origOf[c] * 3 + k] * QUANT) - neutral[c * 3 + k]
  return { q, joints, eyes }
}

/** Low bytes then high bytes: deltas are small, so the high-byte plane deflates to almost nothing. */
function planes(i16) {
  const b = Buffer.from(i16.buffer, i16.byteOffset, i16.byteLength)
  const out = Buffer.alloc(b.length)
  for (let i = 0; i < i16.length; i++) {
    out[i] = b[i * 2]
    out[i16.length + i] = b[i * 2 + 1]
  }
  return out
}

rmSync(`${OUT}bodies`, { recursive: true, force: true })
mkdirSync(`${OUT}bodies`, { recursive: true })
const bodies = {}
for (const [id, a] of Object.entries(appearances)) {
  const key = bodyKey(a)
  if (!bodies[key]) {
    const { q, joints, eyes } = bakeBody(macroFor(a))
    const buf = Buffer.concat([planes(q), Buffer.from(joints.buffer), Buffer.from(eyes.buffer)])
    writeFileSync(`${OUT}bodies/${key}.bin`, deflateRawSync(buf, { level: 9 }))
    bodies[key] = { appearance: a, used: [] }
  }
  bodies[key].used.push(id)
}

/* ----------------------------------------------------------- skin regions */

const boneWeightSum = (test) => {
  const out = new Float32Array(NC)
  for (let c = 0; c < NC; c++) for (const [b, w] of perVertex[origOf[c]]) if (test(boneNames[b])) out[c] += w
  return out
}
const regionPos = new Float64Array(NC * 3)
for (let c = 0; c < NC; c++) for (let k = 0; k < 3; k++) regionPos[c * 3 + k] = obj.v[origOf[c] * 3 + k]
const bodyPart = partRanges.find((p) => p.name === 'body')
const bodyTris = new Uint32Array(bodyPart.count)
const renderTris = []
for (let i = 0; i < bodyPart.count; i++) {
  const r = indices[bodyPart.start + i]
  bodyTris[i] = renderToCompact[r]
  renderTris.push({ vert: renderToCompact[r], u: renderUV[r * 2], v: renderUV[r * 2 + 1] })
}
const regionNormals = new Float64Array(NC * 3)
for (let t = 0; t < bodyTris.length; t += 3) {
  const [a, b, c] = [bodyTris[t] * 3, bodyTris[t + 1] * 3, bodyTris[t + 2] * 3]
  const e1 = [0, 1, 2].map((k) => regionPos[b + k] - regionPos[a + k])
  const e2 = [0, 1, 2].map((k) => regionPos[c + k] - regionPos[a + k])
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
  for (const v of [a, b, c]) for (let k = 0; k < 3; k++) regionNormals[v + k] += n[k]
}
for (let v = 0; v < NC; v++) {
  const l = Math.hypot(regionNormals[v * 3], regionNormals[v * 3 + 1], regionNormals[v * 3 + 2]) || 1
  for (let k = 0; k < 3; k++) regionNormals[v * 3 + k] /= l
}
const regions = await bakeRegions({
  mpfb: MPFB,
  pos: regionPos,
  normals: regionNormals,
  bodyTris,
  renderTris,
  compactCount: NC,
  handWeight: boneWeightSum((n) => /^(hand|thumb|index|middle|ring|pinky)_/.test(n)),
  legWeight: boneWeightSum((n) => /^(calf|thigh)_/.test(n)),
  forearmWeight: boneWeightSum((n) => /^lowerarm_/.test(n)),
  out: OUT,
})

/* --------------------------------------------------------------- base.bin */

const chunks = []
const layout = {}
let offset = 0
const put = (name, typed) => {
  const pad = (4 - (offset % 4)) % 4
  if (pad) {
    chunks.push(Buffer.alloc(pad))
    offset += pad
  }
  layout[name] = { offset, length: typed.length, type: typed.constructor.name }
  chunks.push(Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength))
  offset += typed.byteLength
}
put('neutral', neutral)
put('renderToCompact', Uint16Array.from(renderToCompact))
put(
  'uv',
  Uint16Array.from(renderUV, (x) => Math.round(x * 65535)),
)
put('index', Uint16Array.from(indices))
put('skinIndex', skinIndex)
put('ao', regions.ao)
put('flush', regions.flush)
put('lids', regions.lids)
put('bodyHair', regions.bodyHair)
put('scalp', regions.scalp)
put('scalpAz', regions.scalpAz)
put('skinWeight', skinWeight)
const morphMeta = []
for (const [name, rel] of MORPHS) {
  const t = readTarget(rel)
  const idx = []
  const d = []
  for (let j = 0; j < t.length; j += 4) {
    const c = compactOf[t[j]]
    if (c < 0) continue
    idx.push(c)
    d.push(Math.round(t[j + 1] * 10000), Math.round(t[j + 2] * 10000), Math.round(t[j + 3] * 10000))
  }
  put(`morph:${name}:index`, Uint16Array.from(idx))
  put(`morph:${name}:delta`, Int16Array.from(d))
  morphMeta.push(name)
}
writeFileSync(`${OUT}base.bin`, deflateRawSync(Buffer.concat(chunks), { level: 9 }))

const meta = {
  source: 'MakeHuman hm08 base mesh and targets, MPFB2 game-engine rig (CC0 1.0)',
  units: 'decimetres; y up, +z forward, +x = patient left',
  compactCount: NC,
  renderCount: NR,
  positionScale: 1 / QUANT,
  compression:
    'deflate-raw; body = int16 offsets from neutral as byte planes (all low bytes, then all high bytes), then float32 joints (bone head, tail) and eye pivots (centre, radius) x2',
  morphScale: 1 / 10000,
  parts: partRanges,
  bones: boneNames,
  boneParents,
  morphs: morphMeta,
  layout,
  bodies: Object.fromEntries(Object.entries(bodies).map(([k, v]) => [k, v.appearance])),
  // anatomical landmark vertices (compact indices), located on the neutral mesh
  landmarks: Object.fromEntries(
    Object.entries({
      navel: 4121,
      nippleL: 8471,
      nippleR: 1799,
      sternalNotch: 1522,
      xiphoid: 4070,
      pubis: 4335,
      asisL: 10957,
      asisR: 4330,
      thyroidCartilage: 797,
      noseTip: 297,
      chin: 5225,
      vertex: 881,
      kneeL: 11223,
      medialMalleolusL: 12939,
    }).map(([k, v]) => [k, compactOf[v]]),
  ),
}
writeFileSync(`${OUT}base.json`, JSON.stringify(meta) + '\n')
console.log(`compact ${NC}, render ${NR}, tris ${indices.length / 3}, bones ${boneNames.length}, morphs ${morphMeta.length}, bodies ${Object.keys(bodies).length}`)
console.log(
  Object.entries(bodies)
    .map(([k, v]) => `${k}: ${v.used.join(', ')}`)
    .join('\n'),
)
