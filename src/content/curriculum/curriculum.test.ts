import { describe, expect, it } from 'vitest'
import { CASE_META } from '../cases'
import { SCHEDULE, TOPIC_BY_ID, TOPICS } from './index'

describe('curriculum', () => {
  it('covers every scheduled session with a topic', () => {
    expect(SCHEDULE).toHaveLength(12)
    for (const s of SCHEDULE) expect(TOPIC_BY_ID[s.topic], s.topic).toBeDefined()
  })

  it.each(TOPICS.map((t) => [t.id, t] as const))('%s links only to cases that exist, and has some', (_id, t) => {
    expect(t.cases.length).toBeGreaterThan(0)
    for (const id of t.cases) expect(CASE_META[id], `case ${id}`).toBeDefined()
  })

  it.each(TOPICS.map((t) => [t.id, t] as const))('%s has key points, sourced sections and questions', (_id, t) => {
    expect(t.keyPoints.length).toBeGreaterThan(2)
    expect(t.qa.length).toBeGreaterThanOrEqual(15)
    for (const qa of t.qa) {
      expect(qa.q.trim().length).toBeGreaterThan(5)
      expect(qa.a.trim().length).toBeGreaterThan(10)
    }
    const ids = t.sections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(t.sections.some((s) => s.source?.includes('Macleod'))).toBe(true)
  })
})
