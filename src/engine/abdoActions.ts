import type { RegionId } from '../anatomy/bodyModel'
import { SCAR_INFO } from '../anatomy/Scars'
import {
  aortaResult,
  bladderResult,
  bowelSounds,
  bruit,
  fluidThrill,
  hernia,
  kidneyResult,
  liverResult,
  liverSpan,
  maxTender,
  murphyTest,
  palpate,
  percussionTenderness,
  percussNote,
  reboundTest,
  shiftingDullness,
  spleenResult,
} from './abdo'
import { news2 } from './news2'
import type { AbdoFindings, CaseDef, CompletionId, Observation } from './types'

export type ViewId = 'bed' | 'hands' | 'face' | 'neck' | 'chest' | 'abdomen' | 'groin' | 'legs'

export interface ActionDef {
  id: string
  label: string
  /** Short label for compact buttons */
  short?: string
  view: ViewId | 'any'
  group: 'Communication' | 'Inspection' | 'Palpation' | 'Percussion' | 'Auscultation' | 'Organs' | 'Special tests' | 'Hernial orifices' | 'Completion' | 'Measurement'
  contact: boolean
  /** Requires a region argument */
  region?: boolean
  intimate?: boolean
  hint?: string
}

export const ABDO_ACTIONS: ActionDef[] = [
  // communication (any view)
  { id: 'comm.wash', label: 'Clean your hands', short: 'Hand hygiene', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.intro', label: 'Introduce yourself (name & role)', short: 'Introduce', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.identity', label: 'Confirm name and date of birth', short: 'Confirm ID', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.consent', label: 'Explain the examination & gain consent', short: 'Consent', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.chaperone', label: 'Offer a chaperone', short: 'Chaperone', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.pain', label: 'Ask about pain before examining', short: 'Any pain?', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.position', label: 'Lie flat, one pillow, arms by sides', short: 'Position', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.expose', label: 'Expose the abdomen (xiphisternum to pubis), maintaining dignity', short: 'Expose', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.analgesia', label: 'Offer analgesia', short: 'Analgesia', view: 'any', group: 'Communication', contact: false },
  { id: 'comm.thank', label: 'Thank the patient and help them cover up', short: 'Thank & cover', view: 'any', group: 'Completion', contact: false },

  // general
  { id: 'gen.endOfBed', label: 'Inspect from the end of the bed', short: 'End of bed', view: 'bed', group: 'Inspection', contact: false },
  { id: 'gen.obs', label: 'Review the observation chart', short: 'Obs chart', view: 'bed', group: 'Inspection', contact: false },

  // hands & arms
  { id: 'hands.inspect', label: 'Inspect hands & nails', short: 'Inspect hands', view: 'hands', group: 'Inspection', contact: true },
  { id: 'hands.clubbing', label: 'Check for clubbing (Schamroth’s window)', short: 'Clubbing', view: 'hands', group: 'Inspection', contact: true },
  { id: 'hands.temp', label: 'Feel temperature of the hands', short: 'Temperature', view: 'hands', group: 'Palpation', contact: true },
  { id: 'hands.crt', label: 'Capillary refill time', short: 'Cap refill', view: 'hands', group: 'Measurement', contact: true },
  { id: 'hands.flap', label: 'Test for asterixis (arms out, wrists cocked back for 30 s)', short: 'Asterixis', view: 'hands', group: 'Special tests', contact: false },
  { id: 'hands.pulse', label: 'Radial pulse — rate & rhythm', short: 'Radial pulse', view: 'hands', group: 'Measurement', contact: true },
  { id: 'arms.inspect', label: 'Inspect the arms (bruising, scratch marks, needle marks)', short: 'Inspect arms', view: 'hands', group: 'Inspection', contact: false },

  // face & neck
  { id: 'face.eyes', label: 'Eyes: sclerae & conjunctivae (gently pull down the lower lid)', short: 'Eyes', view: 'face', group: 'Inspection', contact: true },
  { id: 'face.mouth', label: 'Mouth: hydration, tongue, ulcers, angular stomatitis', short: 'Mouth', view: 'face', group: 'Inspection', contact: false },
  { id: 'face.fetor', label: 'Note the breath (fetor)', short: 'Breath', view: 'face', group: 'Inspection', contact: false },
  { id: 'neck.nodes', label: 'Palpate supraclavicular & cervical lymph nodes (from behind)', short: 'Neck nodes', view: 'neck', group: 'Palpation', contact: true },
  { id: 'chest.inspect', label: 'Inspect the chest (spider naevi, gynaecomastia, hair loss)', short: 'Inspect chest', view: 'chest', group: 'Inspection', contact: false },

  // abdomen
  { id: 'abdo.inspect', label: 'Inspect the abdomen', short: 'Inspect', view: 'abdomen', group: 'Inspection', contact: false },
  { id: 'abdo.inspectSide', label: 'Inspect at eye level from the side', short: 'Eye-level view', view: 'abdomen', group: 'Inspection', contact: false },
  { id: 'abdo.cough', label: 'Ask the patient to cough', short: 'Cough', view: 'abdomen', group: 'Inspection', contact: false },
  { id: 'abdo.headLift', label: 'Ask the patient to lift their head off the pillow', short: 'Head lift', view: 'abdomen', group: 'Inspection', contact: false },
  { id: 'abdo.light', label: 'Light palpation', short: 'Light', view: 'abdomen', group: 'Palpation', contact: true, region: true },
  { id: 'abdo.deep', label: 'Deep palpation', short: 'Deep', view: 'abdomen', group: 'Palpation', contact: true, region: true },
  { id: 'abdo.percTender', label: 'Percussion tenderness', short: 'Perc. tender', view: 'abdomen', group: 'Palpation', contact: true, region: true },
  { id: 'abdo.rebound', label: 'Rebound tenderness', short: 'Rebound', view: 'abdomen', group: 'Palpation', contact: true, region: true },
  { id: 'abdo.percuss', label: 'Percuss', short: 'Percuss', view: 'abdomen', group: 'Percussion', contact: true, region: true },
  { id: 'abdo.liver', label: 'Palpate the liver (from the RIF upwards)', short: 'Liver', view: 'abdomen', group: 'Organs', contact: true },
  { id: 'abdo.liverSpan', label: 'Percuss the liver span', short: 'Liver span', view: 'abdomen', group: 'Percussion', contact: true },
  { id: 'abdo.murphy', label: 'Gallbladder & Murphy’s sign', short: 'Murphy’s', view: 'abdomen', group: 'Organs', contact: true },
  { id: 'abdo.murphyLeft', label: 'Compare Murphy’s manoeuvre on the left', short: 'Murphy’s (L)', view: 'abdomen', group: 'Organs', contact: true },
  { id: 'abdo.spleen', label: 'Palpate the spleen (RIF → left costal margin)', short: 'Spleen', view: 'abdomen', group: 'Organs', contact: true },
  { id: 'abdo.kidneys', label: 'Ballot the kidneys', short: 'Kidneys', view: 'abdomen', group: 'Organs', contact: true },
  { id: 'abdo.aorta', label: 'Palpate the aorta', short: 'Aorta', view: 'abdomen', group: 'Organs', contact: true },
  { id: 'abdo.bladder', label: 'Palpate & percuss the bladder', short: 'Bladder', view: 'abdomen', group: 'Organs', contact: true },
  { id: 'abdo.shifting', label: 'Shifting dullness', short: 'Shifting dullness', view: 'abdomen', group: 'Special tests', contact: true },
  { id: 'abdo.thrill', label: 'Fluid thrill', short: 'Fluid thrill', view: 'abdomen', group: 'Special tests', contact: true },
  { id: 'abdo.bowel', label: 'Auscultate bowel sounds', short: 'Bowel sounds', view: 'abdomen', group: 'Auscultation', contact: true },
  { id: 'abdo.bruitAortic', label: 'Listen for an aortic bruit', short: 'Aortic bruit', view: 'abdomen', group: 'Auscultation', contact: true },
  { id: 'abdo.bruitRenal', label: 'Listen for renal bruits', short: 'Renal bruits', view: 'abdomen', group: 'Auscultation', contact: true },
  { id: 'abdo.succussion', label: 'Succussion splash', short: 'Succussion', view: 'abdomen', group: 'Special tests', contact: true },
  { id: 'abdo.rovsing', label: 'Rovsing’s sign', short: 'Rovsing’s', view: 'abdomen', group: 'Special tests', contact: true },
  { id: 'abdo.psoas', label: 'Psoas sign', short: 'Psoas', view: 'abdomen', group: 'Special tests', contact: true },
  { id: 'abdo.obturator', label: 'Obturator sign', short: 'Obturator', view: 'abdomen', group: 'Special tests', contact: true },
  { id: 'abdo.carnett', label: 'Carnett’s sign', short: 'Carnett’s', view: 'abdomen', group: 'Special tests', contact: true },

  // groin
  { id: 'groin.expose', label: 'Expose the groin (with consent & chaperone)', short: 'Expose groin', view: 'groin', group: 'Hernial orifices', contact: false, intimate: true },
  { id: 'groin.inguinalR', label: 'Right inguinal region', short: 'R inguinal', view: 'groin', group: 'Hernial orifices', contact: true, intimate: true },
  { id: 'groin.inguinalL', label: 'Left inguinal region', short: 'L inguinal', view: 'groin', group: 'Hernial orifices', contact: true, intimate: true },
  { id: 'groin.femoralR', label: 'Right femoral canal', short: 'R femoral', view: 'groin', group: 'Hernial orifices', contact: true, intimate: true },
  { id: 'groin.femoralL', label: 'Left femoral canal', short: 'L femoral', view: 'groin', group: 'Hernial orifices', contact: true, intimate: true },
  { id: 'groin.umbilical', label: 'Umbilicus', short: 'Umbilicus', view: 'groin', group: 'Hernial orifices', contact: true },
  { id: 'groin.cough', label: 'Ask the patient to cough (fingers on the hernial orifices)', short: 'Cough', view: 'groin', group: 'Hernial orifices', contact: true, intimate: true },
  { id: 'groin.femoralPulses', label: 'Femoral pulses', short: 'Femoral pulses', view: 'groin', group: 'Palpation', contact: true, intimate: true },

  // legs
  { id: 'legs.oedema', label: 'Check for pitting oedema', short: 'Oedema', view: 'legs', group: 'Palpation', contact: true },

  // completion
  { id: 'complete.dre', label: 'Digital rectal examination', short: 'DRE', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.genitalia', label: 'Examine the external genitalia', short: 'Genitalia', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.urinalysis', label: 'Urine dipstick', short: 'Urinalysis', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.pregnancy', label: 'Pregnancy test (β-hCG)', short: 'Pregnancy test', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.cvsResp', label: 'Examine the cardiovascular & respiratory systems', short: 'CVS/resp exam', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.hernial', label: 'State: I would examine the hernial orifices', short: 'Hernial orifices', view: 'any', group: 'Completion', contact: false },
]

export const ACTION_BY_ID: Record<string, ActionDef> = Object.fromEntries(ABDO_ACTIONS.map((a) => [a.id, a]))

export function isContact(action: string): boolean {
  return !!ACTION_BY_ID[action]?.contact
}

/* ------------------------------------------------------------------ */

const p3 = (c: CaseDef) =>
  c.patient.sex === 'male' ? { he: 'he', his: 'his', him: 'him', He: 'He', His: 'His' } : { he: 'she', his: 'her', him: 'her', He: 'She', His: 'Her' }

export interface ObserveCtx {
  c: CaseDef
  f: AbdoFindings
  analgesia: boolean
  /** extra detail: e.g. liver start position, seconds listened */
  detail?: string
  seconds?: number
}

export function observe(action: string, region: RegionId | undefined, x: ObserveCtx): Observation {
  const { c, f } = x
  const p = p3(c)
  const a = c.patient.appearance
  const v = c.vitals
  switch (action) {
    /* communication */
    case 'comm.wash':
      return { text: 'You clean your hands with alcohol gel.' }
    case 'comm.intro':
      return { text: 'You introduce yourself by name and role.', says: c.patient.persona.mood === 'distressed' ? 'Hello… please help, it hurts.' : 'Hello, nice to meet you.' }
    case 'comm.identity':
      return { text: `${c.patient.name}, date of birth ${c.patient.dob}.`, says: `Yes — ${c.patient.name}, ${c.patient.dob}.` }
    case 'comm.consent':
      return { text: 'You explain that you would like to examine the tummy, which involves looking, feeling and listening, and that it may be uncomfortable.', says: 'Yes, that’s fine, go ahead.' }
    case 'comm.chaperone':
      return {
        text: 'You offer a chaperone.',
        says: c.patient.sex === 'female' ? 'Yes please, I’d prefer that.' : 'No, that’s fine thank you.',
      }
    case 'comm.pain': {
      const m = maxTender(f)
      if (!m.region || m.level === 0) return { text: 'You ask whether there is any pain before you start.', says: 'No, nothing hurts at the moment.' }
      const site = siteWords(m.region)
      return {
        text: `You ask about pain before you touch.`,
        says: `Yes — it’s really sore ${site}.`,
        meaning: 'Now you know to start palpating away from that area and watch the face throughout.',
      }
    }
    case 'comm.position':
      return { text: `${c.patient.title} lies flat with one pillow, arms by ${p.his} sides, to relax the abdominal wall.` }
    case 'comm.expose':
      return { text: 'You expose the abdomen from the xiphisternum to the pubic symphysis, keeping the patient covered elsewhere.' }
    case 'comm.analgesia':
      return {
        text: 'You arrange analgesia. After a few minutes the patient looks more comfortable.',
        meaning: 'Good practice: early analgesia does not mask clinical signs and makes the examination kinder and more reliable.',
        says: 'Thank you — that’s taking the edge off.',
      }
    case 'comm.thank':
      return { text: `You thank ${c.patient.title}, cover ${p.him} up and make sure ${p.he} is comfortable.`, says: 'Thank you, doctor.' }

    /* general */
    case 'gen.endOfBed':
      return { text: f.general.endOfBed, abnormal: !!(f.general.lyingStill || f.general.restless) }
    case 'gen.obs': {
      const n = news2(v)
      return {
        text: `HR ${v.hr} (${v.rhythm}), BP ${v.sbp}/${v.dbp}, RR ${v.rr}, SpO₂ ${v.spo2}%${v.o2 ? ` on ${v.o2}` : ' on air'}, T ${v.temp.toFixed(1)} °C${v.avpu ? `, AVPU ${v.avpu}` : ''}${v.pain !== undefined ? `, pain ${v.pain}/10` : ''}.`,
        meaning: `NEWS2 = ${n.score} (${n.risk} risk).${n.notes.length ? ' ' + n.notes.join(' ') : ''}`,
        abnormal: n.score > 0,
      }
    }

    /* hands */
    case 'hands.inspect': {
      const h = f.hands
      const bits: string[] = []
      bits.push(h.clubbing ? 'The nails are clubbed.' : 'No clubbing.')
      if (h.leukonychia) bits.push('The nails are white (leukonychia).')
      if (h.koilonychia) bits.push('The nails are spoon-shaped (koilonychia).')
      if (h.palmarErythema) bits.push('The thenar and hypothenar eminences are reddened (palmar erythema).')
      if (h.dupuytren) bits.push('There is thickening of the palmar fascia with a flexion contracture of the ring finger (Dupuytren’s).')
      if (h.pallorCreases) bits.push('The palmar creases look pale.')
      if (h.tarStaining) bits.push('There is tar staining of the fingers.')
      if (!h.leukonychia && !h.koilonychia && !h.palmarErythema && !h.dupuytren && !h.pallorCreases && !h.clubbing)
        bits.push('No leukonychia, koilonychia, palmar erythema or Dupuytren’s contracture.')
      const abnormal = h.clubbing || h.leukonychia || h.koilonychia || h.palmarErythema || h.dupuytren || !!h.pallorCreases
      const meanings: string[] = []
      if (h.leukonychia) meanings.push('leukonychia → hypoalbuminaemia (e.g. chronic liver disease)')
      if (h.koilonychia) meanings.push('koilonychia → iron deficiency')
      if (h.palmarErythema) meanings.push('palmar erythema → chronic liver disease, pregnancy, thyrotoxicosis')
      if (h.dupuytren) meanings.push('Dupuytren’s → associated with alcohol excess')
      if (h.clubbing) meanings.push('clubbing → cirrhosis, IBD, coeliac disease (GI causes)')
      if (h.pallorCreases) meanings.push('pale creases → anaemia')
      return { text: bits.join(' '), meaning: meanings.length ? meanings.join('; ') + '.' : 'Normal hands.', abnormal, media: 'closeup:hands' }
    }
    case 'hands.clubbing':
      return f.hands.clubbing
        ? { text: 'With the dorsal surfaces of the index fingernails opposed, the diamond-shaped window has disappeared and the nail-bed angle is lost.', meaning: 'Schamroth’s sign positive — finger clubbing.', abnormal: true, media: 'closeup:profile' }
        : { text: 'With the index fingernails placed back to back, a diamond-shaped window is visible between them.', meaning: 'Schamroth’s window present — no clubbing.', media: 'closeup:profile' }
    case 'hands.temp': {
      const t = f.hands.temperature
      return {
        text: t === 'warm' ? 'The hands are warm.' : t === 'hot' ? 'The hands are hot and flushed.' : t === 'cool' ? 'The hands are cool.' : 'The hands are cold and clammy.',
        meaning: t === 'cold' || t === 'cool' ? 'Peripheral vasoconstriction — consider shock or hypovolaemia.' : t === 'hot' ? 'Warm peripheries — vasodilatation (fever, early sepsis).' : 'Well perfused.',
        abnormal: t !== 'warm',
      }
    }
    case 'hands.crt': {
      const crt = f.hands.crt
      return {
        text: `After 5 seconds of pressure on the nail bed, colour returns in ${crt.toFixed(crt % 1 ? 1 : 0)} second${crt === 1 ? '' : 's'}.`,
        meaning: crt > 2 ? 'Prolonged capillary refill (> 2 s): poor peripheral perfusion — hypovolaemia / shock.' : 'Normal capillary refill (< 2 s).',
        abnormal: crt > 2,
      }
    }
    case 'hands.flap':
      return f.hands.asterixis
        ? { text: `With arms outstretched and wrists cocked back, ${p.his} hands show an irregular, jerky flapping movement.`, meaning: 'Asterixis — hepatic encephalopathy (also CO₂ retention, uraemia).', abnormal: true, media: 'anim:flap' }
        : { text: `With arms outstretched and wrists cocked back for 30 seconds, ${p.his} hands stay steady.`, meaning: 'No asterixis.', media: 'anim:flap-none' }
    case 'hands.pulse': {
      const vol = f.hands.pulseVolume ?? 'normal'
      return {
        text: `Radial pulse ${v.hr} bpm, ${v.rhythm === 'irregular' ? 'irregularly irregular' : 'regular'}, ${vol === 'weak' ? 'weak and thready' : vol === 'bounding' ? 'bounding' : 'normal volume'}.`,
        meaning:
          [v.hr > 100 ? 'Tachycardia (pain, fever, sepsis, hypovolaemia).' : v.hr < 60 ? 'Bradycardia.' : '', v.rhythm === 'irregular' ? 'An irregularly irregular pulse suggests atrial fibrillation — a source of emboli (think mesenteric or limb ischaemia).' : '']
            .filter(Boolean)
            .join(' ') || 'Normal rate and rhythm.',
        abnormal: v.hr > 100 || v.hr < 60 || v.rhythm === 'irregular' || vol !== 'normal',
        media: 'pulse',
      }
    }
    case 'arms.inspect': {
      const marks = f.hands.armMarks
      const cannula = a.lines?.cannula ? `A cannula is sited in the ${a.lines.cannula.replace('-', ' ')}. ` : ''
      return {
        text: cannula + (marks ?? (a.excoriations ? 'There are linear scratch marks on the forearms.' : 'No bruising, scratch marks or needle-track marks.')),
        meaning: a.excoriations ? 'Excoriations → pruritus from cholestasis (obstructive jaundice).' : undefined,
        abnormal: !!marks || !!a.excoriations,
      }
    }

    /* face */
    case 'face.eyes': {
      const e = f.face
      const bits = [e.sclera === 'icteric' ? 'The sclerae are yellow.' : 'The sclerae are white.', e.conjunctiva === 'pale' ? 'The conjunctivae are pale.' : 'The conjunctivae are pink.']
      if (e.xanthelasma) bits.push('There are yellowish plaques around the eyelids (xanthelasma).')
      const m: string[] = []
      if (e.sclera === 'icteric') m.push('scleral icterus → jaundice (visible when bilirubin > ~50 µmol/L; check the sclerae in all skin tones)')
      if (e.conjunctiva === 'pale') m.push('conjunctival pallor → anaemia')
      if (e.xanthelasma) m.push('xanthelasma → hyperlipidaemia / primary biliary cholangitis')
      return { text: bits.join(' '), meaning: m.length ? m.join('; ') + '.' : 'No jaundice or pallor.', abnormal: m.length > 0, media: 'closeup:eye' }
    }
    case 'face.mouth': {
      const m = f.face
      const bits = [m.mucosa === 'dry' ? 'The mucous membranes are dry.' : 'The mucous membranes are moist.']
      if (m.tongue === 'dry-furred') bits.push('The tongue is dry and coated.')
      else if (m.tongue === 'smooth-red') bits.push('The tongue is smooth and beefy red (glossitis).')
      else if (m.tongue === 'pale') bits.push('The tongue is pale.')
      if (m.angularCheilitis) bits.push('There are cracks at the corners of the mouth (angular stomatitis).')
      if (m.ulcers) bits.push('There are aphthous ulcers.')
      if (!m.angularCheilitis && !m.ulcers) bits.push('No ulcers or angular stomatitis.')
      const mm: string[] = []
      if (m.mucosa === 'dry') mm.push('dry mucosa → dehydration')
      if (m.tongue === 'smooth-red') mm.push('glossitis → B12/folate/iron deficiency')
      if (m.angularCheilitis) mm.push('angular stomatitis → iron deficiency')
      if (m.ulcers) mm.push('aphthous ulcers → Crohn’s, coeliac')
      return { text: bits.join(' '), meaning: mm.length ? mm.join('; ') + '.' : 'Normal mouth.', abnormal: mm.length > 0, media: 'closeup:mouth' }
    }
    case 'face.fetor': {
      const fe = f.face.fetor
      const map = {
        none: ['No unusual smell on the breath.', undefined],
        hepaticus: ['There is a sweet, musty smell on the breath.', 'Fetor hepaticus — severe liver disease.'],
        ketotic: ['The breath smells of pear drops.', 'Ketosis (e.g. DKA — which can mimic an acute abdomen!).'],
        alcohol: ['The breath smells of alcohol.', 'Recent alcohol intake.'],
        faeculent: ['The breath smells faeculent.', 'Faeculent vomiting — distal small-bowel obstruction.'],
        uraemic: ['The breath has a fishy, ammoniacal smell.', 'Uraemic fetor — renal failure.'],
      } as const
      const [text, meaning] = map[fe]
      return { text, meaning, abnormal: fe !== 'none' }
    }

    /* neck & chest */
    case 'neck.nodes':
      return f.neck.virchow
        ? { text: 'Standing behind the patient, you feel a hard, fixed, 1.5 cm node in the left supraclavicular fossa.', meaning: 'Virchow’s node (Troisier’s sign) → metastatic upper GI malignancy, e.g. gastric or pancreatic cancer.', abnormal: true }
        : { text: f.neck.nodes ?? 'No palpable supraclavicular or cervical lymph nodes.', meaning: 'No lymphadenopathy (Virchow’s node absent).' }
    case 'chest.inspect': {
      const ch = f.chest
      const bits: string[] = []
      if (ch.spiderNaevi) bits.push('Several spider naevi on the upper chest — they blanch from the centre when pressed.')
      if (ch.gynaecomastia) bits.push('There is gynaecomastia.')
      if (ch.hairLoss) bits.push('There is loss of body hair.')
      return bits.length
        ? { text: bits.join(' '), meaning: 'Stigmata of chronic liver disease (> 5 spider naevi is abnormal; gynaecomastia also with spironolactone).', abnormal: true }
        : { text: 'No spider naevi, gynaecomastia or loss of body hair.', meaning: 'No chest stigmata of liver disease.' }
    }

    /* abdomen */
    case 'abdo.inspect':
      return inspectAbdomen(c, f)
    case 'abdo.inspectSide':
      return {
        text:
          f.abdomen.shape === 'distended'
            ? 'At eye level the abdomen is visibly and symmetrically distended.'
            : a.visiblePulsation
              ? 'At eye level you notice a pulsation in the epigastrium.'
              : 'At eye level there is no asymmetry, visible mass, pulsation or peristalsis.',
        abnormal: f.abdomen.shape === 'distended' || !!a.visiblePulsation || !!a.visiblePeristalsis,
      }
    case 'abdo.cough':
      return f.abdomen.coughPain
        ? { text: `${p.He} coughs, then winces and clutches ${p.his} abdomen.`, meaning: 'Pain on coughing — a sign of peritoneal irritation (peritonism).', abnormal: true, reaction: 0.7, says: 'Ow — coughing really hurts.' }
        : { text: 'Coughing causes no pain and no visible hernia or divarication.', meaning: 'No peritonism on coughing.' }
    case 'abdo.headLift':
      return { text: f.abdomen.headLift ?? `As ${p.he} lifts ${p.his} head, the recti tense evenly; no midline bulge or hernia appears.`, abnormal: !!f.abdomen.headLift }
    case 'abdo.light':
      return palpate(c, f, region ?? 'UMB', 'light', x.analgesia)
    case 'abdo.deep':
      return palpate(c, f, region ?? 'UMB', 'deep', x.analgesia)
    case 'abdo.percTender':
      return percussionTenderness(c, f, region ?? 'UMB')
    case 'abdo.rebound':
      return reboundTest(c, f, region ?? 'UMB')
    case 'abdo.percuss':
      return percussNote(f, region ?? 'UMB')
    case 'abdo.liver':
      return liverResult(c, f, x.detail !== 'high')
    case 'abdo.liverSpan':
      return liverSpan(f)
    case 'abdo.murphy':
      return murphyTest(c, f, 'right')
    case 'abdo.murphyLeft':
      return murphyTest(c, f, 'left')
    case 'abdo.spleen':
      return spleenResult(c, f)
    case 'abdo.kidneys':
      return kidneyResult(f)
    case 'abdo.aorta':
      return aortaResult(c, f)
    case 'abdo.bladder':
      return bladderResult(f)
    case 'abdo.shifting':
      return shiftingDullness(f)
    case 'abdo.thrill':
      return fluidThrill(f)
    case 'abdo.bowel':
      return bowelSounds(f, x.seconds ?? 30)
    case 'abdo.bruitAortic':
      return bruit(f, 'aortic')
    case 'abdo.bruitRenal': {
      const r = bruit(f, 'renalR')
      const l = bruit(f, 'renalL')
      return r.abnormal || l.abnormal ? { ...(r.abnormal ? r : l) } : { text: 'No renal bruits on either side.', media: 'steth:quiet' }
    }
    case 'abdo.succussion':
      return f.abdomen.succussionSplash
        ? { text: 'Gently rocking the patient side to side with the stethoscope over the epigastrium, you hear a loud splash.', meaning: 'Succussion splash > 4 h after eating → gastric outlet obstruction.', abnormal: true, media: 'splash' }
        : { text: 'No succussion splash.' }
    case 'abdo.rovsing':
      return f.abdomen.rovsing
        ? { text: `Deep pressure in the left iliac fossa makes ${p.him} wince and point to the right iliac fossa.`, meaning: 'Rovsing’s sign positive → appendicitis (peritoneal irritation in the RIF).', abnormal: true, reaction: 0.6, says: 'It hurts over on the right side!' }
        : { text: 'Pressing in the left iliac fossa causes no pain on the right.', meaning: 'Rovsing’s sign negative.' }
    case 'abdo.psoas':
      return f.abdomen.psoas
        ? { text: `Lying on ${p.his} left side, extension of the right hip causes pain in the right iliac fossa.`, meaning: 'Psoas sign positive → inflamed retrocaecal appendix irritating psoas (also psoas abscess).', abnormal: true, reaction: 0.55, says: 'Ah — that pulls in my tummy.' }
        : { text: 'Hip extension against resistance causes no abdominal pain.', meaning: 'Psoas sign negative.' }
    case 'abdo.obturator':
      return f.abdomen.obturator
        ? { text: `With the right hip and knee flexed to 90°, internal rotation of the hip causes pain deep in the pelvis.`, meaning: 'Obturator sign positive → pelvic appendix (inflamed tissue on obturator internus).', abnormal: true, reaction: 0.5, says: 'Ooh — that hurts deep down.' }
        : { text: 'Internal rotation of the flexed right hip causes no pain.', meaning: 'Obturator sign negative.' }
    case 'abdo.carnett':
      return f.abdomen.carnett === 'abdominal-wall'
        ? { text: 'When the patient tenses the abdominal wall by lifting the head, the tenderness gets worse.', meaning: 'Carnett’s sign positive → pain arises from the abdominal wall (e.g. rectus sheath haematoma, nerve entrapment).', abnormal: true }
        : { text: 'When the patient tenses the abdominal muscles, the tenderness lessens.', meaning: 'Carnett’s sign negative → the pain is intra-abdominal.' }

    /* groin */
    case 'groin.expose':
      return { text: 'With consent and a chaperone present, you lower the underwear and cover the genitalia with a drape, exposing both groins.' }
    case 'groin.inguinalR':
      return hernia(c, f, 'rightInguinal', false)
    case 'groin.inguinalL':
      return hernia(c, f, 'leftInguinal', false)
    case 'groin.femoralR':
      return hernia(c, f, 'rightFemoral', false)
    case 'groin.femoralL':
      return hernia(c, f, 'leftFemoral', false)
    case 'groin.umbilical':
      return hernia(c, f, 'umbilical', false)
    case 'groin.cough': {
      const hs = f.abdomen.hernias
      const found = (['rightInguinal', 'leftInguinal', 'rightFemoral', 'leftFemoral', 'umbilical'] as const).filter((k) => hs[k].present)
      if (!found.length) return { text: 'With your fingers over the hernial orifices, a strong cough produces no impulse on either side.', meaning: 'Hernial orifices intact.' }
      return hernia(c, f, found[0], true)
    }
    case 'groin.femoralPulses':
      return { text: f.completion['femoral-pulses'] ?? 'Femoral pulses are palpable and equal.', abnormal: !!c.abdo?.completion?.['femoral-pulses'] }

    case 'legs.oedema':
      return f.legs.oedema === 'none'
        ? { text: 'Pressing firmly over the tibiae for 10 seconds leaves no pit.', meaning: 'No peripheral oedema.' }
        : { text: `Pitting oedema ${f.legs.oedema === 'ankle' ? 'at the ankles' : f.legs.oedema === 'to-knee' ? 'to the knees' : 'to the thighs'}.`, meaning: 'Peripheral oedema — hypoalbuminaemia, heart or renal failure.', abnormal: true }

    /* completion (reveals results) */
    case 'complete.dre':
      return completion(f, 'dre', 'Digital rectal examination (with consent & chaperone)')
    case 'complete.genitalia':
      return completion(f, 'genitalia', 'External genitalia')
    case 'complete.urinalysis':
      return completion(f, 'urinalysis', 'Urine dipstick')
    case 'complete.pregnancy':
      return completion(f, 'pregnancy', 'Pregnancy test')
    case 'complete.cvsResp':
      return completion(f, 'cvs-resp', 'Cardiorespiratory examination')
    case 'complete.hernial': {
      const hs = f.abdomen.hernias
      const found = (['rightInguinal', 'leftInguinal', 'rightFemoral', 'leftFemoral', 'umbilical'] as const).filter((k) => hs[k].present)
      if (!found.length) return completion(f, 'hernial', 'Hernial orifices')
      const o = hernia(c, f, found[0], true)
      return { ...o, text: `Examiner: “${o.text}”` }
    }
  }
  return { text: 'Done.' }
}

function completion(f: AbdoFindings, id: CompletionId, label: string): Observation {
  const t = f.completion[id]
  return { text: `${label}: ${t ?? 'Normal.'}`, abnormal: !!t && !/normal|negative|intact|no blood|not applicable/i.test(t) }
}

function siteWords(r: RegionId): string {
  return {
    RUQ: 'under my ribs on the right',
    EPI: 'up here in the middle, below my breastbone',
    LUQ: 'under my ribs on the left',
    RF: 'in my right side',
    UMB: 'around my belly button',
    LF: 'in my left side',
    RIF: 'down here on the right',
    SP: 'low down in the middle',
    LIF: 'down here on the left',
  }[r]
}

function inspectAbdomen(c: CaseDef, f: AbdoFindings): Observation {
  const a = c.patient.appearance
  const ab = f.abdomen
  const bits: string[] = []
  const m: string[] = []
  const shape = { flat: 'The abdomen is flat', scaphoid: 'The abdomen is scaphoid', distended: 'The abdomen is distended', obese: 'The abdomen is obese but soft-looking' }[ab.shape]
  bits.push(`${shape} and ${ab.movesWithRespiration === 'normal' ? 'moves normally with respiration' : ab.movesWithRespiration === 'reduced' ? 'moves little with respiration' : 'does not move with respiration'}.`)
  if (ab.movesWithRespiration !== 'normal') m.push('reduced movement with breathing → peritonitis (the patient splints the abdomen)')
  if (ab.shape === 'distended') {
    if (a.distensionType === 'fluid') {
      bits.push('The flanks are full and the umbilicus is everted.')
      m.push('distension with full flanks and everted umbilicus → ascites')
    } else {
      bits.push('It looks tense and tympanitic.')
      m.push('distension: remember the 5 Fs — fat, fluid, flatus, faeces, fetus (and a big mass)')
    }
  }
  const scars = (a.scars ?? []).map((s) => SCAR_INFO[s])
  if (scars.length) {
    bits.push(`Scars: ${scars.map((s) => s.name.toLowerCase()).join(', ')}.`)
    m.push(scars.map((s) => `${s.name} → ${s.operation.toLowerCase()}`).join('; '))
  } else bits.push('No scars.')
  if (a.stoma) {
    const st = a.stoma
    const spout = st.type === 'ileostomy' || st.type === 'urostomy' || st.type === 'loop-ileostomy'
    bits.push(`A ${spout ? 'spouted' : 'flush'} stoma in the ${st.side === 'right' ? 'right' : 'left'} iliac fossa${st.bag ? ' with a bag attached' : ''}.`)
    m.push(spout ? 'spouted RIF stoma → ileostomy (or urostomy — check the bag contents)' : 'flush LIF stoma → end colostomy')
  }
  if (a.caputMedusae) {
    bits.push('Dilated, tortuous veins radiate from the umbilicus.')
    m.push('caput medusae → portal hypertension')
  }
  if (a.striae) bits.push('There are striae.')
  if (a.cullens) {
    bits.push('There is bluish discolouration around the umbilicus.')
    m.push('Cullen’s sign → retroperitoneal/intra-abdominal haemorrhage (e.g. severe pancreatitis, ruptured ectopic)')
  }
  if (a.greyTurners) {
    bits.push('There is bruising in both flanks.')
    m.push('Grey Turner’s sign → retroperitoneal haemorrhage (e.g. haemorrhagic pancreatitis)')
  }
  if (a.visiblePeristalsis) {
    bits.push('Waves of visible peristalsis move across the abdomen.')
    m.push('visible peristalsis → bowel obstruction (in a thin patient)')
  }
  if (a.visiblePulsation) {
    bits.push('There is a visible pulsation in the epigastrium.')
    m.push('visible pulsation → consider AAA (may be normal in thin people)')
  }
  const visibleHernias = (a.hernias ?? []).filter((h) => h.visible === 'always')
  if (visibleHernias.length) bits.push('There is a visible swelling in the groin/abdominal wall.')
  if (a.excoriations) bits.push('Scratch marks are visible.')
  if (ab.inspectionExtra) bits.push(ab.inspectionExtra)
  return {
    text: bits.join(' '),
    meaning: m.length ? m.map((s) => s[0].toUpperCase() + s.slice(1)).join('. ') + '.' : 'Normal inspection.',
    abnormal: m.length > 0,
  }
}
