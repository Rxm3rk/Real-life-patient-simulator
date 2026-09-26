import { REGION_ORDER, type RegionId } from '../../anatomy/bodyModel'
import { maxTender } from '../abdo'
import { isContact, type ViewId } from '../abdoActions'
import type { AbdoFindings, CaseDef, ExamEvent } from '../types'

export interface StepCtx {
  c: CaseDef
  f: AbdoFindings
  log: ExamEvent[]
  /** History intents asked (e.g. introduced during history) */
  asked: Set<string>
  /** Investigations ordered */
  ordered: Set<string>
}

export interface ProtocolStep {
  id: string
  section: string
  label: string
  marks: number
  /** true/false or a fraction 0..1 */
  done: (x: StepCtx) => boolean | number
  applies?: (x: StepCtx) => boolean
  why: string
  how?: string
  look?: string
  /** Action to highlight when this is the suggested next step */
  action?: string
  view?: ViewId
}

export interface OrderRule {
  id: string
  message: string
  penalty: number
  violated: (x: StepCtx) => boolean
}

/* helpers */
export const did = (x: StepCtx, a: string) => x.log.some((e) => e.action === a)
const didAny = (x: StepCtx, as: string[]) => x.log.some((e) => as.includes(e.action))
const idx = (x: StepCtx, pred: (e: ExamEvent) => boolean) => x.log.findIndex(pred)
const regions = (x: StepCtx, a: string) => new Set(x.log.filter((e) => e.action === a && e.region).map((e) => e.region as RegionId))
const PALP = ['abdo.light', 'abdo.deep', 'abdo.percTender', 'abdo.rebound']
const HANDS_ON_ABDO = [...PALP, 'abdo.percuss', 'abdo.liver', 'abdo.murphy', 'abdo.spleen', 'abdo.kidneys', 'abdo.aorta', 'abdo.bladder']
const tenderAny = (x: StepCtx) => maxTender(x.f).level >= 2
const female = (x: StepCtx) => x.c.patient.sex === 'female'
const reproductiveAge = (x: StepCtx) => female(x) && x.c.patient.age >= 12 && x.c.patient.age <= 55

export const ABDOMINAL_STEPS: ProtocolStep[] = [
  /* Preparation */
  {
    id: 'prep.wash',
    section: 'Preparation',
    label: 'Clean your hands',
    marks: 1,
    done: (x) => did(x, 'comm.wash'),
    action: 'comm.wash',
    why: 'Hand hygiene before touching a patient (WHO “moment 1”) prevents you carrying organisms from one patient to the next.',
    how: 'Alcohol gel for 20–30 s, or soap and water if hands are visibly soiled or C. difficile is suspected.',
  },
  {
    id: 'prep.intro',
    section: 'Preparation',
    label: 'Introduce yourself (name & role)',
    marks: 1,
    done: (x) => did(x, 'comm.intro') || x.asked.has('comm.intro'),
    action: 'comm.intro',
    why: 'Patients should know who is examining them. “Hello, my name is…” builds trust from the first seconds.',
  },
  {
    id: 'prep.identity',
    section: 'Preparation',
    label: 'Confirm the patient’s identity',
    marks: 1,
    done: (x) => did(x, 'comm.identity') || x.asked.has('comm.identity'),
    action: 'comm.identity',
    why: 'Check name and date of birth (and the wristband) — it prevents examining, investigating or operating on the wrong patient.',
  },
  {
    id: 'prep.consent',
    section: 'Preparation',
    label: 'Explain the examination and gain consent',
    marks: 1,
    done: (x) => did(x, 'comm.consent'),
    action: 'comm.consent',
    why: 'Valid consent requires a simple explanation of what you will do (look, feel, listen) and that it may be uncomfortable.',
  },
  {
    id: 'prep.chaperone',
    section: 'Preparation',
    label: 'Offer a chaperone',
    marks: 1,
    done: (x) => did(x, 'comm.chaperone'),
    action: 'comm.chaperone',
    why: 'The groin and genitalia may need examining. Offer a chaperone to every patient regardless of your gender or theirs, and document it.',
  },
  {
    id: 'prep.pain',
    section: 'Preparation',
    label: 'Ask about pain before you touch',
    marks: 1,
    done: (x) => did(x, 'comm.pain') || x.asked.has('pain.site'),
    action: 'comm.pain',
    why: 'Knowing where it hurts lets you start palpating as far away from the pain as possible and watch for it.',
  },
  {
    id: 'prep.position',
    section: 'Preparation',
    label: 'Position: flat, one pillow, arms by the sides',
    marks: 1,
    done: (x) => did(x, 'comm.position'),
    action: 'comm.position',
    why: 'Lying flat with the head on one pillow and arms by the sides relaxes the abdominal wall so you can palpate deep structures.',
  },
  {
    id: 'prep.expose',
    section: 'Preparation',
    label: 'Expose appropriately, maintaining dignity',
    marks: 1,
    done: (x) => did(x, 'comm.expose'),
    action: 'comm.expose',
    why: 'Expose at least from the xiphisternum to the symphysis pubis. The groin must be seen to examine the hernial orifices — keep the genitalia covered until needed.',
  },

  /* General inspection */
  {
    id: 'gen.eob',
    section: 'General inspection',
    label: 'Inspect from the end of the bed',
    marks: 1,
    done: (x) => did(x, 'gen.endOfBed'),
    action: 'gen.endOfBed',
    view: 'bed',
    why: 'Step back first. Much of the diagnosis is visible before you touch anyone.',
    look: 'Does the patient look well or unwell? Lying very still (peritonitis) or writhing (colic)? Jaundice, pallor, cachexia, distension? Around the bed: drains, stomas, NG tube and its contents, catheter bag, oxygen, sick bowl, medications.',
  },
  {
    id: 'gen.obs',
    section: 'General inspection',
    label: 'Review the observations (NEWS2)',
    marks: 1,
    done: (x) => did(x, 'gen.obs'),
    action: 'gen.obs',
    view: 'bed',
    why: 'Tachycardia, hypotension, fever and a raised respiratory rate identify the sick surgical patient who needs resuscitation before anything else.',
  },

  /* Hands & arms */
  {
    id: 'hands.inspect',
    section: 'Hands & arms',
    label: 'Inspect the hands and nails',
    marks: 1,
    done: (x) => did(x, 'hands.inspect'),
    action: 'hands.inspect',
    view: 'hands',
    why: 'The hands carry stigmata of chronic liver disease, anaemia and malabsorption.',
    look: 'Clubbing, leukonychia (low albumin), koilonychia (iron deficiency), palmar erythema, Dupuytren’s contracture, pale palmar creases.',
  },
  {
    id: 'hands.perfusion',
    section: 'Hands & arms',
    label: 'Assess temperature and capillary refill',
    marks: 1,
    done: (x) => didAny(x, ['hands.temp', 'hands.crt']),
    action: 'hands.crt',
    view: 'hands',
    why: 'Cool peripheries and a capillary refill > 2 s are early signs of hypovolaemia or shock.',
    how: 'Press the nail bed for 5 s at heart level, release, and count the seconds for colour to return.',
  },
  {
    id: 'hands.flap',
    section: 'Hands & arms',
    label: 'Test for asterixis',
    marks: 1,
    done: (x) => did(x, 'hands.flap'),
    action: 'hands.flap',
    view: 'hands',
    why: 'A coarse flapping tremor suggests hepatic encephalopathy (also CO₂ retention and uraemia).',
    how: 'Ask the patient to hold the arms out straight and cock the wrists back, fingers spread, for 30 seconds.',
  },
  {
    id: 'hands.pulse',
    section: 'Hands & arms',
    label: 'Radial pulse: rate and rhythm',
    marks: 1,
    done: (x) => did(x, 'hands.pulse'),
    action: 'hands.pulse',
    view: 'hands',
    why: 'Tachycardia accompanies pain, sepsis and bleeding; an irregularly irregular pulse (AF) is a source of mesenteric and limb emboli.',
    how: 'Feel the radial pulse with your index and middle fingers; count for 15 s × 4 (or 30 s × 2; a full minute if irregular).',
  },
  {
    id: 'arms.inspect',
    section: 'Hands & arms',
    label: 'Inspect the arms',
    marks: 0.5,
    done: (x) => did(x, 'arms.inspect'),
    action: 'arms.inspect',
    view: 'hands',
    why: 'Look for bruising (coagulopathy), scratch marks (cholestatic itch), needle-track marks and cannulae.',
  },

  /* Face & neck */
  {
    id: 'face.eyes',
    section: 'Face & neck',
    label: 'Eyes: sclerae and conjunctivae',
    marks: 1,
    done: (x) => did(x, 'face.eyes'),
    action: 'face.eyes',
    view: 'face',
    why: 'Jaundice appears first in the sclerae; conjunctival pallor suggests anaemia. In darker skin, these are more reliable than the skin itself.',
    how: 'Ask the patient to look up and gently pull down the lower eyelid.',
  },
  {
    id: 'face.mouth',
    section: 'Face & neck',
    label: 'Mouth and tongue',
    marks: 1,
    done: (x) => didAny(x, ['face.mouth', 'face.fetor']),
    action: 'face.mouth',
    view: 'face',
    why: 'Dry mucous membranes suggest dehydration; look for angular stomatitis, glossitis, ulcers and note any fetor.',
  },
  {
    id: 'neck.nodes',
    section: 'Face & neck',
    label: 'Palpate the supraclavicular lymph nodes',
    marks: 1,
    done: (x) => did(x, 'neck.nodes'),
    action: 'neck.nodes',
    view: 'neck',
    why: 'A hard left supraclavicular node (Virchow’s node — Troisier’s sign) suggests metastatic gastric or other upper GI cancer.',
    how: 'Ideally from behind the sitting patient, with the fingers in the supraclavicular fossae.',
  },
  {
    id: 'chest.inspect',
    section: 'Face & neck',
    label: 'Inspect the chest',
    marks: 0.5,
    done: (x) => did(x, 'chest.inspect'),
    action: 'chest.inspect',
    view: 'chest',
    why: 'Spider naevi (> 5 is abnormal), gynaecomastia and loss of body hair are stigmata of chronic liver disease.',
  },

  /* Abdomen: inspection */
  {
    id: 'abdo.inspect',
    section: 'Abdomen — inspection',
    label: 'Inspect the abdomen',
    marks: 1,
    done: (x) => did(x, 'abdo.inspect'),
    action: 'abdo.inspect',
    view: 'abdomen',
    why: 'Shape and movement, scars (they tell the surgical history), stomas, distension, visible masses, pulsation or peristalsis, caput medusae, bruising and hernias.',
    how: 'Look from the end of the bed and then crouch to look tangentially at eye level.',
  },
  {
    id: 'abdo.cough',
    section: 'Abdomen — inspection',
    label: 'Ask the patient to cough (or lift the head)',
    marks: 1,
    done: (x) => didAny(x, ['abdo.cough', 'abdo.headLift']),
    action: 'abdo.cough',
    view: 'abdomen',
    why: 'Pain on coughing is a gentle test for peritonism; coughing or lifting the head also reveals hernias and divarication of the recti.',
  },

  /* Abdomen: palpation */
  {
    id: 'palp.light',
    section: 'Abdomen — palpation',
    label: 'Light palpation of all nine regions',
    marks: 2,
    done: (x) => Math.min(1, regions(x, 'abdo.light').size / 8),
    action: 'abdo.light',
    view: 'abdomen',
    why: 'Light palpation detects tenderness and guarding before you cause pain with deep palpation.',
    how: 'Kneel so your forearm is level with the abdomen; use the flat of the fingers, not the tips; watch the patient’s face throughout.',
  },
  {
    id: 'palp.away',
    section: 'Abdomen — palpation',
    label: 'Start palpation away from the painful area',
    marks: 1,
    applies: tenderAny,
    done: (x) => {
      const first = x.log.find((e) => PALP.includes(e.action) && e.region)
      if (!first?.region) return false
      const rf = x.f.abdomen.regions[first.region]
      return Math.max(rf.light, rf.deep) < 2
    },
    why: 'If you start on the tender spot the patient will guard for the rest of the examination and you will learn nothing more.',
  },
  {
    id: 'palp.deep',
    section: 'Abdomen — palpation',
    label: 'Deep palpation of all nine regions',
    marks: 2,
    done: (x) => Math.min(1, regions(x, 'abdo.deep').size / 8),
    action: 'abdo.deep',
    view: 'abdomen',
    why: 'Deep palpation identifies deeper tenderness and masses. Describe any mass: site, size, shape, consistency, surface, edge, tenderness, mobility, pulsatility.',
  },
  {
    id: 'palp.peritonism',
    section: 'Abdomen — palpation',
    label: 'Check for peritonism in the tender area',
    marks: 1,
    applies: tenderAny,
    done: (x) => {
      const tender = REGION_ORDER.filter((r) => Math.max(x.f.abdomen.regions[r].light, x.f.abdomen.regions[r].deep) >= 2)
      return x.log.some((e) => (e.action === 'abdo.percTender' || e.action === 'abdo.rebound') && e.region && tender.includes(e.region)) || did(x, 'abdo.cough')
    },
    action: 'abdo.percTender',
    view: 'abdomen',
    why: 'Localised peritonism (percussion or rebound tenderness, guarding, pain on coughing) points to an inflamed viscus against the parietal peritoneum.',
    how: 'Macleod’s advises gentle percussion tenderness rather than rebound — it gives the same information more kindly.',
  },
  {
    id: 'org.liver',
    section: 'Abdomen — palpation',
    label: 'Palpate the liver',
    marks: 1,
    done: (x) => did(x, 'abdo.liver'),
    action: 'abdo.liver',
    view: 'abdomen',
    why: 'Hepatomegaly: congestion, infiltration, malignancy. Describe the edge: distance below the costal margin, texture, tenderness, pulsatility.',
    how: 'Start in the right iliac fossa; with each breath in, move your hand 1–2 cm up towards the right costal margin, feeling for the edge with the radial side of the index finger.',
  },
  {
    id: 'org.gb',
    section: 'Abdomen — palpation',
    label: 'Gallbladder / Murphy’s sign',
    marks: 1,
    done: (x) => did(x, 'abdo.murphy'),
    action: 'abdo.murphy',
    view: 'abdomen',
    why: 'Murphy’s sign (inspiratory arrest on palpation at the tip of the right 9th costal cartilage, absent on the left) → acute cholecystitis. A palpable, non-tender gallbladder in a jaundiced patient → Courvoisier’s law.',
  },
  {
    id: 'org.spleen',
    section: 'Abdomen — palpation',
    label: 'Palpate the spleen',
    marks: 1,
    done: (x) => did(x, 'abdo.spleen'),
    action: 'abdo.spleen',
    view: 'abdomen',
    why: 'The spleen enlarges from under the left costal margin towards the right iliac fossa, so start there and work diagonally. If not felt, roll the patient onto their right side.',
  },
  {
    id: 'org.kidneys',
    section: 'Abdomen — palpation',
    label: 'Ballot the kidneys',
    marks: 1,
    done: (x) => did(x, 'abdo.kidneys'),
    action: 'abdo.kidneys',
    view: 'abdomen',
    why: 'Bimanual palpation: one hand in the loin pushes up while the anterior hand feels the kidney “ballot”.',
  },
  {
    id: 'org.aorta',
    section: 'Abdomen — palpation',
    label: 'Palpate the aorta',
    marks: 1,
    done: (x) => did(x, 'abdo.aorta'),
    action: 'abdo.aorta',
    view: 'abdomen',
    why: 'An expansile mass (fingers pushed apart, not just up) above the umbilicus indicates an abdominal aortic aneurysm.',
  },
  {
    id: 'org.bladder',
    section: 'Abdomen — palpation',
    label: 'Palpate and percuss the bladder',
    marks: 0.5,
    applies: (x) =>
      x.f.abdomen.bladder.palpable || Math.max(x.f.abdomen.regions.SP.light, x.f.abdomen.regions.SP.deep) >= 1 || (x.c.patient.sex === 'male' && x.c.patient.age > 60),
    done: (x) => did(x, 'abdo.bladder'),
    action: 'abdo.bladder',
    view: 'abdomen',
    why: 'A smooth, dull suprapubic mass that you cannot get below is a distended bladder (retention) until proven otherwise.',
  },

  /* Percussion */
  {
    id: 'perc.regions',
    section: 'Abdomen — percussion',
    label: 'Percuss the abdomen',
    marks: 1,
    done: (x) => Math.min(1, regions(x, 'abdo.percuss').size / 5),
    action: 'abdo.percuss',
    view: 'abdomen',
    why: 'Tympanic over gas-filled bowel, dull over solid organs, masses, fluid or a full bladder.',
    how: 'Middle finger of the left hand flat on the skin; strike its middle phalanx with the tip of the right middle finger, using a loose wrist action.',
  },
  {
    id: 'perc.liver',
    section: 'Abdomen — percussion',
    label: 'Percuss the liver span',
    marks: 0.5,
    done: (x) => did(x, 'abdo.liverSpan'),
    action: 'abdo.liverSpan',
    view: 'abdomen',
    why: 'Upper border from the resonant chest down (normally 5th intercostal space), lower border from the abdomen up.',
  },
  {
    id: 'perc.shifting',
    section: 'Abdomen — percussion',
    label: 'Test for shifting dullness',
    marks: 1,
    applies: (x) => x.f.abdomen.shape === 'distended' || x.f.abdomen.shiftingDullness || x.f.abdomen.regions.RF.note === 'dull' || x.f.abdomen.regions.LF.note === 'dull',
    done: (x) => did(x, 'abdo.shifting'),
    action: 'abdo.shifting',
    view: 'abdomen',
    why: 'Distension or dull flanks: shifting dullness confirms free fluid (ascites).',
    how: 'Percuss from the umbilicus to the flank until dull; keep your finger there, roll the patient away from you, wait 30 s and percuss again.',
  },

  /* Auscultation */
  {
    id: 'ausc.bowel',
    section: 'Abdomen — auscultation',
    label: 'Listen for bowel sounds',
    marks: 1,
    done: (x) => did(x, 'abdo.bowel'),
    action: 'abdo.bowel',
    view: 'abdomen',
    why: 'Absent sounds (ileus, peritonitis), “tinkling” sounds (mechanical obstruction) or hyperactive sounds (gastroenteritis, GI bleed).',
    how: 'Diaphragm just right of the umbilicus; listen for up to 2 minutes before calling them absent.',
  },
  {
    id: 'ausc.bruits',
    section: 'Abdomen — auscultation',
    label: 'Listen for aortic and renal bruits',
    marks: 1,
    done: (x) => (did(x, 'abdo.bruitAortic') ? 0.5 : 0) + (did(x, 'abdo.bruitRenal') ? 0.5 : 0),
    action: 'abdo.bruitAortic',
    view: 'abdomen',
    why: 'Bruits indicate turbulent flow: aortic aneurysm/atheroma, renal artery stenosis (listen 2–3 cm above and lateral to the umbilicus).',
  },

  /* Hernial orifices & legs */
  {
    id: 'hern.orifices',
    section: 'Hernial orifices & legs',
    label: 'Examine the hernial orifices (with a cough)',
    marks: 1,
    done: (x) => {
      const n = ['groin.inguinalR', 'groin.inguinalL', 'groin.femoralR', 'groin.femoralL'].filter((a) => did(x, a)).length
      if (n >= 3 && did(x, 'groin.cough')) return 1
      if (n >= 2 || did(x, 'groin.cough')) return 0.6
      return did(x, 'complete.hernial') ? 0.5 : 0
    },
    action: 'groin.expose',
    view: 'groin',
    why: 'Always examine the hernial orifices in abdominal pain, and above all in bowel obstruction: a small femoral hernia in an elderly woman is easily missed.',
    how: 'Palpate the inguinal (above & medial to the pubic tubercle) and femoral (below & lateral) regions on both sides while the patient coughs.',
  },
  {
    id: 'legs.oedema',
    section: 'Hernial orifices & legs',
    label: 'Check for peripheral oedema',
    marks: 0.5,
    done: (x) => did(x, 'legs.oedema'),
    action: 'legs.oedema',
    view: 'legs',
    why: 'Pitting oedema with ascites suggests hypoalbuminaemia (chronic liver disease, nephrotic syndrome) or heart failure.',
  },

  /* Completion */
  {
    id: 'end.thank',
    section: 'Completion',
    label: 'Thank the patient and restore their dignity',
    marks: 1,
    done: (x) => did(x, 'comm.thank'),
    action: 'comm.thank',
    why: 'Cover the patient up, make sure they are comfortable and thank them.',
  },
  {
    id: 'end.wash',
    section: 'Completion',
    label: 'Clean your hands afterwards',
    marks: 1,
    done: (x) => {
      const lastContact = x.log.map((e) => isContact(e.action)).lastIndexOf(true)
      return lastContact >= 0 && x.log.slice(lastContact + 1).some((e) => e.action === 'comm.wash')
    },
    action: 'comm.wash',
    why: 'WHO “moment 4”: after touching a patient — protects you and the next patient.',
  },
  {
    id: 'end.completion',
    section: 'Completion',
    label: 'State how you would complete the examination',
    marks: 1,
    done: (x) => {
      const n = ['complete.dre', 'complete.genitalia', 'complete.urinalysis'].filter((a) => did(x, a)).length
      return n >= 2 ? 1 : n === 1 ? 0.5 : 0
    },
    action: 'complete.dre',
    why: 'An abdominal examination is completed by: hernial orifices, external genitalia, digital rectal examination, urine dipstick (+ pregnancy test in women of childbearing age) and the observation chart.',
  },
  {
    id: 'end.pregnancy',
    section: 'Completion',
    label: 'Pregnancy test in a woman of childbearing age',
    marks: 1,
    applies: reproductiveAge,
    done: (x) => did(x, 'complete.pregnancy') || x.ordered.has('urine-hcg') || x.ordered.has('bhcg-serum'),
    action: 'complete.pregnancy',
    why: 'Every woman of reproductive age with abdominal pain needs a pregnancy test — an ectopic pregnancy can kill, and pregnancy changes imaging and drug choices.',
  },
]

export const ABDOMINAL_ORDER_RULES: OrderRule[] = [
  {
    id: 'order.wash',
    message: 'You touched the patient before cleaning your hands.',
    penalty: 1,
    violated: (x) => {
      const firstContact = idx(x, (e) => isContact(e.action))
      if (firstContact < 0) return false
      const firstWash = idx(x, (e) => e.action === 'comm.wash')
      return firstWash < 0 || firstWash > firstContact
    },
  },
  {
    id: 'order.consent',
    message: 'You touched the patient before explaining the examination and gaining consent.',
    penalty: 1,
    violated: (x) => {
      const firstContact = idx(x, (e) => isContact(e.action))
      if (firstContact < 0) return false
      const consent = idx(x, (e) => e.action === 'comm.consent')
      return consent < 0 || consent > firstContact
    },
  },
  {
    id: 'order.expose',
    message: 'You palpated the abdomen before exposing it properly — you cannot inspect or palpate well through clothing.',
    penalty: 0.5,
    violated: (x) => {
      const firstPalp = idx(x, (e) => HANDS_ON_ABDO.includes(e.action))
      if (firstPalp < 0) return false
      const exp = idx(x, (e) => e.action === 'comm.expose')
      return exp < 0 || exp > firstPalp
    },
  },
  {
    id: 'order.painAsk',
    message: 'You started palpating without asking where it hurts.',
    penalty: 0.5,
    violated: (x) => {
      if (maxTender(x.f).level === 0) return false
      const firstPalp = idx(x, (e) => PALP.includes(e.action))
      if (firstPalp < 0) return false
      if (x.asked.has('pain.site')) return false
      const ask = idx(x, (e) => e.action === 'comm.pain')
      return ask < 0 || ask > firstPalp
    },
  },
  {
    id: 'order.eob',
    message: 'You laid hands on the patient before inspecting from the end of the bed.',
    penalty: 0.5,
    violated: (x) => {
      const firstContact = idx(x, (e) => isContact(e.action))
      if (firstContact < 0) return false
      const eob = idx(x, (e) => e.action === 'gen.endOfBed')
      return eob < 0 || eob > firstContact
    },
  },
  {
    id: 'order.peripheries',
    message: 'Macleod’s systematic sequence examines the hands, face and neck before the abdomen — you went to the abdomen first.',
    penalty: 0.5,
    violated: (x) => {
      const firstAbdo = idx(x, (e) => HANDS_ON_ABDO.includes(e.action))
      const hands = idx(x, (e) => e.action === 'hands.inspect')
      return firstAbdo >= 0 && hands >= 0 && hands > firstAbdo
    },
  },
  {
    id: 'order.inspectFirst',
    message: 'You palpated before inspecting the abdomen. Look before you touch.',
    penalty: 0.5,
    violated: (x) => {
      const firstPalp = idx(x, (e) => HANDS_ON_ABDO.includes(e.action))
      if (firstPalp < 0) return false
      const insp = idx(x, (e) => e.action === 'abdo.inspect')
      return insp < 0 || insp > firstPalp
    },
  },
  {
    id: 'order.lightDeep',
    message: 'You palpated deeply before palpating lightly in the same region.',
    penalty: 0.5,
    violated: (x) => {
      const seenLight = new Set<RegionId>()
      for (const e of x.log) {
        if (e.action === 'abdo.light' && e.region) seenLight.add(e.region)
        if (e.action === 'abdo.deep' && e.region && !seenLight.has(e.region)) return true
      }
      return false
    },
  },
  {
    id: 'order.startTender',
    message: 'You began palpating on the painful area. Start as far from the pain as possible and work towards it.',
    penalty: 1,
    violated: (x) => {
      if (maxTender(x.f).level < 2) return false
      const first = x.log.find((e) => PALP.includes(e.action) && e.region)
      if (!first?.region) return false
      const rf = x.f.abdomen.regions[first.region]
      return Math.max(rf.light, rf.deep) >= 2
    },
  },
  {
    id: 'order.chaperone',
    message: 'You examined the groin without offering a chaperone.',
    penalty: 1,
    violated: (x) => {
      const groin = idx(x, (e) => e.action.startsWith('groin.') && e.action !== 'groin.umbilical')
      if (groin < 0) return false
      const ch = idx(x, (e) => e.action === 'comm.chaperone')
      return ch < 0 || ch > groin
    },
  },
]
