import type { CaseDef, ExamKind, Observation } from '../types'
import { BREAST } from './breast'
import { GROIN } from './groin'
import { LUMP } from './lump'
import { SCROTAL } from './scrotal'
import { THYROID } from './thyroid'
import type { StationAction, StationDef } from './types'
import { ARTERIAL, VENOUS } from './vascular'

export type { StationAction, StationCue, StationDef, StationView } from './types'

export const STATIONS: Partial<Record<ExamKind, StationDef>> = {
  groin: GROIN,
  lump: LUMP,
  thyroid: THYROID,
  breast: BREAST,
  arterial: ARTERIAL,
  venous: VENOUS,
  scrotal: SCROTAL,
}

export function stationFor(kind: ExamKind): StationDef | undefined {
  return STATIONS[kind]
}

const byId = new Map<StationDef, Record<string, StationAction>>()
export function stationActions(def: StationDef): Record<string, StationAction> {
  let m = byId.get(def)
  if (!m) {
    m = Object.fromEntries(def.actions.map((a) => [a.id, a]))
    byId.set(def, m)
  }
  return m
}

const pronouns = (c: CaseDef) =>
  c.patient.sex === 'male' ? { he: 'he', his: 'his', him: 'him' } : { he: 'she', his: 'her', him: 'her' }

/**
 * What the student perceives when performing a station action. Case-specific
 * findings (`c.keyed`) override the station's normal findings.
 */
export function observeStation(def: StationDef, c: CaseDef, action: string): Observation {
  const k = c.keyed?.[action]
  const p = pronouns(c)
  switch (action) {
    case 'comm.wash':
      return { text: 'You clean your hands with alcohol gel.' }
    case 'comm.intro':
      return { text: 'You introduce yourself by name and role.', says: k?.says ?? (c.patient.persona.mood === 'anxious' ? 'Hello, doctor.' : 'Hello, nice to meet you.') }
    case 'comm.identity':
      return { text: `${c.patient.name}, date of birth ${c.patient.dob}.`, says: `Yes — ${c.patient.name}, ${c.patient.dob}.` }
    case 'comm.consent':
      return { text: def.consentText, says: k?.says ?? 'Yes, that’s fine.' }
    case 'comm.chaperone':
      return {
        text: k?.text ?? 'You offer a chaperone.',
        says: k?.says ?? (def.intimate ? 'Yes please, I’d prefer that.' : 'No, that’s fine, thank you.'),
        meaning: def.intimate ? 'The chaperone’s name should be documented in the notes — or the patient’s refusal of one.' : undefined,
      }
    case 'comm.pain':
      return {
        text: 'You ask whether anything is painful before you start.',
        says: k?.says ?? 'No, it doesn’t hurt.',
        meaning: k?.meaning,
      }
    case 'comm.position':
      return { text: k?.text ?? def.positionText }
    case 'comm.expose':
      return { text: k?.text ?? def.exposeText }
    case 'comm.thank':
      return { text: `You thank ${c.patient.title}, help ${p.him} to dress and make sure ${p.he} is comfortable.`, says: 'Thank you, doctor.' }
  }
  const f = k ?? def.normal[action]
  if (!f) return { text: 'Nothing abnormal is found.' }
  return { text: f.text, meaning: f.meaning, abnormal: f.abnormal, media: f.media, reaction: f.reaction, says: f.says }
}
