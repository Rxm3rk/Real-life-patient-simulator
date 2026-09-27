import * as THREE from 'three'
import type { Appearance, HairStyle } from '../anatomy/types'
import type { HumanBase } from './assets'
import { computeNormals, type HumanModel } from './human'

/**
 * Scalp hair as shells: layers of the scalp pushed out along the normal and
 * combed back/down, each layer cutting out tapering strands. It gives short
 * hair real volume and a soft, anatomical hairline (receding temples, crown
 * loss) for very little GPU work. A bob adds a draped curtain that falls from
 * the widest part of the head to the jaw; longer styles are worn tied back in
 * a bun.
 */

interface StyleSpec {
  /** strand length, decimetres */
  length: number
  /** hairline on the scalp field (0.5 = natural) */
  line: number
  /** temple/frontal recession 0..1 */
  recede: number
  /** crown/vertex loss 0..1 (1 with `fringeOnly` = horseshoe) */
  crown: number
  fringeOnly?: boolean
  curl: number
  /** how flat the hair lies (0 sticks out, 1 lies flat) */
  lie: number
  bun?: boolean
  /** hair falling to the jaw around the sides and back */
  drape?: boolean
}

const STYLES: Record<HairStyle, StyleSpec> = {
  short: { length: 0.2, line: 0.5, recede: 0.1, crown: 0, curl: 0.1, lie: 0.75 },
  crop: { length: 0.075, line: 0.5, recede: 0.05, crown: 0, curl: 0.05, lie: 0.5 },
  receding: { length: 0.13, line: 0.5, recede: 0.75, crown: 0.35, curl: 0.05, lie: 0.7 },
  bald: { length: 0.07, line: 0.5, recede: 1, crown: 1, fringeOnly: true, curl: 0, lie: 0.6 },
  bob: { length: 0.1, line: 0.49, recede: 0, crown: 0, curl: 0.1, lie: 0.9, drape: true },
  long: { length: 0.12, line: 0.49, recede: 0, crown: 0, curl: 0.05, lie: 0.92, bun: true },
  bun: { length: 0.11, line: 0.49, recede: 0, crown: 0, curl: 0.05, lie: 0.92, bun: true },
  curly: { length: 0.24, line: 0.5, recede: 0, crown: 0, curl: 1, lie: 0.35 },
  hijab: { length: 0.05, line: 0.5, recede: 0, crown: 0, curl: 0, lie: 0.9 },
}

export const HAIR_COLOR: Record<Appearance['hairColor'], [string, string]> = {
  // [base, tips/highlight]
  black: ['#15110f', '#2c2420'],
  darkbrown: ['#2a1b13', '#4a3326'],
  brown: ['#3f2a1c', '#6b4a33'],
  auburn: ['#5a2412', '#8c4526'],
  blonde: ['#8c6a3f', '#c7a46b'],
  grey: ['#6f6b67', '#b3afaa'],
  white: ['#bdb9b3', '#e8e5df'],
}

const LAYERS = 18

const HEADER = /* glsl */ `
attribute float aLayer;
attribute float aMask;
attribute vec3 aBase;
varying float vLayer;
varying float vMask;
varying vec3 vBase;
`

const FRAG_HEADER = /* glsl */ `
uniform vec3 uHairA;
uniform vec3 uHairB;
uniform float uCurl;
uniform float uCell;
varying float vLayer;
varying float vMask;
varying vec3 vBase;
float hr_hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
`

const STRANDS = /* glsl */ `
  // strands on a cylindrical parameterisation of the head (even spacing)
  float ang = atan( vBase.x, vBase.z - 0.55 );
  vec2 sp = vec2( ang * 1.05, vBase.y ) / uCell;
  sp += uCurl * 0.35 * vec2( sin( vLayer * 9.0 + sp.y * 0.7 ), cos( vLayer * 7.0 + sp.x * 0.7 ) );
  vec2 cell = floor( sp );
  vec2 f = fract( sp ) - 0.5;
  float rnd = hr_hash( cell );
  vec2 off = vec2( hr_hash( cell + 3.1 ), hr_hash( cell + 7.7 ) ) - 0.5;
  float d = length( f - off * 0.45 );
  float strandLen = 0.3 + 0.7 * hr_hash( cell + 11.3 );
  float radius = mix( 0.5, 0.1, clamp( vLayer / strandLen, 0.0, 1.0 ) );
  // an irregular hairline: density wanders along it rather than following a ruled line
  float wander = hr_hash( floor( vec2( ang * 40.0, vBase.y * 40.0 ) ) ) * 0.35 + 0.82;
  bool present = rnd < clamp( vMask * wander, 0.0, 1.0 );
  if ( vLayer > 0.04 && ( !present || vLayer > strandLen || d > radius ) ) discard;
  // the dense base layer thins out at the hairline (dithered, so there's no hard edge)
  if ( vLayer <= 0.04 && hr_hash( floor( gl_FragCoord.xy ) ) > smoothstep( 0.25, 0.8, vMask ) ) discard;
  vec3 hairCol = mix( uHairA, uHairB, 0.45 * hr_hash( cell + 5.0 ) + 0.45 * vLayer );
  hairCol *= 0.8 + 0.4 * hr_hash( cell + 9.0 );
  // roots in shadow of the hair above them
  hairCol *= mix( 0.38, 1.0, smoothstep( 0.0, 0.85, vLayer ) );
  diffuseColor.rgb = hairCol;
`

export interface HairModel {
  object: THREE.Object3D
  dispose(): void
}

export function createHair(h: HumanModel, base: HumanBase, a: Appearance): HairModel | null {
  const style = STYLES[a.hair]
  const group = new THREE.Group()
  group.name = 'hair'
  const [colA, colB] = HAIR_COLOR[a.hairColor]
  if (a.hair === 'hijab') return null

  // ---- shells cut from the scalp
  const NC = base.meta.compactCount
  const normals = computeNormals(h.positions, base.index, base.renderToCompact, NC)
  const part = base.meta.parts.find((p) => p.name === 'body')!
  const maskOf = new Float32Array(NC).fill(-1)
  const lineAt = (az: number) => style.line + style.recede * (0.34 * Math.exp(-(((az - 0.16) / 0.08) ** 2)) + 0.16 * Math.exp(-((az / 0.1) ** 2)))
  const densityAt = (c: number) => {
    if (maskOf[c] >= 0) return maskOf[c]
    const field = base.scalp[c] / 255
    const az = base.scalpAz[c] / 255
    const line = lineAt(az)
    // a hairline is a gradient of thinning hairs, not an edge
    let m = THREE.MathUtils.smoothstep(field, line - 0.05, line + 0.09)
    // crown / vertex loss
    const crown = THREE.MathUtils.smoothstep(field, 0.66, 0.78) * THREE.MathUtils.smoothstep(1 - az, 0.25, 0.55)
    m *= 1 - style.crown * crown
    if (style.fringeOnly) m *= THREE.MathUtils.smoothstep(az, 0.36, 0.5) * (1 - THREE.MathUtils.smoothstep(field, 0.7, 0.8))
    maskOf[c] = m
    return m
  }
  const tris: number[] = []
  for (let i = part.start; i < part.start + part.count; i += 3) {
    const cs = [0, 1, 2].map((k) => base.renderToCompact[base.index[i + k]])
    if (cs.some((c) => base.scalp[c] === 0)) continue
    if (Math.max(...cs.map(densityAt)) < 0.02) continue
    tris.push(...cs)
  }
  if (!tris.length) return null
  const local = new Map<number, number>()
  const verts: number[] = []
  for (const c of tris)
    if (!local.has(c)) {
      local.set(c, verts.length)
      verts.push(c)
    }
  const NV = verts.length
  const pos = new Float32Array(NV * LAYERS * 3)
  const nrm = new Float32Array(NV * LAYERS * 3)
  const baseAttr = new Float32Array(NV * LAYERS * 3)
  const layer = new Float32Array(NV * LAYERS)
  const mask = new Float32Array(NV * LAYERS)
  const skinIndex = new Uint16Array(NV * LAYERS * 4)
  const skinWeight = new Float32Array(NV * LAYERS * 4)
  const comb = new THREE.Vector3()
  const n = new THREE.Vector3()
  const p = new THREE.Vector3()
  for (let L = 0; L < LAYERS; L++) {
    const t = L === 0 ? 0.02 : L / (LAYERS - 1)
    for (let v = 0; v < NV; v++) {
      const c = verts[v]
      const i = L * NV + v
      p.fromArray(h.positions, c * 3)
      n.fromArray(normals, c * 3)
      // comb back over the top, down at the sides and back
      const side = Math.abs(n.x) + Math.max(0, -n.z)
      comb.set(0, -0.35 - side * 0.8, -1 + side * 0.7)
      comb.sub(n.clone().multiplyScalar(comb.dot(n))).normalize()
      // longer on top, short at the hairline and nape
      const len = style.length * (0.45 + 0.75 * THREE.MathUtils.smoothstep(base.scalp[c] / 255, 0.48, 0.9))
      const out = t * len * (1 - style.lie * 0.75)
      const along = t * len * style.lie
      p.addScaledVector(n, out + 0.002).addScaledVector(comb, along)
      pos.set([p.x, p.y, p.z], i * 3)
      nrm.set([n.x * 0.6 + comb.x * 0.4, n.y * 0.6 + comb.y * 0.4, n.z * 0.6 + comb.z * 0.4], i * 3)
      baseAttr.set([h.positions[c * 3], h.positions[c * 3 + 1], h.positions[c * 3 + 2]], i * 3)
      layer[i] = t
      mask[i] = densityAt(c)
      for (let k = 0; k < 4; k++) {
        skinIndex[i * 4 + k] = base.skinIndex[c * 4 + k]
        skinWeight[i * 4 + k] = base.skinWeight[c * 4 + k] / 255
      }
    }
  }
  const index: number[] = []
  for (let L = 0; L < LAYERS; L++) for (const c of tris) index.push(L * NV + local.get(c)!)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  g.setAttribute('aBase', new THREE.BufferAttribute(baseAttr, 3))
  g.setAttribute('aLayer', new THREE.BufferAttribute(layer, 1))
  g.setAttribute('aMask', new THREE.BufferAttribute(mask, 1))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
  g.setIndex(index)

  const m = new THREE.MeshStandardMaterial({ name: 'hair', color: '#ffffff', roughness: 0.82, metalness: 0, side: THREE.DoubleSide, alphaToCoverage: true })
  const uniforms = {
    uHairA: { value: new THREE.Color(colA) },
    uHairB: { value: new THREE.Color(colB) },
    uCurl: { value: style.curl },
    uCell: { value: style.curl > 0.5 ? 0.018 : 0.0105 },
  }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${HEADER}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLayer = aLayer; vMask = aMask; vBase = aBase;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${FRAG_HEADER}`).replace('#include <map_fragment>', STRANDS)
  }
  m.customProgramCacheKey = () => 'bedside-hair-v1'
  const mesh = new THREE.SkinnedMesh(g, m)
  mesh.name = 'hair-shells'
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  mesh.bind(h.mesh.skeleton, h.mesh.bindMatrix)
  group.add(mesh)

  // ---- a bob: layered hair hanging from the widest part of the head to the jaw
  const drape = style.drape ? createDrape(h, base, colA, colB) : null
  if (drape) group.add(drape.mesh)

  // ---- tied-back hair: a bun at the back of the head, riding on the head bone
  let bun: THREE.Mesh | null = null
  if (style.bun) {
    const headRest = h.rest.head.head
    const top = h.rest.head.tail
    const bunGeo = new THREE.SphereGeometry(0.42, 32, 24)
    // flatten against the head and add a twist so it reads as coiled hair
    const bp = bunGeo.attributes.position
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i)
      const y = bp.getY(i)
      let z = bp.getZ(i)
      z = z > 0 ? z * 0.55 : z * 0.9
      const coil = 1 + 0.07 * Math.sin(Math.atan2(y, x) * 5 + z * 20)
      bp.setXYZ(i, x * coil, y * coil, z)
    }
    bunGeo.computeVertexNormals()
    const bunMat = new THREE.MeshStandardMaterial({ name: 'hair-bun', color: colA, roughness: 0.5 })
    bunMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTip = { value: new THREE.Color(colB) }
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uTip;\nvarying vec3 vP;')
        .replace(
          '#include <map_fragment>',
          `float a = atan( vP.y, vP.x );
  float strands = 0.5 + 0.5 * sin( a * 70.0 + length( vP.xy ) * 60.0 );
  diffuseColor.rgb = mix( diffuseColor.rgb, uTip, strands * 0.45 ) * ( 0.75 + 0.25 * strands );`,
        )
    }
    bun = new THREE.Mesh(bunGeo, bunMat)
    bun.name = 'hair-bun'
    bun.castShadow = true
    // behind and above the occiput, tilted to sit on the head
    bun.position.set(0, (top.y - headRest.y) * 0.55, -0.95).add(new THREE.Vector3(0, 0, headRest.z - 0.46))
    bun.rotation.x = -0.35
    h.bones.head.add(bun)
  }

  return {
    object: group,
    dispose() {
      g.dispose()
      m.dispose()
      drape?.dispose()
      if (bun) {
        bun.removeFromParent()
        bun.geometry.dispose()
        ;(bun.material as THREE.Material).dispose()
      }
    },
  }
}

/* ------------------------------------------------------------------ drape */

const DRAPE_LAYERS = 4

const DRAPE_VERT = /* glsl */ `
attribute vec2 aHUv;
attribute float aHLayer;
varying vec2 vHUv;
varying float vHLayer;
`

const DRAPE_FRAG_HEADER = /* glsl */ `
uniform vec3 uHairA;
uniform vec3 uHairB;
varying vec2 vHUv;
varying float vHLayer;
float dr_hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
`

const DRAPE_STRANDS = /* glsl */ `
  // strands run down the curtain: u around the head, v from the crown to the ends
  float s = vHUv.x * 520.0 + sin( vHUv.y * 9.0 + vHUv.x * 40.0 ) * 0.6;
  vec2 cell = vec2( floor( s ), 0.0 );
  float fx = fract( s ) - 0.5;
  float rnd = dr_hash( cell );
  // ragged ends: each strand stops at its own length, outer layers a little shorter
  float end = 1.0 - 0.1 * dr_hash( cell + 2.3 ) - 0.04 * vHLayer;
  if ( vHUv.y > end ) discard;
  // outer layers: separate locks rather than a sheet
  if ( vHLayer > 0.1 ) {
    float lock = dr_hash( vec2( floor( s * 0.45 ), vHLayer * 17.0 ) );
    if ( lock > 0.8 - vHLayer * 0.3 || abs( fx ) > 0.42 ) discard;
  }
  // thin out at the edges that frame the face
  float edge = min( vHUv.x, 1.0 - vHUv.x );
  if ( edge < 0.03 * dr_hash( cell + 4.0 ) + 0.004 ) discard;
  vec3 col = mix( uHairA, uHairB, 0.25 * rnd + 0.4 * smoothstep( 0.1, 1.0, vHUv.y ) );
  col *= 0.9 + 0.16 * dr_hash( cell + 9.0 );
  col *= 0.94 + 0.06 * cos( fx * 6.2832 );
  // inner layers and the roots sit in the shade of the hair over them
  col *= mix( 0.5, 1.0, clamp( vHLayer * 0.7 + 0.3, 0.0, 1.0 ) ) * mix( 0.7, 1.0, smoothstep( 0.0, 0.25, vHUv.y ) );
  diffuseColor.rgb = col;
`

/**
 * A draped bob: a curtain of hair that hangs from the widest part of the head
 * (it can't go in under it), sweeps a little forward to frame the jaw, tucks
 * under at the ends and is longer at the front than at the nape. Its radius
 * comes from the patient's own head, sampled around a vertical axis.
 */
function createDrape(h: HumanModel, base: HumanBase, colA: string, colB: string) {
  const P = h.positions
  const NC = base.meta.compactCount
  const eyeY = h.rest.head.head.y + h.eyes.left.position.y
  const lm = base.meta.landmarks as Record<string, number>
  const chinY = P[lm.chin * 3 + 1]
  const topY = P[lm.vertex * 3 + 1] - 0.02
  // the head's vertical axis: centred between forehead and occiput at brow height
  let zMin = Infinity
  let zMax = -Infinity
  for (let c = 0; c < NC; c++) {
    const y = P[c * 3 + 1]
    if (y > eyeY && y < eyeY + 0.5 && Math.abs(P[c * 3]) < 0.3) {
      zMin = Math.min(zMin, P[c * 3 + 2])
      zMax = Math.max(zMax, P[c * 3 + 2])
    }
  }
  const cz = (zMin + zMax) / 2 - 0.1
  // points spread over the skin of the head and neck (vertices alone leave gaps between them)
  const samples: number[] = []
  {
    const part = base.meta.parts.find((q) => q.name === 'body')!
    const r2c = base.renderToCompact
    const N = 4
    for (let i = part.start; i < part.start + part.count; i += 3) {
      const a = r2c[base.index[i]] * 3
      const b = r2c[base.index[i + 1]] * 3
      const c = r2c[base.index[i + 2]] * 3
      if (Math.min(P[a + 1], P[b + 1], P[c + 1]) < chinY - 0.7) continue
      for (let s1 = 0; s1 <= N; s1++)
        for (let s2 = 0; s2 <= N - s1; s2++) {
          const w1 = s1 / N
          const w2 = s2 / N
          const w0 = 1 - w1 - w2
          samples.push(P[a] * w0 + P[b] * w1 + P[c] * w2, P[a + 1] * w0 + P[b + 1] * w1 + P[c + 1] * w2, P[a + 2] * w0 + P[b + 2] * w1 + P[c + 2] * w2)
        }
    }
  }
  const NS = samples.length / 3
  // the front hairline: the lowest point of the scalp field's hair-bearing skin over the forehead
  let hairFrontY = eyeY + 0.6
  for (let c = 0; c < NC; c++)
    if (base.scalp[c] / 255 >= 0.5 && Math.abs(P[c * 3]) < 0.2 && P[c * 3 + 2] > cz + 0.3) hairFrontY = Math.min(hairFrontY, P[c * 3 + 1])
  // skin radius around the axis, binned by angle and height (head, ears and neck)
  const NA = 96
  const y0 = chinY - 0.6
  const dy = 0.04
  const NY = Math.ceil((topY + 0.4 - y0) / dy)
  const R = new Float32Array(NA * NY).fill(0)
  for (let q = 0; q < NS; q++) {
    const x = samples[q * 3]
    const y = samples[q * 3 + 1]
    const z = samples[q * 3 + 2] - cz
    if (y < y0 || y >= y0 + NY * dy) continue
    const r = Math.hypot(x, z)
    if (r > 1.6) continue
    const a = Math.floor(((Math.atan2(x, z) + Math.PI) / (Math.PI * 2)) * NA) % NA
    const j = Math.floor((y - y0) / dy)
    R[j * NA + a] = Math.max(R[j * NA + a], r)
  }
  // fill any empty cells from their neighbours round the head, then from the row above,
  // then let hair fall: at each height it's at least as wide as anywhere above
  const dilate = (M: Float32Array, rows: number) => {
    for (let pass = 0; pass < 6; pass++)
      for (let j = 0; j < rows; j++)
        for (let a = 0; a < NA; a++)
          if (!M[j * NA + a]) M[j * NA + a] = Math.max(M[j * NA + ((a + 1) % NA)], M[j * NA + ((a + NA - 1) % NA)])
  }
  dilate(R, NY)
  for (let j = NY - 2; j >= 0; j--)
    for (let a = 0; a < NA; a++) if (!R[j * NA + a]) R[j * NA + a] = R[(j + 1) * NA + a] * 0.98
  for (let j = NY - 2; j >= 0; j--) for (let a = 0; a < NA; a++) R[j * NA + a] = Math.max(R[j * NA + a], R[(j + 1) * NA + a])
  // soften around the head so the curtain has no facets
  const tmp = new Float32Array(R.length)
  for (let pass = 0; pass < 4; pass++) {
    for (let j = 0; j < NY; j++)
      for (let a = 0; a < NA; a++) tmp[j * NA + a] = (R[j * NA + ((a + NA - 1) % NA)] + 2 * R[j * NA + a] + R[j * NA + ((a + 1) % NA)]) / 4
    R.set(tmp)
  }
  const radiusAt = (ang: number, y: number) => {
    const a = (((ang + Math.PI) / (Math.PI * 2)) * NA + NA) % NA
    const j = THREE.MathUtils.clamp((y - y0) / dy, 0, NY - 1.001)
    const a0 = Math.floor(a)
    const j0 = Math.floor(j)
    const fa = a - a0
    const fj = j - j0
    const g = (aa: number, jj: number) => R[jj * NA + (aa % NA)]
    return (g(a0, j0) * (1 - fa) + g(a0 + 1, j0) * fa) * (1 - fj) + (g(a0, j0 + 1) * (1 - fa) + g(a0 + 1, j0 + 1) * fa) * fj
  }

  // over the top of the head the hair follows the skull: a dome around a centre point, so the gap to the
  // scalp is even all over the crown (a horizontal offset alone would let the scalp hair poke through)
  const cy = eyeY + 0.35
  const C = new THREE.Vector3(0, cy, cz)
  const NE = 24
  const elMin = -0.2
  const D = new Float32Array(NA * NE).fill(0)
  for (let q = 0; q < NS; q++) {
    const x = samples[q * 3]
    const y = samples[q * 3 + 1] - cy
    const z = samples[q * 3 + 2] - cz
    if (y < -0.4) continue
    const hr = Math.hypot(x, z)
    if (hr > 1.6) continue
    const el = Math.atan2(y, hr)
    if (el < elMin) continue
    const a = Math.floor(((Math.atan2(x, z) + Math.PI) / (Math.PI * 2)) * NA) % NA
    const e = Math.min(NE - 1, Math.floor(((el - elMin) / (Math.PI / 2 - elMin)) * NE))
    D[e * NA + a] = Math.max(D[e * NA + a], Math.hypot(hr, y))
  }
  dilate(D, NE)
  for (let e = 1; e < NE; e++) for (let a = 0; a < NA; a++) if (!D[e * NA + a]) D[e * NA + a] = D[(e - 1) * NA + a]
  for (let pass = 0; pass < 4; pass++) {
    const t2 = new Float32Array(D.length)
    for (let e = 0; e < NE; e++)
      for (let a = 0; a < NA; a++) {
        const up = D[Math.min(NE - 1, e + 1) * NA + a]
        const dn = D[Math.max(0, e - 1) * NA + a]
        t2[e * NA + a] = (D[e * NA + ((a + NA - 1) % NA)] + D[e * NA + ((a + 1) % NA)] + up + dn + 4 * D[e * NA + a]) / 8
      }
    D.set(t2)
  }
  const domeAt = (ang: number, el: number) => {
    const a = (((ang + Math.PI) / (Math.PI * 2)) * NA + NA) % NA
    const e = THREE.MathUtils.clamp(((el - elMin) / (Math.PI / 2 - elMin)) * NE - 0.5, 0, NE - 1.001)
    const a0 = Math.floor(a)
    const e0 = Math.floor(e)
    const fa = a - a0
    const fe = e - e0
    const g = (aa: number, ee: number) => D[ee * NA + (aa % NA)]
    return (g(a0, e0) * (1 - fa) + g(a0 + 1, e0) * fa) * (1 - fe) + (g(a0, e0 + 1) * (1 - fa) + g(a0 + 1, e0 + 1) * fa) * fe
  }

  const NU = 72
  const NV = 34
  const SPLIT = 0.48
  const count = (NU + 1) * (NV + 1) * DRAPE_LAYERS
  const pos = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  const lay = new Float32Array(count)
  const deg = THREE.MathUtils.degToRad
  const dir = new THREE.Vector3()
  let k = 0
  for (let L = 0; L < DRAPE_LAYERS; L++)
    for (let jv = 0; jv <= NV; jv++)
      for (let iu = 0; iu <= NU; iu++) {
        const u = iu / NU
        const v = jv / NV
        // falls from the crown (a centre parting at the front), clears the face below the hairline by
        // going back past the temples in front of the ears, then sweeps a little forward to frame the jaw
        const yGuess = v < SPLIT ? cy + Math.sin((1 - v / SPLIT) * Math.PI / 2) * 0.95 : cy + (chinY - cy) * ((v - SPLIT) / (1 - SPLIT))
        const clear = 1 - THREE.MathUtils.smoothstep(yGuess, hairFrontY - 0.1, hairFrontY + 0.4)
        const front = deg(9 + 75 * clear - 20 * THREE.MathUtils.smoothstep(v, 0.7, 1))
        const ang = front + u * (Math.PI * 2 - 2 * front)
        // outer layers meet the inner one at the crown, so no layer shows a top edge
        const layerOff = L * 0.022 * THREE.MathUtils.smoothstep(v, 0.05, 0.5)
        if (v < SPLIT) {
          const el = (Math.PI / 2) * (1 - v / SPLIT)
          dir.set(Math.sin(ang) * Math.cos(el), Math.sin(el), Math.cos(ang) * Math.cos(el))
          const d = domeAt(ang, el) + 0.075 + layerOff
          pos.set([C.x + dir.x * d, C.y + dir.y * d, C.z + dir.z * d], k * 3)
        } else {
          const w = (v - SPLIT) / (1 - SPLIT)
          const back = (1 - Math.cos(ang)) / 2
          const bottomY = chinY + 0.02 + 0.3 * back
          const y = cy + (bottomY - cy) * w
          // hangs straight from the widest part of the head, fuller towards the ends, tucked under at the tips
          const skin = Math.max(radiusAt(ang, y), domeAt(ang, 0))
          let r = skin + 0.075 + 0.1 * w * w + layerOff
          r -= 0.1 * THREE.MathUtils.smoothstep(w, 0.8, 1)
          r = Math.max(r, radiusAt(ang, y) + 0.03 + L * 0.02)
          pos.set([Math.sin(ang) * r, y, cz + Math.cos(ang) * r], k * 3)
        }
        uv.set([u, v], k * 2)
        lay[k] = L / (DRAPE_LAYERS - 1)
        k++
      }
  const index: number[] = []
  const row = NU + 1
  for (let L = 0; L < DRAPE_LAYERS; L++) {
    const o = L * row * (NV + 1)
    for (let jv = 0; jv < NV; jv++)
      for (let iu = 0; iu < NU; iu++) {
        const a = o + jv * row + iu
        index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
      }
  }
  // it all rides on the head
  const headIndex = base.meta.bones.indexOf('head')
  const skinIndex = new Uint16Array(count * 4)
  const skinWeight = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    skinIndex[i * 4] = headIndex
    skinWeight[i * 4] = 1
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aHUv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('aHLayer', new THREE.BufferAttribute(lay, 1))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
  g.setIndex(index)
  g.computeVertexNormals()
  const m = new THREE.MeshPhysicalMaterial({
    name: 'hair-drape',
    color: '#ffffff',
    roughness: 0.62,
    sheen: 0.55,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(colB),
    side: THREE.DoubleSide,
    alphaToCoverage: true,
  })
  const uniforms = { uHairA: { value: new THREE.Color(colA) }, uHairB: { value: new THREE.Color(colB) } }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${DRAPE_VERT}`).replace('#include <begin_vertex>', '#include <begin_vertex>\nvHUv = aHUv; vHLayer = aHLayer;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${DRAPE_FRAG_HEADER}`).replace('#include <map_fragment>', DRAPE_STRANDS)
  }
  m.customProgramCacheKey = () => 'bedside-hair-drape-v1'
  const mesh = new THREE.SkinnedMesh(g, m)
  mesh.name = 'hair-drape'
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  mesh.bind(h.mesh.skeleton, h.mesh.bindMatrix)
  return {
    mesh,
    dispose() {
      g.dispose()
      m.dispose()
    },
  }
}
