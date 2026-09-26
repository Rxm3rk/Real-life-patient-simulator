import type { BodyProps } from '../../../../anatomy/Body'
import { armOutline, bodyDims, landmarks } from '../../../../anatomy/bodyModel'
import { BUERGER_VIEWBOX, BuergerView } from '../../../../anatomy/BuergerView'
import { ClinicScene } from '../../../../anatomy/Clinic'
import type { Pt } from '../../../../anatomy/geometry'
import { LegsBack, LegSigns } from '../../../../anatomy/LegSigns'
import { BedScene } from '../../../../anatomy/Scene'
import type { LegsVisual } from '../../../../engine/types'
import { lastIndex, type SceneCtx, type SceneSpec, type Zone } from '../types'

const NORMAL_LEGS: LegsVisual = { right: {}, left: {} }

/** Mirror a viewer's-right point to both legs: [patient right, patient left]. */
const both = (p: Pt): [Pt, Pt] => [[-p[0], p[1]], p]

export function arterialScene(x: SceneCtx): SceneSpec {
  const { c, view, exposed } = x
  const a = c.patient.appearance
  const d = bodyDims(a)
  const lm = landmarks(a, d)
  const legs = c.visual?.legs ?? NORMAL_LEGS
  const k = a.sex === 'female' ? 17 : 21
  const s = d.legScale

  if (view === 'buerger') {
    const b = x.extra.buerger ?? { angle: 0, dependent: false, pallor: 0, rubor: 0 }
    const worst = (legs.right.buergerAngle ?? 99) < (legs.left.buergerAngle ?? 99) ? legs.right : legs.left
    return {
      content: <BuergerView a={a} id="buerger" angle={b.angle} dependent={b.dependent} pallor={b.pallor} rubor={b.rubor} showAngle target={x.learn ? worst.buergerAngle : undefined} />,
      rect: { cx: BUERGER_VIEWBOX.w / 2, cy: BUERGER_VIEWBOX.h / 2, w: BUERGER_VIEWBOX.w, h: BUERGER_VIEWBOX.h },
      zones: [],
      aria: 'Side view of Buerger’s test',
      effectScale: 2,
    }
  }

  const body: BodyProps = {
    a,
    pose: { exposure: exposed ? 'legs' : 'gowned', pain: x.pain, wince: x.wince, lookAt: 'up' },
    id: 'stbody',
    seed: c.id,
    hr: c.vitals.hr,
    rr: c.vitals.rr,
  }
  const arm = armOutline(d)
  const [radR, radL] = both([arm.wrist[0] - 4, arm.wrist[1] - 4])
  const [femR, femL] = [lm.midInguinalR, lm.midInguinalL]
  const [popR, popL] = both([k + 22 * s, 548])
  const [shinR, shinL] = both([k + 26, 640])
  const [ptR, ptL] = both([k + 7, 738])
  const [dpR, dpL] = both([k + 22, 770])
  const [toeR, toeL] = both([k + 22, 792])

  const zones: Zone[] =
    view === 'bed'
      ? [
          { id: 'radR', actions: ['art.radial', 'art.hands'], at: radR, r: 16, label: 'Right wrist' },
          { id: 'radL', actions: ['art.radial', 'art.hands'], at: radL, r: 16, label: 'Left wrist' },
          { id: 'aorta', actions: ['art.aorta'], at: lm.aorta, r: 18, label: 'Aorta' },
        ]
      : view === 'legs'
        ? [
            { id: 'femR', actions: ['art.femoral'], at: femR, r: 11, label: 'R femoral' },
            { id: 'femL', actions: ['art.femoral'], at: femL, r: 11, label: 'L femoral' },
            { id: 'popR', actions: ['art.popliteal'], at: popR, r: 14, label: 'R popliteal' },
            { id: 'popL', actions: ['art.popliteal'], at: popL, r: 14, label: 'L popliteal' },
            { id: 'shinR', actions: ['art.temp', 'art.inspect'], at: shinR, r: 16, label: 'R shin' },
            { id: 'shinL', actions: ['art.temp', 'art.inspect'], at: shinL, r: 16, label: 'L shin' },
          ]
        : [
            { id: 'ptR', actions: ['art.pt'], at: ptR, r: 7, label: 'R post. tibial' },
            { id: 'ptL', actions: ['art.pt'], at: ptL, r: 7, label: 'L post. tibial' },
            { id: 'dpR', actions: ['art.dp'], at: dpR, r: 7, label: 'R dorsalis pedis' },
            { id: 'dpL', actions: ['art.dp'], at: dpL, r: 7, label: 'L dorsalis pedis' },
            { id: 'toeR', actions: ['art.crt', 'art.toes', 'art.sensation'], at: toeR, r: 8, label: 'R toes' },
            { id: 'toeL', actions: ['art.crt', 'art.toes', 'art.sensation'], at: toeL, r: 8, label: 'L toes' },
          ]

  return {
    content: (
      <BedScene id="stbed" body={body}>
        {exposed && <LegSigns a={a} d={d} spec={legs} id="legsigns" bodyId="stbody" seed={c.id} />}
      </BedScene>
    ),
    rect: view === 'bed' ? { cx: 0, cy: 330, w: 420, h: 720 } : view === 'legs' ? { cx: 0, cy: 590, w: 300, h: 460 } : { cx: 0, cy: 752, w: 210, h: 150 },
    zones,
    aria: `${c.patient.name} lying on the couch with both legs exposed`,
  }
}

export function venousScene(x: SceneCtx): SceneSpec {
  const { c, view, exposed, log } = x
  const a = c.patient.appearance
  const d = bodyDims(a)
  const lm = landmarks(a, d)
  const legs = c.visual?.legs ?? NORMAL_LEGS
  const k = a.sex === 'female' ? 17 : 21
  const standing = view === 'standing'
  // from behind once asked to turn round, until the next front-facing manoeuvre
  const back =
    standing &&
    lastIndex(log, ['ven.back']) > lastIndex(log, ['ven.inspect', 'ven.palpate', 'ven.oedema', 'ven.sfj', 'ven.cough', 'ven.tap', 'ven.stand']) &&
    x.cue.kind !== 'tourniquet'
  const fill = x.extra.veinFill ?? (standing ? 1 : 0.35)

  const body: BodyProps = {
    a,
    pose: { exposure: exposed ? 'legs' : 'gowned', pain: x.pain, wince: x.wince, lookAt: standing ? 'examiner' : 'up' },
    id: 'stbody',
    seed: c.id,
    hr: c.vitals.hr,
    rr: standing ? undefined : c.vitals.rr,
  }
  const [sfjR, sfjL] = both([20, 428])
  const [calfR, calfL] = both([k + 5, 630])
  const [ankR, ankL] = both([k + 13, 722])
  const [dpR, dpL] = both([k + 22, 770])

  const tourniquet = x.extra.tourniquet ? (
    <g>
      {[-1, 1].map((sx) => (
        <g key={sx} transform={`scale(${sx} 1)`}>
          <path d="M4 452 C20 458 60 458 78 450 L77 460 C60 468 20 468 5 462 Z" fill="#3f7fbf" />
          <path d="M4 452 C20 458 60 458 78 450" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" fill="none" />
        </g>
      ))}
    </g>
  ) : null

  const front = (
    <>
      {exposed && <LegSigns a={a} d={d} spec={legs} id="legsigns" bodyId="stbody" veinFill={fill} seed={c.id} />}
      {tourniquet}
    </>
  )

  const zones: Zone[] = standing
    ? back
      ? [
          { id: 'calfR', actions: ['ven.palpate', 'ven.tap'], at: [k + 24, 620], r: 18, label: 'R calf' },
          { id: 'calfL', actions: ['ven.palpate', 'ven.tap'], at: [-(k + 24), 620], r: 18, label: 'L calf' },
        ]
      : [
          { id: 'sfjR', actions: ['ven.sfj', 'ven.cough', 'ven.tap'], at: sfjR, r: 11, label: 'R SFJ' },
          { id: 'sfjL', actions: ['ven.sfj', 'ven.cough', 'ven.tap'], at: sfjL, r: 11, label: 'L SFJ' },
          { id: 'calfR', actions: ['ven.palpate'], at: calfR, r: 16, label: 'R calf' },
          { id: 'calfL', actions: ['ven.palpate'], at: calfL, r: 16, label: 'L calf' },
          { id: 'ankR', actions: ['ven.oedema'], at: ankR, r: 11, label: 'R ankle' },
          { id: 'ankL', actions: ['ven.oedema'], at: ankL, r: 11, label: 'L ankle' },
        ]
    : [
        { id: 'sfjR', actions: ['ven.doppler'], at: sfjR, r: 12, label: 'R SFJ' },
        { id: 'sfjL', actions: ['ven.doppler'], at: sfjL, r: 12, label: 'L SFJ' },
        { id: 'femR', actions: ['ven.pulses'], at: lm.midInguinalR, r: 9, label: 'R femoral' },
        { id: 'femL', actions: ['ven.pulses'], at: lm.midInguinalL, r: 9, label: 'L femoral' },
        { id: 'dpR', actions: ['ven.pulses'], at: dpR, r: 8, label: 'R dorsalis pedis' },
        { id: 'dpL', actions: ['ven.pulses'], at: dpL, r: 8, label: 'L dorsalis pedis' },
      ]

  let content
  if (standing && back) {
    content = (
      <ClinicScene id="clinic">
        <LegsBack a={a} d={d} spec={legs} id="legsback" veinFill={fill} seed={c.id} />
      </ClinicScene>
    )
  } else if (standing) {
    content = (
      <ClinicScene id="clinic" body={body}>
        {front}
      </ClinicScene>
    )
  } else {
    content = (
      <BedScene id="stbed" body={body}>
        {front}
      </BedScene>
    )
  }
  return {
    content,
    rect: { cx: 0, cy: 598, w: 320, h: 500 },
    zones,
    aria: standing ? (back ? 'The backs of both legs, standing' : 'Both legs, standing') : 'Both legs, lying',
  }
}
