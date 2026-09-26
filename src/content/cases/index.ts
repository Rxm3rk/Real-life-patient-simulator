import type { CaseDef, CaseMeta } from '../../engine/types'

/**
 * The ward list. Metadata is kept here so the library renders instantly; the
 * full case (history script, findings, results, viva) loads on demand.
 */
export const CASES: CaseMeta[] = [
  {
    id: 'appendicitis',
    presenting: 'Right iliac fossa pain',
    specialty: 'Emergency general surgery',
    exam: 'abdominal',
    difficulty: 1,
    setting: 'Emergency department',
    patientLabel: 'James Carter',
    sex: 'male',
    age: 24,
    tags: ['acute abdomen', 'RIF pain'],
    load: () => import('./appendicitis').then((m) => m.default),
  },
  {
    id: 'cholecystitis',
    presenting: 'Right upper quadrant pain and fever',
    specialty: 'Hepatobiliary',
    exam: 'abdominal',
    difficulty: 1,
    setting: 'Surgical assessment unit',
    patientLabel: 'Sandra Hughes',
    sex: 'female',
    age: 46,
    tags: ['RUQ pain', 'gallstones'],
    load: () => import('./cholecystitis').then((m) => m.default),
  },
  {
    id: 'sbo-femoral',
    presenting: 'Vomiting and abdominal distension',
    specialty: 'Emergency general surgery',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Emergency department',
    patientLabel: 'Edith Clarke',
    sex: 'female',
    age: 83,
    tags: ['obstruction', 'hernia', 'elderly'],
    load: () => import('./sbo-femoral').then((m) => m.default),
  },
  {
    id: 'perforated-du',
    presenting: 'Sudden severe epigastric pain',
    specialty: 'Upper GI',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Emergency department',
    patientLabel: 'Marcus Reid',
    sex: 'male',
    age: 52,
    tags: ['peritonitis', 'NSAIDs'],
    load: () => import('./perforated-du').then((m) => m.default),
  },
  {
    id: 'pancreatitis',
    presenting: 'Epigastric pain radiating to the back',
    specialty: 'Hepatobiliary',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Emergency department',
    patientLabel: 'Daniel Kowalski',
    sex: 'male',
    age: 44,
    tags: ['epigastric pain', 'alcohol'],
    load: () => import('./pancreatitis').then((m) => m.default),
  },
  {
    id: 'diverticulitis',
    presenting: 'Left iliac fossa pain and fever',
    specialty: 'Colorectal',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Surgical assessment unit',
    patientLabel: 'Patricia Doyle',
    sex: 'female',
    age: 68,
    tags: ['LIF pain', 'abscess'],
    load: () => import('./diverticulitis').then((m) => m.default),
  },
  {
    id: 'cholangitis',
    presenting: 'Fever, jaundice and RUQ pain',
    specialty: 'Hepatobiliary',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Emergency department',
    patientLabel: 'Samuel Okoye',
    sex: 'male',
    age: 72,
    tags: ['jaundice', 'sepsis'],
    load: () => import('./cholangitis').then((m) => m.default),
  },
  {
    id: 'ruptured-aaa',
    presenting: 'Collapse with abdominal and back pain',
    specialty: 'Vascular',
    exam: 'abdominal',
    difficulty: 3,
    setting: 'Emergency department',
    patientLabel: 'George Harris',
    sex: 'male',
    age: 74,
    tags: ['shock', 'vascular'],
    load: () => import('./ruptured-aaa').then((m) => m.default),
  },
  {
    id: 'mesenteric-ischaemia',
    presenting: 'Severe central abdominal pain',
    specialty: 'Vascular',
    exam: 'abdominal',
    difficulty: 3,
    setting: 'Emergency department',
    patientLabel: 'Margaret Walsh',
    sex: 'female',
    age: 79,
    tags: ['AF', 'lactate'],
    load: () => import('./mesenteric-ischaemia').then((m) => m.default),
  },
  {
    id: 'pancreatic-cancer',
    presenting: 'Painless jaundice and weight loss',
    specialty: 'Hepatobiliary',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Surgical assessment unit',
    patientLabel: 'Ahmed Hassan',
    sex: 'male',
    age: 68,
    tags: ['jaundice', 'cancer'],
    load: () => import('./pancreatic-cancer').then((m) => m.default),
  },
  {
    id: 'caecal-cancer',
    presenting: 'Tiredness, weight loss and a lump in the tummy',
    specialty: 'Colorectal',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Outpatient clinic',
    patientLabel: 'Joyce Palmer',
    sex: 'female',
    age: 76,
    tags: ['RIF mass', 'anaemia'],
    load: () => import('./caecal-cancer').then((m) => m.default),
  },
  {
    id: 'liver-disease',
    presenting: 'OSCE: examine this abdomen — swelling',
    specialty: 'Hepatobiliary',
    exam: 'abdominal',
    difficulty: 2,
    setting: 'Surgical ward',
    patientLabel: 'Kwame Mensah',
    sex: 'male',
    age: 55,
    tags: ['OSCE', 'ascites', 'stigmata'],
    load: () => import('./liver-disease').then((m) => m.default),
  },
  {
    id: 'ileostomy',
    presenting: 'OSCE: examine this abdomen — stoma',
    specialty: 'Colorectal',
    exam: 'abdominal',
    difficulty: 1,
    setting: 'Outpatient clinic',
    patientLabel: 'Tom Bennett',
    sex: 'male',
    age: 34,
    tags: ['OSCE', 'stoma'],
    load: () => import('./ileostomy').then((m) => m.default),
  },
]

export const CASE_META: Record<string, CaseMeta> = Object.fromEntries(CASES.map((c) => [c.id, c]))

const cache = new Map<string, CaseDef>()

export async function loadCase(id: string): Promise<CaseDef | null> {
  if (cache.has(id)) return cache.get(id)!
  const meta = CASE_META[id]
  if (!meta) return null
  const c = await meta.load()
  cache.set(id, c)
  return c
}

export function cachedCase(id: string): CaseDef | undefined {
  return cache.get(id)
}
