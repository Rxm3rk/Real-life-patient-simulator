import type { OrderRule, ProtocolStep, StepCtx } from '../protocols/abdominal'
import type { StationAction } from './types'

export const did = (x: StepCtx, a: string) => x.log.some((e) => e.action === a)
export const didAny = (x: StepCtx, as: string[]) => x.log.some((e) => as.includes(e.action))
export const firstIdx = (x: StepCtx, pred: (a: string) => boolean) => x.log.findIndex((e) => pred(e.action))

/** Build a protocol step satisfied by performing any of the listed actions. */
export function step(
  id: string,
  section: string,
  label: string,
  marks: number,
  actions: string[] | ((x: StepCtx) => boolean | number),
  why: string,
  extra: Partial<ProtocolStep> = {},
): ProtocolStep {
  return {
    id,
    section,
    label,
    marks,
    done: typeof actions === 'function' ? actions : (x) => didAny(x, actions),
    action: Array.isArray(actions) ? actions[0] : undefined,
    why,
    ...extra,
  }
}

/** Communication actions shared by every station. */
export const COMM_ACTIONS: StationAction[] = [
  { id: 'comm.wash', label: 'Clean your hands', short: 'Hand hygiene', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.intro', label: 'Introduce yourself (name & role)', short: 'Introduce', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.identity', label: 'Confirm name and date of birth', short: 'Confirm ID', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.consent', label: 'Explain the examination & gain consent', short: 'Consent', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.chaperone', label: 'Offer a chaperone', short: 'Chaperone', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.pain', label: 'Ask about pain before examining', short: 'Any pain?', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.position', label: 'Position the patient', short: 'Position', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.expose', label: 'Expose appropriately, maintaining dignity', short: 'Expose', view: 'any', group: 'Communication', contact: false, cue: 'expose' },
  { id: 'comm.thank', label: 'Thank the patient and help them dress', short: 'Thank & cover', view: 'any', group: 'Completion', contact: false },
]

/** Standard preparation steps (Macleod’s: introduction, consent, positioning, exposure). */
export function prepSteps(opts: { chaperone: 'critical' | 'normal'; position: string; expose: string }): ProtocolStep[] {
  return [
    step('prep.wash', 'Preparation', 'Clean your hands', 1, ['comm.wash'], 'Hand hygiene before touching a patient (WHO moment 1).'),
    step('prep.intro', 'Preparation', 'Introduce yourself (name & role)', 1, (x) => did(x, 'comm.intro') || x.asked.has('comm.intro'), 'Patients should know who is examining them.', { action: 'comm.intro' }),
    step('prep.identity', 'Preparation', 'Confirm the patient’s identity', 1, (x) => did(x, 'comm.identity') || x.asked.has('comm.identity'), 'Name and date of birth — prevents wrong-patient errors.', { action: 'comm.identity' }),
    step('prep.consent', 'Preparation', 'Explain the examination and gain consent', 1, ['comm.consent'], 'Explain what you will do and why, and obtain consent.'),
    step(
      'prep.chaperone',
      'Preparation',
      'Offer a chaperone',
      opts.chaperone === 'critical' ? 2 : 1,
      ['comm.chaperone'],
      opts.chaperone === 'critical'
        ? 'This is an intimate examination — a chaperone must be offered (GMC guidance), whatever the gender of patient and doctor, and the offer documented.'
        : 'Offer a chaperone for any examination the patient may find intimate.',
    ),
    step('prep.pain', 'Preparation', 'Ask about pain or tenderness first', 1, (x) => did(x, 'comm.pain') || x.asked.has('pain.site') || x.asked.has('lump.pain'), 'Know what hurts before you touch it.', { action: 'comm.pain' }),
    step('prep.position', 'Preparation', opts.position, 1, ['comm.position'], 'Correct positioning makes the signs visible.'),
    step('prep.expose', 'Preparation', opts.expose, 1, ['comm.expose'], 'Adequate exposure with dignity — cover what you are not examining.'),
  ]
}

export function completionSteps(extra: ProtocolStep[] = []): ProtocolStep[] {
  return [
    ...extra,
    step('end.thank', 'Completion', 'Thank the patient and restore their dignity', 1, ['comm.thank'], 'Help them cover up and thank them.'),
    step(
      'end.wash',
      'Completion',
      'Clean your hands afterwards',
      1,
      (x) => {
        const last = x.log.map((e) => !e.action.startsWith('comm.') && !e.action.startsWith('complete.')).lastIndexOf(true)
        return last >= 0 && x.log.slice(last + 1).some((e) => e.action === 'comm.wash')
      },
      'WHO moment 4 — after touching the patient.',
      { action: 'comm.wash' },
    ),
  ]
}

/** Generic sequence rules: hygiene, consent and chaperone before contact. */
export function baseRules(isContact: (a: string) => boolean, isIntimate: (a: string) => boolean): OrderRule[] {
  return [
    {
      id: 'order.wash',
      message: 'You touched the patient before cleaning your hands.',
      penalty: 1,
      violated: (x) => {
        const c = firstIdx(x, isContact)
        if (c < 0) return false
        const w = firstIdx(x, (a) => a === 'comm.wash')
        return w < 0 || w > c
      },
    },
    {
      id: 'order.consent',
      message: 'You touched the patient before explaining the examination and gaining consent.',
      penalty: 1,
      violated: (x) => {
        const c = firstIdx(x, isContact)
        if (c < 0) return false
        const k = firstIdx(x, (a) => a === 'comm.consent')
        return k < 0 || k > c
      },
    },
    {
      id: 'order.chaperone',
      message: 'You began an intimate examination without offering a chaperone.',
      penalty: 1.5,
      violated: (x) => {
        const c = firstIdx(x, isIntimate)
        if (c < 0) return false
        const k = firstIdx(x, (a) => a === 'comm.chaperone')
        return k < 0 || k > c
      },
    },
  ]
}

/**
 * `a` should come before `b`. Non-strict: only flags when both were done in the
 * wrong order. Strict: also flags doing `b` without ever doing `a`.
 */
export function before(a: string | string[], b: string | string[], message: string, penalty = 0.5, strict = false): OrderRule {
  const A = Array.isArray(a) ? a : [a]
  const B = Array.isArray(b) ? b : [b]
  return {
    id: `order.${A[0]}>${B[0]}`,
    message,
    penalty,
    violated: (x) => {
      const ib = firstIdx(x, (k) => B.includes(k))
      if (ib < 0) return false
      const ia = firstIdx(x, (k) => A.includes(k))
      return ia < 0 ? strict : ia > ib
    },
  }
}
