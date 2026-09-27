import * as THREE from 'three'
import type { BreastVisual, LumpVisual, NeckVisual } from '../engine/types'
import type { Anatomy } from './anatomy'
import type { HumanModel } from './human'
import { scarPaths, type LiveBulge, type Patch, type Segment } from './signs'

/**
 * Signs for the non-abdominal stations on the 3D body: a goitre that rises
 * when the patient swallows, a thyroglossal cyst that moves up when they put
 * their tongue out, a breast lump at its clock position with tethering and
 * nipple changes, and lumps at their body sites. Positions come from the
 * patient's own landmarks and skeleton (rest pose, decimetres).
 */

export interface StationSigns {
  patches: Patch[]
  segments: Segment[]
  bulges: LiveBulge[]
}

/** Live values from the scene that some signs follow. */
export interface SignDrivers {
  swallow(): number
  tongue(): number
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/* ----------------------------------------------------------------- neck */

export function neckSigns(n: NeckVisual, A: Anatomy, h: HumanModel, drive: SignDrivers): StationSigns {
  const out: StationSigns = { patches: [], segments: [], bulges: [] }
  const tc = A.thyroidCartilage
  const sn = A.sternalNotch
  // the isthmus lies over the 2nd–4th tracheal rings, the lobes either side reaching up beside the thyroid cartilage
  const isthY = tc.y - (tc.y - sn.y) * 0.42
  const rises = (base: THREE.Vector3, up: number) => (b: LiveBulge) => {
    b.at.copy(base).add(v3(0, up * drive.swallow(), 0.02 * drive.swallow()))
  }
  const g = n.goitre
  if (g) {
    const r = [0, 0.3, 0.4, 0.52][g.size]
    const ht = [0, 0.07, 0.13, 0.21][g.size]
    const up = 0.3
    const lobe = (s: 1 | -1, k: number, id: string) => {
      const base = A.onFront(0.3 * s, isthY + 0.12)
      out.bulges.push({ id, at: base.clone(), r: r * k, h: ht * k, sx: 0.85, sy: 1.35, drive: rises(base, up) })
    }
    if (g.kind === 'nodule') {
      const s = g.side === 'left' ? 1 : -1
      const base = A.onFront(0.28 * s, isthY + 0.05)
      out.bulges.push({ id: 'thy-nodule', at: base.clone(), r: r * 0.75, h: ht * 0.9, drive: rises(base, up) })
    } else {
      lobe(1, g.kind === 'multinodular' ? 1.1 : 1, 'thy-lobe-l')
      lobe(-1, g.kind === 'multinodular' ? 0.85 : 1, 'thy-lobe-r')
      const isth = A.onFront(0, isthY)
      out.bulges.push({ id: 'thy-isthmus', at: isth.clone(), r: r * 0.75, h: ht * 0.7, sx: 1.4, drive: rises(isth, up) })
      if (g.kind === 'multinodular')
        for (const [x, y, k, id] of [
          [0.42, 0.05, 0.45, 'thy-nod-1'],
          [-0.18, -0.12, 0.35, 'thy-nod-2'],
          [0.2, 0.28, 0.3, 'thy-nod-3'],
        ] as const) {
          const base = A.onFront(x, isthY + y)
          out.bulges.push({ id, at: base.clone(), r: r * k, h: ht * k * 1.1, drive: rises(base, up) })
        }
    }
  }
  if (n.thyroglossal) {
    // midline, just below the hyoid: moves up when the tongue is protruded (and on swallowing)
    const base = A.onFront(0, tc.y + 0.3)
    const s = n.thyroglossal.sizeCm
    out.bulges.push({
      id: 'thyroglossal',
      at: base.clone(),
      r: s * 0.075,
      h: s * 0.055,
      drive: (b) => b.at.copy(base).add(v3(0, 0.22 * drive.tongue() + 0.18 * drive.swallow(), 0.02 * drive.tongue())),
    })
  }
  if (n.nodes)
    for (const side of n.nodes === 'both' ? ['left', 'right'] : [n.nodes]) {
      const s = side === 'left' ? 1 : -1
      out.bulges.push({ id: `neck-node-${side}`, at: A.onSkin(tc.clone().add(v3(0.8 * s, -0.25, -0.2))), r: 0.18, h: 0.06 })
    }
  if (n.scar) for (const path of scarPaths('thyroid-collar', A)) for (let i = 0; i < path.length - 1; i++) out.segments.push({ a: A.onFront(path[i].x, path[i].y), b: A.onFront(path[i + 1].x, path[i + 1].y), width: 0.02 })
  if (n.pretibialMyxoedema)
    for (const sfx of ['l', 'r'] as const) {
      const knee = h.rest[`calf_${sfx}`].head
      const ankle = h.rest[`foot_${sfx}`].head
      out.patches.push({ at: A.onSkin(knee.clone().lerp(ankle, 0.6).add(v3(0, 0, 1.2))), r: 0.55, kind: 'peau', strength: 0.7 })
    }
  return out
}

/* --------------------------------------------------------------- breast */

/** Where a breast lump is: clock position as seen facing the patient (3 o'clock towards the patient's left), cm from the nipple. */
export function breastLumpAt(b: NonNullable<BreastVisual['lump']>, A: Anatomy) {
  const nip = b.side === 'left' ? A.nippleL : A.nippleR
  const th = (b.clock / 12) * Math.PI * 2
  return A.onFront(nip.x + Math.sin(th) * b.distCm * 0.1, nip.y + Math.cos(th) * b.distCm * 0.1)
}

export function breastSigns(b: BreastVisual, A: Anatomy, h: HumanModel): StationSigns {
  const out: StationSigns = { patches: [], segments: [], bulges: [] }
  if (b.lump) {
    const at = breastLumpAt(b.lump, A)
    out.bulges.push({ id: 'breast-lump', at, r: b.lump.sizeCm * 0.06, h: b.lump.visible ? b.lump.sizeCm * 0.04 : 0.012 })
    if (b.lump.tethered) {
      // dimpling over the lump, deepened when the pectorals contract or the arms go up
      const nip = b.lump.side === 'left' ? A.nippleL : A.nippleR
      const dimple = A.onFront(at.x + (nip.x - at.x) * 0.25, at.y + (nip.y - at.y) * 0.25)
      out.bulges.push({ id: 'breast-tether', at: dimple, r: 0.15, h: -0.045 })
    }
    if (b.skin === 'peau') out.patches.push({ at: A.onFront(at.x, at.y - 0.2), r: 0.65, kind: 'peau', strength: 0.85 })
    if (b.skin === 'erythema') out.patches.push({ at, r: 0.8, kind: 'tint', color: '#ffb3a8', strength: 0.7 })
    if (b.skin === 'ulcer') out.patches.push({ at, r: 0.16, kind: 'ulcer' })
  }
  if (b.nipple) {
    const nip = b.nipple.side === 'left' ? A.nippleL : A.nippleR
    const c = b.nipple.change
    if (c === 'inverted' || c === 'retracted') out.bulges.push({ id: 'nipple-in', at: nip.clone(), r: 0.13, h: c === 'inverted' ? -0.07 : -0.045 })
    if (c === 'paget') out.patches.push({ at: nip.clone(), r: 0.16, kind: 'eczema', strength: 0.9 })
    if (c === 'discharge') out.patches.push({ at: A.onFront(nip.x, nip.y - 0.06), r: 0.05, kind: 'tint', color: '#d9a07a', strength: 0.8 })
  }
  if (b.nodes) {
    const sfx = b.nodes === 'left' ? 'l' : 'r'
    const s = b.nodes === 'left' ? 1 : -1
    out.bulges.push({ id: 'axilla-node', at: A.onSkin(h.rest[`upperarm_${sfx}`].head.clone().add(v3(-0.25 * s, -0.75, 0.05))), r: 0.16, h: 0.06 })
  }
  return out
}

/* ----------------------------------------------------------------- lump */

export interface LumpPlace {
  at: THREE.Vector3
  radius: number
}

/**
 * Where a lump sits on this patient. For the forearm it's the mid-forearm skin
 * facing up in the current pose (the extensor surface of a pronated forearm
 * resting in front of the patient), found with `upNow`: a rest-pose point's
 * world-space normal · up.
 */
export function lumpPlace(l: LumpVisual, A: Anatomy, h: HumanModel, upNow?: (rest: THREE.Vector3) => number): LumpPlace {
  const s = l.side === 'left' ? 1 : -1
  const sfx = l.side === 'left' ? 'l' : 'r'
  const r = h.rest
  let at: THREE.Vector3
  switch (l.site) {
    case 'forearm': {
      const mid = r[`lowerarm_${sfx}`].head.clone().lerp(r[`lowerarm_${sfx}`].tail, 0.45)
      const axis = r[`lowerarm_${sfx}`].tail.clone().sub(r[`lowerarm_${sfx}`].head).normalize()
      // candidates all the way round the forearm at mid-shaft
      const side = new THREE.Vector3().crossVectors(axis, v3(0, 0, 1)).normalize()
      const other = new THREE.Vector3().crossVectors(axis, side).normalize()
      let best = A.onSkin(mid.clone().add(v3(0.8 * s, 0.1, -0.2)))
      let bestUp = -Infinity
      if (upNow)
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2
          const p = A.onSkin(mid.clone().addScaledVector(side, Math.cos(a) * 1.2).addScaledVector(other, Math.sin(a) * 1.2))
          const up = upNow(p)
          if (up > bestUp) {
            bestUp = up
            best = p
          }
        }
      at = best
      break
    }
    case 'upper-back':
      // over the scapula, a hand's breadth from the spine
      at = A.onBack(0.8 * s, r.spine_03.head.y + 0.3)
      break
    case 'shoulder':
      at = A.onSkin(r[`upperarm_${sfx}`].head.clone().add(v3(0.25 * s, 0.6, 0.1)))
      break
    case 'chest-wall': {
      const nip = s === 1 ? A.nippleL : A.nippleR
      at = A.onFront(nip.x + 0.4 * s, nip.y + 0.7)
      break
    }
    case 'thigh':
    default:
      at = A.onSkin(r[`thigh_${sfx}`].head.clone().lerp(r[`calf_${sfx}`].head, 0.45).add(v3(0, 0, 1.3)))
  }
  return { at, radius: Math.max(l.w, l.h) * 0.05 }
}

export function lumpSigns(l: LumpVisual, place: LumpPlace, torch: boolean): StationSigns {
  const out: StationSigns = { patches: [], segments: [], bulges: [] }
  const { at, radius } = place
  const m = Math.max(l.w, l.h)
  // dome height: a flat soft lipoma a centimetre or so, a tense cyst standing well proud
  const h = (0.25 + (l.domed ?? 0.5)) * m * 0.05
  out.bulges.push({ id: 'lump', at, r: radius, h, sx: l.w / m, sy: l.h / m })
  if (l.lobulated)
    for (const [dx, dy] of [
      [0.45, 0.2],
      [-0.4, -0.25],
    ])
      out.bulges.push({ id: `lump-lobe-${dx}`, at: at.clone().add(v3(dx * radius, dy * radius, 0)), r: radius * 0.55, h: h * 0.55 })
  if (l.punctum) out.patches.push({ at, r: 0.065, kind: 'punctum' })
  if (l.erythema) out.patches.push({ at, r: radius * 1.4, kind: 'tint', color: '#ff9c8a', strength: l.erythema })
  // a pen torch against the side of the lump: a fluid-filled lump glows red, a solid one only shows the torch spot
  if (torch) out.patches.push(l.transilluminates ? { at, r: radius * 1.1, kind: 'glow', color: '#ff6a3a', strength: 0.9 } : { at: at.clone().add(v3(radius * 0.9, 0, 0)), r: 0.07, kind: 'glow', color: '#fff2d8', strength: 0.9 })
  return out
}
