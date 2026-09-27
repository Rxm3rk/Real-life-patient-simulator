import type { ExamKind } from '../../../engine/types'

/** Stations (and views) examined on the 3D patient; the scrotal examination keeps its illustrated close-up. */
export function has3dStation(exam: ExamKind): boolean {
  return exam !== 'scrotal' && exam !== 'abdominal'
}
