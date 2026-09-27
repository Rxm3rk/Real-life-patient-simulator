import * as THREE from 'three'
import type { Appearance, HairStyle } from '../anatomy/types'
import type { HumanBase } from './assets'
import { computeNormals, type HumanModel } from './human'

/**
 * Scalp hair as shells: layers of the scalp pushed out along the normal and
 * combed back/down, each layer cutting out tapering strands. It gives short
 * hair real volume and a soft, anatomical hairline (receding temples, crown
 * loss) for very little GPU work. Longer styles are worn tied back in a bun.
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
}

const STYLES: Record<HairStyle, StyleSpec> = {
  short: { length: 0.2, line: 0.5, recede: 0.1, crown: 0, curl: 0.1, lie: 0.75 },
  crop: { length: 0.075, line: 0.5, recede: 0.05, crown: 0, curl: 0.05, lie: 0.5 },
  receding: { length: 0.13, line: 0.5, recede: 0.75, crown: 0.35, curl: 0.05, lie: 0.7 },
  bald: { length: 0.07, line: 0.5, recede: 1, crown: 1, fringeOnly: true, curl: 0, lie: 0.6 },
  bob: { length: 0.34, line: 0.49, recede: 0, crown: 0, curl: 0.15, lie: 0.85 },
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
      if (bun) {
        bun.removeFromParent()
        bun.geometry.dispose()
        ;(bun.material as THREE.Material).dispose()
      }
    },
  }
}
