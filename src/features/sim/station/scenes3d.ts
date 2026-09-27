import * as THREE from 'three'
import type { PatientScene, Shot } from '../../../anatomy3d/patientScene'
import { legColour, legSigns } from '../../../anatomy3d/legs'
import type { PoseSpec } from '../../../anatomy3d/poses'
import type { SetKind } from '../../../anatomy3d/sets'
import { lumpShot, shotFor } from '../../../anatomy3d/shots'
import { breastLumpAt, breastSigns, lumpPlace, lumpSigns, neckSigns, type LumpPlace } from '../../../anatomy3d/stationSigns'
import { isClinic } from '../../../engine/setting'
import type { CaseDef, LegsVisual, LumpVisual } from '../../../engine/types'
import { clothingFor, type Staging, type Zone3D } from '../exam/PatientStage3D'
import { breastArmPose } from './scenes/breast'
import { groinPhase } from './scenes/groin'
import { venousFromBehind } from './scenes/vascular'
import type { SceneCtx, SceneSpec } from './types'

/**
 * How each station looks with the 3D patient: where they are (couch, clinic
 * floor, chair), how they're posed and dressed, where the camera looks, where
 * each examination zone is on their body, and the station's own signs. The
 * zones, actions and findings are the station's own (shared with the 2D stage).
 */

export interface Station3D {
  staging: Staging
  zones: Zone3D[]
  faceInset: boolean
  onReadyScene?: (scene: PatientScene) => void
  live?: (scene: PatientScene) => void
  cues?: { cough?: number; swallow?: number }
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const NORMAL_LEGS: LegsVisual = { right: {}, left: {} }
const lyingSet = (c: CaseDef): SetKind => (isClinic(c.setting) ? 'couch' : 'bed')

export function station3dFor(x: SceneCtx, spec: SceneSpec): Station3D {
  switch (x.c.exam) {
    case 'groin':
      return groin3d(x, spec)
    case 'arterial':
      return arterial3d(x, spec)
    case 'venous':
      return venous3d(x, spec)
    case 'thyroid':
      return thyroid3d(x, spec)
    case 'breast':
      return breast3d(x, spec)
    default:
      return lump3d(x, spec)
  }
}

/* ---------------------------------------------------------------- groin */

function groin3d(x: SceneCtx, spec: SceneSpec): Station3D {
  const standing = x.view === 'standing'
  const female = x.c.patient.sex === 'female'
  return {
    staging: {
      set: standing ? 'standing' : lyingSet(x.c),
      pose: standing ? { posture: 'stand', arms: 'sides' } : { posture: 'supine' },
      // examined with the gown lifted above the umbilicus, a towel over the genitals
      clothing: x.exposed ? { ...clothingFor('standing-groin', female), blanketFrom: standing ? null : 'midThigh' } : { ...clothingFor('gowned', female), blanketFrom: standing ? null : 'waist' },
      shot: 'groin',
      herniaPhase: groinPhase(x),
      expression: { lookAt: 'camera' },
    },
    zones: spec.zones.map((zone) => ({ zone })),
    faceInset: true,
  }
}

/* ------------------------------------------------------------- vascular */

/** Pulses and the hands, placed from the skeleton (the body-model's arms and feet don't map onto the 3D pose). */
function limbPoint(scene: PatientScene, id: string): THREE.Vector3 | undefined {
  const h = scene.human!
  const A = scene.anatomy!
  const side = id.endsWith('L') ? 'l' : 'r'
  const s = side === 'l' ? 1 : -1
  const r = h.rest
  const ankle = r[`foot_${side}`].head
  const toe = r[`ball_${side}`].tail
  const ball = r[`ball_${side}`].head
  switch (id.slice(0, -1)) {
    case 'rad': // radial pulse: thumb side of the wrist, palmar surface
      return A.onSkin(r[`hand_${side}`].head.clone().lerp(r[`lowerarm_${side}`].head, 0.08).add(v3(0, 0, 0.5)))
    case 'pt': // posterior tibial: behind the medial malleolus
      return A.onSkin(ankle.clone().add(v3(-0.55 * s, 0, -0.35)))
    case 'dp': // dorsalis pedis: dorsum of the foot, lateral to extensor hallucis longus
      return A.onSkin(ankle.clone().lerp(ball, 0.45).add(v3(-0.1 * s, 0.7, 0)))
    case 'toe':
      return A.onSkin(toe.clone().add(v3(-0.15 * s, 0.15, 0.3)))
    case 'hand':
      return A.onSkin(r[`middle_01_${side}`].head.clone().add(v3(0, 0, 0.2)))
    case 'wrist':
      return A.onSkin(r[`hand_${side}`].head.clone().add(v3(0, 0, 0.5)))
    default:
      return undefined
  }
}

const limbZones = (spec: SceneSpec): Zone3D[] =>
  spec.zones.map((zone) => ({
    zone,
    rest: /^(rad|pt|dp|toe)[RL]$/.test(zone.id) ? (scene: PatientScene) => limbPoint(scene, zone.id)! : undefined,
    r: /^(pt|dp)[RL]$/.test(zone.id) ? 0.3 : /^toe[RL]$/.test(zone.id) ? 0.4 : /^rad[RL]$/.test(zone.id) ? 0.35 : undefined,
  }))

function legsReady(legs: LegsVisual) {
  return (scene: PatientScene) => {
    const ls = legSigns(legs, scene.anatomy!, scene.human!)
    scene.setExtraSigns(ls)
    for (const side of ['right', 'left'] as const) scene.setLeg(side, ls.look[side])
  }
}

/** The legs from the patient's right side at the height of the couch (Buerger's test). */
const buergerShot = (scene: PatientScene): Shot => {
  const knee = scene.landmark('kneeL')
  const ankle = scene.landmark('medialMalleolusL')
  return { target: knee.clone().lerp(ankle, 0.4).setX(0), dir: v3(-1, 0.32, 0.15), dist: 21, fov: 32 }
}

function arterial3d(x: SceneCtx, spec: SceneSpec): Station3D {
  const legs = x.c.visual?.legs ?? NORMAL_LEGS
  const female = x.c.patient.sex === 'female'
  const b = x.extra.buerger
  let pose: PoseSpec = { posture: 'supine' }
  if (x.view === 'buerger') pose = b?.dependent ? { posture: 'sitEdge' } : { posture: 'supine', legRaise: { left: b?.angle ?? 0, right: b?.angle ?? 0 } }
  return {
    staging: {
      set: lyingSet(x.c),
      pose,
      clothing: x.exposed ? clothingFor('legs', female) : clothingFor('gowned', female),
      shot: x.view === 'buerger' ? buergerShot : x.view === 'feet' ? 'feet' : x.view === 'legs' ? 'legs' : 'overview',
      expression: { lookAt: 'up' },
    },
    zones: limbZones(spec),
    faceInset: true,
    onReadyScene: legsReady(legs),
    live: (scene) => {
      for (const side of ['right', 'left'] as const) {
        const col = legColour(legs[side], b)
        scene.setLeg(side, { tint: col.tint, tintAmount: col.amount })
      }
    },
  }
}

function venous3d(x: SceneCtx, spec: SceneSpec): Station3D {
  const legs = x.c.visual?.legs ?? NORMAL_LEGS
  const female = x.c.patient.sex === 'female'
  const standing = x.view === 'standing'
  const back = venousFromBehind(x)
  const fill = x.extra.veinFill ?? (standing ? 1 : 0.35)
  const score = (l: LegsVisual['right']) => (l.varicose?.severity ?? 0) + (l.ulcer ? 2 : 0)
  const worse = score(legs.right) >= score(legs.left) ? 'right' : 'left'
  return {
    staging: {
      set: standing ? 'standing' : lyingSet(x.c),
      pose: standing ? { posture: 'stand', arms: 'sides', turned: back } : { posture: 'supine' },
      clothing: x.exposed ? clothingFor('legs', female) : { ...clothingFor('gowned', female), blanketFrom: standing ? null : 'waist' },
      shot: (scene) => {
        const s = shotFor(scene, 'legs')
        if (back) s.dir.set(0.06, 0.1, -1)
        // standing: a little round towards the worse leg's inner side, where the long saphenous runs
        else if (standing) s.dir.set(worse === 'right' ? 0.38 : -0.38, 0.06, 1)
        return s
      },
      expression: { lookAt: standing ? 'camera' : 'up' },
    },
    zones: spec.zones.map((zone) => ({
      zone,
      // from behind: the backs of the calves
      rest: back && zone.id.startsWith('calf')
        ? (scene: PatientScene) => {
            const side = zone.id.endsWith('L') ? 'l' : 'r'
            const r = scene.human!.rest
            return scene.anatomy!.onSkin(r[`calf_${side}`].head.clone().lerp(r[`foot_${side}`].head, 0.3).add(v3(0, 0, -1.3)))
          }
        : /^(dp)[RL]$/.test(zone.id)
          ? (scene: PatientScene) => limbPoint(scene, zone.id)!
          : undefined,
    })),
    faceInset: !back,
    onReadyScene: legsReady(legs),
    live: (scene) => scene.setVeinFill(fill),
  }
}

/* -------------------------------------------------------------- thyroid */

function thyroidZone(scene: PatientScene, id: string): THREE.Vector3 | undefined {
  const A = scene.anatomy!
  const h = scene.human!
  const tc = A.thyroidCartilage
  const sn = A.sternalNotch
  const isthY = tc.y - (tc.y - sn.y) * 0.42
  const eye = (side: 'left' | 'right') => h.rest.head.head.clone().add(h.eyes[side].position)
  switch (id) {
    case 'thyroid':
      return A.onFront(0, isthY)
    case 'trachea':
      return sn.clone()
    case 'manubrium':
      return A.onFront(0, sn.y - 0.35)
    case 'nodesR':
      return A.onSkin(tc.clone().add(v3(-0.85, -0.1, -0.2)))
    case 'nodesL':
      return A.onSkin(tc.clone().add(v3(0.85, -0.1, -0.2)))
    case 'eyes':
      return eye('left').lerp(eye('right'), 0.5).add(v3(0, 0, 0.1))
    case 'mouth':
      return scene.restLandmark('noseTip').lerp(scene.restLandmark('chin'), 0.5)
    case 'cyst':
      return A.onFront(0, tc.y + 0.3)
    case 'wristR':
      return limbPoint(scene, 'wristR')
    case 'wristL':
      return limbPoint(scene, 'wristL')
    case 'handR':
      return limbPoint(scene, 'handR')
    case 'handL':
      return limbPoint(scene, 'handL')
  }
  return undefined
}

const THYROID_R: Record<string, number> = { thyroid: 0.45, trachea: 0.16, manubrium: 0.22, nodesR: 0.35, nodesL: 0.35, eyes: 0.4, mouth: 0.22, cyst: 0.2, wristR: 0.35, wristL: 0.35, handR: 0.55, handL: 0.55 }

function thyroid3d(x: SceneCtx, spec: SceneSpec): Station3D {
  const neck = x.c.visual?.neck ?? {}
  const female = x.c.patient.sex === 'female'
  const hands = x.view === 'hands'
  const cue = x.cue.kind
  const armsUp = cue === 'pemberton'
  const tremor = hands && cue === 'tremor'
  return {
    staging: {
      set: 'chair',
      pose: { posture: 'sitChair', arms: hands ? 'forward' : armsUp ? 'up' : 'sides', wrists: tremor ? -8 : undefined, spread: tremor },
      // the neck bare to the clavicles (a woman's chest covered by the folded gown)
      clothing: { gownTop: !x.exposed, gownUp: false, gownSkirt: true, briefs: true, chestBand: x.exposed && female, drape: false, blanketFrom: null },
      shot: hands ? 'hands' : cue === 'eyes' || cue === 'lid-lag' ? 'face' : armsUp ? 'chest' : 'neck',
      expression: {
        lidRetraction: neck.lidRetraction ? 0.85 : 0,
        // lid lag: following your finger down, the upper lids stay up
        lookAt: cue === 'lid-lag' ? 'down' : 'camera',
        tongueOut: cue === 'tongue' ? 1 : 0,
        mouthOpen: cue === 'tongue' ? 0.55 : 0,
      },
    },
    zones: spec.zones.map((zone) => ({ zone, rest: (scene: PatientScene) => thyroidZone(scene, zone.id) ?? scene.anatomy!.sternalNotch.clone(), r: THYROID_R[zone.id] })),
    faceInset: hands,
    cues: { swallow: cue === 'swallow' ? x.cue.key : 0 },
    onReadyScene: (scene) => {
      scene.setExtraSigns(neckSigns(neck, scene.anatomy!, scene.human!, { swallow: () => scene.swallowNow, tongue: () => scene.tongueNow }))
      scene.setProptosis(neck.proptosis ?? 0)
      if (neck.sweaty) scene.setSkin({ sweat: 1 })
      if (neck.palmarErythema) scene.setSkin({ flush: 0.55 })
    },
    live: (scene) => scene.setTremor(tremor ? (neck.tremor ?? 0) : 0),
  }
}

/* --------------------------------------------------------------- breast */

function breast3d(x: SceneCtx, spec: SceneSpec): Station3D {
  const b = x.c.visual?.breast ?? {}
  const pose = breastArmPose(x)
  const affected = b.lump?.side ?? b.nipple?.side ?? 'left'
  const zoneAt = (scene: PatientScene, id: string): THREE.Vector3 | undefined => {
    const A = scene.anatomy!
    const h = scene.human!
    const nipA = affected === 'left' ? A.nippleL : A.nippleR
    const nipN = affected === 'left' ? A.nippleR : A.nippleL
    const sA = affected === 'left' ? 1 : -1
    const axilla = (sfx: 'l' | 'r') => A.onSkin(h.rest[`upperarm_${sfx}`].head.clone().add(v3(sfx === 'l' ? -0.25 : 0.25, -0.75, 0.05)))
    const scf = (sfx: 'l' | 'r') => A.onSkin(h.rest[`clavicle_${sfx}`].head.clone().lerp(h.rest[`clavicle_${sfx}`].tail, 0.5).add(v3(0, 0.35, 0.2)))
    switch (id) {
      case 'normal':
        return A.onFront(nipN.x - 0.25 * sA, nipN.y + 0.1)
      case 'affected':
        return A.onFront(nipA.x + 0.25 * sA, nipA.y + 0.1)
      case 'lump':
        return b.lump ? breastLumpAt(b.lump, A) : undefined
      case 'nipple':
        return nipA.clone()
      case 'axR':
        return axilla('r')
      case 'axL':
        return axilla('l')
      case 'scfR':
        return scf('r')
      case 'scfL':
        return scf('l')
    }
    return undefined
  }
  const R: Record<string, number> = { normal: 0.6, affected: 0.55, lump: 0.25, nipple: 0.14, axR: 0.35, axL: 0.35, scfR: 0.25, scfL: 0.25 }
  return {
    staging: {
      set: 'couch',
      pose: { posture: 'sitEdge', arms: x.exposed ? pose : 'sides' },
      clothing: x.exposed ? { gownTop: false, gownSkirt: true, briefs: true, chestBand: false, drape: false, blanketFrom: null } : { ...clothingFor('gowned', true), blanketFrom: null },
      shot: 'chest',
      expression: { lookAt: 'camera' },
    },
    zones: spec.zones.map((zone) => ({ zone, rest: (scene: PatientScene) => zoneAt(scene, zone.id) ?? scene.anatomy!.sternalNotch.clone(), r: R[zone.id] })),
    faceInset: true,
    onReadyScene: (scene) => scene.setExtraSigns(breastSigns(b, scene.anatomy!, scene.human!)),
    // tethering shows best with the pectorals tensed or the arms raised
    live: (scene) => scene.signs.size('breast-tether', pose === 'up' || pose === 'hips' ? 2.3 : 1),
  }
}

/* ----------------------------------------------------------------- lump */

const DEFAULT_LUMP: LumpVisual = { site: 'forearm', side: 'right', w: 3, h: 2.5, kind: 'lipoma' }
const places = new WeakMap<PatientScene, LumpPlace>()
const placeOf = (scene: PatientScene, l: LumpVisual) => {
  let p = places.get(scene)
  if (!p) places.set(scene, (p = lumpPlace(l, scene.anatomy!, scene.human!, (rest) => scene.surfaceAt(rest).normal.y)))
  return p
}

function lump3d(x: SceneCtx, spec: SceneSpec): Station3D {
  const l = x.c.visual?.lump ?? DEFAULT_LUMP
  const female = x.c.patient.sex === 'female'
  const torch = x.cue.kind === 'transilluminate'
  const forearm = l.site === 'forearm'
  const back = l.site === 'upper-back'
  const bareTop = l.site === 'upper-back' || l.site === 'shoulder' || l.site === 'chest-wall'
  return {
    staging: {
      set: forearm ? 'chair' : 'standing',
      pose: forearm ? { posture: 'sitChair', arms: 'forward' } : { posture: 'stand', arms: 'sides', turned: back },
      clothing: {
        gownTop: !(x.exposed && bareTop) || (female && l.site !== 'upper-back'),
        chestBand: x.exposed && bareTop && female && l.site === 'upper-back',
        gownSkirt: l.site !== 'thigh' || !x.exposed,
        briefs: true,
        drape: false,
        blanketFrom: null,
      },
      // close in on the lump low across the skin, so its outline stands out against what's behind it
      shot: (scene) => lumpShot(scene, placeOf(scene, l).at, back),
      expression: { lookAt: 'camera' },
    },
    zones: spec.zones.map((zone) => ({ zone, rest: (scene: PatientScene) => placeOf(scene, l).at, r: Math.max(0.3, Math.max(l.w, l.h) * 0.09) })),
    faceInset: true,
    onReadyScene: (scene) => scene.setExtraSigns(lumpSigns(l, placeOf(scene, l), false)),
    live: (scene) => scene.setExtraSigns(lumpSigns(l, placeOf(scene, l), torch)),
  }
}
