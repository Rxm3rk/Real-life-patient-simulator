export type Sex = 'male' | 'female'
export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6
export type Habitus = 'thin' | 'average' | 'overweight' | 'obese'
export type HairStyle = 'short' | 'crop' | 'receding' | 'bald' | 'long' | 'bob' | 'bun' | 'curly' | 'hijab'
export type HairColor = 'black' | 'darkbrown' | 'brown' | 'auburn' | 'blonde' | 'grey' | 'white'
export type EyeColor = 'brown' | 'hazel' | 'blue' | 'green' | 'grey'
export type FacialHair = 'none' | 'stubble' | 'beard' | 'moustache'

export type ScarId =
  | 'lanz'
  | 'gridiron'
  | 'kocher'
  | 'midline'
  | 'upper-midline'
  | 'lower-midline'
  | 'pfannenstiel'
  | 'lap-chole'
  | 'lap-appendix'
  | 'rooftop'
  | 'mercedes'
  | 'right-paramedian'
  | 'left-inguinal'
  | 'right-inguinal'
  | 'rutherford-morison-right'
  | 'left-loin'
  | 'umbilical'
  | 'thyroid-collar'
  | 'sternotomy'

export type Exposure = 'gowned' | 'abdomen' | 'groin' | 'torso' | 'legs' | 'standing-groin'

export type HerniaKind =
  | 'inguinal-indirect'
  | 'inguinal-direct'
  | 'femoral'
  | 'umbilical'
  | 'paraumbilical'
  | 'incisional'
  | 'epigastric'

export interface HerniaBulge {
  kind: HerniaKind
  side?: 'left' | 'right'
  size: 'small' | 'medium' | 'large'
  /** When the bulge is visible: always, only on coughing/standing, or not at all (impalpable) */
  visible: 'always' | 'cough' | 'standing' | 'never'
  /** Inflamed/tense (irreducible, strangulated) */
  tense?: boolean
  /** Cannot be reduced (incarcerated) */
  irreducible?: boolean
}

export interface Stoma {
  type: 'ileostomy' | 'colostomy' | 'urostomy' | 'loop-ileostomy'
  side: 'left' | 'right'
  bag: boolean
}

export interface Lines {
  ngTube?: boolean
  oxygen?: 'none' | 'nasal' | 'mask'
  cannula?: 'left-hand' | 'right-hand' | 'left-forearm' | 'right-forearm'
  catheter?: boolean
  drip?: boolean
  drain?: 'right' | 'left'
}

export interface Appearance {
  sex: Sex
  age: number
  skinTone: SkinTone
  habitus: Habitus
  hair: HairStyle
  hairColor: HairColor
  eyeColor?: EyeColor
  facialHair?: FacialHair
  glasses?: boolean

  // Clinical appearance (0..1 intensities)
  jaundice?: number
  pallor?: number
  cyanosis?: number
  flushed?: number
  sweaty?: boolean
  cachexia?: boolean
  dehydrated?: boolean

  distension?: 0 | 1 | 2 | 3
  distensionType?: 'gas' | 'fluid'
  umbilicus?: 'normal' | 'everted' | 'deep'
  scars?: ScarId[]
  stoma?: Stoma
  caputMedusae?: boolean
  spiderNaevi?: number
  gynaecomastia?: boolean
  cullens?: boolean
  greyTurners?: boolean
  visiblePeristalsis?: boolean
  visiblePulsation?: boolean
  hernias?: HerniaBulge[]
  excoriations?: boolean
  striae?: boolean
  bodyHairLoss?: boolean
  lines?: Lines
}

/** Dynamic, moment-to-moment state driven by the simulation. */
export interface PatientPose {
  exposure: Exposure
  /** 0 = relaxed, 1 = worst pain */
  pain: number
  /** Brief intense wince (e.g. on palpation of a tender spot) 0..1 */
  wince: number
  /** Patient is coughing right now */
  coughing?: boolean
  /** Breath phase 0..1 (0 = end expiration) */
  breath?: number
  /** Head lifted off pillow (to tense recti) */
  headLift?: boolean
  eyesClosed?: boolean
  speaking?: boolean
  mouthOpen?: number
  lookAt?: 'up' | 'examiner' | 'down'
}
