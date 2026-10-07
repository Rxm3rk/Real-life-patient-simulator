import { useEffect, useState } from 'react'
import { CASES } from '../../content/cases'
import { GENERAL_QA, TOPICS, topicsForCase } from '../../content/curriculum'
import type { CaseDef } from '../../engine/types'
import { buildIndex, topicDocs, type Doc, type SearchIndex } from './search'

let cached: SearchIndex | null = null
let pending: Promise<SearchIndex> | null = null

const curriculumDocs = (): Doc[] => [
  ...TOPICS.flatMap(topicDocs),
  ...GENERAL_QA.map((qa, i): Doc => ({ id: `general:qa:${i}`, kind: 'qa', title: qa.q, body: qa.a, keywords: qa.k })),
]

const caseDoc = (c: CaseDef): Doc => ({
  id: `case:${c.id}`,
  kind: 'case',
  title: `${c.presenting} — ${c.title}`,
  body: c.teaching.summary,
  keywords: [c.title, ...c.tags, ...c.teaching.keyFindings],
  caseId: c.id,
  topic: topicsForCase(c.id)[0]?.id,
})

/** The curriculum index at once; the cases are added as their files arrive. */
function load(onUpdate: (idx: SearchIndex) => void): Promise<SearchIndex> {
  if (cached) return Promise.resolve(cached)
  pending ??= (async () => {
    const base = curriculumDocs()
    onUpdate((cached = buildIndex(base)))
    const defs = await Promise.all(CASES.map((m) => m.load().catch(() => null)))
    cached = buildIndex([...base, ...defs.filter((d): d is CaseDef => !!d).map(caseDoc)])
    return cached
  })()
  return pending
}

export function useSearchIndex(): SearchIndex | null {
  const [idx, setIdx] = useState<SearchIndex | null>(cached)
  useEffect(() => {
    let alive = true
    load((i) => alive && setIdx(i)).then((i) => alive && setIdx(i))
    return () => {
      alive = false
    }
  }, [])
  return idx
}
