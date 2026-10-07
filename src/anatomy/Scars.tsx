import { memo } from 'react'
import type { Landmarks } from './bodyModel'
import { mix } from './color'
import { lerpPt, smoothPath, type Pt } from './geometry'
import type { SkinPalette } from './palette'
import type { ScarId, SkinTone } from './types'

export interface ScarInfo {
  id: ScarId
  name: string
  operation: string
  note?: string
}

/** Teaching metadata for every scar the renderer can draw. */
export const SCAR_INFO: Record<ScarId, ScarInfo> = {
  lanz: {
    id: 'lanz',
    name: 'Lanz incision',
    operation: 'Open appendicectomy',
    note: 'Transverse skin-crease incision in the right iliac fossa; better cosmesis than a gridiron.',
  },
  gridiron: {
    id: 'gridiron',
    name: 'Gridiron (McBurney) incision',
    operation: 'Open appendicectomy',
    note: 'Oblique incision through McBurney’s point, perpendicular to the spino-umbilical line.',
  },
  kocher: {
    id: 'kocher',
    name: 'Kocher (right subcostal) incision',
    operation: 'Open cholecystectomy, liver or biliary surgery',
    note: 'Parallel to and ~2–3 cm below the right costal margin.',
  },
  midline: {
    id: 'midline',
    name: 'Midline laparotomy',
    operation: 'Emergency laparotomy, bowel resection, AAA repair',
    note: 'Along the linea alba from xiphisternum to pubis, skirting the umbilicus.',
  },
  'upper-midline': {
    id: 'upper-midline',
    name: 'Upper midline laparotomy',
    operation: 'Gastric or duodenal surgery (e.g. perforated ulcer repair), splenectomy',
  },
  'lower-midline': {
    id: 'lower-midline',
    name: 'Lower midline laparotomy',
    operation: 'Pelvic / colorectal surgery, e.g. Hartmann’s procedure',
  },
  pfannenstiel: {
    id: 'pfannenstiel',
    name: 'Pfannenstiel incision',
    operation: 'Caesarean section, hysterectomy, bladder or prostate surgery',
    note: 'Curved transverse incision ~2 fingerbreadths above the pubic symphysis.',
  },
  'lap-chole': {
    id: 'lap-chole',
    name: 'Laparoscopic port-site scars (×4)',
    operation: 'Laparoscopic cholecystectomy',
    note: 'Umbilical camera port, epigastric port and two right upper quadrant ports.',
  },
  'lap-appendix': {
    id: 'lap-appendix',
    name: 'Laparoscopic port-site scars (×3)',
    operation: 'Laparoscopic appendicectomy',
    note: 'Umbilical, suprapubic and left iliac fossa ports.',
  },
  'lap-bariatric': {
    id: 'lap-bariatric',
    name: 'Upper abdominal laparoscopic port-site scars (×5)',
    operation: 'Laparoscopic bariatric surgery (gastric bypass or sleeve gastrectomy)',
    note: 'Camera port above and left of the umbilicus, a subxiphoid liver-retractor port and working ports in both upper quadrants.',
  },
  'lap-colorectal': {
    id: 'lap-colorectal',
    name: 'Laparoscopic port-site scars (×4) with a low transverse extraction wound',
    operation: 'Laparoscopic colorectal resection (e.g. anterior resection, sigmoid colectomy)',
    note: 'Umbilical camera port, two right-sided working ports and a left-sided port; the specimen comes out through a short Pfannenstiel-type incision.',
  },
  rooftop: {
    id: 'rooftop',
    name: 'Rooftop (chevron / bilateral subcostal) incision',
    operation: 'Liver resection, pancreatic surgery (Whipple’s), liver transplant',
  },
  mercedes: {
    id: 'mercedes',
    name: 'Mercedes-Benz incision',
    operation: 'Liver transplantation, major upper GI surgery',
    note: 'Rooftop incision with an upward midline extension to the xiphisternum.',
  },
  'right-paramedian': {
    id: 'right-paramedian',
    name: 'Right paramedian incision',
    operation: 'Older approach to laparotomy (now rarely used)',
  },
  'left-inguinal': {
    id: 'left-inguinal',
    name: 'Left inguinal incision',
    operation: 'Open left inguinal hernia repair (e.g. Lichtenstein mesh repair)',
  },
  'right-inguinal': {
    id: 'right-inguinal',
    name: 'Right inguinal incision',
    operation: 'Open right inguinal hernia repair (e.g. Lichtenstein mesh repair)',
  },
  'rutherford-morison-right': {
    id: 'rutherford-morison-right',
    name: 'Rutherford Morison (hockey-stick) incision',
    operation: 'Renal transplant (right iliac fossa)',
    note: 'Look for a palpable, non-tender transplanted kidney beneath it.',
  },
  'left-loin': {
    id: 'left-loin',
    name: 'Left loin incision',
    operation: 'Open nephrectomy',
  },
  umbilical: {
    id: 'umbilical',
    name: 'Periumbilical incision',
    operation: 'Umbilical / paraumbilical hernia repair',
  },
  'thyroid-collar': {
    id: 'thyroid-collar',
    name: 'Kocher’s collar incision',
    operation: 'Thyroidectomy / parathyroidectomy',
  },
  sternotomy: {
    id: 'sternotomy',
    name: 'Median sternotomy',
    operation: 'Cardiac surgery (CABG, valve replacement)',
  },
}

type Stroke = { d: string; kind: 'long' | 'port' }

export function scarGeometry(id: ScarId, lm: Landmarks): Stroke[] {
  const u = lm.umbilicus
  const mcb = lm.mcburney
  const port = (p: Pt, len = 5, ang = 0): Stroke => {
    const dx = (Math.cos(ang) * len) / 2
    const dy = (Math.sin(ang) * len) / 2
    return { d: smoothPath([[p[0] - dx, p[1] - dy], [p[0], p[1] + 0.8], [p[0] + dx, p[1] + dy]]), kind: 'port' }
  }
  switch (id) {
    case 'lanz':
      return [{ d: smoothPath([[mcb[0] - 13, mcb[1] + 6], [mcb[0], mcb[1] + 5], [mcb[0] + 12, mcb[1] + 1]]), kind: 'long' }]
    case 'gridiron': {
      const v: Pt = [u[0] - lm.asisR[0], u[1] - lm.asisR[1]]
      const len = Math.hypot(v[0], v[1])
      const perp: Pt = [-v[1] / len, v[0] / len]
      return [{ d: smoothPath([[mcb[0] - perp[0] * 14, mcb[1] - perp[1] * 14], mcb, [mcb[0] + perp[0] * 14, mcb[1] + perp[1] * 14]]), kind: 'long' }]
    }
    case 'kocher':
      return [{ d: smoothPath(lm.costalMarginR.slice(1).map(([x, y]) => [x * 1.02 - 1, y + 12] as Pt)), kind: 'long' }]
    case 'midline':
      return [
        {
          d: smoothPath([
            [0, 246],
            [0, u[1] - 14],
            [6, u[1] - 7],
            [8.5, u[1]],
            [6, u[1] + 7],
            [0, u[1] + 14],
            [0, 378],
          ]),
          kind: 'long',
        },
      ]
    case 'upper-midline':
      return [{ d: smoothPath([[0, 246], [0, u[1] - 14], [5.5, u[1] - 7], [7.5, u[1]]]), kind: 'long' }]
    case 'lower-midline':
      return [{ d: smoothPath([[7.5, u[1]], [5.5, u[1] + 7], [0, u[1] + 14], [0, 378]]), kind: 'long' }]
    case 'pfannenstiel':
      return [{ d: smoothPath([[-36, 372], [0, 379], [36, 372]]), kind: 'long' }]
    case 'lap-chole':
      return [
        { d: smoothPath([[-4.5, u[1] - 8.5], [0, u[1] - 10], [4.5, u[1] - 8.5]]), kind: 'port' },
        port([-5, 254], 6, 0.1),
        port([lm.mclR, 288], 4, 0.3),
        port([lm.costalTipR[0] + 2, 306], 4, 0.4),
      ]
    case 'lap-appendix':
      return [
        { d: smoothPath([[-4.5, u[1] + 8.5], [0, u[1] + 10], [4.5, u[1] + 8.5]]), kind: 'port' },
        port([0, 368], 4),
        port([Math.abs(mcb[0]), mcb[1] + 4], 4, -0.3),
      ]
    case 'lap-bariatric':
      return [
        port([7, u[1] - 26], 5, -0.1),
        port([-2, 252], 4),
        port([lm.mclR, 288], 4, 0.3),
        port([lm.mclL, 290], 5, -0.3),
        port([lm.costalTipL[0] - 8, 310], 4, -0.4),
      ]
    case 'lap-colorectal':
      return [
        { d: smoothPath([[-4.5, u[1] + 8.5], [0, u[1] + 10], [4.5, u[1] + 8.5]]), kind: 'port' },
        port([lm.mclR, u[1] - 8], 4, 0.3),
        port([lm.mclR - 4, lm.transtubercularY - 6], 5, -0.3),
        port([lm.mclL + 4, lm.transtubercularY - 6], 4, 0.3),
        { d: smoothPath([[-17, 374], [0, 378.5], [17, 374]]), kind: 'long' },
      ]
    case 'rooftop': {
      const r = lm.costalMarginR.slice(1).map(([x, y]) => [x * 1.02, y + 12] as Pt)
      const l = r.map(([x, y]) => [-x, y] as Pt)
      return [{ d: smoothPath([...r.slice().reverse(), [0, 256], ...l]), kind: 'long' }]
    }
    case 'mercedes': {
      const base = scarGeometry('rooftop', lm)
      return [...base, { d: smoothPath([[0, 256], [0, 238], [0, 222]]), kind: 'long' }]
    }
    case 'right-paramedian':
      return [{ d: smoothPath([[-15, 250], [-15.5, 300], [-15, 362]]), kind: 'long' }]
    case 'right-inguinal':
    case 'left-inguinal': {
      const s = id === 'right-inguinal' ? 1 : -1
      const pts: Pt[] = [
        [-15, 372],
        [-28, 367],
        [-41, 360],
        [-53, 351],
      ]
      return [{ d: smoothPath(pts.map(([x, y]) => [x * s, y] as Pt)), kind: 'long' }]
    }
    case 'rutherford-morison-right':
      return [{ d: smoothPath([[-77, 310], [-73, 334], [-60, 352], [-40, 364], [-18, 371]]), kind: 'long' }]
    case 'left-loin':
      return [{ d: smoothPath([[62, 276], [70, 292], [76, 308]]), kind: 'long' }]
    case 'umbilical':
      return [{ d: smoothPath([[-8, u[1] + 7], [0, u[1] + 10.5], [8, u[1] + 7]]), kind: 'long' }]
    case 'thyroid-collar':
      return [{ d: smoothPath([[-21, 124], [0, 129], [21, 124]]), kind: 'long' }]
    case 'sternotomy':
      return [{ d: smoothPath([[0, 147], [0, 190], [0, 236]]), kind: 'long' }]
  }
}

/** Positions of scars for tap-to-identify (a representative point for each). */
export function scarAnchor(id: ScarId, lm: Landmarks): Pt {
  const u = lm.umbilicus
  switch (id) {
    case 'lanz':
    case 'gridiron':
      return lm.mcburney
    case 'kocher':
      return [-34, 284]
    case 'midline':
    case 'upper-midline':
      return [0, 270]
    case 'lower-midline':
      return [0, 345]
    case 'pfannenstiel':
      return [0, 377]
    case 'lap-chole':
      return [0, u[1] - 9]
    case 'lap-appendix':
      return [0, u[1] + 9]
    case 'lap-bariatric':
      return [7, u[1] - 26]
    case 'lap-colorectal':
      return [0, 377]
    case 'rooftop':
    case 'mercedes':
      return [0, 256]
    case 'right-paramedian':
      return [-15, 300]
    case 'right-inguinal':
      return lerpPt([-15, 372], [-53, 351], 0.5)
    case 'left-inguinal':
      return lerpPt([15, 372], [53, 351], 0.5)
    case 'rutherford-morison-right':
      return [-60, 352]
    case 'left-loin':
      return [70, 292]
    case 'umbilical':
      return [0, u[1] + 9]
    case 'thyroid-collar':
      return [0, 127]
    case 'sternotomy':
      return [0, 190]
  }
}

export const Scars = memo(function Scars({
  scars,
  lm,
  pal,
  skinTone,
}: {
  scars: ScarId[]
  lm: Landmarks
  pal: SkinPalette
  skinTone: SkinTone
}) {
  if (!scars.length) return null
  const dark = skinTone >= 4
  const scarColor = dark ? mix(pal.base, '#3d2a24', 0.35) : mix(pal.base, '#f6e6e4', 0.55)
  const edge = dark ? mix(pal.base, '#ead7cf', 0.3) : mix(pal.base, '#b77a74', 0.35)
  return (
    <g strokeLinecap="round" fill="none">
      {scars.flatMap((id) =>
        scarGeometry(id, lm).map((s, i) => (
          <g key={`${id}-${i}`}>
            <path d={s.d} stroke={edge} strokeWidth={s.kind === 'port' ? 2.6 : 3.4} opacity="0.55" />
            <path d={s.d} stroke={scarColor} strokeWidth={s.kind === 'port' ? 1.7 : 2.2} />
            <path d={s.d} stroke="#fff" strokeWidth="0.5" opacity="0.35" transform="translate(-0.4 -0.5)" />
          </g>
        )),
      )}
    </g>
  )
})
