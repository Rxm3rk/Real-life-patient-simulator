import type { ReactNode } from 'react'
import { Body } from '../../anatomy/Body'
import { bodyDims, landmarks } from '../../anatomy/bodyModel'
import { BreastSigns } from '../../anatomy/BreastSigns'
import { Face } from '../../anatomy/Face'
import { EyeCloseup } from '../../anatomy/FaceCloseups'
import { HandsIllustration, SchamrothView } from '../../anatomy/Hands'
import { LegSigns } from '../../anatomy/LegSigns'
import { LumpView } from '../../anatomy/LumpView'
import { NeckBust } from '../../anatomy/NeckBust'
import { ScrotumView } from '../../anatomy/ScrotumView'
import type { Appearance } from '../../anatomy/types'

export type SignSystem = 'Hands' | 'Face & eyes' | 'Neck' | 'Abdomen' | 'Groin & scrotum' | 'Breast' | 'Legs' | 'Lumps & skin'

export interface SignDef {
  id: string
  name: string
  system: SignSystem
  /** One line: what you see */
  what: string
  /** What it means */
  meaning: string
  causes: string[]
  /** How to elicit / look for it */
  elicit?: string
  viewBox: string
  render: (id: string) => ReactNode
}

const MAN: Appearance = { sex: 'male', age: 58, skinTone: 2, habitus: 'average', hair: 'short', hairColor: 'brown', eyeColor: 'blue', facialHair: 'none' }
const WOMAN: Appearance = { sex: 'female', age: 54, skinTone: 2, habitus: 'average', hair: 'bob', hairColor: 'brown', eyeColor: 'hazel' }
const pose = { pain: 0, wince: 0 }

const bodyWith = (a: Appearance, exposure: 'abdomen' | 'groin' | 'standing-groin' | 'legs' | 'torso', id: string, extra: Partial<Parameters<typeof Body>[0]> = {}) => (
  <Body a={a} pose={{ ...pose, exposure }} id={id} standing clinic herniaPhase="standing" {...extra} />
)

export const SIGNS: SignDef[] = [
  /* ------------------------------ Hands ------------------------------ */
  {
    id: 'clubbing',
    name: 'Finger clubbing',
    system: 'Hands',
    what: 'Loss of the angle between nail and nail fold, increased nail curvature and a bulbous fingertip — the diamond-shaped Schamroth window is obliterated.',
    meaning: 'A chronic process; clubbing itself causes no symptoms but points to serious underlying disease.',
    causes: ['GI: inflammatory bowel disease, cirrhosis, coeliac disease', 'Respiratory: lung cancer, bronchiectasis, empyema, interstitial fibrosis', 'Cardiac: cyanotic congenital heart disease, infective endocarditis', 'Thyroid acropachy (Graves’); familial'],
    elicit: 'Schamroth’s test: put the backs of the index fingers together, nail to nail, and look for the diamond window.',
    viewBox: '0 60 400 170',
    render: () => <SchamrothView a={MAN} clubbed />,
  },
  {
    id: 'koilonychia',
    name: 'Koilonychia',
    system: 'Hands',
    what: 'Thin, flattened nails that become concave — “spoon-shaped” enough to hold a drop of water.',
    meaning: 'Classically iron deficiency.',
    causes: ['Iron-deficiency anaemia (e.g. chronic GI blood loss — always ask about bleeding)', 'Haemochromatosis (rare)', 'Occupational trauma; familial'],
    viewBox: '0 60 400 170',
    render: () => <SchamrothView a={WOMAN} clubbed={false} koilonychia />,
  },
  {
    id: 'leukonychia',
    name: 'Leukonychia',
    system: 'Hands',
    what: 'White, opaque nail beds.',
    meaning: 'Hypoalbuminaemia — the nail bed becomes pale because of oedema.',
    causes: ['Chronic liver disease', 'Nephrotic syndrome', 'Protein-losing enteropathy and malnutrition'],
    viewBox: '0 30 400 300',
    render: (id) => <HandsIllustration a={MAN} id={id} view="dorsal" signs={{ leukonychia: true }} />,
  },
  {
    id: 'palmar-erythema',
    name: 'Palmar erythema',
    system: 'Hands',
    what: 'Blotchy redness of the thenar and hypothenar eminences, sparing the centre of the palm.',
    meaning: 'Increased circulating oestrogen or a hyperdynamic circulation.',
    causes: ['Chronic liver disease', 'Pregnancy', 'Thyrotoxicosis', 'Rheumatoid arthritis', 'Polycythaemia'],
    viewBox: '0 30 400 300',
    render: (id) => <HandsIllustration a={MAN} id={id} view="palms" signs={{ palmarErythema: true }} />,
  },
  {
    id: 'dupuytren',
    name: 'Dupuytren’s contracture',
    system: 'Hands',
    what: 'A thickened palmar fascia cord with nodules, flexing the ring (then little) finger at the MCP joint.',
    meaning: 'Fibroproliferative disease of the palmar fascia.',
    causes: ['Family history (autosomal dominant)', 'Alcohol excess and chronic liver disease', 'Diabetes', 'Epilepsy (phenytoin)', 'Manual work, smoking'],
    elicit: 'Hueston’s tabletop test: can the patient lay the palm flat on a table?',
    viewBox: '0 30 400 300',
    render: (id) => <HandsIllustration a={MAN} id={id} view="palms" signs={{ dupuytren: true }} />,
  },
  {
    id: 'asterixis',
    name: 'Asterixis (liver flap)',
    system: 'Hands',
    what: 'An irregular, flapping movement of the outstretched hands as wrist extension lapses.',
    meaning: 'A negative myoclonus from a metabolic encephalopathy.',
    causes: ['Hepatic encephalopathy', 'CO₂ retention (type 2 respiratory failure)', 'Uraemia'],
    elicit: 'Arms outstretched, wrists cocked back, fingers spread — watch for 30 seconds.',
    viewBox: '0 30 400 300',
    render: (id) => <HandsIllustration a={MAN} id={id} view="outstretched" flapPhase={0.8} signs={{}} />,
  },
  {
    id: 'tar',
    name: 'Nicotine (tar) staining',
    system: 'Hands',
    what: 'Yellow-brown staining of the index and middle fingers.',
    meaning: 'Heavy cigarette smoking — a risk factor to raise in almost every surgical station.',
    causes: ['Peripheral arterial disease and AAA', 'Lung cancer, COPD', 'Poor wound healing and post-operative chest infection'],
    viewBox: '0 30 400 300',
    render: (id) => <HandsIllustration a={MAN} id={id} view="dorsal" signs={{ tarStaining: true }} />,
  },

  /* ------------------------------ Face & eyes ------------------------------ */
  {
    id: 'jaundice',
    name: 'Scleral icterus (jaundice)',
    system: 'Face & eyes',
    what: 'Yellow discolouration of the sclerae, best seen in natural light.',
    meaning: 'Bilirubin above about 40–50 µmol/L. Classify it: pre-hepatic, hepatic or post-hepatic (obstructive).',
    causes: ['Obstructive: CBD stones, carcinoma of the pancreatic head, cholangiocarcinoma', 'Hepatic: hepatitis, cirrhosis, drugs', 'Pre-hepatic: haemolysis, Gilbert’s syndrome'],
    elicit: 'Ask the patient to look down while you gently lift the upper lid; also look under the tongue.',
    viewBox: '0 0 300 180',
    render: (id) => <EyeCloseup a={{ ...MAN, jaundice: 0.85 }} sclera="icteric" conjunctiva="pink" id={id} />,
  },
  {
    id: 'pallor',
    name: 'Conjunctival pallor',
    system: 'Face & eyes',
    what: 'A pale conjunctival rim when the lower lid is gently everted.',
    meaning: 'Anaemia (usually Hb < 90 g/L to be detectable).',
    causes: ['Chronic GI blood loss (e.g. caecal carcinoma — check for iron deficiency)', 'Acute haemorrhage', 'Chronic disease, malignancy'],
    elicit: 'Gently pull down the lower lid while the patient looks up.',
    viewBox: '0 0 300 180',
    render: (id) => <EyeCloseup a={{ ...WOMAN, pallor: 0.7 }} sclera="white" conjunctiva="pale" id={id} />,
  },
  {
    id: 'exophthalmos',
    name: 'Exophthalmos and lid retraction',
    system: 'Face & eyes',
    what: 'Sclera visible above and below the iris; the eyes protrude beyond the brow when viewed from above.',
    meaning: 'Graves’ ophthalmopathy (exophthalmos is specific to Graves’; lid retraction occurs in any thyrotoxicosis).',
    causes: ['Graves’ disease', 'Orbital tumours (unilateral proptosis)'],
    elicit: 'Inspect from the front, the side and from above behind the patient; test for lid lag and eye movements.',
    viewBox: '-40 30 80 34',
    render: (id) => <Face a={{ ...WOMAN, age: 30 }} pose={{ lookAt: 'up' }} gaze={{ x: 0, y: 0 }} eyes={{ retraction: 1, proptosis: 1 }} id={id} />,
  },

  /* ------------------------------ Neck ------------------------------ */
  {
    id: 'goitre',
    name: 'Diffuse goitre',
    system: 'Neck',
    what: 'Smooth, symmetrical enlargement of both lobes and the isthmus that rises on swallowing.',
    meaning: 'Any enlargement of the thyroid. Always assess thyroid status and eye signs too.',
    causes: ['Graves’ disease (often with a bruit)', 'Simple (colloid) goitre, puberty, pregnancy', 'Hashimoto’s thyroiditis', 'Iodine deficiency'],
    elicit: 'Watch it rise with a sip of water; palpate from behind; percuss the manubrium; listen for a bruit.',
    viewBox: '-80 40 160 150',
    render: (id) => <NeckBust a={{ ...WOMAN, age: 32, hair: 'bun' }} neck={{ goitre: { kind: 'diffuse', size: 2 } }} st={{ swallow: 0, tongue: 0, gazeDown: 0, pemberton: 0, pain: 0, wince: 0 }} id={id} exposed />,
  },
  {
    id: 'thyroglossal',
    name: 'Thyroglossal cyst',
    system: 'Neck',
    what: 'A smooth midline swelling at the level of the hyoid that rises on swallowing AND on tongue protrusion.',
    meaning: 'A remnant of the thyroglossal duct, tethered to the foramen caecum.',
    causes: ['Congenital — usually presents in children or young adults'],
    elicit: 'Ask the patient to stick out the tongue while you watch the lump.',
    viewBox: '-80 40 160 150',
    render: (id) => <NeckBust a={{ ...WOMAN, age: 19, hair: 'bun', hairColor: 'auburn' }} neck={{ thyroglossal: { sizeCm: 2 } }} st={{ swallow: 0, tongue: 0, gazeDown: 0, pemberton: 0, pain: 0, wince: 0 }} id={id} exposed />,
  },

  /* ------------------------------ Abdomen ------------------------------ */
  {
    id: 'caput',
    name: 'Stigmata of chronic liver disease',
    system: 'Abdomen',
    what: 'Caput medusae (dilated veins radiating from the umbilicus), spider naevi on the upper trunk and gynaecomastia.',
    meaning: 'Portal hypertension (caput medusae) and hyperoestrogenism (spider naevi, gynaecomastia).',
    causes: ['Alcohol-related liver disease', 'Viral hepatitis B and C', 'MASLD (fatty liver disease)'],
    elicit: 'Spider naevi blanch when the central arteriole is pressed and refill from the centre. More than five is abnormal.',
    viewBox: '-120 150 240 240',
    render: (id) => bodyWith({ ...MAN, caputMedusae: true, spiderNaevi: 7, gynaecomastia: true, jaundice: 0.35, distension: 1, distensionType: 'fluid' }, 'abdomen', id),
  },
  {
    id: 'cullen',
    name: 'Cullen’s and Grey Turner’s signs',
    system: 'Abdomen',
    what: 'Periumbilical bruising (Cullen’s) and flank bruising (Grey Turner’s).',
    meaning: 'Retroperitoneal or intra-abdominal haemorrhage tracking to the skin — a late, serious sign.',
    causes: ['Severe acute (haemorrhagic) pancreatitis', 'Ruptured abdominal aortic aneurysm', 'Ruptured ectopic pregnancy (Cullen’s)'],
    viewBox: '-120 240 240 160',
    render: (id) => bodyWith({ ...MAN, cullens: true, greyTurners: true }, 'abdomen', id),
  },
  {
    id: 'distension',
    name: 'Abdominal distension',
    system: 'Abdomen',
    what: 'A generally swollen, tense abdomen with an everted umbilicus.',
    meaning: 'Remember the causes: fat, fluid, flatus, faeces, fetus (and a massive organ or tumour).',
    causes: ['Bowel obstruction (tympanic)', 'Ascites (shifting dullness)', 'Pregnancy, obesity, large masses'],
    elicit: 'Percuss: tympanic (gas) versus dull in the flanks with shifting dullness (fluid).',
    viewBox: '-130 200 260 220',
    render: (id) => bodyWith({ ...MAN, distension: 3, distensionType: 'gas', umbilicus: 'everted', visiblePeristalsis: true }, 'abdomen', id),
  },
  {
    id: 'stoma',
    name: 'End ileostomy',
    system: 'Abdomen',
    what: 'A spouted stoma in the right iliac fossa with a single lumen.',
    meaning: 'Spouted (2–3 cm) to keep the irritant small-bowel effluent off the skin. Colostomies are usually flush, in the LIF, passing formed stool.',
    causes: ['Panproctocolectomy for ulcerative colitis or FAP', 'Subtotal colectomy (emergency colitis)', 'Loop ileostomy to defunction an anastomosis'],
    elicit: 'Describe site, spout, lumens, mucosa, contents; ask the patient to cough for a parastomal hernia.',
    viewBox: '-120 220 240 190',
    render: (id) => bodyWith({ ...MAN, habitus: 'thin', scars: ['midline'], stoma: { type: 'ileostomy', side: 'right', bag: false } }, 'abdomen', id),
  },

  /* ------------------------------ Groin & scrotum ------------------------------ */
  {
    id: 'inguinal',
    name: 'Inguinal hernia',
    system: 'Groin & scrotum',
    what: 'A groin swelling above and medial to the pubic tubercle, with an expansile cough impulse.',
    meaning: 'Indirect (through the deep ring, controlled by deep ring pressure) or direct (through Hesselbach’s triangle).',
    causes: ['Patent processus vaginalis (indirect)', 'Weak posterior wall with age (direct)', 'Raised intra-abdominal pressure: cough, constipation, prostatism, lifting'],
    elicit: 'Examine standing; find the pubic tubercle; feel for a cough impulse; reduce lying and occlude the deep ring.',
    viewBox: '-110 320 220 140',
    render: (id) => bodyWith({ ...MAN, hernias: [{ kind: 'inguinal-indirect', side: 'right', size: 'medium', visible: 'always' }] }, 'standing-groin', id),
  },
  {
    id: 'femoral',
    name: 'Femoral hernia',
    system: 'Groin & scrotum',
    what: 'A small, firm swelling below and lateral to the pubic tubercle, often irreducible and without a cough impulse.',
    meaning: 'Narrow, rigid neck — high risk of strangulation. Repair promptly.',
    causes: ['More common in women (wider pelvis)', 'Often presents as small-bowel obstruction in elderly women'],
    viewBox: '-110 320 220 140',
    render: (id) => bodyWith({ ...WOMAN, age: 74, hair: 'bob', hairColor: 'grey', hernias: [{ kind: 'femoral', side: 'right', size: 'small', visible: 'always' }] }, 'standing-groin', id),
  },
  {
    id: 'hydrocele',
    name: 'Hydrocele — transillumination',
    system: 'Groin & scrotum',
    what: 'A smooth scrotal swelling you can get above, surrounding the testis, which glows when a torch is applied.',
    meaning: 'Fluid in the tunica vaginalis. In adults, scan to exclude an underlying testicular tumour.',
    causes: ['Idiopathic (primary)', 'Secondary: tumour, epididymo-orchitis, trauma, torsion'],
    elicit: 'Can you get above it? Is it separate from the testis? Does it transilluminate?',
    viewBox: '40 60 320 240',
    render: (id) => <ScrotumView a={{ ...MAN, age: 67 }} spec={{ side: 'right', kind: 'hydrocele', size: 3 }} id={id} lying={false} torch exposed />,
  },

  /* ------------------------------ Breast ------------------------------ */
  {
    id: 'tethering',
    name: 'Skin tethering and nipple retraction',
    system: 'Breast',
    what: 'Dimpling of the skin over a lump, accentuated when the pectorals are tensed or the arms raised, with a recently drawn-in nipple.',
    meaning: 'Tumour infiltrating the suspensory (Cooper’s) ligaments — carcinoma until proven otherwise.',
    causes: ['Invasive breast carcinoma', 'Fat necrosis (history of trauma) can mimic it'],
    elicit: 'Inspect with arms by the sides, hands pressed on hips, and arms raised above the head.',
    viewBox: '-110 160 220 130',
    render: (id) => <BreastScene id={id} />,
  },
  {
    id: 'peau',
    name: 'Peau d’orange',
    system: 'Breast',
    what: 'Oedematous, pitted skin resembling orange peel, often with erythema.',
    meaning: 'Dermal lymphatic obstruction by tumour — inflammatory or locally advanced breast cancer (T4d).',
    causes: ['Inflammatory breast cancer', 'Locally advanced carcinoma', 'Rarely: severe infection or post-radiotherapy oedema'],
    viewBox: '-110 160 220 130',
    render: (id) => <BreastScene id={id} peau />,
  },

  /* ------------------------------ Legs ------------------------------ */
  {
    id: 'varicose',
    name: 'Varicose veins (great saphenous)',
    system: 'Legs',
    what: 'Dilated, tortuous superficial veins along the medial calf and thigh, filling on standing.',
    meaning: 'Superficial venous incompetence, usually at the saphenofemoral junction.',
    causes: ['Primary valve incompetence (family history, pregnancy, standing occupations)', 'Secondary to previous DVT (post-thrombotic)'],
    elicit: 'Examine standing, front and back; cough and tap tests; handheld Doppler at the SFJ.',
    viewBox: '-100 440 200 380',
    render: (id) => <LegsScene id={id} spec={{ right: { varicose: { system: 'gsv', severity: 3 } }, left: { varicose: { system: 'gsv', severity: 1 } } }} />,
  },
  {
    id: 'venous-ulcer',
    name: 'Venous ulcer',
    system: 'Legs',
    what: 'A large, shallow ulcer with sloping edges and a granulating base above the medial malleolus, with haemosiderin, eczema and lipodermatosclerosis.',
    meaning: 'Chronic venous hypertension (CEAP C6). Check ABPI before compression.',
    causes: ['Superficial venous reflux', 'Post-thrombotic deep venous disease', 'Obesity, immobility'],
    viewBox: '-84 620 118 150',
    render: (id) => <LegsScene id={id} spec={{ right: { haemosiderin: true, lipodermatosclerosis: true, eczema: true, ulcer: { kind: 'venous', site: 'gaiter', sizeCm: 3.4 }, varicose: { system: 'gsv', severity: 2 } }, left: {} }} />,
  },
  {
    id: 'arterial-ulcer',
    name: 'Arterial ulcer and dry gangrene',
    system: 'Legs',
    what: 'A small, deep, punched-out ulcer over the lateral malleolus with a pale base; a black, mummified toe with a red line of demarcation; pale, shiny, hairless skin.',
    meaning: 'Chronic limb-threatening ischaemia with tissue loss — urgent vascular referral.',
    causes: ['Atherosclerosis (smoking, diabetes, hypertension, hyperlipidaemia)', 'Diabetic microvascular disease (often with neuropathy)'],
    viewBox: '-88 650 118 160',
    render: (id) => <LegsScene id={id} spec={{ right: { pallor: 0.5, shiny: true, ulcer: { kind: 'arterial', site: 'lateral-malleolus', sizeCm: 1.6 }, gangrene: [2] }, left: {} }} />,
  },

  /* ------------------------------ Lumps & skin ------------------------------ */
  {
    id: 'lipoma',
    name: 'Lipoma',
    system: 'Lumps & skin',
    what: 'A soft, lobulated, mobile subcutaneous lump with normal overlying skin and a positive slip sign.',
    meaning: 'Benign fatty tumour. Screen for sarcoma red flags: > 5 cm, growing, deep to fascia, painful, recurrent.',
    causes: ['Sporadic; multiple in familial lipomatosis and Dercum’s disease'],
    elicit: 'Press the edge — it slips away under your finger (slip sign).',
    viewBox: '0 0 400 300',
    render: (id) => <LumpView a={MAN} spec={{ site: 'forearm', side: 'right', w: 4.5, h: 3.5, kind: 'lipoma', lobulated: true, domed: 0.42 }} id={id} exposed />,
  },
  {
    id: 'epidermoid',
    name: 'Epidermoid cyst with punctum',
    system: 'Lumps & skin',
    what: 'A smooth, dome-shaped intradermal lump with a central punctum, tethered to the skin.',
    meaning: 'A keratin-filled cyst from the hair follicle infundibulum (“sebaceous cyst” is a misnomer).',
    causes: ['Common on the face, neck, back and scrotum', 'Multiple in Gardner’s syndrome'],
    elicit: 'Look for the punctum; move the skin over the lump — it puckers at the punctum.',
    viewBox: '60 20 330 260',
    render: (id) => <LumpView a={{ ...WOMAN, skinTone: 3 }} spec={{ site: 'upper-back', side: 'right', w: 2, h: 2, kind: 'epidermoid', punctum: true, tethered: true, domed: 0.9 }} id={id} exposed />,
  },
]

export const SIGN_SYSTEMS: SignSystem[] = ['Hands', 'Face & eyes', 'Neck', 'Abdomen', 'Groin & scrotum', 'Breast', 'Legs', 'Lumps & skin']
export const SIGN_BY_ID: Record<string, SignDef> = Object.fromEntries(SIGNS.map((s) => [s.id, s]))

function BreastScene({ id, peau }: { id: string; peau?: boolean }) {
  const a: Appearance = { ...WOMAN, age: 62, hair: 'short', hairColor: 'grey' }
  const d = bodyDims(a)
  const lm = landmarks(a, d)
  return (
    <g>
      <Body a={a} pose={{ ...pose, exposure: 'torso' }} id={`${id}-b`} standing clinic armPose={peau ? 'sides' : 'hips'} />
      <BreastSigns
        a={a}
        d={d}
        lm={lm}
        pose={peau ? 'sides' : 'hips'}
        id={`${id}-s`}
        spec={peau ? { skin: 'peau', lump: { side: 'left', clock: 4, distCm: 3, sizeCm: 4 } } : { lump: { side: 'left', clock: 2, distCm: 3.5, sizeCm: 3, visible: true, tethered: true }, nipple: { side: 'left', change: 'retracted' } }}
      />
    </g>
  )
}

function LegsScene({ id, spec }: { id: string; spec: Parameters<typeof LegSigns>[0]['spec'] }) {
  const a: Appearance = { ...MAN, age: 66 }
  const d = bodyDims(a)
  return (
    <g>
      <Body a={a} pose={{ ...pose, exposure: 'legs' }} id={`${id}-b`} standing clinic />
      <LegSigns a={a} d={d} spec={spec} id={`${id}-l`} bodyId={`${id}-b`} seed={id} />
    </g>
  )
}
