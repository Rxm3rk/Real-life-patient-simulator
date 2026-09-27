/** Pre-rendered 3D portraits of each case's patient (scripts/human/portraits.mjs). */
const URLS = import.meta.glob('../assets/portraits/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function portraitUrl(caseId?: string): string | undefined {
  return caseId ? URLS[`../assets/portraits/${caseId}.webp`] : undefined
}
