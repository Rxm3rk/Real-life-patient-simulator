import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { BedsideItems } from '../anatomy/Scene'
import type { Lines, Stoma } from '../anatomy/types'
import type { Anatomy } from './anatomy'
import type { HumanModel } from './human'

/**
 * What else is at the bedside: a stoma on the abdominal wall, a cannula in a
 * hand or forearm (with the drip line running up to the bag), oxygen by mask
 * or nasal cannulae, a catheter bag hanging off the bed frame, a vomit bowl on
 * the table, a walking frame. Patient-attached items are built in rest-pose
 * body space and skinned to the nearest bone, so they move with the patient.
 */

export const URINE: Record<NonNullable<BedsideItems['catheterUrine']>, string> = {
  normal: '#e9cf52',
  concentrated: '#d69a1f',
  tea: '#7a4a1c',
  haematuria: '#b3312b',
}

export const VOMIT: Record<NonNullable<BedsideItems['vomitBowl']>, string> = {
  bilious: '#6f8a2a',
  feculent: '#6b4b22',
  'coffee-ground': '#3b2618',
  clear: '#d8d4c2',
  empty: 'transparent',
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const mat = (color: THREE.ColorRepresentation, roughness = 0.5, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, ...extra })

/** Orient a group so +y is `normal` and it sits at `at` (rest space). */
function placeOn(o: THREE.Object3D, at: THREE.Vector3, normal: THREE.Vector3, spin = 0) {
  o.position.copy(at)
  o.quaternion.setFromUnitVectors(v3(0, 1, 0), normal.clone().normalize())
  if (spin) o.rotateY(spin)
}

export interface Attached {
  /** Objects to parent to a bone: [bone name, object in rest-pose space] */
  onBones: [string, THREE.Object3D][]
  dispose(): void
}

/* ----------------------------------------------------------------- stoma */

/**
 * A stoma: a spouted ileostomy (or urostomy) or a flush colostomy, moist and
 * red; with a bag, a clear-backed appliance on a skin-coloured flange.
 */
function stomaObject(s: Stoma, at: THREE.Vector3, normal: THREE.Vector3): THREE.Object3D {
  const g = new THREE.Group()
  const spout = s.type === 'ileostomy' || s.type === 'urostomy' || s.type === 'loop-ileostomy'
  const r = s.type === 'colostomy' ? 0.17 : 0.14
  const mucosa = mat('#b8323a', 0.28, { clearcoat: 0.8, clearcoatRoughness: 0.18, sheen: 0.4, sheenColor: new THREE.Color('#ff8a8a') })
  // the spout: a short everted tube of bowel with a rolled rim and a central lumen
  const h = spout ? 0.18 : 0.05
  const v2 = (x: number, y: number) => new THREE.Vector2(x, y)
  const pts = [v2(r * 0.95, -0.02), v2(r, h * 0.4), v2(r * 0.92, h * 0.9), v2(r * 0.7, h * 1.05), v2(r * 0.35, h * 0.95), v2(r * 0.2, h * 0.7)]
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mucosa)
  g.add(body)
  if (s.type === 'loop-ileostomy') {
    // a second, smaller opening beside the first
    const second = body.clone()
    second.scale.setScalar(0.7)
    second.position.set(r * 1.3, 0, 0)
    g.add(second)
  }
  if (s.bag) {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.015, 40), mat('#e8d7c4', 0.6))
    flange.position.y = 0.01
    const bag = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.05, 1.35, 4, 0.02), mat('#efe6d4', 0.35, { transparent: true, opacity: 0.82, clearcoat: 0.5 }))
    bag.position.set(0, h + 0.05, 0.45)
    g.add(flange, bag)
  }
  placeOn(g, at, normal)
  return g
}

/* --------------------------------------------------------------- cannula */

/** A peripheral cannula taped over a vein, its coloured port pointing up the arm. */
function cannulaObject(at: THREE.Vector3, normal: THREE.Vector3, along: THREE.Vector3): THREE.Object3D {
  const g = new THREE.Group()
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.22, 16), mat('#e7e9ec', 0.35, { clearcoat: 0.6 }))
  hub.rotation.x = Math.PI / 2
  hub.position.set(0, 0.05, 0)
  // green (18 G) wings and port
  const wings = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.012, 0.08, 2, 0.005), mat('#3aa655', 0.45))
  wings.position.set(0, 0.018, -0.02)
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 12), mat('#3aa655', 0.4))
  port.position.set(0, 0.11, 0.02)
  // a clear dressing over it
  const dressing = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.006, 0.5, 2, 0.003), mat('#ffffff', 0.25, { transparent: true, opacity: 0.35, clearcoat: 1 }))
  dressing.position.set(0, 0.006, 0)
  g.add(hub, wings, port, dressing)
  placeOn(g, at, normal)
  // turn so the hub points up the arm (towards the elbow)
  const n = normal.clone().normalize()
  const fwd = along.clone().addScaledVector(n, -along.dot(n)).normalize()
  const local = fwd.applyQuaternion(g.quaternion.clone().invert())
  g.rotateY(Math.atan2(local.x, local.z))
  return g
}

/* ---------------------------------------------------------------- oxygen */

function oxygenMask(A: Anatomy, h: HumanModel, nose: THREE.Vector3, chin: THREE.Vector3, surface: (rest: THREE.Vector3) => { point: THREE.Vector3; normal: THREE.Vector3 }): THREE.Object3D {
  const g = new THREE.Group()
  // a clear, green-tinged cup over nose and mouth, from the bridge of the nose to below the lower lip
  const top = nose.clone().add(v3(0, 0.32, -0.18))
  const bottom = chin.clone().add(v3(0, 0.12, -0.02))
  const centre = top.clone().lerp(bottom, 0.5)
  const height = top.distanceTo(bottom)
  const shell = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)
  // cup: 0.5 radius → about 6 cm wide, as tall as nose-to-chin, 3 cm deep
  shell.scale(0.62 / 0.5 / 2 * 1.0, height / 1.0, 0.34 / 0.5)
  const cup = new THREE.Mesh(shell, mat('#cfeadb', 0.12, { transparent: true, opacity: 0.5, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }))
  // the sphere cap opens along −y; turn it so it opens backwards onto the face
  cup.rotation.x = -Math.PI / 2
  cup.position.copy(centre).add(v3(0, 0, 0.05))
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.018, 8, 40), mat('#cfe8da', 0.3, { transparent: true, opacity: 0.7 }))
  rim.scale.set(0.62, height, 1)
  rim.position.copy(centre).add(v3(0, 0, 0.02))
  // the elastic strap: from each side of the mask back round the head just above the ears, hugging the skin
  const eyeY = h.rest.head.head.y + h.eyes.left.position.y
  const eyeZ = h.rest.head.head.z + h.eyes.left.position.z
  const hug = (x: number, y: number, z: number) => {
    const s = surface(A.onSkin(v3(x, y, z)))
    return s.point.clone().addScaledVector(s.normal, 0.035)
  }
  const side = (k: 1 | -1) => [hug(0.55 * k, eyeY - 0.35, eyeZ - 0.25), hug(0.75 * k, eyeY + 0.05, eyeZ - 0.8), hug(0.62 * k, eyeY + 0.15, eyeZ - 1.45)]
  const back = hug(0, eyeY + 0.2, eyeZ - 1.9)
  const strapPts = [centre.clone().add(v3(0.3, 0.05, 0.02)), ...side(1), back, ...side(-1).reverse(), centre.clone().add(v3(-0.3, 0.05, 0.02))]
  const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts), 80, 0.014, 6, false), mat('#2e7d4f', 0.6))
  // oxygen tubing from the bottom of the mask down onto the chest
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([centre.clone().add(v3(0, -height * 0.45, 0.2)), chin.clone().add(v3(0.05, -0.35, 0.35)), A.sternalNotch.clone().add(v3(0.2, 0, 0.45)), A.sternalNotch.clone().add(v3(0.7, -1.4, 0.45))]), 32, 0.045, 8, false),
    mat('#e8f3ec', 0.3, { transparent: true, opacity: 0.8 }),
  )
  g.add(cup, rim, strap, tube)
  return g
}

function nasalSpecs(nose: THREE.Vector3, h: HumanModel): THREE.Object3D {
  const head = h.rest.head.head
  const s = 1
  const pts = [v3(-0.9, head.y - 0.35, head.z - 0.3), v3(-0.62, nose.y - 0.08, nose.z - 0.35), v3(-0.14, nose.y - 0.14, nose.z - 0.02), v3(0.14, nose.y - 0.14, nose.z - 0.02), v3(0.62, nose.y - 0.08, nose.z - 0.35), v3(0.9 * s, head.y - 0.35, head.z - 0.3)]
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 8, false), mat('#e6f2ea', 0.3, { transparent: true, opacity: 0.85 }))
}

/* ---------------------------------------------------------------- attach */

/** Patient-attached items (stoma, cannula, oxygen), in rest-pose space with the bone each rides on. */
export function attachedItems(opts: { stoma?: Stoma; lines?: Lines; A: Anatomy; h: HumanModel; surface: (rest: THREE.Vector3) => { point: THREE.Vector3; normal: THREE.Vector3 }; noseTip: THREE.Vector3; chin: THREE.Vector3 }): Attached {
  const { A, h, surface } = opts
  const onBones: [string, THREE.Object3D][] = []
  const s = opts.stoma
  if (s) {
    // in an iliac fossa, over the rectus sheath: from the umbilicus a third of the way to the ASIS, a little low
    const asis = s.side === 'right' ? A.asisR : A.asisL
    const at0 = A.navel.clone().lerp(asis, 0.4).add(v3(0, 0.02, 0))
    const at = A.onFront(at0.x, at0.y)
    const n = surface(at).normal
    onBones.push(['pelvis', stomaObject(s, at, n)])
  }
  const l = opts.lines
  if (l?.cannula) {
    const side = l.cannula.startsWith('left') ? 'l' : 'r'
    const r = h.rest
    const inHand = l.cannula.endsWith('hand')
    // back of the hand over the dorsal venous network, or the forearm a hand's breadth above the wrist
    const base = inHand ? r[`hand_${side}`].head.clone().lerp(r[`middle_01_${side}`].head, 0.45) : r[`lowerarm_${side}`].head.clone().lerp(r[`lowerarm_${side}`].tail, 0.62)
    const out = inHand ? v3(side === 'l' ? 1 : -1, 0, -0.2).normalize() : v3(side === 'l' ? 0.3 : -0.3, 0, 1).normalize()
    const at = A.onSkin(base.clone().addScaledVector(out, 0.6))
    const sN = surface(at)
    const along = r[`lowerarm_${side}`].head.clone().sub(r[`lowerarm_${side}`].tail).normalize()
    onBones.push([inHand ? `hand_${side}` : `lowerarm_${side}`, cannulaObject(at, sN.normal, along)])
  }
  if (l?.oxygen === 'mask') onBones.push(['head', oxygenMask(A, h, opts.noseTip, opts.chin, surface)])
  if (l?.oxygen === 'nasal') onBones.push(['head', nasalSpecs(opts.noseTip, h)])
  return {
    onBones,
    dispose() {
      for (const [, o] of onBones)
        o.traverse((x) => {
          const m = x as THREE.Mesh
          m.geometry?.dispose()
          const mm = m.material as THREE.Material | THREE.Material[] | undefined
          if (Array.isArray(mm)) mm.forEach((q) => q.dispose())
          else mm?.dispose()
        })
    },
  }
}

/* ----------------------------------------------------------- the bedside */

/** Things around a hospital bed (bed coordinates: head end at −z, the examiner on the patient's right, −x). */
export interface Bedside {
  group: THREE.Group
  /** Run the giving set from the drip to a cannula (world point), or back to the bed */
  lineTo(p: THREE.Vector3 | null): void
  dispose(): void
}

export function bedsideProps(items: BedsideItems & { drip?: boolean }, bed: { surfaceY: number; headZ: number }): Bedside {
  const group = new THREE.Group()
  group.name = 'bedside'
  const metal = mat('#c7ced6', 0.3, { metalness: 0.7 })
  let line: THREE.Mesh | null = null
  const lineMat = mat('#f2f6f8', 0.3, { transparent: true, opacity: 0.8 })
  const dripTop = v3(5.6, 14.5, bed.headZ + 3)
  if (items.drip) {
    // a drip stand at the head of the bed on the patient's left, bag of fluid and a giving set
    const stand = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 17, 12), metal)
    pole.position.y = 8.5
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 5), metal)
    foot.position.y = 0.4
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 20, Math.PI), metal)
    hook.position.y = 17
    const bag = new THREE.Mesh(new RoundedBoxGeometry(0.95, 1.6, 0.35, 4, 0.14), mat('#eaf4fb', 0.12, { transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }))
    bag.position.set(0, 15.9, 0)
    const fluid = new THREE.Mesh(new RoundedBoxGeometry(0.85, 1.1, 0.28, 4, 0.12), mat('#f4fbff', 0.1, { transparent: true, opacity: 0.5 }))
    fluid.position.set(0, 15.6, 0)
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 12), mat('#ffffff', 0.2, { transparent: true, opacity: 0.6 }))
    chamber.position.set(0, 14.8, 0)
    stand.add(pole, foot, hook, bag, fluid, chamber)
    stand.position.set(5.6, 0, bed.headZ + 3)
    group.add(stand)
  }
  if (items.catheterUrine) {
    // a urine bag hanging from the bed frame on the patient's right, below the mattress
    const bag = new THREE.Mesh(new RoundedBoxGeometry(1.35, 1.9, 0.3, 4, 0.15), mat('#f3f5f7', 0.2, { transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }))
    bag.position.set(-4.95, bed.surfaceY - 3.2, bed.headZ + 11)
    const urine = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.0, 0.24, 4, 0.1), mat(URINE[items.catheterUrine], 0.15, { transparent: true, opacity: 0.85, clearcoat: 0.8 }))
    urine.position.set(-4.95, bed.surfaceY - 3.6, bed.headZ + 11)
    const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 16, Math.PI), metal)
    hanger.position.set(-4.95, bed.surfaceY - 2.2, bed.headZ + 11)
    group.add(bag, urine, hanger)
  }
  if (items.vomitBowl) {
    // a cardboard vomit bowl on the over-bed table at the foot
    const table = new THREE.Group()
    const top = new THREE.Mesh(new RoundedBoxGeometry(4, 0.2, 2.2, 3, 0.08), mat('#d6dbe0', 0.5))
    top.position.set(0, bed.surfaceY + 2.4, 0)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, bed.surfaceY + 2.4, 10), metal)
    leg.position.set(1.7, (bed.surfaceY + 2.4) / 2, 0)
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.1, 2.6, 2, 0.04), metal)
    base.position.set(1.7, 0.4, 0)
    const bowlGeo = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.55, 0.02), new THREE.Vector2(0.8, 0.18), new THREE.Vector2(0.95, 0.42), new THREE.Vector2(1, 0.45)], 28)
    bowlGeo.scale(1, 1, 0.55)
    const bowl = new THREE.Mesh(bowlGeo, mat('#b9a98f', 0.9, { side: THREE.DoubleSide }))
    bowl.position.set(-0.6, bed.surfaceY + 2.51, 0)
    table.add(top, leg, base, bowl)
    if (items.vomitBowl !== 'empty') {
      const content = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), mat(VOMIT[items.vomitBowl], 0.2, { clearcoat: 0.8 }))
      content.scale.set(1, 0.55, 1)
      content.rotation.x = -Math.PI / 2
      content.position.set(-0.6, bed.surfaceY + 2.72, 0)
      table.add(content)
    }
    table.position.set(-5.8, 0, bed.headZ + 7)
    table.rotation.y = 0.08
    group.add(table)
  }
  if (items.walkingFrame) {
    // a walking frame parked at the foot of the bed
    const frame = new THREE.Group()
    const tube = (a: THREE.Vector3, b: THREE.Vector3) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, a.distanceTo(b), 10), metal)
      m.position.copy(a).lerp(b, 0.5)
      m.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize())
      return m
    }
    const H = 8.2
    const corners = [v3(-2.6, 0, -1.6), v3(2.6, 0, -1.6), v3(-2.8, 0, 1.8), v3(2.8, 0, 1.8)]
    for (const c of corners) frame.add(tube(c, c.clone().setY(H).multiply(v3(0.92, 1, 0.92))))
    frame.add(tube(v3(-2.4, H, -1.47), v3(-2.58, H, 1.66)), tube(v3(2.4, H, -1.47), v3(2.58, H, 1.66)), tube(v3(-2.4, H * 0.93, -1.5), v3(2.4, H * 0.93, -1.5)), tube(v3(-2.45, 3.4, -1.55), v3(2.45, 3.4, -1.55)))
    for (const c of corners.slice(0, 2)) {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.35, 12), mat('#2c3036', 0.8))
      tip.position.copy(c).setY(0.17)
      frame.add(tip)
    }
    frame.position.set(-3, 0, bed.headZ + 24.5)
    frame.rotation.y = 0.3
    group.add(frame)
  }
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true
  })
  const lineTo = (p: THREE.Vector3 | null) => {
    if (!items.drip) return
    if (line) {
      line.removeFromParent()
      line.geometry.dispose()
    }
    const end = p ?? v3(3.4, bed.surfaceY + 1.2, bed.headZ + 9.6)
    // droops from the chamber, loops over the mattress edge, runs to the cannula
    const mid = dripTop.clone().lerp(end, 0.55).setY(Math.max(end.y + 1.6, bed.surfaceY + 2.2))
    line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([dripTop, dripTop.clone().add(v3(-0.3, -2.4, 1.4)), mid, end.clone().add(v3(0, 0.25, 0)), end]), 48, 0.035, 8, false), lineMat)
    line.castShadow = true
    group.add(line)
  }
  lineTo(null)
  return {
    group,
    lineTo,
    dispose() {
      lineMat.dispose()
      group.traverse((x) => {
        const m = x as THREE.Mesh
        m.geometry?.dispose()
        ;(m.material as THREE.Material | undefined)?.dispose?.()
      })
    },
  }
}
