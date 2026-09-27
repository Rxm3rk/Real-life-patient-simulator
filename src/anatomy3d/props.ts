import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { HumanBase } from './assets'
import type { HumanModel } from './human'
import { createSignUniforms } from './signs'
import { createSkinMaterial, type SkinLook } from './skin'

/**
 * The examiner's side of the examination: your right hand (cut from the same
 * MakeHuman body, so it's anatomically right), a stethoscope chest piece with
 * its tubing, and the observation chart clipped to the bed.
 */

const EXAMINER_LOOK: SkinLook = {
  tone: '#cf9f80',
  hair: '#3a2a20',
  beard: 0,
  brows: 0,
  bodyHair: 0.15,
  legHair: 1,
  jaundice: 0,
  pallor: 0,
  flush: 0,
  cyanosis: 0,
  sweat: 0,
  mottle: 0,
}

export interface ExaminerHand {
  object: THREE.Group
  /** Distance from the palm centre to the finger pads, along the fingers */
  tipReach: number
  /**
   * Lay the hand flat on the skin: palm centre at world point `p` (outward skin normal `n`),
   * fingers pointing along `toward`, `lift` above the skin (negative sinks it in as the skin gives).
   */
  place(p: THREE.Vector3, n: THREE.Vector3, toward: THREE.Vector3, lift: number): void
  dispose(): void
}

/** Your right hand and forearm, built from the patient's rest-pose mesh in a palm-down frame. */
export function createExaminerHand(h: HumanModel, base: HumanBase): ExaminerHand {
  const bones = base.meta.bones
  const idx = (re: RegExp) => new Set(bones.map((b, i) => (re.test(b) ? i : -1)).filter((i) => i >= 0))
  const handSet = idx(/^(hand_r|(thumb|index|middle|ring|pinky)_0\d_r)$/)
  const foreSet = idx(/^lowerarm_r$/)
  const thumbSet = idx(/^thumb_0[23]_r$/)
  const tipSet = idx(/^middle_03_r$/)
  const NC = base.meta.compactCount
  const P = h.positions
  const w = (c: number, set: Set<number>) => {
    let s = 0
    for (let k = 0; k < 4; k++) if (set.has(base.skinIndex[c * 4 + k])) s += base.skinWeight[c * 4 + k] / 255
    return s
  }
  const v = (c: number) => new THREE.Vector3(P[c * 3], P[c * 3 + 1], P[c * 3 + 2])
  const hand = new Float32Array(NC)
  const keep = new Uint8Array(NC)
  const wrist = new THREE.Vector3()
  const thumb = new THREE.Vector3()
  const palm = new THREE.Vector3()
  let nw = 0
  let nt = 0
  let np = 0
  for (let c = 0; c < NC; c++) {
    hand[c] = w(c, handSet)
    const fore = w(c, foreSet)
    if (hand[c] + fore > 0.5) keep[c] = 1
    if (hand[c] > 0.35 && hand[c] < 0.65) {
      wrist.add(v(c))
      nw++
    }
    if (w(c, thumbSet) > 0.5) {
      thumb.add(v(c))
      nt++
    }
    if (hand[c] > 0.95) {
      palm.add(v(c))
      np++
    }
  }
  wrist.divideScalar(Math.max(1, nw))
  thumb.divideScalar(Math.max(1, nt))
  palm.divideScalar(Math.max(1, np))
  let tip = wrist.clone()
  for (let c = 0; c < NC; c++) if (w(c, tipSet) > 0.5 && v(c).distanceTo(wrist) > tip.distanceTo(wrist)) tip = v(c)
  const F = tip.clone().sub(wrist).normalize()
  const T = thumb.clone().sub(wrist)
  T.addScaledVector(F, -T.dot(F)).normalize()
  // out of the palm (for a right hand, thumb × fingers)
  const N = new THREE.Vector3().crossVectors(T, F).normalize()
  // palm surface: the furthest the hand reaches along N from its centre
  let reach = 0
  for (let c = 0; c < NC; c++) if (hand[c] > 0.95) reach = Math.max(reach, v(c).sub(palm).dot(N))
  const origin = palm.clone().addScaledVector(N, reach).addScaledVector(F, 0.1)
  // local frame: x towards the little finger, y out of the palm, z along the fingers (right-handed)
  const X = T.clone().negate()

  // triangles of the kept vertices (body part only), with the skin shader's attributes
  const part = base.meta.parts.find((p) => p.name === 'body')!
  const r2c = base.renderToCompact
  const src = h.geometry
  const map = new Map<number, number>()
  const pos: number[] = []
  const uv: number[] = []
  const attrs: Record<string, number[]> = { aAO: [], aFlush: [], aLids: [], aHair: [] }
  const index: number[] = []
  for (let i = part.start; i < part.start + part.count; i += 3) {
    const rs = [base.index[i], base.index[i + 1], base.index[i + 2]]
    if (!rs.every((r) => keep[r2c[r]])) continue
    for (const r of rs) {
      let k = map.get(r)
      if (k === undefined) {
        k = pos.length / 3
        map.set(r, k)
        const p = v(r2c[r]).sub(origin)
        pos.push(p.dot(X), p.dot(N), p.dot(F))
        uv.push(src.attributes.uv.getX(r), src.attributes.uv.getY(r))
        for (const a of Object.keys(attrs)) attrs[a].push(src.attributes[a].getX(r))
      }
      index.push(k)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  for (const [a, vals] of Object.entries(attrs)) g.setAttribute(a, new THREE.Float32BufferAttribute(vals, 1))
  g.setIndex(index)
  g.computeVertexNormals()
  const { material } = createSkinMaterial(EXAMINER_LOOK, createSignUniforms())
  const mesh = new THREE.Mesh(g, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.name = 'examiner-hand'
  const object = new THREE.Group()
  object.add(mesh)
  object.visible = false

  const basis = new THREE.Matrix4()
  return {
    object,
    tipReach: tip.clone().sub(origin).dot(F) - 0.12,
    place(p, n, toward, lift) {
      const Nw = n.clone().normalize().negate()
      const Fw = toward.clone().addScaledVector(n, -toward.dot(n)).normalize()
      const Tw = new THREE.Vector3().crossVectors(Fw, Nw)
      basis.makeBasis(Tw.negate(), Nw, Fw)
      object.quaternion.setFromRotationMatrix(basis)
      object.position.copy(p).addScaledVector(n, lift)
      object.visible = true
    },
    dispose() {
      g.dispose()
      material.dispose()
    },
  }
}

export interface Stethoscope {
  object: THREE.Group
  place(p: THREE.Vector3, n: THREE.Vector3, examinerSide: THREE.Vector3): void
  dispose(): void
}

/** A stethoscope chest piece resting on the skin, its tubing curving away to the examiner. */
export function createStethoscope(): Stethoscope {
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#d7dde3', metalness: 1, roughness: 0.22 })
  const plastic = new THREE.MeshPhysicalMaterial({ color: '#2a2f36', roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3 })
  const tubeMat = new THREE.MeshPhysicalMaterial({ color: '#1c2229', roughness: 0.55, clearcoat: 0.3 })
  const head = new THREE.Group()
  // diaphragm (against the skin), chrome bell body and rim, and the stem
  const diaphragm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 40), plastic)
  diaphragm.position.y = 0.01
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.215, 0.09, 40), chrome)
  body.position.y = 0.065
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.018, 10, 40), chrome)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.03
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 16), chrome)
  stem.rotation.z = Math.PI / 2
  stem.position.set(0.28, 0.08, 0)
  head.add(diaphragm, body, rim, stem)
  const object = new THREE.Group()
  object.add(head)
  object.visible = false
  let tube: THREE.Mesh | null = null
  object.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : null))
  return {
    object,
    place(p, n, examinerSide) {
      const up = n.clone().normalize()
      // the stem points towards the examiner, along the skin
      const side = examinerSide.clone().addScaledVector(up, -examinerSide.dot(up)).normalize()
      const z = new THREE.Vector3().crossVectors(side, up)
      object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, z))
      object.position.copy(p).addScaledVector(up, 0.01)
      // tubing: leaves the stem, rises and runs off towards the examiner
      tube?.geometry.dispose()
      if (tube) object.remove(tube)
      const pts = [new THREE.Vector3(0.38, 0.08, 0), new THREE.Vector3(0.9, 0.35, 0.1), new THREE.Vector3(1.8, 1.6, 0.4), new THREE.Vector3(2.6, 3.6, 0.2), new THREE.Vector3(3.2, 6.5, 0)]
      tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.045, 10, false), tubeMat)
      tube.castShadow = true
      object.add(tube)
      object.visible = true
    },
    dispose() {
      object.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      chrome.dispose()
      plastic.dispose()
      tubeMat.dispose()
    },
  }
}

/** An observation chart on a clipboard: tap it to read the obs. */
export function createObsChart(): { object: THREE.Mesh; dispose(): void } {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 352
  const x = c.getContext('2d')!
  x.fillStyle = '#fbfbf7'
  x.fillRect(0, 0, 256, 352)
  x.fillStyle = '#1d4e89'
  x.fillRect(0, 0, 256, 34)
  x.fillStyle = '#ffffff'
  x.font = 'bold 18px system-ui, sans-serif'
  x.fillText('OBSERVATIONS', 14, 24)
  // NEWS2-style banded rows with a plotted trend
  const bands = ['#f4c7c3', '#fbe3b7', '#fff6c9', '#ffffff', '#fff6c9', '#fbe3b7', '#f4c7c3']
  for (let r = 0; r < 6; r++) {
    const top = 48 + r * 50
    bands.forEach((b, i) => {
      x.fillStyle = b
      x.fillRect(46, top + i * 6, 200, 6)
    })
    x.strokeStyle = '#c9ced6'
    x.strokeRect(46, top, 200, 42)
    x.fillStyle = '#44505e'
    x.font = '11px system-ui, sans-serif'
    x.fillText(['RR', 'SpO₂', 'BP', 'HR', 'T', 'AVPU'][r], 8, top + 25)
    x.strokeStyle = '#1f2a36'
    x.lineWidth = 2
    x.beginPath()
    for (let k = 0; k < 8; k++) x[k ? 'lineTo' : 'moveTo'](56 + k * 25, top + 21 + Math.sin(k * 1.3 + r) * 6)
    x.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const board = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.6 })
  const paper = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
  const geo = new RoundedBoxGeometry(2.3, 3.1, 0.08, 2, 0.04)
  // box faces: +x, −x, +y, −y, +z (front: paper), −z
  const mesh = new THREE.Mesh(geo, [board, board, board, board, paper, board])
  mesh.name = 'obs-chart'
  mesh.castShadow = true
  return {
    object: mesh,
    dispose() {
      geo.dispose()
      tex.dispose()
      board.dispose()
      paper.dispose()
    },
  }
}
