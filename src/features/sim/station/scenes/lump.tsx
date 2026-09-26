import { LUMP_CM, LUMP_VIEWBOX, lumpCentre, LumpView } from '../../../../anatomy/LumpView'
import type { LumpVisual } from '../../../../engine/types'
import type { SceneCtx, SceneSpec } from '../types'

const DEFAULT: LumpVisual = { site: 'forearm', side: 'right', w: 3, h: 2.5, kind: 'lipoma' }

export function lumpScene(x: SceneCtx): SceneSpec {
  const { c, exposed, cue } = x
  const spec = c.visual?.lump ?? DEFAULT
  const [cx, cy] = lumpCentre(spec)
  const r = (Math.max(spec.w, spec.h) * LUMP_CM) / 2
  return {
    content: (
      <LumpView
        a={c.patient.appearance}
        spec={spec}
        id="lumpview"
        exposed={exposed}
        torch={cue.kind === 'transilluminate'}
        measure={cue.kind === 'measure'}
        pinch={x.log.length > 0 && x.log[x.log.length - 1].action === 'lump.skin'}
      />
    ),
    rect: LUMP_VIEWBOX,
    zones: [
      {
        id: 'lump',
        actions: ['lump.temp', 'lump.tender', 'lump.surface', 'lump.consistency', 'lump.fluctuation', 'lump.skin', 'lump.deep', 'lump.pulsation', 'lump.compress', 'lump.slip'],
        at: [cx, cy],
        r: r + 12,
        label: 'Lump',
      },
    ],
    aria: `Close-up of a lump on the ${spec.side} ${spec.site.replace('-', ' ')}`,
    effectScale: 3.2,
  }
}
