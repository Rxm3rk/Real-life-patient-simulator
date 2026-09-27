import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { HumanModel } from './human'

/**
 * The places patients are examined: a hospital bed (ward, ED, SAU), an
 * examination couch (clinic) and a clinic floor with a privacy curtain for
 * standing examinations. Units are decimetres; the patient's head is at −z.
 */

export type SetKind = 'bed' | 'couch' | 'standing' | 'chair'

export interface ExamSet {
  kind: SetKind
  group: THREE.Group
  /** Height of the lying surface */
  surfaceY: number
  /** Where the head end starts (z) */
  headZ: number
  /** Tilt the back rest (degrees); 0 = flat */
  setBackrest(deg: number): void
  /** Fit the set to the patient (a chair's seat at the height of their knees) */
  fitTo?(h: HumanModel): void
  dispose(): void
}

const mat = (color: THREE.ColorRepresentation, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })

function fabricNoise(m: THREE.MeshStandardMaterial, scale = 40, amount = 0.08) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <map_fragment>', `#include <map_fragment>\n  diffuseColor.rgb *= 1.0 - ${amount.toFixed(3)} * ( 0.5 + 0.5 * sin( vW.x * ${scale.toFixed(1)} ) * sin( vW.z * ${scale.toFixed(1)} ) );`)
  }
  m.customProgramCacheKey = () => `bedside-weave-${scale}-${amount}`
  return m
}

function castAll(g: THREE.Object3D) {
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
}

function hospitalBed(): ExamSet {
  const group = new THREE.Group()
  group.name = 'bed'
  const L = 21
  const W = 9.2
  const top = 7
  const frameY = top - 1.6
  const metal = mat('#c9d0d6', 0.35, 0.6)
  const dark = mat('#3b4550', 0.5, 0.4)
  const sheet = fabricNoise(mat('#f3f5f7', 0.9), 55, 0.05)

  // frame, legs and castors
  const frame = new THREE.Mesh(new RoundedBoxGeometry(W - 0.4, 0.5, L - 0.6, 3, 0.15), metal)
  frame.position.set(0, frameY, 0)
  group.add(frame)
  for (const x of [-W / 2 + 0.8, W / 2 - 0.8])
    for (const z of [-L / 2 + 1.2, L / 2 - 1.2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, frameY - 0.9, 12), metal)
      leg.position.set(x, (frameY - 0.9) / 2 + 0.9, z)
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 20), dark)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, 0.55, z)
      group.add(leg, wheel)
    }
  // lowered side rails
  for (const x of [-W / 2 - 0.1, W / 2 + 0.1]) {
    const rail = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.9, L * 0.55, 2, 0.1), metal)
    rail.position.set(x, frameY + 0.2, -1)
    group.add(rail)
  }
  // head and foot boards
  for (const [z, h] of [[-L / 2 + 0.1, 4.2], [L / 2 - 0.1, 3.2]] as const) {
    const board = new THREE.Mesh(new RoundedBoxGeometry(W, h, 0.45, 3, 0.18), mat('#d8dde3', 0.45, 0.1))
    board.position.set(0, frameY + h / 2 - 0.2, z)
    group.add(board)
  }

  // mattress: a foot section and a hinged back rest, both under a sheet
  const backLen = 7.5
  const legLen = L - 0.9 - backLen
  const foot = new THREE.Mesh(new RoundedBoxGeometry(W - 0.5, 1.35, legLen, 4, 0.45), sheet)
  foot.position.set(0, top - 0.675, -L / 2 + 0.45 + backLen + legLen / 2)
  const hinge = new THREE.Group()
  hinge.position.set(0, top - 1.35, -L / 2 + 0.45 + backLen)
  const back = new THREE.Mesh(new RoundedBoxGeometry(W - 0.5, 1.35, backLen, 4, 0.45), sheet)
  back.position.set(0, 0.675, -backLen / 2)
  hinge.add(back)
  // pillow on the back rest
  const pillowGeo = new RoundedBoxGeometry(5.6, 1.1, 3.4, 6, 0.5)
  const pp = pillowGeo.attributes.position
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i)
    const z = pp.getZ(i)
    // squash the ends and dent the middle where a head rests
    const bulge = 1 - 0.35 * (x / 2.8) ** 2 - 0.25 * (z / 1.7) ** 2
    pp.setY(i, pp.getY(i) * Math.max(0.35, bulge) - (pp.getY(i) > 0 ? 0.25 * Math.exp(-(x * x + z * z) / 2) : 0))
  }
  pillowGeo.computeVertexNormals()
  const pillow = new THREE.Mesh(pillowGeo, fabricNoise(mat('#fbfcfd', 0.95), 70, 0.04))
  pillow.position.set(0, 1.35 + 0.35, -backLen + 2.2)
  hinge.add(pillow)
  group.add(foot, hinge)
  castAll(group)

  return {
    kind: 'bed',
    group,
    surfaceY: top,
    headZ: -L / 2 + 0.45,
    setBackrest(deg) {
      hinge.rotation.x = THREE.MathUtils.degToRad(deg)
    },
    dispose() {
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    },
  }
}

function examCouch(): ExamSet {
  const group = new THREE.Group()
  group.name = 'couch'
  const L = 19.5
  const W = 6.6
  const top = 7.6
  const vinyl = mat('#2f4a58', 0.45, 0)
  const base = mat('#e2e6ea', 0.5, 0.2)
  const paper = fabricNoise(new THREE.MeshStandardMaterial({ color: '#fbfbf8', roughness: 0.95, transparent: true, opacity: 0.93 }), 90, 0.03)

  const plinth = new THREE.Mesh(new RoundedBoxGeometry(W - 1.4, top - 1.6, L - 4, 3, 0.25), base)
  plinth.position.set(0, (top - 1.6) / 2, 0.5)
  group.add(plinth)
  const backLen = 7
  const seat = new THREE.Mesh(new RoundedBoxGeometry(W, 1.2, L - backLen, 4, 0.4), vinyl)
  seat.position.set(0, top - 0.6, -L / 2 + backLen + (L - backLen) / 2)
  const hinge = new THREE.Group()
  hinge.position.set(0, top - 1.2, -L / 2 + backLen)
  const back = new THREE.Mesh(new RoundedBoxGeometry(W, 1.2, backLen, 4, 0.4), vinyl)
  back.position.set(0, 0.6, -backLen / 2)
  hinge.add(back)
  // paper roll running the length of the couch
  const paperSeat = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.02, L - backLen), paper)
  paperSeat.position.set(0, top + 0.01, seat.position.z)
  const paperBack = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.02, backLen), paper)
  paperBack.position.set(0, 1.21, -backLen / 2)
  hinge.add(paperBack)
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, W * 0.82, 24), paper)
  roll.rotation.z = Math.PI / 2
  roll.position.set(0, top - 0.3, -L / 2 - 0.4)
  group.add(seat, hinge, paperSeat, roll)
  castAll(group)

  return {
    kind: 'couch',
    group,
    surfaceY: top,
    headZ: -L / 2,
    setBackrest(deg) {
      hinge.rotation.x = THREE.MathUtils.degToRad(deg)
    },
    dispose() {
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    },
  }
}

function standingArea(): ExamSet {
  const group = new THREE.Group()
  group.name = 'standing'
  // a curtain on a ceiling track behind the patient
  const folds = new THREE.PlaneGeometry(30, 22, 120, 1)
  const fp = folds.attributes.position
  for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getX(i) * 1.6) * 0.35 + Math.sin(fp.getX(i) * 0.7) * 0.2)
  folds.computeVertexNormals()
  const curtain = new THREE.Mesh(folds, fabricNoise(mat('#9fbdb8', 0.95), 30, 0.05))
  curtain.position.set(0, 11.5, -9)
  curtain.receiveShadow = true
  group.add(curtain)
  return {
    kind: 'standing',
    group,
    surfaceY: 0,
    headZ: 0,
    setBackrest() {},
    dispose() {
      folds.dispose()
    },
  }
}

/** A clinic chair (in the curtained area) for seated examinations: the neck, hands, a lump on the forearm. */
function clinicChair(): ExamSet {
  const area = standingArea()
  const chair = new THREE.Group()
  chair.name = 'chair'
  const frame = mat('#3b4550', 0.4, 0.5)
  const pad = mat('#46607a', 0.7)
  const seat = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.6, 4.4, 3, 0.2), pad)
  const back = new THREE.Mesh(new RoundedBoxGeometry(4.4, 3.6, 0.5, 3, 0.2), pad)
  const legs: THREE.Mesh[] = []
  for (const x of [-1.9, 1.9])
    for (const z of [-1.8, 1.8]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 10), frame)
      leg.userData.at = [x, z]
      legs.push(leg)
    }
  chair.add(seat, back, ...legs)
  castAll(chair)
  area.group.add(chair)
  const place = (seatTop: number) => {
    seat.position.set(0, seatTop - 0.3, -1)
    back.position.set(0, seatTop + 1.9, -3.1)
    back.rotation.x = -0.12
    for (const leg of legs) {
      const [x, z] = leg.userData.at as [number, number]
      leg.scale.y = seatTop - 0.6
      leg.position.set(x, (seatTop - 0.6) / 2, z - 1)
    }
  }
  place(4.6)
  return {
    ...area,
    kind: 'chair',
    surfaceY: 4.6,
    fitTo(h) {
      // seat at the height of the knee joint, so the feet rest flat on the floor
      const seatTop = h.rest.calf_l.head.y - 0.55
      this.surfaceY = seatTop
      place(seatTop)
    },
    dispose() {
      area.dispose()
      chair.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    },
  }
}

export function createSet(kind: SetKind): ExamSet {
  return kind === 'bed' ? hospitalBed() : kind === 'couch' ? examCouch() : kind === 'chair' ? clinicChair() : standingArea()
}

/** Floor and a soft vignette backdrop shared by every set. */
export function createRoom(dark: boolean) {
  const group = new THREE.Group()
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: dark ? '#1c2533' : '#c9ced4', roughness: 0.85 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  group.add(floor)
  return group
}

/**
 * A blanket over a lying patient: a heightfield sampled from the posed body,
 * widened and blurred so it tents between the legs and hangs over the edges.
 * `fromZ`..`toZ` is the covered stretch of the bed (head end is −z).
 */
export function buildBlanket(h: HumanModel, opts: { surfaceY: number; fromZ: number; toZ: number; width: number; parent: THREE.Object3D; over?: THREE.SkinnedMesh[] }) {
  const res = 0.25
  const half = opts.width / 2 + 1.2
  const nx = Math.ceil((half * 2) / res) + 1
  const nz = Math.ceil((opts.toZ - opts.fromZ) / res) + 1
  const H = new Float32Array(nx * nz).fill(opts.surfaceY + 0.05)
  // posed body heights (skinned vertex positions in the parent's frame)
  opts.parent.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(opts.parent.matrixWorld).invert()
  const pos = h.geometry.attributes.position
  const v = new THREE.Vector3()
  const bodyPart = h.geometry.groups[0]
  const idx = h.geometry.index!.array
  const seen = new Uint8Array(pos.count)
  // the arms rest on top of the blanket (or are held out over it): only the trunk and legs shape it
  const armBones = new Set(h.mesh.skeleton.bones.map((b, i) => (/^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/.test(b.name) ? i : -1)).filter((i) => i >= 0))
  const si = h.geometry.attributes.skinIndex
  const sw = h.geometry.attributes.skinWeight
  for (let i = bodyPart.start; i < bodyPart.start + bodyPart.count; i++) {
    const r = idx[i]
    if (seen[r]) continue
    seen[r] = 1
    let arm = 0
    for (let k = 0; k < 4; k++) if (armBones.has(si.getComponent(r, k))) arm += sw.getComponent(r, k)
    if (arm > 0.5) continue
    v.fromBufferAttribute(pos, r)
    h.mesh.applyBoneTransform(r, v)
    v.applyMatrix4(h.mesh.matrixWorld).applyMatrix4(inv)
    const gx = Math.round((v.x + half) / res)
    const gz = Math.round((v.z - opts.fromZ) / res)
    if (gx < 0 || gz < 0 || gx >= nx || gz >= nz) continue
    H[gz * nx + gx] = Math.max(H[gz * nx + gx], v.y + 0.18)
  }
  // clothing the blanket lies over (a gown's skirt)
  for (const m of opts.over ?? []) {
    const p = m.geometry.attributes.position
    for (let r = 0; r < p.count; r++) {
      v.fromBufferAttribute(p, r)
      m.applyBoneTransform(r, v)
      v.applyMatrix4(m.matrixWorld).applyMatrix4(inv)
      const gx = Math.round((v.x + half) / res)
      const gz = Math.round((v.z - opts.fromZ) / res)
      if (gx < 0 || gz < 0 || gx >= nx || gz >= nz) continue
      H[gz * nx + gx] = Math.max(H[gz * nx + gx], v.y + 0.14)
    }
  }
  // dilate then blur: fabric bridges gaps and rounds over the shins
  const tmp = new Float32Array(H.length)
  for (let pass = 0; pass < 2; pass++) {
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) {
        let m = H[z * nx + x]
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx
            const zz = z + dz
            if (xx >= 0 && zz >= 0 && xx < nx && zz < nz) m = Math.max(m, H[zz * nx + xx])
          }
        tmp[z * nx + x] = m
      }
    H.set(tmp)
  }
  for (let pass = 0; pass < 6; pass++) {
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) {
        let s = 0
        let n = 0
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx
            const zz = z + dz
            if (xx >= 0 && zz >= 0 && xx < nx && zz < nz) {
              s += H[zz * nx + xx]
              n++
            }
          }
        tmp[z * nx + x] = s / n
      }
    H.set(tmp)
  }
  // grid mesh; beyond the mattress the blanket falls away over the edge
  const geo = new THREE.PlaneGeometry(half * 2, opts.toZ - opts.fromZ, nx - 1, nz - 1)
  geo.rotateX(-Math.PI / 2)
  const gp = geo.attributes.position
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i)
    const z = gp.getZ(i) + (opts.fromZ + opts.toZ) / 2
    const gx = Math.round((x + half) / res)
    const gz = Math.round((z - opts.fromZ) / res)
    let y = H[Math.min(nz - 1, Math.max(0, gz)) * nx + Math.min(nx - 1, Math.max(0, gx))]
    const over = Math.abs(x) - opts.width / 2
    let xOut = x
    if (over > 0) {
      y -= over * 2.2
      xOut = Math.sign(x) * (opts.width / 2 + over * 0.35)
    }
    // soft wrinkles
    y += Math.sin(x * 2.3 + z * 0.9) * 0.025 + Math.sin(z * 3.1 - x * 0.6) * 0.02
    gp.setXYZ(i, xOut, y, z)
  }
  geo.computeVertexNormals()
  const m = fabricNoise(new THREE.MeshStandardMaterial({ color: '#dce7f0', roughness: 0.95, side: THREE.DoubleSide }), 26, 0.12)
  const mesh = new THREE.Mesh(geo, m)
  mesh.name = 'blanket'
  mesh.castShadow = true
  mesh.receiveShadow = true
  // a turned-down fold running along the blanket's top edge
  const edge: THREE.Vector3[] = []
  for (let i = 0; i < gp.count; i++) if (Math.abs(gp.getZ(i) - opts.fromZ) < 1e-3) edge.push(new THREE.Vector3(gp.getX(i), gp.getY(i) + 0.06, gp.getZ(i) + 0.12))
  edge.sort((p, q) => p.x - q.x)
  const fold = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), edge.length * 2, 0.16, 8, false), m)
  fold.castShadow = true
  const group = new THREE.Group()
  group.add(mesh, fold)
  return {
    object: group,
    material: m,
    dispose() {
      geo.dispose()
      fold.geometry.dispose()
      m.dispose()
    },
  }
}
