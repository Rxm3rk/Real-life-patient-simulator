import { describe, expect, it } from 'vitest'
import { DIAG_BY_ID } from '../diagnoses'
import { INTENT_BY_ID } from '../intents'
import { INV_BY_ID } from '../investigations'
import { MGMT_BY_ID } from '../management'
import { protocolFor } from '../../engine/protocols'
import { stationActions, stationFor } from '../../engine/stations'
import { CASES } from './index'

describe('case library integrity', () => {
  it.each(CASES.map((c) => [c.id, c] as const))('%s references only known ids', async (_id, meta) => {
    const c = await meta.load()
    expect(c.id).toBe(meta.id)
    expect(c.exam).toBe(meta.exam)
    expect(c.patient.age).toBe(meta.age)
    expect(c.patient.sex).toBe(meta.sex)
    expect(c.patient.appearance.sex).toBe(c.patient.sex)
    for (const k of [...c.history.key, ...(c.history.critical ?? []), ...Object.keys(c.history.answers)]) expect(INTENT_BY_ID[k], `intent ${k}`).toBeDefined()
    for (const k of Object.keys(c.investigations)) expect(INV_BY_ID[k], `investigation ${k}`).toBeDefined()
    const r = c.investigationRubric
    for (const k of [...r.essential, ...(r.helpful ?? []), ...(r.avoid ?? [])]) expect(INV_BY_ID[k.id], `rubric investigation ${k.id}`).toBeDefined()
    for (const k of [c.diagnosis.correct, ...(c.diagnosis.accept ?? []), ...c.diagnosis.differentials]) expect(DIAG_BY_ID[k], `diagnosis ${k}`).toBeDefined()
    const m = c.management
    for (const k of [...m.essential, ...(m.helpful ?? []), ...(m.avoid ?? [])]) expect(MGMT_BY_ID[k.id], `management ${k.id}`).toBeDefined()
    const steps = new Set(protocolFor(c.exam).steps.map((s) => s.id))
    for (const k of c.criticalSteps ?? []) expect(steps.has(k), `critical step ${k}`).toBe(true)
    for (const q of c.viva) if (q.options) expect(q.correct).toBeLessThan(q.options.length)
    expect(c.teaching.presentation.length).toBeGreaterThan(200)
    // station findings must be keyed to real actions of that station
    const station = stationFor(c.exam)
    if (station) {
      const acts = stationActions(station)
      for (const k of Object.keys(c.keyed ?? {})) expect(acts[k], `keyed action ${k}`).toBeDefined()
      for (const [k, f] of Object.entries(c.keyed ?? {})) if (!k.startsWith('comm.')) expect(f.text.length, `finding text ${k}`).toBeGreaterThan(3)
    }
  })
})
