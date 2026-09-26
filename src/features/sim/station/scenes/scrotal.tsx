import { SCROTUM_VIEWBOX, scrotumGeom, ScrotumView } from '../../../../anatomy/ScrotumView'
import { lastIndex, type SceneCtx, type SceneSpec, type Zone } from '../types'

export function scrotalScene(x: SceneCtx): SceneSpec {
  const { c, exposed, cue, log } = x
  const spec = c.visual?.scrotum
  const lying = lastIndex(log, ['scr.lie']) >= 0 && cue.kind !== 'stand'
  const geo = scrotumGeom(spec, lying)
  const aff = spec?.side ?? 'right'
  const affC = aff === 'left' ? geo.left : geo.right
  const normC = aff === 'left' ? geo.right : geo.left
  const sx = aff === 'left' ? 1 : -1
  const zones: Zone[] = [
    { id: 'normal', actions: ['scr.normal'], at: normC, r: 20, label: 'Normal side' },
    { id: 'affected', actions: ['scr.affected', 'scr.separate'], at: affC, r: 22, label: 'Affected side' },
    { id: 'epi', actions: ['scr.epididymis'], at: [affC[0] + sx * 16, affC[1] - 16], r: 9, label: 'Epididymis' },
    { id: 'cord', actions: ['scr.cord', 'scr.getAbove'], at: aff === 'left' ? geo.cordL : geo.cordR, r: 11, label: 'Cord' },
    { id: 'nodesR', actions: ['scr.nodes'], at: geo.groinR, r: 16, label: 'Inguinal nodes' },
    { id: 'nodesL', actions: ['scr.nodes'], at: geo.groinL, r: 16, label: 'Inguinal nodes' },
  ]
  return {
    content: (
      <ScrotumView
        a={c.patient.appearance}
        spec={spec}
        id="scrotum"
        lying={lying}
        anatomy={!!x.extra.anatomy}
        torch={cue.kind === 'transilluminate'}
        exposed={exposed}
      />
    ),
    rect: SCROTUM_VIEWBOX,
    zones,
    aria: 'Close-up of the scrotum, penis covered by a towel',
    effectScale: 2.6,
  }
}
