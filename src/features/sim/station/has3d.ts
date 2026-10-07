import type { ExamKind } from '../../../engine/types'

/** Stations (and views) examined on the 3D patient; the scrotal and perianal examinations keep their illustrated close-ups. */
export function has3dStation(exam: ExamKind): boolean {
  return exam !== 'scrotal' && exam !== 'perianal' && exam !== 'abdominal'
}
