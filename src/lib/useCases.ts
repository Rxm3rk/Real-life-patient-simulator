import { useEffect, useState } from 'react'
import { CASES, cachedCase, loadCase } from '../content/cases'
import type { CaseDef } from '../engine/types'

/** Loads (and caches) full case definitions — used where avatars are shown. */
export function useCaseDefs(ids: string[] = CASES.map((c) => c.id)): Record<string, CaseDef> {
  const [defs, setDefs] = useState<Record<string, CaseDef>>(() => {
    const out: Record<string, CaseDef> = {}
    for (const id of ids) {
      const c = cachedCase(id)
      if (c) out[id] = c
    }
    return out
  })
  const key = ids.join(',')
  useEffect(() => {
    let alive = true
    Promise.all(ids.map((id) => loadCase(id))).then((list) => {
      if (!alive) return
      const out: Record<string, CaseDef> = {}
      list.forEach((c) => c && (out[c.id] = c))
      setDefs(out)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return defs
}
