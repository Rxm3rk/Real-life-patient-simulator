import * as THREE from 'three'
import type { Appearance } from '../anatomy/types'
import type { HumanBase } from './assets'
import { computeNormals, type HumanModel } from './human'
import type { Anatomy } from './anatomy'
import { SIGN_DISPLACE, SIGN_NORMAL, SIGN_VERT_HEADER, type SignUniforms } from './signs'

/**
 * Clothes cut from the patient's own skin surface: briefs, a short-sleeved gown
 * top, a chest band (a gown folded up to keep a woman's chest covered while the
 * abdomen is examined) and the gown's skirt (from MakeHuman's fitted skirt
 * helper); and a small folded towel laid over the genitals for a groin
 * examination. Garments are clipped exactly along smooth boundaries (waist line,
 * leg openings, neckline, sleeves), so hems run straight whatever the mesh
 * topology; then they're loosened so the fabric bridges hollows (cleavage,
 * navel) but never sinks below the skin.
 */

export type GarmentName = 'briefs' | 'gownTop' | 'chestBand' | 'gownSkirt' | 'drape'
type ClippedName = Exclude<GarmentName, 'drape'>

export interface Garments {
  meshes: Record<GarmentName, THREE.SkinnedMesh>
  /** Per render vertex of the body: (briefs, gown top) 1 where the skin lies well inside the garment, hidden while it's worn */
  cover: Float32Array
  show(which: Partial<Record<GarmentName, boolean>>): void
  /** Breathing: the same abdominal excursion as the skin, so the fabric moves with it */
  setBelly(value: number): void
  dispose(): void
}

interface Landmarks {
  navelY: number
  pubisY: number
  crotchY: number
  hipY: number
  kneeY: number
  armpitY: number
  neckY: number
  underBustY: number
  upperArmLen: number
}

function landmarks(h: HumanModel, base: HumanBase): Landmarks {
  const r = h.rest
  const lm = base.meta.landmarks as Record<string, number>
  const y = (name: string) => h.positions[lm[name] * 3 + 1]
  const nippleY = (y('nippleL') + y('nippleR')) / 2
  return {
    hipY: r.thigh_l.head.y,
    kneeY: r.calf_l.head.y,
    neckY: r.neck_01.head.y,
    armpitY: r.upperarm_l.head.y - 0.5,
    navelY: y('navel'),
    pubisY: y('pubis'),
    crotchY: y('pubis') - 0.75,
    underBustY: nippleY - 0.75,
    upperArmLen: r.upperarm_l.tail.distanceTo(r.upperarm_l.head),
  }
}

/** A clipping vertex: skin position/normal, skin weights, how much it rides on the arm, and the abdominal breathing offset. */
interface CV {
  p: THREE.Vector3
  n: THREE.Vector3
  w: Map<number, number>
  arm: number
  belly: THREE.Vector3
}

/** Keep where every field is negative. */
type Field = (v: CV) => number

interface Spec {
  part: 'body' | 'skirt'
  fields: (L: Landmarks, h: HumanModel) => Field[]
  offset: number
  bridge: number
  smooth: number
}

const SPECS: Record<ClippedName, Spec> = {
  briefs: {
    part: 'body',
    fields: (L) => [
      // waistband a little below the navel, higher at the back
      (v) => v.p.y - (L.navelY - 0.5 + THREE.MathUtils.smoothstep(-v.p.z, -0.2, 0.6) * 0.25),
      // leg openings rise towards the hips
      (v) => L.crotchY - 0.15 + Math.min(1, Math.abs(v.p.x) / 1.6) * 0.45 - v.p.y,
      (v) => v.arm - 0.5,
    ],
    offset: 0.018,
    // never further out than the gown's own offset, so the briefs can't show through it
    bridge: 0.045,
    smooth: 4,
  },
  gownTop: {
    part: 'body',
    fields: (L, h) => {
      const sleeve = (v: CV) => {
        const side = v.p.x >= 0 ? 'l' : 'r'
        const b = h.rest[`upperarm_${side}`]
        const dir = b.tail.clone().sub(b.head).normalize()
        return v.p.clone().sub(b.head).dot(dir) - L.upperArmLen * 0.42
      }
      return [
        // round neckline, lower at the front
        (v) => v.p.y - (L.neckY - 0.1 - 0.32 * THREE.MathUtils.smoothstep(v.p.z, 0.25, 0.85)),
        (v) => L.hipY - 0.25 - v.p.y,
        // short sleeves: only where the skin rides on the arm
        (v) => (v.arm > 0.5 ? sleeve(v) : -1),
      ]
    },
    offset: 0.07,
    bridge: 0.9,
    smooth: 10,
  },
  chestBand: {
    part: 'body',
    fields: (L) => [(v) => L.underBustY - 0.25 - v.p.y, (v) => v.p.y - (L.armpitY + 0.35), (v) => v.arm - 0.35],
    offset: 0.06,
    bridge: 0.9,
    smooth: 10,
  },
  gownSkirt: {
    part: 'skirt',
    fields: (L) => [(v) => L.kneeY + 0.3 - v.p.y],
    offset: 0.02,
    bridge: 0,
    smooth: 0,
  },
}

/* ------------------------------------------------------------ clipping */

function lerpV(a: CV, b: CV, t: number): CV {
  const w = new Map<number, number>()
  for (const [k, x] of a.w) w.set(k, (w.get(k) ?? 0) + x * (1 - t))
  for (const [k, x] of b.w) w.set(k, (w.get(k) ?? 0) + x * t)
  return { p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), w, arm: a.arm * (1 - t) + b.arm * t, belly: a.belly.clone().lerp(b.belly, t) }
}

/** Clip a triangle soup against f < 0, splitting straddling triangles; shared edges share their new vertex. */
function clip(verts: CV[], tris: number[], f: Field): number[] {
  const val = verts.map(f)
  const cache = new Map<string, number>()
  const cut = (a: number, b: number) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    let i = cache.get(key)
    if (i === undefined) {
      const t = val[a] / (val[a] - val[b])
      i = verts.length
      verts.push(lerpV(verts[a], verts[b], t))
      val.push(0)
      cache.set(key, i)
    }
    return i
  }
  const out: number[] = []
  for (let t = 0; t < tris.length; t += 3) {
    const idx = [tris[t], tris[t + 1], tris[t + 2]]
    const inside = idx.map((i) => val[i] < 0)
    const n = inside.filter(Boolean).length
    if (n === 3) out.push(...idx)
    else if (n === 1) {
      const k = inside.indexOf(true)
      const a = idx[k]
      const b = idx[(k + 1) % 3]
      const c = idx[(k + 2) % 3]
      out.push(a, cut(a, b), cut(a, c))
    } else if (n === 2) {
      const k = inside.indexOf(false)
      const c = idx[k]
      const a = idx[(k + 1) % 3]
      const b = idx[(k + 2) % 3]
      const bc = cut(b, c)
      const ac = cut(a, c)
      out.push(a, b, bc, a, bc, ac)
    }
  }
  return out
}

/* --------------------------------------------------------------- fabric */

const FABRIC_HEADER = /* glsl */ `
uniform vec3 uPrint;
uniform float uPattern;
varying vec3 vObj;
float gm_hash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
`
const FABRIC = /* glsl */ `
  // plain weave, and for the gown a small repeating print
  vec2 w = vObj.xy * 180.0 + vObj.z * 60.0;
  float weave = 0.5 + 0.5 * sin( w.x ) * sin( w.y );
  diffuseColor.rgb *= 0.93 + 0.07 * weave;
  if ( uPattern > 0.5 ) {
    vec2 g = vObj.xy * 5.5 + vec2( vObj.z * 2.0, 0.0 );
    vec2 c = floor( g );
    vec2 f = fract( g ) - 0.5;
    float dotMark = smoothstep( 0.16, 0.1, length( f + ( vec2( gm_hash( c ), gm_hash( c + 1.7 ) ) - 0.5 ) * 0.3 ) );
    diffuseColor.rgb = mix( diffuseColor.rgb, uPrint, dotMark * 0.55 );
  }
`

/** Fabric that also rides over the patient's swellings (a hernia lifts the underwear over it). */
function fabric(color: string, print: string | null, name: string, signs: SignUniforms) {
  const m = new THREE.MeshPhysicalMaterial({ name, color, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4), side: THREE.DoubleSide })
  const uniforms = { uPrint: { value: new THREE.Color(print ?? color) }, uPattern: { value: print ? 1 : 0 } }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uBulgeC: signs.uBulgeC, uBulgeP: signs.uBulgeP, uBulgeN: signs.uBulgeN })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObj;\n${SIGN_VERT_HEADER}`)
      .replace('#include <morphnormal_vertex>', `#include <morphnormal_vertex>\n${SIGN_NORMAL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvObj = position;\n${SIGN_DISPLACE}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${FABRIC_HEADER}`).replace('#include <map_fragment>', `#include <map_fragment>\n${FABRIC}`)
  }
  m.customProgramCacheKey = () => `bedside-fabric-v2-${print ? 'print' : 'plain'}`
  return m
}

/* ---------------------------------------------------------------- build */

export function createGarments(h: HumanModel, base: HumanBase, a: Appearance, signs: SignUniforms, A: Anatomy): Garments {
  const L = landmarks(h, base)
  const NC = base.meta.compactCount
  const normals = computeNormals(h.positions, base.index, base.renderToCompact, NC)
  const armBones = new Set(base.meta.bones.map((b, i) => (/^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/.test(b) ? i : -1)).filter((i) => i >= 0))
  const gown = fabric('#a9c6d8', '#5f86a3', 'gown', signs)
  const briefsMat = fabric(a.sex === 'male' ? '#2d3a4f' : '#5a4a58', null, 'briefs', signs)
  const towel = fabric('#e9eef1', null, 'towel', signs)
  const meshes = {} as Record<GarmentName, THREE.SkinnedMesh>
  // the abdominal breathing morph (same data the skin uses), per compact vertex
  const bellyDelta = new Float32Array(NC * 3)
  const distend = base.morphs.get('distend')
  if (distend)
    for (let j = 0; j < distend.index.length; j++)
      for (let k = 0; k < 3; k++) bellyDelta[distend.index[j] * 3 + k] = distend.delta[j * 3 + k] * base.meta.morphScale

  const cvOf = (c: number): CV => {
    const w = new Map<number, number>()
    let arm = 0
    for (let k = 0; k < 4; k++) {
      const x = base.skinWeight[c * 4 + k] / 255
      if (!x) continue
      const b = base.skinIndex[c * 4 + k]
      w.set(b, (w.get(b) ?? 0) + x)
      if (armBones.has(b)) arm += x
    }
    return {
      p: new THREE.Vector3(h.positions[c * 3], h.positions[c * 3 + 1], h.positions[c * 3 + 2]),
      n: new THREE.Vector3(normals[c * 3], normals[c * 3 + 1], normals[c * 3 + 2]),
      w,
      arm,
      belly: new THREE.Vector3(bellyDelta[c * 3], bellyDelta[c * 3 + 1], bellyDelta[c * 3 + 2]),
    }
  }

  // Skin well inside the briefs or the gown top is hidden while they're worn: in creases (the groin,
  // a reclining patient's hips) the skin would otherwise poke through fabric that fits closely.
  // Near the hems the skin stays, so you never see into an empty garment.
  const coverOf = (name: ClippedName, margin: number) => {
    const fields = SPECS[name].fields(L, h)
    const out = new Uint8Array(NC)
    for (let c = 0; c < NC; c++) out[c] = fields.every((f) => f(cvOf(c)) < -margin) ? 1 : 0
    return out
  }
  const briefsIn = coverOf('briefs', 0.12)
  const gownIn = coverOf('gownTop', 0.35)
  const cover = new Float32Array(base.renderToCompact.length * 2)
  base.renderToCompact.forEach((c, r) => {
    cover[r * 2] = briefsIn[c]
    cover[r * 2 + 1] = gownIn[c]
  })

  for (const [name, spec] of Object.entries(SPECS) as [ClippedName, Spec][]) {
    // gather the part's triangles over compact vertices
    const part = base.meta.parts.find((x) => x.name === spec.part)!
    const local = new Map<number, number>()
    const verts: CV[] = []
    let tris: number[] = []
    for (let i = part.start; i < part.start + part.count; i++) {
      const c = base.renderToCompact[base.index[i]]
      let v = local.get(c)
      if (v === undefined) {
        v = verts.length
        local.set(c, v)
        verts.push(cvOf(c))
      }
      tris.push(v)
    }
    for (const f of spec.fields(L, h)) tris = clip(verts, tris, f)

    // compact the survivors
    const remap = new Map<number, number>()
    const used: CV[] = []
    for (const v of tris)
      if (!remap.has(v)) {
        remap.set(v, used.length)
        used.push(verts[v])
      }
    const index = tris.map((v) => remap.get(v)!)
    const NV = used.length
    const pos = new Float32Array(NV * 3)
    used.forEach((v, i) => pos.set([v.p.x + v.n.x * spec.offset, v.p.y + v.n.y * spec.offset, v.p.z + v.n.z * spec.offset], i * 3))

    // neighbours and hems (open edges)
    const nbrs: Set<number>[] = Array.from({ length: NV }, () => new Set())
    const edges = new Map<number, number>()
    for (let t = 0; t < index.length; t += 3)
      for (const [u, w] of [[0, 1], [1, 2], [2, 0]]) {
        const a0 = index[t + u]
        const b0 = index[t + w]
        nbrs[a0].add(b0)
        nbrs[b0].add(a0)
        const key = Math.min(a0, b0) * 131072 + Math.max(a0, b0)
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    const hem: number[][] = Array.from({ length: NV }, () => [])
    for (const [key, n] of edges)
      if (n === 1) {
        const a0 = Math.floor(key / 131072)
        const b0 = key % 131072
        hem[a0].push(b0)
        hem[b0].push(a0)
      }
    // loosen the fabric: smooth, but keep it between `offset` and `offset + bridge` above the skin
    const tmp = new Float32Array(pos.length)
    for (let it = 0; it < spec.smooth; it++) {
      for (let v = 0; v < NV; v++) {
        const ring = hem[v].length ? hem[v] : [...nbrs[v]]
        let x = 0
        let y = 0
        let z = 0
        for (const n of ring) {
          x += pos[n * 3]
          y += pos[n * 3 + 1]
          z += pos[n * 3 + 2]
        }
        const w = ring.length ? 0.55 : 0
        const k = ring.length ? 1 / ring.length : 0
        tmp[v * 3] = pos[v * 3] * (1 - w) + x * k * w
        tmp[v * 3 + 1] = pos[v * 3 + 1] * (1 - w) + y * k * w
        tmp[v * 3 + 2] = pos[v * 3 + 2] * (1 - w) + z * k * w
      }
      for (let v = 0; v < NV; v++) {
        const s = used[v]
        const i = v * 3
        const d = (tmp[i] - s.p.x) * s.n.x + (tmp[i + 1] - s.p.y) * s.n.y + (tmp[i + 2] - s.p.z) * s.n.z
        const want = THREE.MathUtils.clamp(d, spec.offset, spec.offset + spec.bridge)
        pos[i] = tmp[i] + s.n.x * (want - d)
        pos[i + 1] = tmp[i + 1] + s.n.y * (want - d)
        pos[i + 2] = tmp[i + 2] + s.n.z * (want - d)
      }
    }
    // skin weights: top four, renormalised
    const skinIndex = new Uint16Array(NV * 4)
    const skinWeight = new Float32Array(NV * 4)
    used.forEach((v, i) => {
      const top = [...v.w].sort((x, y) => y[1] - x[1]).slice(0, 4)
      const sum = top.reduce((s, [, x]) => s + x, 0) || 1
      top.forEach(([b, x], k) => {
        skinIndex[i * 4 + k] = b
        skinWeight[i * 4 + k] = x / sum
      })
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
    g.setIndex(index)
    g.computeVertexNormals()
    const belly = new Float32Array(NV * 3)
    used.forEach((v, i) => belly.set([v.belly.x, v.belly.y, v.belly.z], i * 3))
    g.morphAttributes.position = [new THREE.BufferAttribute(belly, 3)]
    g.morphTargetsRelative = true
    const mesh = new THREE.SkinnedMesh(g, name === 'briefs' ? briefsMat : gown)
    mesh.morphTargetInfluences = [0]
    mesh.name = `garment-${name}`
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    mesh.visible = false
    h.root.add(mesh)
    mesh.bind(h.mesh.skeleton, h.mesh.bindMatrix)
    meshes[name] = mesh
  }

  meshes.drape = buildTowel(h, base, A, L, towel)

  return {
    meshes,
    cover,
    show(which) {
      for (const [n, v] of Object.entries(which)) if (v !== undefined) meshes[n as GarmentName].visible = v
    },
    setBelly(value) {
      for (const m of Object.values(meshes)) if (m.morphTargetInfluences) m.morphTargetInfluences[0] = value
    },
    dispose() {
      for (const m of Object.values(meshes)) {
        m.removeFromParent()
        m.geometry.dispose()
      }
      gown.dispose()
      briefsMat.dispose()
      towel.dispose()
    },
  }
}

/**
 * A small towel over the genitals: a cloth laid on the front of the body from
 * just above the pubic symphysis down over the crotch, bridging the gap between
 * the thighs, with soft folds and edges that fall away. It's skinned from the
 * nearest skin so it stays in place in every pose.
 */
function buildTowel(h: HumanModel, base: HumanBase, A: Anatomy, L: Landmarks, material: THREE.Material): THREE.SkinnedMesh {
  const nu = 16
  const nv = 20
  const top = L.pubisY + 0.12
  const bottom = L.crotchY - 0.35
  const half = (v: number) => 0.3 + v * 0.1
  // front depth of the body over the towel's footprint, dilated and blurred so the cloth bridges hollows
  const res = 0.03
  const gx0 = -0.7
  const gy0 = bottom - 0.2
  const gnx = Math.round(1.4 / res) + 1
  const gny = Math.round((top - bottom + 0.4) / res) + 1
  let D = new Float32Array(gnx * gny)
  for (let j = 0; j < gny; j++)
    for (let i = 0; i < gnx; i++) {
      const z = A.front(gx0 + i * res, gy0 + j * res)
      D[j * gnx + i] = Number.isFinite(z) ? z : -Infinity
    }
  const pass = (fn: (vals: number[]) => number, times: number, r: number) => {
    for (let t = 0; t < times; t++) {
      const out = new Float32Array(D.length)
      for (let j = 0; j < gny; j++)
        for (let i = 0; i < gnx; i++) {
          const vals: number[] = []
          for (let dj = -r; dj <= r; dj++)
            for (let di = -r; di <= r; di++) {
              const ii = i + di
              const jj = j + dj
              if (ii >= 0 && jj >= 0 && ii < gnx && jj < gny && D[jj * gnx + ii] > -Infinity) vals.push(D[jj * gnx + ii])
            }
          out[j * gnx + i] = vals.length ? fn(vals) : -Infinity
        }
      D = out
    }
  }
  pass((v) => Math.max(...v), 2, 2)
  pass((v) => v.reduce((a, b) => a + b, 0) / v.length, 4, 2)
  const depth = (x: number, y: number) => {
    const i = THREE.MathUtils.clamp(Math.round((x - gx0) / res), 0, gnx - 1)
    const j = THREE.MathUtils.clamp(Math.round((y - gy0) / res), 0, gny - 1)
    const z = D[j * gnx + i]
    return Number.isFinite(z) ? z : A.pubis.z
  }

  const NV = (nu + 1) * (nv + 1)
  const pos = new Float32Array(NV * 3)
  const uv = new Float32Array(NV * 2)
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const u = i / nu
      const v = j / nv
      const x = (u * 2 - 1) * half(v)
      const y = top + (bottom - top) * v
      const edge = Math.abs(u * 2 - 1)
      // folds running down the towel, and edges that droop away from the body
      const fold = Math.sin(u * Math.PI * 3.2 + 0.6) * 0.012 * (0.4 + v)
      const droop = THREE.MathUtils.smoothstep(edge, 0.72, 1) * 0.07 + THREE.MathUtils.smoothstep(v, 0.85, 1) * 0.03
      const z = depth(x, y) + 0.045 + fold - droop
      const k = j * (nu + 1) + i
      pos.set([x, y, z], k * 3)
      uv.set([u, v], k * 2)
    }
  const index: number[] = []
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i
      const b = a + 1
      const c = a + nu + 1
      const d = c + 1
      index.push(a, c, b, b, c, d)
    }
  // skin weights: inverse-distance blend of the nearest skin vertices
  const skinIndex = new Uint16Array(NV * 4)
  const skinWeight = new Float32Array(NV * 4)
  const P = h.positions
  const NC = base.meta.compactCount
  for (let k = 0; k < NV; k++) {
    const x = pos[k * 3]
    const y = pos[k * 3 + 1]
    const z = pos[k * 3 + 2]
    const near: [number, number][] = []
    for (let c = 0; c < NC; c++) {
      const dy = P[c * 3 + 1] - y
      if (dy > 0.5 || dy < -0.5) continue
      const d = (P[c * 3] - x) ** 2 + dy * dy + (P[c * 3 + 2] - z) ** 2
      if (near.length < 8 || d < near[near.length - 1][1]) {
        near.push([c, d])
        near.sort((p, q) => p[1] - q[1])
        if (near.length > 8) near.pop()
      }
    }
    const w = new Map<number, number>()
    for (const [c, d] of near) {
      const f = 1 / (Math.sqrt(d) + 0.02)
      for (let q = 0; q < 4; q++) {
        const bw = base.skinWeight[c * 4 + q] / 255
        if (bw) w.set(base.skinIndex[c * 4 + q], (w.get(base.skinIndex[c * 4 + q]) ?? 0) + bw * f)
      }
    }
    const topW = [...w].sort((p, q) => q[1] - p[1]).slice(0, 4)
    const sum = topW.reduce((t, [, x2]) => t + x2, 0) || 1
    topW.forEach(([b, x2], q) => {
      skinIndex[k * 4 + q] = b
      skinWeight[k * 4 + q] = x2 / sum
    })
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
  g.setIndex(index)
  g.computeVertexNormals()
  const mesh = new THREE.SkinnedMesh(g, material)
  mesh.name = 'garment-drape'
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  mesh.visible = false
  h.root.add(mesh)
  mesh.bind(h.mesh.skeleton, h.mesh.bindMatrix)
  return mesh
}
