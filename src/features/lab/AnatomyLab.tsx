import { Face } from '../../anatomy/Face'
import { BedScene, SCENE_VIEWBOX } from '../../anatomy/Scene'
import type { Appearance, Exposure, PatientPose } from '../../anatomy/types'
import { useLocation } from '../../lib/router'

const PATIENTS: Record<string, Appearance> = {
  james: {
    sex: 'male',
    age: 24,
    skinTone: 3,
    habitus: 'average',
    hair: 'short',
    hairColor: 'darkbrown',
    eyeColor: 'brown',
    facialHair: 'stubble',
    flushed: 0.3,
    lines: { cannula: 'left-hand' },
  },
  maria: {
    sex: 'female',
    age: 44,
    skinTone: 2,
    habitus: 'overweight',
    hair: 'long',
    hairColor: 'brown',
    eyeColor: 'hazel',
    scars: ['pfannenstiel'],
    lines: { cannula: 'right-forearm' },
  },
  ahmed: {
    sex: 'male',
    age: 71,
    skinTone: 4,
    habitus: 'thin',
    hair: 'bald',
    hairColor: 'grey',
    facialHair: 'moustache',
    jaundice: 0.8,
    cachexia: true,
    excoriations: true,
    scars: ['kocher', 'lap-appendix'],
    lines: { cannula: 'left-hand', catheter: true },
  },
  edith: {
    sex: 'female',
    age: 83,
    skinTone: 1,
    habitus: 'thin',
    hair: 'bun',
    hairColor: 'white',
    distension: 2,
    distensionType: 'gas',
    visiblePeristalsis: true,
    scars: ['midline'],
    hernias: [{ kind: 'femoral', side: 'right', size: 'medium', visible: 'always', tense: true }],
    lines: { ngTube: true, cannula: 'left-forearm', drip: true, oxygen: 'nasal' },
    sweaty: true,
    dehydrated: true,
  },
  kwame: {
    sex: 'male',
    age: 55,
    skinTone: 6,
    habitus: 'obese',
    hair: 'crop',
    hairColor: 'black',
    distension: 3,
    distensionType: 'fluid',
    umbilicus: 'everted',
    caputMedusae: true,
    spiderNaevi: 6,
    gynaecomastia: true,
    jaundice: 0.5,
    scars: ['lap-chole'],
  },
  layla: {
    sex: 'female',
    age: 36,
    skinTone: 4,
    habitus: 'average',
    hair: 'hijab',
    hairColor: 'black',
    cullens: true,
    greyTurners: true,
    pallor: 0.4,
    sweaty: true,
    lines: { oxygen: 'mask', cannula: 'left-hand' },
  },
}

export default function AnatomyLab() {
  const { query } = useLocation()
  const who = query.get('p') ?? 'james'
  const exposure = (query.get('x') ?? 'abdomen') as Exposure
  const view = query.get('v') ?? 'scene'
  const pain = Number(query.get('pain') ?? 0.2)
  const wince = Number(query.get('wince') ?? 0)
  const a = PATIENTS[who] ?? PATIENTS.james
  const pose: PatientPose = { exposure, pain, wince, breath: 0.5, lookAt: 'up' }

  if (view === 'faces') {
    return (
      <div className="grid min-h-dvh grid-cols-3 gap-4 bg-bg p-4">
        {Object.entries(PATIENTS).map(([k, p]) =>
          [0, 0.6, 1].map((pn) => (
            <div key={`${k}${pn}`} className="rounded-xl bg-surface-2 p-2">
              <svg viewBox="-70 -30 140 190" className="w-full">
                <Face a={p} pose={{ pain: pn, wince: pn === 1 ? 1 : 0 }} id={`f-${k}-${pn}`} bust />
              </svg>
              <div className="text-center text-xs text-muted">
                {k} pain {pn}
              </div>
            </div>
          )),
        )}
      </div>
    )
  }

  const zoom = query.get('zoom')
  const vb = zoom === 'abdomen' ? '-120 170 240 250' : zoom === 'face' ? '-60 -20 120 140' : zoom === 'groin' ? '-100 320 200 150' : `${SCENE_VIEWBOX.x} ${SCENE_VIEWBOX.y} ${SCENE_VIEWBOX.w} ${SCENE_VIEWBOX.h}`

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stage">
      <svg viewBox={vb} className="h-dvh w-full" preserveAspectRatio="xMidYMid meet">
        <BedScene
          id="lab"
          body={{ a, pose, id: 'labbody', seed: who, herniaPhase: 'rest' }}
          items={{
            vomitBowl: who === 'edith' ? 'bilious' : undefined,
            catheterUrine: who === 'ahmed' ? 'tea' : who === 'edith' ? 'concentrated' : undefined,
            ngDrainage: who === 'edith' ? 'bilious' : undefined,
            drip: !!a.lines?.drip,
            walkingFrame: who === 'edith',
          }}
        />
      </svg>
    </div>
  )
}
