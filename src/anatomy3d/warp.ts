import * as THREE from 'three'
import type { Landmarks } from '../anatomy/bodyModel'
import type { Pt } from '../anatomy/geometry'
import type { Anatomy } from './anatomy'

/**
 * Two ways of describing the same body: the examination logic works in the 2D
 * body model's units (a patient seen from the ceiling, 1 cm ≈ 4.35 units, the
 * patient's right at x < 0), the 3D patient in rest-pose decimetres. The warp
 * maps between them through matching landmarks (vertex, chin, sternal notch,
 * xiphisternum, the subcostal and transtubercular planes, ASIS, pubic
 * tubercles, knees and ankles), so a tap on the 3D abdomen lands in the same
 * region the 2D model would give, and a 2D effect point appears on the skin.
 */
export interface BodyWarp {
  /** 2D body units → a point on the front of the rest-pose body, lifted `lift` off the skin */
  to3(pt: Pt, lift?: number): THREE.Vector3
  /** Rest-pose point → 2D body units */
  to2(p: THREE.Vector3): Pt
}

interface Row {
  y2: number
  y3: number
  /** x scale (3D per 2D unit) */
  sx: number
}

export function bodyWarp(lm: Landmarks, A: Anatomy, extra: { vertexY: number; chinY: number; knee: THREE.Vector3; ankle: THREE.Vector3 }): BodyWarp {
  const sxChest = Math.abs(A.nippleR.x) / Math.abs(lm.nippleR[0])
  const sxAbdo = A.mcl / Math.abs(lm.mclR)
  const sxAsis = Math.abs(A.asisR.x) / Math.abs(lm.asisR[0])
  const sxTub = Math.abs(A.pubicTubercleR.x) / Math.abs(lm.pubicTubercleR[0])
  // the 2D legs are drawn about x = ±43 at the knee and ankle
  const sxKnee = Math.abs(extra.knee.x) / 43
  const sxAnkle = Math.abs(extra.ankle.x) / 43.5
  const candidates: Row[] = [
    { y2: 0, y3: extra.vertexY, sx: sxChest },
    { y2: 92, y3: extra.chinY, sx: sxChest },
    { y2: lm.sternalNotch[1], y3: A.sternalNotch.y, sx: sxChest },
    { y2: lm.nippleR[1], y3: A.nippleR.y, sx: sxChest },
    { y2: lm.xiphisternum[1], y3: A.xiphoid.y, sx: sxAbdo },
    { y2: lm.subcostalY, y3: A.subcostalY, sx: sxAbdo },
    { y2: lm.transtubercularY, y3: A.transtubercularY, sx: sxAbdo },
    { y2: lm.asisR[1], y3: (A.asisR.y + A.asisL.y) / 2, sx: sxAsis },
    { y2: lm.pubicTubercleR[1], y3: A.pubicTubercleR.y, sx: sxTub },
    { y2: 560, y3: extra.knee.y, sx: sxKnee },
    { y2: 732, y3: extra.ankle.y, sx: sxAnkle },
    { y2: 800, y3: 0.1, sx: sxAnkle },
  ]
  // keep the table strictly monotonic (e.g. low-hanging breasts put the nipples below the xiphisternum)
  const rows: Row[] = []
  for (const r of candidates) {
    const last = rows[rows.length - 1]
    if (!last || (r.y2 > last.y2 && r.y3 < last.y3)) rows.push(r)
  }

  const seg2 = (y2: number) => {
    let i = 0
    while (i < rows.length - 2 && y2 > rows[i + 1].y2) i++
    const a = rows[i]
    const b = rows[i + 1]
    return { a, b, t: (y2 - a.y2) / (b.y2 - a.y2) }
  }
  const seg3 = (y3: number) => {
    let i = 0
    while (i < rows.length - 2 && y3 < rows[i + 1].y3) i++
    const a = rows[i]
    const b = rows[i + 1]
    return { a, b, t: (y3 - a.y3) / (b.y3 - a.y3) }
  }

  return {
    to3(pt, lift = 0) {
      const { a, b, t } = seg2(pt[1])
      const y = a.y3 + (b.y3 - a.y3) * t
      const x = pt[0] * (a.sx + (b.sx - a.sx) * THREE.MathUtils.clamp(t, 0, 1))
      return A.onFront(x, y, lift)
    },
    to2(p) {
      const { a, b, t } = seg3(p.y)
      const y2 = a.y2 + (b.y2 - a.y2) * t
      const sx = a.sx + (b.sx - a.sx) * THREE.MathUtils.clamp(t, 0, 1)
      return [p.x / sx, y2]
    },
  }
}
