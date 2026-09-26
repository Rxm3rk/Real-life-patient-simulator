/**
 * Where share links point: the page's own address, unless the build sets
 * VITE_SHARE_URL (an embedded copy's own address isn't one a friend can open).
 */
export function shareBase(): string {
  const env = import.meta.env.VITE_SHARE_URL as string | undefined
  return env || `${location.origin}${location.pathname}`
}

/*
 * Share links use a plain fragment token — letters, digits and . _ ~ - only —
 * because some hosts pass nothing else through to the page:
 *   #case.appendicitis              → /case/appendicitis
 *   #osce~480~lipoma.graves         → /osce?c=lipoma,graves&t=480
 */
export const caseLink = (id: string) => `${shareBase()}#case.${id}`
export const challengeLink = (caseIds: string[], seconds: number) => `${shareBase()}#osce~${Math.round(seconds)}~${caseIds.join('.')}`

/** The in-app route for a share token, or null if the fragment isn't one. */
export function resolveToken(fragment: string): string | null {
  const h = fragment.replace(/^#/, '')
  const kase = /^case\.([a-z0-9-]+)$/.exec(h)
  if (kase) return `/case/${kase[1]}`
  const osce = /^osce~(\d+)~([a-z0-9.-]+)$/.exec(h)
  if (osce) return `/osce?c=${osce[2].split('.').filter(Boolean).join(',')}&t=${osce[1]}`
  return null
}
