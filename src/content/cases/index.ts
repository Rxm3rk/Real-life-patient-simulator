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
