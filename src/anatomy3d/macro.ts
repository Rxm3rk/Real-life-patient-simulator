import type { Appearance } from '../anatomy/types'

/**
 * MakeHuman "macro" settings for a patient. The 3D bodies are baked offline from
 * these (scripts/human/bake.mjs) and the app finds the baked body by `bodyKey`.
 * Both sides use this module, so the mapping lives in exactly one place.
 */
export interface Macro {
  /** 0 = female, 1 = male */
  gender: number
  /** MakeHuman age slider: 0 = 1 year, 0.5 = 25 years, 1 = 90 years */
  age: number
  muscle: number
  weight: number
  african: number
  asian: number
  caucasian: number
  breastSize: number
  breastFirmness: number
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))

/** MakeHuman's age mapping (human.py setAgeYears). */
export function ageSlider(years: number) {
  const y = clamp(years, 1, 90)
  return y < 25 ? (y - 1) / 48 : 0.5 + (y - 25) / 130
}

const WEIGHT: Record<Appearance['habitus'], number> = { thin: 0.2, average: 0.5, overweight: 0.72, obese: 0.93 }

/**
 * Ancestry blend from skin tone. MakeHuman's ethnic targets shape the face and
 * build subtly; skin colour itself is set by the skin shader, not by these.
 */
const ANCESTRY: Record<Appearance['skinTone'], [african: number, asian: number, caucasian: number]> = {
  1: [0.02, 0.06, 0.92],
  2: [0.04, 0.1, 0.86],
  3: [0.1, 0.35, 0.55],
  4: [0.25, 0.5, 0.25],
  5: [0.78, 0.07, 0.15],
  6: [0.9, 0.04, 0.06],
}

export function macroFor(a: Appearance): Macro {
  const years = a.age
  let weight = WEIGHT[a.habitus]
  // muscle mass falls with age; frail and cachectic patients lose most of it
  let muscle = years < 30 ? 0.55 : years < 55 ? 0.5 : years < 70 ? 0.42 : 0.34
  if (a.cachexia) {
    weight = Math.min(weight, 0.08)
    muscle = Math.min(muscle, 0.18)
  }
  const [african, asian, caucasian] = ANCESTRY[a.skinTone]
  const female = a.sex === 'female'
  const breastSize = female ? clamp(0.5 + (weight - 0.5) * 0.6) : a.gynaecomastia ? 0.75 : 0.5
  const breastFirmness = female ? clamp(0.62 - Math.max(0, years - 30) * 0.008) : 0.5
  return { gender: female ? 0 : 1, age: ageSlider(years), muscle, weight, african, asian, caucasian, breastSize, breastFirmness }
}

/** Identical macro settings share one baked body; the key is stable and human-readable. */
export function bodyKey(a: Appearance): string {
  return [a.sex === 'male' ? 'm' : 'f', Math.round(a.age), a.habitus, `t${a.skinTone}`, a.cachexia && 'cx', a.gynaecomastia && 'gy'].filter(Boolean).join('-')
}

/** Distance between two appearances' bodies, used to fall back to the nearest baked body. */
export function bodyDistance(a: Appearance, b: Appearance) {
  const ma = macroFor(a)
  const mb = macroFor(b)
  return (
    Math.abs(ma.gender - mb.gender) * 10 +
    Math.abs(ma.age - mb.age) * 4 +
    Math.abs(ma.weight - mb.weight) * 3 +
    Math.abs(ma.muscle - mb.muscle) * 2 +
    (Math.abs(ma.african - mb.african) + Math.abs(ma.asian - mb.asian)) * 1.5 +
    Math.abs(ma.breastSize - mb.breastSize)
  )
}
