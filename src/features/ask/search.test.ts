import { describe, expect, it } from 'vitest'
import { GENERAL_QA, TOPICS } from '../../content/curriculum'
import { buildIndex, normalise, search, stem, topicDocs, type Doc } from './search'

const idx = buildIndex([
  ...TOPICS.flatMap(topicDocs),
  ...GENERAL_QA.map((qa, i): Doc => ({ id: `general:qa:${i}`, kind: 'qa', title: qa.q, body: qa.a, keywords: qa.k })),
])

const top = (q: string, n = 3) => search(idx, q, { limit: n })

describe('Ask search', () => {
  it('finds the obvious question first', () => {
    const [h] = top('charcot triad')
    expect(h.doc.kind).toBe('qa')
    expect(h.doc.title.toLowerCase()).toContain('charcot')
  })

  it('understands abbreviations and spellings', () => {
    expect(top('UGIB').some((h) => h.doc.topic === 'gi-bleeding')).toBe(true)
    expect(top('oesophageal varices').some((h) => h.doc.topic === 'gi-bleeding')).toBe(true)
    expect(top('esophageal varices').some((h) => h.doc.topic === 'gi-bleeding')).toBe(true)
  })

  it('forgives a typo', () => {
    expect(top('goodsals rule').some((h) => h.doc.topic === 'perianal')).toBe(true)
  })

  it('can be limited to a topic', () => {
    const hits = search(idx, 'examination', { limit: 20, topics: new Set(['breast'] as const) })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.doc.topic === 'breast')).toBe(true)
  })

  it('normalises and stems consistently', () => {
    expect(normalise('Haemorrhage')).toBe(normalise('hemorrhage'))
    expect(stem('bleeding')).toBe(stem('bleed'))
    expect(stem('strangulated')).toBe(stem('strangulation'))
  })

  it('answers fast', () => {
    const t = performance.now()
    for (let i = 0; i < 50; i++) search(idx, 'signs of a strangulated hernia')
    expect((performance.now() - t) / 50).toBeLessThan(25)
  })
})
