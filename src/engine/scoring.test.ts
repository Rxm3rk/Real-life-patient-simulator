import { describe, expect, it } from 'vitest'
import c from '../content/cases/appendicitis'
import { REGION_ORDER, type RegionId } from '../anatomy/bodyModel'
import { newEncounter, type EncounterState } from './encounter'
import { computeResult } from './scoring'

function run(actions: [string, RegionId?][], extra: Partial<EncounterState> = {}): EncounterState {
  const s = newEncounter(c.id, 'practice', ['exam'])
  s.log = actions.map(([action, region], i) => ({ action, region, t: i }))
  return { ...s, ...extra }
}

// order regions starting far from the RIF
const AWAY: RegionId[] = ['LUQ', 'EPI', 'RUQ', 'LF', 'UMB', 'RF', 'LIF', 'SP', 'RIF']

describe('abdominal scoring', () => {
  it('rewards a complete, well-ordered examination', () => {
    const acts: [string, RegionId?][] = [
      ['comm.wash'],
      ['comm.intro'],
      ['comm.identity'],
      ['comm.consent'],
      ['comm.chaperone'],
      ['comm.pain'],
      ['comm.position'],
      ['comm.expose'],
      ['gen.endOfBed'],
      ['gen.obs'],
      ['hands.inspect'],
      ['hands.crt'],
      ['hands.flap'],
      ['hands.pulse'],
      ['arms.inspect'],
      ['face.eyes'],
      ['face.mouth'],
      ['neck.nodes'],
      ['chest.inspect'],
      ['abdo.inspect'],
      ['abdo.cough'],
      ...AWAY.map((r) => ['abdo.light', r] as [string, RegionId]),
      ...AWAY.map((r) => ['abdo.deep', r] as [string, RegionId]),
      ['abdo.percTender', 'RIF'],
      ['abdo.liver'],
      ['abdo.murphy'],
      ['abdo.spleen'],
      ['abdo.kidneys'],
      ['abdo.aorta'],
      ...REGION_ORDER.slice(0, 6).map((r) => ['abdo.percuss', r] as [string, RegionId]),
      ['abdo.liverSpan'],
      ['abdo.bowel'],
      ['abdo.bruitAortic'],
      ['abdo.bruitRenal'],
      ['groin.expose'],
      ['groin.inguinalR'],
      ['groin.inguinalL'],
      ['groin.femoralR'],
      ['groin.femoralL'],
      ['groin.cough'],
      ['legs.oedema'],
      ['comm.thank'],
      ['comm.wash'],
      ['complete.dre'],
      ['complete.genitalia'],
      ['complete.urinalysis'],
    ]
    const r = computeResult(c, run(acts))
    expect(r.violations).toHaveLength(0)
    expect(r.criticalMissed).toHaveLength(0)
    expect(r.pct).toBeGreaterThan(0.95)
    expect(r.grade).toBe('Excellent')
  })

  it('penalises touching before hand hygiene/consent and starting on the pain', () => {
    const r = computeResult(
      c,
      run([
        ['abdo.light', 'RIF'],
        ['abdo.deep', 'RIF'],
      ]),
    )
    const ids = r.violations.map((v) => v.id)
    expect(ids).toContain('order.wash')
    expect(ids).toContain('order.consent')
    expect(ids).toContain('order.startTender')
    expect(r.grade === 'Fail' || r.grade === 'Borderline').toBe(true)
  })

  it('flags deep-before-light', () => {
    const r = computeResult(c, run([['abdo.deep', 'LUQ'], ['abdo.light', 'LUQ']]))
    expect(r.violations.map((v) => v.id)).toContain('order.lightDeep')
  })
})
