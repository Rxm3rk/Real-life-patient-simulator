import type { ArmPose, BodyProps } from '../../../../anatomy/Body'
import { bodyDims, landmarks } from '../../../../anatomy/bodyModel'
import { breastCentres, BreastSigns, clockPoint } from '../../../../anatomy/BreastSigns'
import { ClinicScene } from '../../../../anatomy/Clinic'
import type { Pt } from '../../../../anatomy/geometry'
import { lastIndex, type SceneCtx, type SceneSpec, type Zone } from '../types'

export function breastArmPose(x: SceneCtx): ArmPose {
  if (x.cue.kind === 'arms-up') return 'up'
  if (x.cue.kind === 'hands-hips') return 'hips'
  if (x.cue.kind === 'arms-side') return 'sides'
  const i = lastIndex(x.log, ['br.inspectSide', 'br.inspectHips', 'br.inspectUp', 'br.fixity', 'br.palpNormal', 'br.palpAffected'])
  const a = i >= 0 ? x.log[i].action : ''
  return a === 'br.inspectUp' ? 'up' : a === 'br.inspectHips' || a === 'br.fixity' ? 'hips' : 'sides'
}

export function breastScene(x: SceneCtx): SceneSpec {
  const { c, exposed } = x
  const a = c.patient.appearance
  const d = bodyDims(a)
  const lm = landmarks(a, d)
  const spec = c.visual?.breast ?? {}
  const pose = breastArmPose(x)
  const body: BodyProps = {
    a,
    pose: { exposure: exposed ? 'torso' : 'gowned', pain: x.pain, wince: x.wince, lookAt: 'examiner' },
    id: 'stbody',
    seed: c.id,
    armPose: exposed ? pose : 'sides',
  }
  const affected = spec.lump?.side ?? spec.nipple?.side ?? 'left'
  const { right, left } = breastCentres(lm, d, pose)
  const normalC = affected === 'left' ? right : left
  const affC = affected === 'left' ? left : right
  const lumpAt: Pt | null = spec.lump ? clockPoint(affected === 'left' ? [lm.nippleL[0], affC[1]] : [lm.nippleR[0], affC[1]], spec.lump.clock, spec.lump.distCm) : null
  const axR: Pt = [-(d.chestW + 10), 192]
  const axL: Pt = [d.chestW + 10, 192]

  const zones: Zone[] = [
    { id: 'normal', actions: ['br.palpNormal'], at: [normalC[0] + (affected === 'left' ? -8 : 8), normalC[1] + 6], r: 20, label: 'Normal breast' },
    { id: 'affected', actions: ['br.palpAffected'], at: [affC[0] + (affected === 'left' ? 10 : -10), affC[1] + 10], r: 16, label: 'Affected breast' },
    ...(lumpAt ? [{ id: 'lump', actions: ['br.lump', 'br.fixity'], at: lumpAt, r: 9, label: 'Lump' } as Zone] : []),
    { id: 'nipple', actions: ['br.nipple'], at: affected === 'left' ? [lm.nippleL[0], affC[1]] : [lm.nippleR[0], affC[1]], r: 6, label: 'Nipple' },
    { id: 'axR', actions: ['br.axillaR'], at: axR, r: 12, label: 'R axilla' },
    { id: 'axL', actions: ['br.axillaL'], at: axL, r: 12, label: 'L axilla' },
    { id: 'scfR', actions: ['br.scf'], at: [-34, 146], r: 9, label: 'Supraclavicular' },
    { id: 'scfL', actions: ['br.scf'], at: [34, 146], r: 9, label: 'Supraclavicular' },
  ]

  return {
    content: (
      <ClinicScene id="clinic" body={body}>
        {exposed && <BreastSigns a={a} d={d} lm={lm} spec={spec} pose={pose} id="brsigns" clockGuide={x.learn && x.log.some((e) => e.action === 'br.lump')} />}
      </ClinicScene>
    ),
    rect: !exposed ? { cx: 0, cy: 220, w: 320, h: 260 } : pose === 'up' ? { cx: 0, cy: 150, w: 330, h: 320 } : pose === 'hips' ? { cx: 0, cy: 246, w: 380, h: 320 } : { cx: 0, cy: 206, w: 290, h: 230 },
    zones,
    aria: `${c.patient.name} sitting for a breast examination`,
  }
}
