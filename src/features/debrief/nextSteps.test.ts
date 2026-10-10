import { describe, expect, it } from 'vitest'
import c from '../../content/cases/appendicitis'
import { newEncounter } from '../../engine/encounter'
import { computeResult } from '../../engine/scoring'
import { nextSteps } from './nextSteps'

describe('what to work on next', () => {
  it('an attempt that did nothing points at the diagnosis, the routine and the history — and ends with a quiz', () => {
    const s = newEncounter(c.id, 'practice', ['history', 'exam', 'investigations', 'diagnosis'])
    const steps = nextSteps(c, computeResult(c, s), s)
    expect(steps.length).toBeLessThanOrEqual(4)
    expect(steps[0].kind).toBe('diagnosis')
    expect(steps[0].to).toBe('/topic/acute-abdomen/case/appendicitis')
    expect(steps.map((x) => x.kind)).toContain('examination')
    expect(steps.find((x) => x.kind === 'examination')?.to).toBe('/learn/routine/abdominal')
    expect(steps.at(-1)).toMatchObject({ kind: 'quiz', to: '/quiz?deck=topic:acute-abdomen' })
  })

  it('a correct diagnosis is not sent back to the case card', () => {
    const s = { ...newEncounter(c.id, 'practice', ['diagnosis']), diagnosis: c.diagnosis.correct }
    const steps = nextSteps(c, computeResult(c, s), s)
    expect(steps.map((x) => x.kind)).not.toContain('diagnosis')
  })

  it('links the history step to the guide’s history section', () => {
    const s = newEncounter(c.id, 'practice', ['history'])
    const hx = nextSteps(c, computeResult(c, s), s).find((x) => x.kind === 'history')
    expect(hx?.to).toBe('/topic/acute-abdomen?s=history')
    expect(hx?.detail).toBeTruthy()
  })
})
