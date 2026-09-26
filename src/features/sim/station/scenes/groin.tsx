import { herniaPosition, type BodyProps, type HerniaPhase } from '../../../../anatomy/Body'
import { bodyDims, landmarks } from '../../../../anatomy/bodyModel'
import { ClinicScene } from '../../../../anatomy/Clinic'
import { lerpPt, type Pt } from '../../../../anatomy/geometry'
import { BedScene } from '../../../../anatomy/Scene'
import { lastIndex, type SceneCtx, type SceneSpec, type Zone } from '../types'

export function groinScene(x: SceneCtx): SceneSpec {
  const { c, view, exposed, cue, log } = x
  const a = c.patient.appearance
  const d = bodyDims(a)
  const lm = landmarks(a, d)
  const hernia = (a.hernias ?? []).find((h) => h.kind === 'inguinal-indirect' || h.kind === 'inguinal-direct' || h.kind === 'femoral')
  const right = (hernia?.side ?? 'right') === 'right'
  const standing = view === 'standing'

  // Reduced once pushed back, until the patient coughs freely, stands, or the pressure is released
  const reducible = !hernia?.irreducible
  const reduced = reducible && !standing && lastIndex(log, ['groin.reduce', 'groin.deepRing']) > lastIndex(log, ['groin.release', 'groin.stand', 'groin.coughLook', 'groin.coughFeel'])
  let phase: HerniaPhase = standing ? 'standing' : reduced ? 'reduced' : 'rest'
  if (cue.kind === 'cough') phase = 'cough'
  if (cue.kind === 'reduce' && reducible) phase = 'reduced'
  if (cue.kind === 'deep-ring' && reducible) phase = 'ring-cough'

  const exposure = exposed ? (standing ? 'standing-groin' : 'groin') : 'gowned'
  const coughing = cue.kind === 'cough' || cue.kind === 'deep-ring'
  const body: BodyProps = {
    a,
    pose: { exposure, pain: x.pain, wince: x.wince, lookAt: standing ? 'examiner' : 'up', coughing },
    id: 'stbody',
    seed: c.id,
    herniaPhase: phase,
    hr: c.vitals.hr,
    rr: standing ? undefined : c.vitals.rr,
  }

  const lesion: Pt = hernia ? herniaPosition(hernia, lm).at : right ? lerpPt(lm.deepRingR, lm.superficialRingR, 0.55) : lerpPt(lm.deepRingL, lm.superficialRingL, 0.55)
  const tub = right ? lm.pubicTubercleR : lm.pubicTubercleL
  const ring = right ? lm.deepRingR : lm.deepRingL
  const other: Pt = [-lesion[0], lesion[1]]

  const zones: Zone[] = standing
    ? [
        { id: 'lump', actions: ['groin.palpate', 'groin.coughFeel', 'groin.getAbove'], at: lesion, r: 15, label: hernia ? 'Swelling' : 'Groin' },
        { id: 'tub', actions: ['groin.tubercle'], at: tub, r: 7, label: 'Pubic tubercle' },
        { id: 'other', actions: ['groin.other'], at: other, r: 15, label: 'Other groin' },
        ...(a.sex === 'male' ? [{ id: 'scrotum', actions: ['groin.scrotum'], at: [0, 438] as Pt, r: 14, label: 'Scrotum' }] : []),
      ]
    : [
        { id: 'lump', actions: ['groin.reduce', 'groin.release', 'groin.auscultate'], at: lesion, r: 15, label: 'Swelling' },
        { id: 'ring', actions: ['groin.deepRing'], at: ring, r: 8, label: 'Deep ring' },
      ]

  return {
    content: standing ? <ClinicScene id="clinic" body={body} /> : <BedScene id="stbed" body={body} />,
    rect: standing ? { cx: 0, cy: 398, w: 290, h: 240 } : { cx: 0, cy: 384, w: 260, h: 210 },
    zones,
    aria: standing ? `${c.patient.name} standing for a groin examination` : `${c.patient.name} lying on the couch`,
  }
}
