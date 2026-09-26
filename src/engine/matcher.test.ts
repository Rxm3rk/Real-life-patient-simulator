import { describe, expect, it } from 'vitest'
import { interpret, normalize } from './matcher'

const one = (q: string) => interpret(q).matched

describe('history matcher', () => {
  it('normalises lay terms to clinical tokens', () => {
    expect(normalize('Have you been throwing up?')).toContain('vomit')
    expect(normalize('Any tummy ache?')).toContain('abdomen')
    expect(normalize('When did you last have a poo?')).toContain('stool')
  })

  it.each([
    ['Where is the pain?', 'pain.site'],
    ['Can you show me where it hurts?', 'pain.site'],
    ['When did it start?', 'pain.onset'],
    ['What does the pain feel like?', 'pain.character'],
    ['Does it go anywhere else?', 'pain.radiation'],
    ['Has the pain moved since it started?', 'pain.moved'],
    ['Does it come and go?', 'pain.timing'],
    ['What makes it worse?', 'pain.exacerbating'],
    ['Does anything help?', 'pain.relieving'],
    ['How bad is it out of 10?', 'pain.severity'],
    ['Have you been sick?', 'gi.vomiting'],
    ['When did you last open your bowels?', 'gi.bowels_last'],
    ['Are you passing wind?', 'gi.flatus'],
    ['Any blood in your poo?', 'gi.stool_blood'],
    ['When was your last period?', 'gyn.lmp'],
    ['Could you be pregnant?', 'gyn.pregnant'],
    ['Do you smoke?', 'sh.smoking'],
    ['How much alcohol do you drink?', 'sh.alcohol'],
    ['Any allergies?', 'dh.allergies'],
    ['Are you on any blood thinners?', 'dh.anticoag'],
    ['Have you had any operations before?', 'pmh.surgery'],
    ['What do you think is going on?', 'ice.ideas'],
    ['Is anything worrying you?', 'ice.concerns'],
    ['What brought you in today?', 'comm.open'],
    ['Would you like something for the pain?', 'comm.analgesia'],
    ['Any diarhoea?', 'gi.diarrhoea'],
    ['Have you had a temperature?', 'sys.fever'],
    ['Do you get pain in your calves when you walk?', 'vas.claudication'],
    ['Does the lump go away when you lie down?', 'lump.reduce'],
  ])('%s → %s', (q, id) => {
    expect(one(q)).toContain(id)
  })

  it('answers compound questions', () => {
    const m = one('Any nausea or vomiting?')
    expect(m).toContain('gi.nausea')
    expect(m).toContain('gi.vomiting')
  })

  it('handles intro + consent in one message', () => {
    const m = one("Hi, I'm Sara, a final year medical student. Is it ok if I ask you a few questions?")
    expect(m).toContain('comm.intro')
    expect(m).toContain('comm.consent')
  })

  it('offers suggestions for gibberish rather than guessing', () => {
    const r = interpret('banana helicopter')
    expect(r.matched).toHaveLength(0)
  })
})
