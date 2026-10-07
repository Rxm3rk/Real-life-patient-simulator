import { useEffect, useState } from 'react'
import { create } from 'zustand'

/**
 * Asking Claude from the app. On claude.ai the published app can call Claude
 * on the viewer's own Claude account (the artifact `sample` capability) — no
 * API key, and the viewer is asked once to allow it. Anywhere else (GitHub
 * Pages, a saved file) there is no `window.claude`, and the feature stays
 * hidden.
 */

export type ModelTier = 'quick' | 'default' | 'complex'
export type Turn = { role: 'user' | 'assistant'; content: string }

export interface SampleOptions {
  onText?: (u: { text: string; delta: string }) => void
  signal?: AbortSignal
  modelTier?: ModelTier
  cache?: boolean | { gcTime?: number; refresh?: boolean }
}

export interface SampleResult {
  text: string
  truncated: boolean
  modelTierApplied?: ModelTier
}

export type SampleFn = (input: string | Turn[], options?: SampleOptions) => Promise<SampleResult>

export interface SampleError {
  code: string
  message?: string
  text?: string
}

type ClaudeHost = { use?: (name: string) => Promise<unknown> }

let pending: Promise<SampleFn | null> | null = null

/** Claude's `sample` function where this page may use it, else null. */
export function claudeSample(): Promise<SampleFn | null> {
  pending ??= (async () => {
    const host = (window as unknown as { claude?: ClaudeHost }).claude
    if (!host?.use) return null
    try {
      return ((await host.use('sample')) as SampleFn | null) ?? null
    } catch {
      return null
    }
  })()
  return pending
}

/** Once the viewer declines (or Claude is off for their account), hide the feature for this visit. */
export const useClaudeBlocked = create<{ blocked: boolean; block: () => void }>()((set) => ({
  blocked: false,
  block: () => set({ blocked: true }),
}))

/** The sample function, `null` where Claude is unavailable, `undefined` while finding out. */
export function useClaude(): SampleFn | null | undefined {
  const [fn, setFn] = useState<SampleFn | null | undefined>(undefined)
  const blocked = useClaudeBlocked((s) => s.blocked)
  useEffect(() => {
    let alive = true
    // wrapped: a function handed to a state setter would be called as an updater
    claudeSample().then((f) => alive && setFn(() => f))
    return () => {
      alive = false
    }
  }, [])
  return blocked ? null : fn
}

const HIDE = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'])

/** What to tell the viewer about a failed call; `null` = say nothing (they stopped it, or Claude is unavailable). */
export function describeClaudeError(e: unknown): string | null {
  const code = (e as SampleError | null)?.code ?? 'upstream_error'
  if (code === 'cancelled') return null
  if (HIDE.has(code)) {
    useClaudeBlocked.getState().block()
    return null
  }
  switch (code) {
    case 'rate_limited':
      return 'Claude is busy, or you’ve reached your Claude usage limit for now. Try again in a little while.'
    case 'session_expired':
      return 'Sign in to claude.ai again to ask Claude.'
    case 'refused':
      return 'Claude couldn’t answer that one — try rephrasing the question.'
    case 'empty_completion':
      return 'No answer came back — try rephrasing the question.'
    case 'prompt_too_large':
      return 'That conversation got too long — start a new question.'
    default:
      return 'Couldn’t reach Claude just now. Check your connection and try again.'
  }
}
