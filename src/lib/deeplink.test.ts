import { describe, expect, it } from 'vitest'
import { CASES } from '../content/cases'
import { caseLink, challengeLink, resolveToken } from './deeplink'

const fragment = (url: string) => url.slice(url.indexOf('#'))

describe('share links', () => {
  it('use only characters every host passes through', () => {
    const ids = CASES.map((c) => c.id)
    for (const url of [caseLink(ids[0]), challengeLink(ids, 600)]) expect(fragment(url)).toMatch(/^#[A-Za-z0-9._~-]+$/)
  })

  it('round-trip a case to its briefing', () => {
    for (const c of CASES) expect(resolveToken(fragment(caseLink(c.id)))).toBe(`/case/${c.id}`)
  })

  it('round-trip an OSCE challenge to the circuit builder', () => {
    expect(resolveToken(fragment(challengeLink(['appendicitis', 'inguinal-hernia', 'graves'], 480)))).toBe('/osce?c=appendicitis,inguinal-hernia,graves&t=480')
  })

  it('leave ordinary routes alone', () => {
    for (const h of ['', '#/', '#/ward', '#/case/appendicitis', '#/osce?c=a,b&t=60']) expect(resolveToken(h)).toBeNull()
  })
})
