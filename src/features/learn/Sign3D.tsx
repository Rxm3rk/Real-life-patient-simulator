import { useRef, useState } from 'react'
import * as THREE from 'three'
import type { Appearance } from '../../anatomy/types'
import { ATLAS_APPEARANCES } from '../../anatomy3d/atlasBodies'
import { legColour, legSigns } from '../../anatomy3d/legs'
import type { ClothingState, PatientScene, Shot } from '../../anatomy3d/patientScene'
import type { SetKind } from '../../anatomy3d/sets'
import { lumpShot, shotFor, type ShotName } from '../../anatomy3d/shots'
import { breastLumpAt, breastSigns, lumpPlace, lumpSigns, neckSigns } from '../../anatomy3d/stationSigns'
import type { BreastVisual, LegsVisual, LumpVisual } from '../../engine/types'
import Viewer3D from './Viewer3D'

/**
 * The signs atlas on a 3D patient: each sign set up on a patient you can turn
 * round and zoom into, with a button for the manoeuvre that brings it out
 * (a cough, a swallow, the tongue out, arms raised).
 */

interface Spec {
  a: Appearance
  set?: SetKind
  setup(scene: PatientScene): void
  action?: { label: string; run(scene: PatientScene): void }
}

const { man: MAN, woman: WOMAN, olderMan: OLD_MAN, olderWoman: OLD_WOMAN } = ATLAS_APPEARANCES
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

const GOWNED: ClothingState = { gownTop: true, gownSkirt: true, briefs: true }
const TORSO_M: ClothingState = { briefs: true }
const TORSO_F: ClothingState = { chestBand: true, briefs: true }
const GROIN: ClothingState = { gownUp: true, drape: true }
const LEGS: ClothingState = { gownTop: true, briefs: true }
const CHEST: ClothingState = { gownSkirt: true, briefs: true }

function stand(scene: PatientScene, clothing: ClothingState, arms: 'sides' | 'hips' | 'up' = 'sides', turned = false) {
  scene.setPose({ posture: 'stand', arms, turned }, true)
  scene.setClothing(clothing)
  scene.setExpression({ lookAt: 'camera' })
}
const look = (scene: PatientScene, shot: ShotName | Shot, tweak?: (s: Shot) => void) => {
  const s = typeof shot === 'string' ? shotFor(scene, shot) : shot
  tweak?.(s)
  scene.shot(s, true)
}
/** Close in on a point on the skin, looking at it from where it faces. */
const at = (scene: PatientScene, rest: THREE.Vector3, dist = 7, lift = 0.25) => {
  const s = scene.surfaceAt(rest)
  scene.shot({ target: s.point, dir: s.normal.clone().add(v3(0, lift, 0)).normalize(), dist, fov: 30 }, true)
}
const legsOn = (scene: PatientScene, legs: LegsVisual) => {
  const ls = legSigns(legs, scene.anatomy!, scene.human!)
  scene.setExtraSigns(ls)
  for (const side of ['right', 'left'] as const) {
    const col = legColour(legs[side])
    scene.setLeg(side, { ...ls.look[side], tint: col.tint, tintAmount: col.amount })
  }
}
const drivers = (scene: PatientScene) => ({ swallow: () => scene.swallowNow, tongue: () => scene.tongueNow })

const BREAST_CA: BreastVisual = { lump: { side: 'left', clock: 2, distCm: 3.5, sizeCm: 3, visible: true, tethered: true }, nipple: { side: 'left', change: 'retracted' } }
const PEAU: BreastVisual = { lump: { side: 'left', clock: 3, distCm: 3, sizeCm: 3.5, visible: true }, skin: 'peau' }
const LIPOMA: LumpVisual = { site: 'forearm', side: 'right', w: 4.5, h: 3.5, kind: 'lipoma', lobulated: true, domed: 0.42 }
const EPIDERMOID: LumpVisual = { site: 'upper-back', side: 'right', w: 2, h: 2, kind: 'epidermoid', punctum: true, tethered: true, domed: 0.9 }

const SPECS: Record<string, Spec> = {
  jaundice: { a: { ...MAN, jaundice: 0.85 }, setup: (s) => (stand(s, GOWNED), look(s, 'face')) },
  pallor: { a: { ...OLD_WOMAN, pallor: 0.85 }, setup: (s) => (stand(s, GOWNED), look(s, 'face')) },
  exophthalmos: {
    a: WOMAN,
    setup: (s) => {
      stand(s, GOWNED)
      s.setProptosis(0.95)
      s.setExpression({ lidRetraction: 0.9 })
      // three-quarters on: the eyes stand proud of the brow
      look(s, 'face', (sh) => sh.dir.set(-0.6, 0.05, 1))
    },
  },
  goitre: {
    a: WOMAN,
    setup: (s) => {
      stand(s, TORSO_F)
      s.setExtraSigns(neckSigns({ goitre: { kind: 'multinodular', size: 3 } }, s.anatomy!, s.human!, drivers(s)))
      look(s, 'neck')
    },
    action: { label: 'Swallow', run: (s) => s.swallow() },
  },
  thyroglossal: {
    a: { ...WOMAN, age: 28 },
    setup: (s) => {
      stand(s, TORSO_F)
      s.setExtraSigns(neckSigns({ thyroglossal: { sizeCm: 2.2 } }, s.anatomy!, s.human!, drivers(s)))
      look(s, 'neck')
    },
    action: {
      label: 'Stick your tongue out',
      run: (s) => {
        s.setExpression({ tongueOut: 1, mouthOpen: 0.55 })
        window.setTimeout(() => s.setExpression({ tongueOut: 0, mouthOpen: 0 }), 2600)
      },
    },
  },
  caput: { a: { ...MAN, caputMedusae: true, distension: 2, distensionType: 'fluid', umbilicus: 'everted', spiderNaevi: 4, jaundice: 0.3 }, setup: (s) => (stand(s, TORSO_M), look(s, 'abdomen')) },
  cullen: { a: { ...WOMAN, cullens: true }, setup: (s) => (stand(s, TORSO_F), look(s, 'abdomen')) },
  distension: {
    a: { ...MAN, distension: 3, distensionType: 'gas', umbilicus: 'everted' },
    set: 'couch',
    setup: (s) => {
      s.setPose({ posture: 'supine' }, true)
      s.setClothing({ briefs: true, blanketFrom: 'thighs' })
      // from the side at the level of the patient: the abdomen in profile
      s.shot({ target: s.landmark('navel'), dir: v3(-1, 0.3, 0.15), dist: 10.5, fov: 30 }, true)
    },
  },
  stoma: { a: { ...MAN, stoma: { type: 'ileostomy', side: 'right', bag: false }, scars: ['midline'] }, setup: (s) => (stand(s, TORSO_M), look(s, 'abdomen', (sh) => (sh.dist = 9))) },
  inguinal: {
    a: { ...MAN, hernias: [{ kind: 'inguinal-indirect', side: 'right', size: 'medium', visible: 'cough' }] },
    setup: (s) => {
      stand(s, GROIN)
      s.setHerniaPhase('standing')
      // a little from the side, so the swelling stands out in profile
      look(s, 'groin', (sh) => sh.dir.set(-0.55, 0.05, 1))
    },
    action: {
      label: 'Cough',
      run: (s) => {
        s.setHerniaPhase('cough')
        window.setTimeout(() => s.setHerniaPhase('standing'), 1400)
      },
    },
  },
  femoral: {
    a: { ...OLD_WOMAN, hernias: [{ kind: 'femoral', side: 'right', size: 'medium', visible: 'always' }] },
    setup: (s) => {
      stand(s, GROIN)
      s.setHerniaPhase('standing')
      look(s, 'groin', (sh) => sh.dir.set(-0.55, 0.05, 1))
    },
    action: {
      label: 'Cough',
      run: (s) => {
        s.setHerniaPhase('cough')
        window.setTimeout(() => s.setHerniaPhase('standing'), 1400)
      },
    },
  },
  tethering: {
    a: WOMAN,
    setup: (s) => {
      stand(s, CHEST, 'hips')
      s.setExtraSigns(breastSigns(BREAST_CA, s.anatomy!, s.human!))
      s.signs.size('breast-tether', 2.3)
      look(s, 'chest')
    },
    action: {
      label: 'Arms up',
      run: (s) => {
        const up = s.getPose().arms !== 'up'
        s.setPose({ posture: 'stand', arms: up ? 'up' : 'hips' })
      },
    },
  },
  peau: {
    a: WOMAN,
    setup: (s) => {
      stand(s, CHEST)
      s.setExtraSigns(breastSigns(PEAU, s.anatomy!, s.human!))
      at(s, breastLumpAt(PEAU.lump!, s.anatomy!), 4, 0.1)
    },
  },
  varicose: {
    a: WOMAN,
    setup: (s) => {
      stand(s, LEGS)
      legsOn(s, { right: { varicose: { system: 'gsv', severity: 3 } }, left: { varicose: { system: 'gsv', severity: 1 } } })
      s.setVeinFill(1)
      // the inside of the right leg, where the long saphenous vein runs
      const h = s.human!
      s.shot({ target: s.boneWorld('calf_r').lerp(s.boneWorld('thigh_r'), 0.2), dir: v3(0.75, 0.12, 0.85), dist: 12, fov: 30 }, true)
      void h
    },
  },
  'venous-ulcer': {
    a: OLD_WOMAN,
    setup: (s) => {
      stand(s, LEGS)
      legsOn(s, { right: { varicose: { system: 'gsv', severity: 2 }, haemosiderin: true, lipodermatosclerosis: true, eczema: true, oedema: 1, ulcer: { kind: 'venous', site: 'gaiter', sizeCm: 3.2 } }, left: {} })
      s.setVeinFill(1)
      const h = s.human!
      at(s, s.anatomy!.onSkin(h.rest.calf_r.head.clone().lerp(h.rest.foot_r.head, 0.75).add(v3(0.5, 0, 0.5))), 9, 0.1)
    },
  },
  'arterial-ulcer': {
    a: OLD_MAN,
    set: 'couch',
    setup: (s) => {
      s.setPose({ posture: 'supine' }, true)
      s.setClothing({ gownTop: true, briefs: true })
      legsOn(s, { right: { pallor: 0.55, hairLoss: true, shiny: true, ulcer: { kind: 'arterial', site: 'lateral-malleolus', sizeCm: 1.5 }, gangrene: [2] }, left: { hairLoss: true } })
      // the outer side of the right ankle and foot, from the examiner's side
      s.shot({ target: s.boneWorld('foot_r').lerp(s.boneWorld('ball_r'), 0.4), dir: v3(-1, 0.55, 0.25), dist: 7, fov: 30 }, true)
    },
  },
  lipoma: {
    a: MAN,
    set: 'chair',
    setup: (s) => {
      s.setPose({ posture: 'sitChair', arms: 'forward' }, true)
      s.setClothing(GOWNED)
      s.poser?.update(10)
      const place = lumpPlace(LIPOMA, s.anatomy!, s.human!, (rest) => s.surfaceAt(rest).normal.y)
      s.setExtraSigns(lumpSigns(LIPOMA, place, false))
      s.shot(lumpShot(s, place.at), true)
    },
  },
  epidermoid: {
    a: { ...MAN, skinTone: 3 },
    setup: (s) => {
      stand(s, TORSO_M, 'sides', true)
      const place = lumpPlace(EPIDERMOID, s.anatomy!, s.human!)
      s.setExtraSigns(lumpSigns(EPIDERMOID, place, false))
      s.shot(lumpShot(s, place.at, true), true)
    },
  },
}

export default function Sign3D({ id, className, onUnavailable }: { id: string; className?: string; onUnavailable: () => void }) {
  const spec = SPECS[id]
  const scene = useRef<PatientScene | null>(null)
  const [busy, setBusy] = useState(false)
  if (!spec) return null
  return (
    <div className="relative">
      <Viewer3D
        key={id}
        appearance={spec.a}
        set={spec.set}
        setup={spec.setup}
        setupKey={id}
        label={`A patient showing the sign: ${id.replace('-', ' ')}`}
        className={className}
        onUnavailable={onUnavailable}
        onScene={(s) => (scene.current = s)}
      />
      {spec.action && (
        <button
          disabled={busy}
          onClick={() => {
            if (!scene.current) return
            spec.action!.run(scene.current)
            setBusy(true)
            window.setTimeout(() => setBusy(false), 1500)
          }}
          className="absolute bottom-3 left-3 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg shadow-(--shadow-lift) transition disabled:opacity-60"
        >
          {spec.action.label}
        </button>
      )}
      <div className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">Drag to turn · pinch to zoom</div>
    </div>
  )
}
