import * as THREE from 'three'
import type { LegSide, LegsVisual } from '../engine/types'
import type { Anatomy } from './anatomy'
import type { HumanModel } from './human'
import type { LiveBulge, Patch, Segment, Vein } from './signs'

/**
 * The legs of a vascular patient on the 3D body: ulcers at their classic
 * sites, dry gangrene of the toes, the skin changes of chronic venous
 * insufficiency, oedema, scars from bypass or vein surgery and the courses of
 * the great and small saphenous veins. Everything is placed from the
 * patient's own skeleton (hip, knee, ankle, ball of the foot).
 */

export interface LegLook {
  hair: number
  shiny: number
}

export interface LegSigns {
  patches: Patch[]
  segments: Segment[]
  veins: Vein[]
  bulges: LiveBulge[]
  look: { right: LegLook; left: LegLook }
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Deterministic pseudo-random numbers, so a patient's veins are the same every time. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function legSigns(legs: LegsVisual, A: Anatomy, h: HumanModel): LegSigns {
  const out: LegSigns = { patches: [], segments: [], veins: [], bulges: [], look: { right: { hair: 1, shiny: 0 }, left: { hair: 1, shiny: 0 } } }
  for (const side of ['right', 'left'] as const) {
    const leg = legs[side]
    const s = side === 'left' ? 1 : -1
    const sfx = side === 'left' ? 'l' : 'r'
    const hip = h.rest[`thigh_${sfx}`].head
    const knee = h.rest[`calf_${sfx}`].head
    const ankle = h.rest[`foot_${sfx}`].head
    const ball = h.rest[`ball_${sfx}`].head
    const toe = h.rest[`ball_${sfx}`].tail
    const medial = v3(-s, 0, 0)
    const lateral = v3(s, 0, 0)
    const fwd = v3(0, 0, 1)
    const back = v3(0, 0, -1)
    const skin = (p: THREE.Vector3) => A.onSkin(p)
    const at = (base: THREE.Vector3, ...offsets: [THREE.Vector3, number][]) => {
      const p = base.clone()
      for (const [d, k] of offsets) p.addScaledVector(d, k)
      return skin(p)
    }
    out.look[side] = { hair: leg.hairLoss ? 0 : 1, shiny: leg.shiny ? 1 : 0 }

    // ulcers and gangrene
    if (leg.ulcer) {
      const site = {
        'lateral-malleolus': () => at(ankle, [lateral, 0.55], [v3(0, -1, 0), 0.05]),
        'medial-malleolus': () => at(ankle, [medial, 0.55]),
        heel: () => at(ankle, [v3(0, -1, 0), 0.6], [back, 0.55]),
        hallux: () => at(toe, [medial, 0.3], [v3(0, 1, 0), 0.15], [fwd, 0.1]),
        'toe-tips': () => at(toe, [v3(0, 1, 0), 0.15], [fwd, 0.25]),
        dorsum: () => at(ankle.clone().lerp(ball, 0.55), [v3(0, 1, 0), 0.7], [fwd, 0.1]),
        gaiter: () => at(ankle.clone().lerp(knee, 0.2), [medial, 0.7], [fwd, 0.25]),
      }[leg.ulcer.site]()
      // venous ulcers are shallow and irregular; arterial ulcers small, punched out and deep
      out.patches.push({ at: site, r: leg.ulcer.sizeCm * (leg.ulcer.kind === 'venous' ? 0.075 : 0.065), kind: 'ulcer' })
    }
    for (const n of leg.gangrene ?? []) {
      const p = at(toe, [lateral, (n - 1) * 0.17], [back, (n - 1) * 0.07], [v3(0, 1, 0), 0.12], [fwd, 0.18])
      out.patches.push({ at: p, r: n === 1 ? 0.16 : 0.12, kind: 'gangrene' })
    }

    // chronic venous insufficiency around the gaiter area
    const gaiter = at(ankle.clone().lerp(knee, 0.25), [medial, 0.7], [fwd, 0.2])
    if (leg.haemosiderin) out.patches.push({ at: gaiter, r: 0.95, kind: 'pigment', color: '#9b6a4a', strength: 0.85 })
    if (leg.lipodermatosclerosis) {
      out.patches.push({ at: at(ankle.clone().lerp(knee, 0.18), [lateral, 0.6], [fwd, 0.2]), r: 0.75, kind: 'pigment', color: '#7f5238', strength: 0.8 })
      // the "inverted champagne bottle": the lower leg narrowed by fibrosis above the ankle
      out.bulges.push({ id: `lds-${side}`, at: gaiter, r: 0.7, h: -0.05, sx: 1.2 })
    }
    if (leg.eczema) out.patches.push({ at: gaiter.clone().add(v3(0, 0.35, 0)), r: 0.8, kind: 'eczema', strength: 0.8 })
    if (leg.atrophieBlanche)
      for (const [dy, dz] of [
        [0.1, 0.05],
        [0.3, -0.1],
        [-0.05, -0.15],
      ])
        out.patches.push({ at: gaiter.clone().add(v3(0, dy, dz)), r: 0.08, kind: 'tint', color: '#ffffff', strength: 0.9 })
    if (leg.oedema) {
      const k = leg.oedema * 0.07
      out.bulges.push({ id: `oed-m-${side}`, at: at(ankle, [medial, 0.5], [v3(0, 1, 0), 0.3]), r: 0.55, h: k })
      out.bulges.push({ id: `oed-l-${side}`, at: at(ankle, [lateral, 0.5], [v3(0, 1, 0), 0.3]), r: 0.55, h: k })
      out.bulges.push({ id: `oed-d-${side}`, at: at(ankle.clone().lerp(ball, 0.4), [v3(0, 1, 0), 0.6]), r: 0.5, h: k * 0.8 })
    }
    if (leg.wasting) out.bulges.push({ id: `wast-${side}`, at: at(knee.clone().lerp(ankle, 0.35), [back, 0.9]), r: 0.8, h: -0.09, sy: 1.6 })

    // the great saphenous vein: SFJ, anteromedial thigh, behind the medial condyle, medial leg, in front of the medial malleolus
    const tub = side === 'left' ? A.pubicTubercleL : A.pubicTubercleR
    const sfj = skin(tub.clone().addScaledVector(lateral, 0.3).add(v3(0, -0.35, 0.3)))
    const am = medial.clone().multiplyScalar(0.8).addScaledVector(fwd, 0.6).normalize()
    const gsv: THREE.Vector3[] = [sfj]
    for (const t of [0.25, 0.5, 0.75]) gsv.push(at(hip.clone().lerp(knee, t), [am, 1.3]))
    gsv.push(at(knee, [medial.clone().addScaledVector(back, 0.3).normalize(), 1.2]))
    for (const t of [0.3, 0.6, 0.85]) gsv.push(at(knee.clone().lerp(ankle, t), [medial.clone().addScaledVector(fwd, 0.35).normalize(), 1.1]))
    gsv.push(at(ankle, [medial, 0.35], [fwd, 0.4]))
    // the small saphenous vein: behind the lateral malleolus, up the back of the calf to the popliteal fossa
    const ssv: THREE.Vector3[] = [at(ankle, [lateral, 0.35], [back, 0.4])]
    for (const t of [0.8, 0.55, 0.3]) ssv.push(at(knee.clone().lerp(ankle, t), [back, 1.2]))
    ssv.push(at(knee, [back, 1.0]))
    // the surface normal along a course: away from the nearest bone axis
    const normalAt = (p: THREE.Vector3) => {
      const axis = p.y > knee.y ? closest(hip, knee, p) : closest(knee, ankle, p)
      return p.clone().sub(axis).normalize()
    }
    const rand = rng(side === 'left' ? 7 : 3)
    const course = (pts: THREE.Vector3[], width: number, wiggle: number) => {
      for (let i = 0; i < pts.length - 1; i++)
        out.veins.push({ a: pts[i], b: pts[i + 1], width, normal: normalAt(pts[i].clone().lerp(pts[i + 1], 0.5)), wiggle, phase: rand() * 6.28 })
    }
    const vv = leg.varicose
    if (vv) {
      const width = [0, 0.028, 0.036, 0.046][vv.severity]
      const wiggle = [0, 0.03, 0.05, 0.075][vv.severity]
      if (vv.system !== 'ssv') {
        // mild disease is mostly below the knee; worse disease runs the whole length
        course(vv.severity === 1 ? gsv.slice(4) : gsv, width, wiggle)
        // tributaries fanning across the calf
        for (let b = 0; b < vv.severity - 1; b++) {
          const from = gsv[5 + b]
          const to = at(knee.clone().lerp(ankle, 0.45 + b * 0.2), [fwd, 1.0], [lateral, 0.35])
          const mid = skin(from.clone().lerp(to, 0.5).add(v3(0, -0.2, 0)))
          course([from, mid, to], width * 0.8, wiggle * 1.2)
        }
      }
      if (vv.system !== 'gsv') course(ssv, width, wiggle)
      if (leg.saphenaVarix) out.bulges.push({ id: `varix-${side}`, at: sfj, r: 0.3, h: 0.1 })
    }

    // scars
    const line = (pts: THREE.Vector3[], width = 0.02) => {
      for (let i = 0; i < pts.length - 1; i++) out.segments.push({ a: pts[i], b: pts[i + 1], width })
    }
    if (leg.scar === 'bypass') {
      const groin = side === 'left' ? A.midInguinalL : A.midInguinalR
      line([skin(groin.clone().add(v3(0, -0.2, 0.2))), ...[0.3, 0.55, 0.8].map((t) => at(hip.clone().lerp(knee, t), [am, 1.3])), at(knee, [medial, 1.2])])
    } else if (leg.scar === 'vein-harvest') line(gsv, 0.018)
    else if (leg.scar === 'stripping') {
      line([skin(sfj.clone().addScaledVector(medial, 0.12).add(v3(0, 0.08, 0))), skin(sfj.clone().addScaledVector(lateral, 0.14).add(v3(0, -0.05, 0)))])
      line([gsv[4], skin(gsv[4].clone().add(v3(0, -0.12, 0)))], 0.015)
    }
  }
  return out
}

function closest(a: THREE.Vector3, b: THREE.Vector3, p: THREE.Vector3) {
  const ab = b.clone().sub(a)
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1)
  return a.clone().addScaledVector(ab, t)
}

/**
 * Colour of a leg at rest and in Buerger's test, as a skin multiplier: pale and
 * waxy (less red, lighter) on elevation, dusky red-purple when dependent.
 */
export function legColour(leg: LegSide, buerger?: { pallor: number; rubor: number }): { tint: [number, number, number]; amount: number } {
  const pallor = Math.max(leg.pallor ?? 0, buerger?.pallor ?? 0)
  const rubor = Math.max(leg.rubor ?? 0, buerger?.rubor ?? 0)
  if (rubor > pallor) return { tint: [1.0, 0.6, 0.7], amount: rubor * 0.85 }
  return { tint: [1.08, 1.28, 1.42], amount: pallor * 0.8 }
}
