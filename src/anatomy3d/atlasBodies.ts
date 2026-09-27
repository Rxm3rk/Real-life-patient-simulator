import type { Appearance } from '../anatomy/types'

/**
 * Bodies baked for the Learn atlases (signs, scars) in addition to the case
 * patients. Any other appearance falls back to the nearest baked body.
 */
export const ATLAS_APPEARANCES: Record<string, Appearance> = {
  man: { sex: 'male', age: 58, skinTone: 2, habitus: 'average', hair: 'short', hairColor: 'brown', eyeColor: 'blue', facialHair: 'none' },
  woman: { sex: 'female', age: 54, skinTone: 2, habitus: 'average', hair: 'bob', hairColor: 'brown', eyeColor: 'hazel' },
  torso: { sex: 'male', age: 50, skinTone: 2, habitus: 'average', hair: 'short', hairColor: 'brown', eyeColor: 'brown', facialHair: 'none' },
  olderWoman: { sex: 'female', age: 62, skinTone: 2, habitus: 'average', hair: 'short', hairColor: 'grey', eyeColor: 'hazel' },
  olderMan: { sex: 'male', age: 66, skinTone: 2, habitus: 'average', hair: 'short', hairColor: 'brown', eyeColor: 'blue', facialHair: 'none' },
}
