import { ANUS, clockPt, lesionPt, PERIANAL_VIEWBOX, PerianalView } from '../../../../anatomy/PerianalView'
import { lastIndex, type SceneCtx, type SceneSpec, type Zone } from '../types'

export function perianalScene(x: SceneCtx): SceneSpec {
  const { c, exposed, cue, log } = x
  const spec = c.visual?.perianal
  // the buttocks stay parted once inspected; the finger shows during the DRE; the scope view while it is in
  const lastDre = lastIndex(log, ['pr.insert', 'pr.tone', 'pr.sweep', 'pr.anterior'])
  const lastScope = lastIndex(log, ['pr.proctoscope'])
  const lastOther = lastIndex(
    log,
    log.map((e) => e.action).filter((a) => a.startsWith('pr.') && !['pr.insert', 'pr.tone', 'pr.sweep', 'pr.anterior', 'pr.proctoscope'].includes(a)),
  )
  // a proctoscope the patient could not tolerate never gets in
  const tolerated = !spec?.spasm && (c.keyed?.['pr.proctoscope']?.reaction ?? 0) < 0.9
  const scope = tolerated && (cue.kind === 'proctoscope' || (lastScope >= 0 && lastScope > lastOther && lastScope > lastDre))
  const finger = !scope && (cue.kind === 'finger' || (lastDre >= 0 && lastDre > lastOther))
  const parted = cue.kind === 'part' || lastIndex(log, ['pr.inspect', 'pr.palpate', 'pr.strain']) >= 0
  const lesion = lesionPt(spec)

  const zones: Zone[] = [
    { id: 'verge', actions: ['pr.inspect', 'pr.insert', 'pr.tone', 'pr.sweep', 'pr.anterior', 'pr.proctoscope'], at: ANUS, r: 16, label: 'Anal verge' },
    { id: 'skin', actions: ['pr.palpate'], at: lesion ?? clockPt(4, 34), r: lesion ? 18 : 16, label: lesion ? 'Lesion' : 'Perianal skin' },
    { id: 'nodesR', actions: ['pr.nodes'], at: [44, 40], r: 22, label: 'Inguinal nodes' },
    { id: 'nodesL', actions: ['pr.nodes'], at: [356, 40], r: 22, label: 'Inguinal nodes' },
  ]
  return {
    content: (
      <PerianalView
        a={c.patient.appearance}
        spec={spec}
        id="perianal"
        exposed={exposed}
        parted={parted}
        straining={cue.kind === 'strain'}
        finger={finger}
        scope={scope}
        sex={c.patient.sex}
      />
    ),
    rect: PERIANAL_VIEWBOX,
    zones,
    aria: 'Close-up of the perianal area in the left lateral position, drawn on the lithotomy clock face',
    effectScale: 2.4,
  }
}
