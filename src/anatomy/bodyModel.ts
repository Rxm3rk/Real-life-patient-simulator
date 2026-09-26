import { lerpPt, type Pt } from './geometry'
import type { Appearance } from './types'

/**
 * Anatomical body model in "body units": vertex of the head at y = 0, soles at
 * y ≈ 760 (one head height = 100 units ≈ 23 cm, so 1 cm ≈ 4.35 units).
 * x = 0 is the midline. The patient lies supine and we look down from the
 * ceiling, so the PATIENT'S RIGHT is on the VIEWER'S LEFT (x < 0).
 */
export const CM = 4.35

export interface BodyDims {
  neckW: number
  shoulderW: number
  chestW: number
  ribW: number
  waistW: number
  iliacW: number
  hipW: number
  trochW: number
  armScale: number
  legScale: number
  belly: number
}

export function bodyDims(a: Appearance): BodyDims {
  const male = a.sex === 'male'
  const d: BodyDims = male
    ? { neckW: 25, shoulderW: 100, chestW: 73, ribW: 69, waistW: 65, iliacW: 69, hipW: 74, trochW: 77, armScale: 1, legScale: 1, belly: 0 }
    : { neckW: 21, shoulderW: 88, chestW: 65, ribW: 61, waistW: 57.5, iliacW: 66, hipW: 77, trochW: 81, armScale: 0.9, legScale: 1.02, belly: 0 }

  const hab = a.habitus
  const k =
    hab === 'thin'
      ? { chest: 0.95, waist: 0.9, hip: 0.95, limb: 0.9, belly: -0.4 }
      : hab === 'overweight'
        ? { chest: 1.05, waist: 1.13, hip: 1.07, limb: 1.1, belly: 0.5 }
        : hab === 'obese'
          ? { chest: 1.12, waist: 1.3, hip: 1.16, limb: 1.22, belly: 1 }
          : { chest: 1, waist: 1, hip: 1, limb: 1, belly: 0 }
  const cach = a.cachexia ? 0.92 : 1

  d.neckW *= hab === 'obese' ? 1.12 : hab === 'thin' ? 0.94 : 1
  d.chestW *= k.chest * cach
  d.ribW *= k.chest * cach
  d.waistW *= k.waist * cach
  d.iliacW *= ((k.waist + k.hip) / 2) * cach
  d.hipW *= k.hip * cach
  d.trochW *= k.hip * cach
  d.shoulderW *= (k.chest + 1) / 2
  d.armScale *= k.limb * cach
  d.legScale *= k.limb * cach
  d.belly = k.belly

  const dist = a.distension ?? 0
  if (dist) {
    const fluid = a.distensionType === 'fluid'
    d.waistW += dist * (fluid ? 7 : 6)
    d.iliacW += dist * (fluid ? 7 : 4.5)
    d.ribW += dist * 2
    d.belly += dist * 0.35
  }
  return d
}

export interface Landmarks {
  sternalNotch: Pt
  xiphisternum: Pt
  nippleR: Pt
  nippleL: Pt
  umbilicus: Pt
  asisR: Pt
  asisL: Pt
  pubicTubercleR: Pt
  pubicTubercleL: Pt
  symphysis: Pt
  midInguinalR: Pt
  midInguinalL: Pt
  deepRingR: Pt
  deepRingL: Pt
  superficialRingR: Pt
  superficialRingL: Pt
  femoralCanalR: Pt
  femoralCanalL: Pt
  mcburney: Pt
  murphy: Pt
  /** 10th costal cartilage tips (lowest point of costal margin) */
  costalTipR: Pt
  costalTipL: Pt
  costalMarginR: Pt[]
  costalMarginL: Pt[]
  inguinalLigR: Pt[]
  inguinalLigL: Pt[]
  mclR: number
  mclL: number
  subcostalY: number
  transtubercularY: number
  aorta: Pt
  renalR: Pt
  renalL: Pt
  bladder: Pt
  liverUpperY: number
  liverEdgeY: number
  spleenTip: Pt
  epigastrium: Pt
  /** Radial pulse position (on the wrists) */
  radialR: Pt
  radialL: Pt
  femoralR: Pt
  femoralL: Pt
}

export function landmarks(a: Appearance, d: BodyDims = bodyDims(a)): Landmarks {
  const w = d.waistW / 63 // relative abdominal width
  const umbilicus: Pt = [0, 304 + d.belly * 4]
  const asisX = 70 * ((d.iliacW / 68 + d.hipW / 75) / 2)
  const asisR: Pt = [-asisX, 343]
  const asisL: Pt = [asisX, 343]
  const pubicTubercleR: Pt = [-12.5, 384]
  const pubicTubercleL: Pt = [12.5, 384]
  const mclX = 40 * Math.min(1.15, (d.chestW / 73 + w) / 2)
  const costalR = [
    [0, 240],
    [-12, 247],
    [-26, 257],
    [-mclX, 268],
    [-54 * w, 281],
    [-64 * w, 292],
  ] as Pt[]
  const costalL = costalR.map(([x, y]) => [-x, y] as Pt)
  const ligR = [asisR, [-58 * (asisX / 70), 356], [-42 * (asisX / 70), 368], [-26, 377], pubicTubercleR] as Pt[]
  const ligL = ligR.map(([x, y]) => [-x, y] as Pt)
  const midInguinalR = lerpPt(asisR, [0, 384], 0.5)
  const midInguinalL: Pt = [-midInguinalR[0], midInguinalR[1]]
  const ligMidR = lerpPt(asisR, pubicTubercleR, 0.5)
  const deepRingR: Pt = [ligMidR[0], ligMidR[1] - 1.5 * CM]
  const deepRingL: Pt = [-deepRingR[0], deepRingR[1]]
  const superficialRingR: Pt = [pubicTubercleR[0] - 5, pubicTubercleR[1] - 7]
  const superficialRingL: Pt = [-superficialRingR[0], superficialRingR[1]]
  const femoralCanalR: Pt = [pubicTubercleR[0] - 11, pubicTubercleR[1] + 9]
  const femoralCanalL: Pt = [-femoralCanalR[0], femoralCanalR[1]]
  const mcburney = lerpPt(asisR, umbilicus, 1 / 3)
  const murphy: Pt = [-mclX, 268]

  return {
    sternalNotch: [0, 141],
    xiphisternum: [0, 240],
    nippleR: [-46 * (d.chestW / 73), a.sex === 'female' ? 222 : 213],
    nippleL: [46 * (d.chestW / 73), a.sex === 'female' ? 222 : 213],
    umbilicus,
    asisR,
    asisL,
    pubicTubercleR,
    pubicTubercleL,
    symphysis: [0, 386],
    midInguinalR,
    midInguinalL,
    deepRingR,
    deepRingL,
    superficialRingR,
    superficialRingL,
    femoralCanalR,
    femoralCanalL,
    mcburney,
    murphy,
    costalTipR: costalR[costalR.length - 1],
    costalTipL: costalL[costalL.length - 1],
    costalMarginR: costalR,
    costalMarginL: costalL,
    inguinalLigR: ligR,
    inguinalLigL: ligL,
    mclR: -mclX * 0.95,
    mclL: mclX * 0.95,
    subcostalY: 292,
    transtubercularY: 326,
    aorta: [3, 282],
    renalR: [-30, 290],
    renalL: [30, 290],
    bladder: [0, 364],
    liverUpperY: 224,
    liverEdgeY: 268,
    spleenTip: [60 * w, 282],
    epigastrium: [0, 262],
    radialR: [0, 0],
    radialL: [0, 0],
    femoralR: midInguinalR,
    femoralL: midInguinalL,
  }
}

/** Right-half torso contour (viewer's right), from under the chin to the crotch. */
export function torsoContour(d: BodyDims, sex: Appearance['sex']): Pt[] {
  const female = sex === 'female'
  return [
    [0, 92],
    [d.neckW * 0.86, 94],
    [d.neckW, 110],
    [d.neckW + 3, 123],
    [d.neckW + 20, 131],
    [d.shoulderW - 32, 138],
    [d.shoulderW - 11, 146],
    [d.shoulderW - 1, 161],
    [d.shoulderW - 4, 184],
    [d.chestW + 5, 204],
    [d.chestW + 2, female ? 226 : 228],
    [d.ribW, 262],
    [d.waistW, 298],
    [d.iliacW, 323],
    [d.hipW, 346],
    [d.hipW + 1, 352],
    // lower edge follows the inguinal crease obliquely down to the pubis
    [d.hipW * 0.8, 361],
    [d.hipW * 0.6, 372],
    [d.hipW * 0.4, 384],
    [d.hipW * 0.2, 396],
    [0, 402],
  ]
}

export interface LimbOutline {
  outer: Pt[]
  inner: Pt[]
  /** Wrist centre + axis direction, used to place the hand */
  wrist: Pt
  wristDir: Pt
  wristHalfWidth: number
  elbow: Pt
}

/**
 * Right arm (viewer's right = patient's LEFT) built from a centreline.
 * `abductionDeg` is the upper-arm angle from hanging straight down;
 * `forearmDeg` the forearm angle on the same scale (default: nearly straight).
 */
export function armOutline(d: BodyDims, abductionDeg = 11, forearmDeg?: number): LimbOutline {
  const s = d.armScale
  const shoulder: Pt = [d.shoulderW - 17, 166]
  const ang = (abductionDeg * Math.PI) / 180
  const upperLen = 128
  const foreLen = 106
  const elbow: Pt = [shoulder[0] + Math.sin(ang) * upperLen, shoulder[1] + Math.cos(ang) * upperLen]
  const ang2 = forearmDeg === undefined ? ang + (3 * Math.PI) / 180 : (forearmDeg * Math.PI) / 180
  const wrist: Pt = [elbow[0] + Math.sin(ang2) * foreLen, elbow[1] + Math.cos(ang2) * foreLen]

  // centreline samples: [point, halfWidth]
  const samples: [Pt, number][] = [
    [shoulder, 21 * s],
    [lerpPt(shoulder, elbow, 0.22), 19.5 * s],
    [lerpPt(shoulder, elbow, 0.55), 17 * s],
    [lerpPt(shoulder, elbow, 0.86), 15 * s],
    [elbow, 14.5 * s],
    [lerpPt(elbow, wrist, 0.22), 16 * s],
    [lerpPt(elbow, wrist, 0.55), 14 * s],
    [lerpPt(elbow, wrist, 0.85), 11.8 * s],
    [wrist, 11 * s],
  ]
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i < samples.length; i++) {
    const [p, hw] = samples[i]
    const prev = samples[Math.max(0, i - 1)][0]
    const next = samples[Math.min(samples.length - 1, i + 1)][0]
    const dx = next[0] - prev[0]
    const dy = next[1] - prev[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = dy / len
    const ny = -dx / len
    outer.push([p[0] + nx * hw, p[1] + ny * hw])
    inner.push([p[0] - nx * hw, p[1] - ny * hw])
  }
  // the deltoid cap rounds over the shoulder (arm down)
  if (abductionDeg < 60) outer[0] = [d.shoulderW + 1, 170]
  const dirLen = foreLen
  return {
    outer,
    inner,
    wrist,
    wristDir: [(wrist[0] - elbow[0]) / dirLen, (wrist[1] - elbow[1]) / dirLen],
    wristHalfWidth: 11 * s,
    elbow,
  }
}

/** Right leg outline (viewer's right) from hip to toes. */
export function legOutline(d: BodyDims, sex: Appearance['sex']): Pt[] {
  const s = d.legScale
  const female = sex === 'female'
  const kneeIn = female ? 17 : 21
  const outer: Pt[] = [
    [d.hipW - 6, 330],
    [d.hipW + 1, 350],
    [d.trochW, 374],
    [d.trochW - 3, 402],
    [d.trochW - 9 * s, 440],
    [kneeIn + 52 * s, 480],
    [kneeIn + 46 * s, 520],
    [kneeIn + 44 * s, 548],
    [kneeIn + 44 * s, 575],
    [kneeIn + 47 * s, 612],
    [kneeIn + 43 * s, 655],
    [kneeIn + 35, 700],
    [kneeIn + 32, 728],
    [kneeIn + 35, 740],
  ]
  const foot: Pt[] = [
    [kneeIn + 40, 756],
    [kneeIn + 38, 778],
    [kneeIn + 31, 794],
    [kneeIn + 20, 801],
    [kneeIn + 10, 797],
    [kneeIn + 8, 780],
    [kneeIn + 10, 758],
  ]
  const inner: Pt[] = [
    [kneeIn + 13, 737],
    [kneeIn + 12, 716],
    [kneeIn + 7, 680],
    [kneeIn + 1 * s, 640],
    [kneeIn - 3 * s, 606],
    [kneeIn - 2, 576],
    [kneeIn, 550],
    [kneeIn - 2, 522],
    [kneeIn - 7 * s, 488],
    [7 - 2 * s, 450],
    [3, 415],
    [3, 396],
    [8, 370],
    [30, 340],
  ]
  return [...outer, ...foot, ...inner]
}

/** The 9 abdominal regions as polygons (for hit-testing and the teaching overlay). */
export type RegionId =
  | 'RUQ'
  | 'EPI'
  | 'LUQ'
  | 'RF'
  | 'UMB'
  | 'LF'
  | 'RIF'
  | 'SP'
  | 'LIF'

export const REGION_LABEL: Record<RegionId, string> = {
  RUQ: 'Right hypochondrium',
  EPI: 'Epigastrium',
  LUQ: 'Left hypochondrium',
  RF: 'Right flank (lumbar)',
  UMB: 'Umbilical region',
  LF: 'Left flank (lumbar)',
  RIF: 'Right iliac fossa',
  SP: 'Suprapubic (hypogastrium)',
  LIF: 'Left iliac fossa',
}

export const REGION_SHORT: Record<RegionId, string> = {
  RUQ: 'R hypochondrium',
  EPI: 'Epigastric',
  LUQ: 'L hypochondrium',
  RF: 'R flank',
  UMB: 'Umbilical',
  LF: 'L flank',
  RIF: 'RIF',
  SP: 'Suprapubic',
  LIF: 'LIF',
}

export const REGION_ORDER: RegionId[] = ['RUQ', 'EPI', 'LUQ', 'RF', 'UMB', 'LF', 'RIF', 'SP', 'LIF']

export function regionAt(pt: Pt, lm: Landmarks, d: BodyDims): RegionId | null {
  const [x, y] = pt
  const top = 236
  const bottom = 392
  if (y < top || y > bottom) return null
  // lateral limits follow the flank contour roughly
  const halfW = y < 262 ? d.ribW : y < 298 ? d.waistW + 2 : y < 323 ? d.iliacW : d.hipW
  if (Math.abs(x) > halfW + 4) return null
  // costal margin: above it is chest wall, except the epigastric angle
  const col = x < lm.mclR ? 0 : x > lm.mclL ? 2 : 1
  const row = y < lm.subcostalY ? 0 : y < lm.transtubercularY ? 1 : 2
  if (row === 0) {
    // must be below the costal margin line to be abdomen (roughly)
    const cm = costalYAt(Math.abs(x), lm)
    if (y < cm - 14) return null
  }
  if (row === 2 && y > inguinalYAt(Math.abs(x), lm) + 4) return null
  return (
    [
      ['RUQ', 'EPI', 'LUQ'],
      ['RF', 'UMB', 'LF'],
      ['RIF', 'SP', 'LIF'],
    ] as RegionId[][]
  )[row][col]
}

export function costalYAt(absX: number, lm: Landmarks): number {
  const pts = lm.costalMarginL
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    if (absX >= x1 && absX <= x2) return y1 + ((absX - x1) / (x2 - x1)) * (y2 - y1)
  }
  return pts[pts.length - 1][1]
}

export function inguinalYAt(absX: number, lm: Landmarks): number {
  const pts = lm.inguinalLigL.slice().reverse() // from pubic tubercle outwards
  if (absX <= pts[0][0]) return pts[0][1]
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    if (absX >= x1 && absX <= x2) return y1 + ((absX - x1) / (x2 - x1)) * (y2 - y1)
  }
  return pts[pts.length - 1][1]
}

/** Centre point of each region for placing markers/labels. */
export function regionCentre(r: RegionId, lm: Landmarks): Pt {
  const xs = { R: (lm.mclR - 58) / 2 - 2, M: 0, L: (lm.mclL + 58) / 2 + 2 }
  const ys = { U: 268, M: (lm.subcostalY + lm.transtubercularY) / 2, B: 352 }
  const map: Record<RegionId, Pt> = {
    RUQ: [xs.R, ys.U + 6],
    EPI: [0, ys.U - 4],
    LUQ: [xs.L, ys.U + 6],
    RF: [xs.R - 2, ys.M],
    UMB: [0, ys.M],
    LF: [xs.L + 2, ys.M],
    RIF: [xs.R + 4, ys.B - 4],
    SP: [0, ys.B + 6],
    LIF: [xs.L - 4, ys.B - 4],
  }
  return map[r]
}
