import { Activity, Droplets, Footprints, HeartPulse, type LucideIcon, Scan, Shirt, Target, UserRound } from 'lucide-react'
import { protocolFor } from '../../engine/protocols'
import { STATIONS } from '../../engine/stations'
import type { ExamKind } from '../../engine/types'

export interface RoutineMeta {
  kind: ExamKind
  title: string
  short: string
  icon: LucideIcon
  blurb: string
  minutes: number
}

export const ROUTINES: RoutineMeta[] = [
  { kind: 'abdominal', title: 'Abdominal examination', short: 'Abdomen', icon: Target, blurb: 'End of the bed → hands → face → neck → chest → abdomen: inspect, palpate, percuss, auscultate.', minutes: 8 },
  { kind: 'groin', title: 'Groin & hernia examination', short: 'Hernia', icon: Activity, blurb: 'Standing first, the pubic tubercle, cough impulse, then lying: reduce and occlude the deep ring.', minutes: 6 },
  { kind: 'lump', title: 'Examination of a lump', short: 'Lump', icon: Scan, blurb: 'Site, size, shape, surface, edge, consistency, fixity, fluctuation, transillumination, nodes.', minutes: 5 },
  { kind: 'thyroid', title: 'Thyroid & neck examination', short: 'Thyroid', icon: UserRound, blurb: 'Hands, eyes, neck from the front (swallow, tongue), palpate from behind, then thyroid status.', minutes: 8 },
  { kind: 'breast', title: 'Breast examination', short: 'Breast', icon: Shirt, blurb: 'Chaperone, three inspection positions, normal side first, all quadrants, axillae and neck.', minutes: 8 },
  { kind: 'arterial', title: 'Peripheral arterial examination', short: 'Arterial', icon: HeartPulse, blurb: 'Inspect between the toes, temperature, capillary refill, pulses top to bottom, Buerger’s, ABPI.', minutes: 8 },
  { kind: 'venous', title: 'Varicose vein examination', short: 'Venous', icon: Droplets, blurb: 'Standing: front and back, skin changes, SFJ, cough and tap, Doppler, tourniquet, pulses.', minutes: 6 },
  { kind: 'scrotal', title: 'Scrotal & testicular examination', short: 'Scrotum', icon: Footprints, blurb: 'Chaperone and gloves; normal side first; can I get above it, is it separate, does it transilluminate?', minutes: 5 },
]

export const ROUTINE_BY_KIND = Object.fromEntries(ROUTINES.map((r) => [r.kind, r])) as Record<ExamKind, RoutineMeta>

export function routineSteps(kind: ExamKind) {
  return protocolFor(kind).steps
}

export function routineTask(kind: ExamKind) {
  return kind === 'abdominal' ? 'Examine this patient’s abdomen' : STATIONS[kind]?.task ?? ''
}
