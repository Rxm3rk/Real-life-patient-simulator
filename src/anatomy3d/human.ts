import * as THREE from 'three'
import type { HumanBase, HumanBody } from './assets'
import { eyeGeometry } from './eyes'

/**
 * A skinned MakeHuman patient: one mesh (skin, tongue, teeth, lashes and the
 * fitted helper shells as material groups), a 53-bone skeleton rebuilt from the
 * baked joints, and two eyes on pivots attached to the head bone.
 *
 * Rest frames are world-aligned, so a local bone rotation is simply a rotation
 * about an axis expressed in rest-pose world coordinates (see poses.ts).
 */

/** Face morphs uploaded to the GPU (MakeHuman expression units), plus our own. */
export const GPU_MORPHS = [
  'browsDown',
  'browsInnerUp',
  'eyesSlit',
  'eyesClosed',
  'eyesWide',
  'noseWrinkle',
  'upperLipRaise',
  'lipStretch',
  'mouthOpen',
  'platysma',
  'lipPress',
  'tongueOut',
  'belly',
] as const
export type GpuMorph = (typeof GPU_MORPHS)[number]

const UNITS: Record<Exclude<GpuMorph, 'tongueOut' | 'belly'>, string[]> = {
  browsDown: ['eyebrows-left-down', 'eyebrows-right-down'],
  browsInnerUp: ['eyebrows-left-inner-up', 'eyebrows-right-inner-up'],
  eyesSlit: ['eye-left-slit', 'eye-right-slit'],
  eyesClosed: ['eye-left-closure', 'eye-right-closure'],
  eyesWide: ['eye-left-opened-up', 'eye-right-opened-up'],
  noseWrinkle: ['nose-compression'],
  upperLipRaise: ['mouth-upward-retraction'],
  lipStretch: ['mouth-retraction'],
  mouthOpen: ['mouth-open'],
  platysma: ['neck-platysma'],
  lipPress: ['mouth-compression'],
}

export type PartName = 'body' | 'tongue' | 'teeth' | 'lashes' | 'hairCap' | 'tights' | 'skirt'

export interface HumanModel {
  root: THREE.Group
  mesh: THREE.SkinnedMesh
  geometry: THREE.BufferGeometry
  materials: Record<PartName, THREE.Material>
  bones: Record<string, THREE.Bone>
  /** Rest-pose world head/tail of each bone (decimetres) */
  rest: Record<string, { head: THREE.Vector3; tail: THREE.Vector3 }>
  eyes: { left: THREE.Group; right: THREE.Group; meshes: THREE.Mesh[]; material: THREE.MeshPhysicalMaterial }
  /** Rest-pose compact positions and the render→compact map, for landmarks and CPU effects */
  positions: Float32Array
  renderToCompact: Uint16Array
  /** First render vertex of each compact vertex */
  compactToRender: Int32Array
  setMorph(name: GpuMorph, value: number): void
  dispose(): void
}

export interface HumanOptions {
  /** Static morphs baked into the rest shape for this patient (0..1) */
  distension?: number
  navel?: 'out' | 'in'
  materials: Record<PartName, THREE.Material>
  eyeMaterial: THREE.MeshPhysicalMaterial
}

/** Area-weighted smooth normals, shared across UV seams. */
export function computeNormals(p: Float32Array, index: Uint16Array, r2c: Uint16Array, compactCount: number, out = new Float32Array(compactCount * 3)) {
  out.fill(0)
  for (let t = 0; t < index.length; t += 3) {
    const a = r2c[index[t]] * 3
    const b = r2c[index[t + 1]] * 3
    const c = r2c[index[t + 2]] * 3
    const e1x = p[b] - p[a]
    const e1y = p[b + 1] - p[a + 1]
    const e1z = p[b + 2] - p[a + 2]
    const e2x = p[c] - p[a]
    const e2y = p[c + 1] - p[a + 1]
    const e2z = p[c + 2] - p[a + 2]
    const nx = e1y * e2z - e1z * e2y
    const ny = e1z * e2x - e1x * e2z
    const nz = e1x * e2y - e1y * e2x
    for (const v of [a, b, c]) {
      out[v] += nx
      out[v + 1] += ny
      out[v + 2] += nz
    }
  }
  for (let v = 0; v < out.length; v += 3) {
    const l = Math.hypot(out[v], out[v + 1], out[v + 2]) || 1
    out[v] /= l
    out[v + 1] /= l
    out[v + 2] /= l
  }
  return out
}

function expand(compact: Float32Array, r2c: Uint16Array) {
  const out = new Float32Array(r2c.length * 3)
  for (let r = 0; r < r2c.length; r++) {
    const c = r2c[r] * 3
    out[r * 3] = compact[c]
    out[r * 3 + 1] = compact[c + 1]
    out[r * 3 + 2] = compact[c + 2]
  }
  return out
}

function addMorph(p: Float32Array, base: HumanBase, name: string, w: number) {
  const m = base.morphs.get(name)
  if (!m || !w) return
  const s = base.meta.morphScale * w
  for (let j = 0; j < m.index.length; j++) {
    const c = m.index[j] * 3
    p[c] += m.delta[j * 3] * s
    p[c + 1] += m.delta[j * 3 + 1] * s
    p[c + 2] += m.delta[j * 3 + 2] * s
  }
}

/** Tongue protrusion: slide the tongue forward and down out of the mouth, tip most. */
function tongueOutDelta(p: Float32Array, base: HumanBase): Float32Array {
  const d = new Float32Array(p.length)
  const part = base.meta.parts.find((x) => x.name === 'tongue')!
  const verts = new Set<number>()
  for (let i = part.start; i < part.start + part.count; i++) verts.add(base.renderToCompact[base.index[i]])
  let zMin = Infinity
  let zMax = -Infinity
  for (const v of verts) {
    zMin = Math.min(zMin, p[v * 3 + 2])
    zMax = Math.max(zMax, p[v * 3 + 2])
  }
  for (const v of verts) {
    const t = (p[v * 3 + 2] - zMin) / (zMax - zMin || 1) // 0 root .. 1 tip
    const reach = 0.1 + 0.9 * t * t
    d[v * 3 + 2] = 0.55 * reach
    d[v * 3 + 1] = -0.22 * reach * t
  }
  return d
}

export function createHuman(base: HumanBase, body: HumanBody, opts: HumanOptions): HumanModel {
  const { meta } = base
  const NC = meta.compactCount
  const r2c = base.renderToCompact

  // Rest shape with this patient's static morphs
  const positions = Float32Array.from(body.positions)
  if (opts.distension) addMorph(positions, base, 'distend', opts.distension)
  if (opts.navel === 'out') addMorph(positions, base, 'navelOut', 1)
  if (opts.navel === 'in') addMorph(positions, base, 'navelIn', 0.8)

  const normals = computeNormals(positions, base.index, r2c, NC)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(expand(positions, r2c), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(expand(normals, r2c), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from(base.uv, (x) => x / 65535), 2))
  const skinIndex = new Uint16Array(r2c.length * 4)
  const skinWeight = new Float32Array(r2c.length * 4)
  for (let r = 0; r < r2c.length; r++)
    for (let k = 0; k < 4; k++) {
      skinIndex[r * 4 + k] = base.skinIndex[r2c[r] * 4 + k]
      skinWeight[r * 4 + k] = base.skinWeight[r2c[r] * 4 + k] / 255
    }
  const perVertex = (src: Uint8Array) => {
    const a = new Uint8Array(r2c.length)
    for (let r = 0; r < r2c.length; r++) a[r] = src[r2c[r]]
    return new THREE.Uint8BufferAttribute(a, 1, true)
  }
  geometry.setAttribute('aAO', perVertex(base.ao))
  geometry.setAttribute('aFlush', perVertex(base.flush))
  geometry.setAttribute('aLids', perVertex(base.lids))
  geometry.setAttribute('aHair', perVertex(base.bodyHair))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
  geometry.setIndex(new THREE.BufferAttribute(base.index, 1))
  const partNames = meta.parts.map((p) => p.name as PartName)
  meta.parts.forEach((p, i) => geometry.addGroup(p.start, p.count, i))

  // Face morphs, with matching normal deltas so shading follows the expression
  const morphPos: THREE.BufferAttribute[] = []
  const morphNrm: THREE.BufferAttribute[] = []
  const scratch = new Float32Array(NC * 3)
  const scratchN = new Float32Array(NC * 3)
  for (const name of GPU_MORPHS) {
    const delta = new Float32Array(NC * 3)
    if (name === 'tongueOut') delta.set(tongueOutDelta(positions, base))
    else if (name === 'belly') addMorph(delta, base, 'distend', 1) // abdominal wall excursion with breathing
    else
      for (const unit of UNITS[name]) {
        const m = base.morphs.get(`expr:${unit}`)
        if (!m) continue
        for (let j = 0; j < m.index.length; j++)
          for (let k = 0; k < 3; k++) delta[m.index[j] * 3 + k] += m.delta[j * 3 + k] * meta.morphScale
      }
    for (let i = 0; i < scratch.length; i++) scratch[i] = positions[i] + delta[i]
    computeNormals(scratch, base.index, r2c, NC, scratchN)
    for (let i = 0; i < scratchN.length; i++) scratchN[i] -= normals[i]
    morphPos.push(new THREE.BufferAttribute(expand(delta, r2c), 3))
    morphNrm.push(new THREE.BufferAttribute(expand(scratchN, r2c), 3))
  }
  geometry.morphAttributes.position = morphPos
  geometry.morphAttributes.normal = morphNrm
  geometry.morphTargetsRelative = true
  geometry.computeBoundingSphere()

  // Skeleton: world-aligned rest frames, so a bone's position is head − parent head
  const bones: Record<string, THREE.Bone> = {}
  const rest: HumanModel['rest'] = {}
  const list = meta.bones.map((name, i) => {
    const b = new THREE.Bone()
    b.name = name
    bones[name] = b
    const j = body.joints
    rest[name] = { head: new THREE.Vector3(j[i * 6], j[i * 6 + 1], j[i * 6 + 2]), tail: new THREE.Vector3(j[i * 6 + 3], j[i * 6 + 4], j[i * 6 + 5]) }
    return b
  })
  meta.boneParents.forEach((p, i) => {
    const b = list[i]
    const head = rest[b.name].head
    if (p < 0) b.position.copy(head)
    else {
      b.position.copy(head).sub(rest[list[p].name].head)
      list[p].add(b)
    }
  })

  const root = new THREE.Group()
  root.name = 'patient'
  const materials = opts.materials
  const mesh = new THREE.SkinnedMesh(
    geometry,
    partNames.map((n) => materials[n]),
  )
  mesh.name = 'patient-body'
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  const rootBone = list[meta.boneParents.indexOf(-1)]
  root.add(rootBone)
  root.add(mesh)
  root.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(list)
  mesh.bind(skeleton)
  mesh.morphTargetInfluences = GPU_MORPHS.map(() => 0)

  // Eyes: two eyeballs pivoting about their centres, riding on the head bone
  const head = bones.head
  const headRest = rest.head.head
  const eyeMeshes: THREE.Mesh[] = []
  const pivots = [0, 1].map((side) => {
    const e = body.eyePivots
    const pivot = new THREE.Group()
    pivot.name = side === 0 ? 'eye-left' : 'eye-right'
    pivot.position.set(e[side * 4], e[side * 4 + 1], e[side * 4 + 2]).sub(headRest)
    head.add(pivot)
    const m = new THREE.Mesh(eyeGeometry(), opts.eyeMaterial)
    m.name = pivot.name + '-ball'
    m.scale.setScalar(e[side * 4 + 3] * 0.9)
    pivot.add(m)
    eyeMeshes.push(m)
    return pivot
  })

  return {
    root,
    mesh,
    geometry,
    materials,
    bones,
    rest,
    eyes: { left: pivots[0], right: pivots[1], meshes: eyeMeshes, material: opts.eyeMaterial },
    positions,
    renderToCompact: r2c,
    compactToRender: (() => {
      const m = new Int32Array(NC).fill(-1)
      for (let r = r2c.length - 1; r >= 0; r--) m[r2c[r]] = r
      return m
    })(),
    setMorph(name, value) {
      const i = GPU_MORPHS.indexOf(name)
      if (i >= 0 && mesh.morphTargetInfluences) mesh.morphTargetInfluences[i] = value
    },
    dispose() {
      geometry.dispose()
      skeleton.dispose()
    },
  }
}
