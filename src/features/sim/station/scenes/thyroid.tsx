import { HandsIllustration } from '../../../../anatomy/Hands'
import { NECK_VIEWBOX, NeckBust } from '../../../../anatomy/NeckBust'
import type { SceneCtx, SceneSpec, Zone } from '../types'

export function thyroidScene(x: SceneCtx): SceneSpec {
  const { c, view, exposed, cue } = x
  const a = c.patient.appearance
  const neck = c.visual?.neck

  if (view === 'hands') {
    const tremorOn = cue.kind === 'tremor'
    const shaking = tremorOn && (neck?.tremor ?? 0) > 0
    const amp = 0.6 + (neck?.tremor ?? 0) * 1.4
    return {
      content: (
        <g>
          <rect x={-400} y={-300} width={1200} height={900} fill="var(--stage)" />
          <g
            className="text-ink"
            style={shaking ? { transformBox: 'fill-box', transformOrigin: '50% 90%', animation: `bs-tremor ${(0.11 / amp).toFixed(3)}s linear infinite` } : undefined}
          >
            <HandsIllustration
              a={a}
              id="thyhands"
              view={tremorOn ? 'outstretched' : 'dorsal'}
              signs={{
                clubbing: neck?.acropachy,
                palmarErythema: neck?.palmarErythema,
                sweaty: neck?.sweaty,
                onycholysis: neck?.onycholysis,
              }}
            />
            {tremorOn && (
              // a sheet of paper laid across the backs of the outstretched hands exaggerates a fine tremor
              <g opacity="0.96">
                <path d="M92 132 L312 124 L316 196 L96 204 Z" fill="#fbfbf8" stroke="#dcdcd4" strokeWidth="1" />
                <path d="M110 150 L296 144 M110 162 L270 157 M110 174 L286 169" stroke="#c9ccd2" strokeWidth="1.2" />
              </g>
            )}
          </g>
        </g>
      ),
      rect: { cx: 200, cy: 185, w: 400, h: 300 },
      zones: [
        { id: 'wristR', actions: ['thy.pulse'], at: [96, 300], r: 30, label: 'Right radial' },
        { id: 'wristL', actions: ['thy.pulse'], at: [304, 300], r: 30, label: 'Left radial' },
        { id: 'handR', actions: ['thy.hands'], at: [110, 170], r: 50, label: 'Right hand' },
        { id: 'handL', actions: ['thy.hands'], at: [290, 170], r: 50, label: 'Left hand' },
      ],
      aria: 'The patient’s hands',
      effectScale: 3,
    }
  }

  const st = {
    swallow: cue.kind === 'swallow' ? 1 : 0,
    tongue: cue.kind === 'tongue' ? 1 : 0,
    gazeDown: cue.kind === 'lid-lag' ? 1 : 0,
    pemberton: cue.kind === 'pemberton' ? 1 : 0,
    pain: x.pain,
    wince: x.wince,
    lookAt: 'examiner' as const,
  }
  const zones: Zone[] = [
    { id: 'thyroid', actions: ['thy.palpate', 'thy.bruit'], at: [0, 128], r: 18, label: 'Thyroid' },
    { id: 'trachea', actions: ['thy.trachea'], at: [0, 149], r: 6, label: 'Trachea (sternal notch)' },
    { id: 'manubrium', actions: ['thy.percuss'], at: [0, 172], r: 10, label: 'Manubrium' },
    { id: 'nodesR', actions: ['thy.nodes'], at: [-34, 104], r: 12, label: 'Cervical nodes' },
    { id: 'nodesL', actions: ['thy.nodes'], at: [34, 104], r: 12, label: 'Cervical nodes' },
    { id: 'eyes', actions: ['thy.eyes', 'thy.lidlag', 'thy.eom'], at: [0, 47], r: 20, label: 'Eyes' },
    { id: 'mouth', actions: ['thy.swallow', 'thy.tongue'], at: [0, 80], r: 9, label: 'Mouth' },
    ...(c.visual?.neck?.thyroglossal ? [{ id: 'cyst', actions: ['thy.palpate'], at: [0, 114] as [number, number], r: 8, label: 'Midline lump' }] : []),
  ]
  const eyeZoom = cue.kind === 'eyes' || cue.kind === 'lid-lag'
  return {
    content: <NeckBust a={a} neck={neck} st={st} id="neckbust" exposed={exposed} />,
    rect: eyeZoom ? { cx: 0, cy: 50, w: 110, h: 80 } : NECK_VIEWBOX,
    zones,
    aria: `${c.patient.name}’s face and neck`,
    effectScale: 0.9,
    faceVisible: true,
  }
}
