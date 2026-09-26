import type { RegionId } from '../anatomy/bodyModel'
import type { BedsideItems } from '../anatomy/Scene'
import type { Appearance } from '../anatomy/types'

export type Mode = 'learn' | 'practice' | 'osce'
export type Component = 'history' | 'exam' | 'investigations' | 'diagnosis' | 'viva'
export type Phase = 'history' | 'exam' | 'investigations' | 'diagnosis' | 'viva' | 'debrief'

export type ExamKind = 'abdominal' | 'groin' | 'lump' | 'thyroid' | 'breast' | 'arterial' | 'venous' | 'scrotal'

export type Specialty =
  | 'Emergency general surgery'
  | 'Upper GI'
  | 'Hepatobiliary'
  | 'Colorectal'
  | 'Vascular'
  | 'Breast'
  | 'Endocrine'
  | 'Urology'
  | 'Hernia & abdominal wall'
  | 'Skin & soft tissue'

/* ------------------------------------------------------------------ */
/* Patient                                                              */
/* ------------------------------------------------------------------ */

export interface Vitals {
  hr: number
  rhythm: 'regular' | 'irregular'
  sbp: number
  dbp: number
  rr: number
  spo2: number
  /** °C */
  temp: number
  /** on air unless stated */
  o2?: string
  avpu?: 'A' | 'V' | 'P' | 'U'
  /** Pain score /10 */
  pain?: number
  /** Capillary glucose mmol/L */
  bm?: number
}

export interface PatientProfile {
  name: string
  /** Preferred form of address, e.g. "Mr Carter" */
  title: string
  age: number
  sex: 'male' | 'female'
  dob: string
  occupation: string
  appearance: Appearance
  /** How the patient speaks and feels */
  persona: {
    mood: 'calm' | 'anxious' | 'distressed' | 'stoic' | 'irritable' | 'drowsy'
    style?: 'brief' | 'normal' | 'chatty'
  }
}

/* ------------------------------------------------------------------ */
/* History                                                              */
/* ------------------------------------------------------------------ */

export type IntentCategory =
  | 'Communication'
  | 'Presenting complaint'
  | 'Pain (SOCRATES)'
  | 'Gastrointestinal'
  | 'Urinary'
  | 'Gynaecological'
  | 'Systemic'
  | 'Systems review'
  | 'Lump'
  | 'Breast'
  | 'Thyroid & neck'
  | 'Vascular'
  | 'Scrotal & groin'
  | 'Anorectal'
  | 'Past medical history'
  | 'Drug history'
  | 'Family history'
  | 'Social history'
  | 'Ideas, concerns, expectations'
  | 'Closing'

export interface AnswerObj {
  text: string
  /** Stage direction, e.g. "points to the right iliac fossa" */
  cue?: string
}
export type Answer = string | AnswerObj

export interface HistoryScript {
  /** Answer to "What brought you in today?" */
  opening: Answer
  answers: Partial<Record<string, Answer>>
  /** Intents that carry marks, grouped by importance */
  key: string[]
  /** Must-ask questions: missing them is flagged as a critical omission */
  critical?: string[]
  ideas?: string
  concerns?: string
  expectations?: string
  /** Social details used by default answers */
  social?: {
    smoking?: string
    alcohol?: string
    drugs?: string
    living?: string
    mobility?: string
    travel?: string
    diet?: string
  }
  pmh?: string
  psh?: string
  meds?: string
  allergies?: string
  fh?: string
}

/* ------------------------------------------------------------------ */
/* Abdominal examination findings                                       */
/* ------------------------------------------------------------------ */

export type Tender = 0 | 1 | 2 | 3
export type Guarding = 'none' | 'voluntary' | 'involuntary'
export type Note = 'resonant' | 'tympanic' | 'dull'

export interface MassFinding {
  description: string
  sizeCm?: number
  tender?: boolean
  pulsatile?: 'expansile' | 'transmitted'
  movesWithRespiration?: boolean
  /** Short label for notes */
  label: string
}

export interface RegionFinding {
  light: Tender
  deep: Tender
  guarding: Guarding
  rebound: boolean
  percussionTender: boolean
  note: Note
  mass?: MassFinding
}

export type BowelSounds = 'normal' | 'hyperactive' | 'tinkling' | 'reduced' | 'absent'

export interface HerniaFinding {
  present: boolean
  description?: string
  coughImpulse?: boolean
  reducible?: boolean
  tender?: boolean
}

export interface AbdoFindings {
  general: {
    /** Description from the end of the bed */
    endOfBed: string
    lyingStill?: boolean
    restless?: boolean
  }
  hands: {
    clubbing: boolean
    leukonychia: boolean
    koilonychia: boolean
    palmarErythema: boolean
    dupuytren: boolean
    asterixis: boolean
    tremor?: boolean
    temperature: 'warm' | 'cool' | 'cold' | 'hot'
    crt: number
    pallorCreases?: boolean
    tarStaining?: boolean
    armMarks?: string
    pulseVolume?: 'normal' | 'bounding' | 'weak'
  }
  face: {
    sclera: 'white' | 'icteric'
    conjunctiva: 'pink' | 'pale'
    xanthelasma?: boolean
    mucosa: 'moist' | 'dry'
    tongue: 'normal' | 'dry-furred' | 'smooth-red' | 'pale'
    angularCheilitis?: boolean
    ulcers?: boolean
    fetor: 'none' | 'hepaticus' | 'ketotic' | 'alcohol' | 'faeculent' | 'uraemic'
    parotids?: boolean
  }
  neck: {
    virchow: boolean
    nodes?: string
  }
  chest: {
    spiderNaevi: boolean
    gynaecomastia: boolean
    hairLoss?: boolean
  }
  abdomen: {
    shape: 'flat' | 'scaphoid' | 'distended' | 'obese'
    movesWithRespiration: 'normal' | 'reduced' | 'absent'
    inspectionExtra?: string
    coughPain: boolean
    headLift?: string
    regions: Record<RegionId, RegionFinding>
    rigidity?: 'none' | 'localised' | 'generalised'
    liver: { edgeCm: number; texture?: 'smooth' | 'nodular' | 'hard-irregular'; tender?: boolean; pulsatile?: boolean; spanCm: number }
    gallbladder: { palpable: boolean; murphy: boolean }
    spleen: { tipCm: number }
    kidneys: { right: boolean; left: boolean; renalAngleTender?: 'right' | 'left' | 'both' }
    aorta: { expansile: boolean; widthCm?: number; tender?: boolean }
    bladder: { palpable: boolean }
    shiftingDullness: boolean
    fluidThrill: boolean
    bowelSounds: BowelSounds
    bruits: { aortic?: boolean; renalR?: boolean; renalL?: boolean; iliac?: boolean }
    succussionSplash?: boolean
    rovsing?: boolean
    psoas?: boolean
    obturator?: boolean
    carnett?: 'intra-abdominal' | 'abdominal-wall'
    heelDrop?: boolean
    hernias: {
      rightInguinal: HerniaFinding
      leftInguinal: HerniaFinding
      rightFemoral: HerniaFinding
      leftFemoral: HerniaFinding
      umbilical: HerniaFinding
    }
  }
  legs: { oedema: 'none' | 'ankle' | 'to-knee' | 'to-thigh'; calves?: string }
  /** Findings revealed when the student states they would complete the examination */
  completion: Partial<Record<CompletionId, string>>
}

export type CompletionId =
  | 'dre'
  | 'genitalia'
  | 'urinalysis'
  | 'pregnancy'
  | 'obs'
  | 'hernial'
  | 'bloods'
  | 'imaging'
  | 'femoral-pulses'
  | 'cvs-resp'

/** Deep partial for authoring cases as "differences from normal" */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/* ------------------------------------------------------------------ */
/* Other examination findings (generic, text-driven)                    */
/* ------------------------------------------------------------------ */

/**
 * Non-abdominal stations use a keyed map of findings: every protocol action
 * reveals the finding stored under its id (or the protocol's normal default).
 */
export interface KeyedFinding {
  text: string
  /** Interpretation shown in learn mode / debrief */
  meaning?: string
  abnormal?: boolean
  /** Optional sound or visual to present with it */
  media?: string
  /** Patient reaction 0..1 (wince) */
  reaction?: number
  /** What the patient says */
  says?: string
}

/* ------------------------------------------------------------------ */
/* Visual specifications for the non-abdominal stations                 */
/* ------------------------------------------------------------------ */

export type PulseGrade = 'normal' | 'weak' | 'absent' | 'prominent'

export interface LegPulses {
  femoral: PulseGrade
  popliteal: PulseGrade
  pt: PulseGrade
  dp: PulseGrade
}

export interface LegSide {
  /** 0..1 */
  pallor?: number
  /** Dusky dependent rubor 0..1 */
  rubor?: number
  hairLoss?: boolean
  shiny?: boolean
  wasting?: boolean
  cold?: boolean
  ulcer?: { kind: 'arterial' | 'venous' | 'neuropathic'; site: 'lateral-malleolus' | 'medial-malleolus' | 'heel' | 'hallux' | 'toe-tips' | 'dorsum' | 'gaiter'; sizeCm: number }
  /** Toes with dry gangrene (1 = hallux … 5 = little toe) */
  gangrene?: number[]
  varicose?: { system: 'gsv' | 'ssv' | 'both'; severity: 1 | 2 | 3 }
  haemosiderin?: boolean
  lipodermatosclerosis?: boolean
  atrophieBlanche?: boolean
  eczema?: boolean
  oedema?: 0 | 1 | 2
  /** Angle (°) at which the foot blanches on elevation (Buerger’s angle) */
  buergerAngle?: number
  saphenaVarix?: boolean
  /** Tourniquet (Trendelenburg) test: does a high thigh tourniquet control the varicosities? */
  tourniquet?: 'controlled' | 'not-controlled'
  scar?: 'bypass' | 'vein-harvest' | 'stripping'
  pulses?: Partial<LegPulses>
}

export interface LegsVisual {
  right: LegSide
  left: LegSide
}

export interface LumpVisual {
  site: 'forearm' | 'upper-back' | 'shoulder' | 'chest-wall' | 'thigh'
  side: 'left' | 'right'
  /** Dimensions in cm */
  w: number
  h: number
  kind: 'lipoma' | 'epidermoid' | 'ganglion' | 'abscess' | 'node' | 'sarcoma'
  punctum?: boolean
  /** 0..1 */
  erythema?: number
  lobulated?: boolean
  transilluminates?: boolean
  /** Tethered to the skin (dimples when the skin is moved) */
  tethered?: boolean
  /** Height of the dome 0..1 */
  domed?: number
}

export interface NeckVisual {
  goitre?: { kind: 'diffuse' | 'multinodular' | 'nodule'; side?: 'left' | 'right'; size: 1 | 2 | 3 }
  thyroglossal?: { sizeCm: number }
  /** Exophthalmos 0..1 */
  proptosis?: number
  lidRetraction?: boolean
  lidLag?: boolean
  /** Fine tremor 0..1 */
  tremor?: number
  sweaty?: boolean
  onycholysis?: boolean
  acropachy?: boolean
  palmarErythema?: boolean
  pretibialMyxoedema?: boolean
  nodes?: 'left' | 'right' | 'both'
  scar?: boolean
}

export interface BreastVisual {
  lump?: {
    side: 'left' | 'right'
    /** Clock-face position as seen facing the patient */
    clock: number
    distCm: number
    sizeCm: number
    /** Lump visibly distorts the contour */
    visible?: boolean
    /** Skin dimpling over it (accentuated with pectorals tensed / arms raised) */
    tethered?: boolean
  }
  skin?: 'normal' | 'peau' | 'erythema' | 'ulcer'
  nipple?: { side: 'left' | 'right'; change: 'inverted' | 'retracted' | 'paget' | 'discharge' }
  nodes?: 'left' | 'right'
}

export interface ScrotalVisual {
  side: 'left' | 'right'
  kind: 'hydrocele' | 'epididymal-cyst' | 'varicocele' | 'tumour' | 'torsion' | 'epididymitis' | 'inguinoscrotal-hernia'
  size: 1 | 2 | 3
  /** 0..1 */
  erythema?: number
  highRiding?: boolean
}

export interface StationVisual {
  legs?: LegsVisual
  lump?: LumpVisual
  neck?: NeckVisual
  breast?: BreastVisual
  scrotum?: ScrotalVisual
}

/* ------------------------------------------------------------------ */
/* Investigations, diagnosis, management                                */
/* ------------------------------------------------------------------ */

export interface LabValue {
  name: string
  value: string
  unit?: string
  range?: string
  flag?: 'H' | 'L' | 'HH' | 'LL'
}

export interface InvestigationResult {
  /** Structured values for lab panels */
  values?: LabValue[]
  /** Free-text report (imaging, bedside tests) */
  report?: string
  /** One-line interpretation shown in learn mode */
  interpretation?: string
  /** Simple schematic image key */
  image?: string
  /** Mark report-type results as abnormal (labs use value flags) */
  abnormal?: boolean
}

export interface RubricItem {
  id: string
  why?: string
}

export interface VivaQuestion {
  id: string
  q: string
  /** Multiple choice (auto-marked) */
  options?: string[]
  correct?: number
  /** Model answer (shown for self-marking and after MCQs) */
  answer: string
  topic?: string
}

export interface CaseDef {
  id: string
  /** Final diagnosis, hidden until debrief */
  title: string
  /** What the ward board shows, e.g. "Right iliac fossa pain" */
  presenting: string
  specialty: Specialty
  exam: ExamKind
  difficulty: 1 | 2 | 3
  setting: 'Emergency department' | 'Surgical assessment unit' | 'Surgical ward' | 'Outpatient clinic' | 'GP surgery'
  /** Station instructions (OSCE-style stem) */
  stem: string
  components: Component[]
  tags: string[]
  patient: PatientProfile
  vitals: Vitals
  bedside?: BedsideItems
  history: HistoryScript
  /** For abdominal / groin stations */
  abdo?: DeepPartial<AbdoFindings>
  /** For keyed stations: action id → finding */
  keyed?: Record<string, KeyedFinding>
  /** What the station stage should draw */
  visual?: StationVisual
  /** Protocol steps that are critical for this case (must be done) */
  criticalSteps?: string[]
  investigations: Record<string, InvestigationResult>
  investigationRubric: {
    essential: RubricItem[]
    helpful?: RubricItem[]
    avoid?: RubricItem[]
  }
  diagnosis: {
    correct: string
    /** Also accepted as correct */
    accept?: string[]
    /** Important differentials to consider */
    differentials: string[]
  }
  management: {
    essential: RubricItem[]
    helpful?: RubricItem[]
    avoid?: RubricItem[]
  }
  viva: VivaQuestion[]
  teaching: {
    summary: string
    keyFindings: string[]
    pearls: string[]
    presentation: string
    references?: string[]
  }
}

export interface CaseMeta {
  id: string
  presenting: string
  specialty: Specialty
  exam: ExamKind
  difficulty: 1 | 2 | 3
  setting: CaseDef['setting']
  patientLabel: string
  sex: 'male' | 'female'
  age: number
  tags: string[]
  load: () => Promise<CaseDef>
}

/* ------------------------------------------------------------------ */
/* Runtime log                                                          */
/* ------------------------------------------------------------------ */

export interface Observation {
  /** What you perceive (always shown) */
  text: string
  /** What it means (learn mode, or on reveal) */
  meaning?: string
  abnormal?: boolean
  /** Sound to play, visual to flash, etc. */
  media?: string
  /** Patient reaction 0..1 */
  reaction?: number
  /** Patient speaks */
  says?: string
}

export interface ExamEvent {
  action: string
  t: number
  region?: RegionId
  detail?: string
  obs?: Observation
}

export interface ChatTurn {
  id: string
  role: 'student' | 'patient' | 'system'
  text: string
  cue?: string
  intents?: string[]
  t: number
}
