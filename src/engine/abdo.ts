import { REGION_LABEL, REGION_ORDER, type RegionId } from '../anatomy/bodyModel'
import { SCAR_INFO } from '../anatomy/Scars'
import type { AbdoFindings, CaseDef, DeepPartial, HerniaFinding, Observation, RegionFinding, Tender } from './types'

export const normalRegion = (): RegionFinding => ({
  light: 0,
  deep: 0,
  guarding: 'none',
  rebound: false,
  percussionTender: false,
  note: 'tympanic',
})

const noHernia = (): HerniaFinding => ({ present: false })

export function defaultAbdo(c: CaseDef): AbdoFindings {
  const a = c.patient.appearance
  const regions = Object.fromEntries(REGION_ORDER.map((r) => [r, normalRegion()])) as Record<RegionId, RegionFinding>
  const scars = (a.scars ?? []).map((s) => SCAR_INFO[s].name)
  return {
    general: {
      endOfBed: `${c.patient.title} is lying comfortably on the bed and is able to talk in full sentences. There are no drains, stomas, catheters or oxygen in use.`,
    },
    hands: {
      clubbing: false,
      leukonychia: false,
      koilonychia: false,
      palmarErythema: false,
      dupuytren: false,
      asterixis: false,
      temperature: 'warm',
      crt: 1.5,
      pallorCreases: (a.pallor ?? 0) > 0.5,
      pulseVolume: 'normal',
    },
    face: {
      sclera: (a.jaundice ?? 0) > 0.25 ? 'icteric' : 'white',
      conjunctiva: (a.pallor ?? 0) > 0.3 ? 'pale' : 'pink',
      mucosa: a.dehydrated ? 'dry' : 'moist',
      tongue: a.dehydrated ? 'dry-furred' : 'normal',
      fetor: 'none',
    },
    neck: { virchow: false },
    chest: {
      spiderNaevi: (a.spiderNaevi ?? 0) > 0,
      gynaecomastia: !!a.gynaecomastia,
      hairLoss: !!a.bodyHairLoss,
    },
    abdomen: {
      shape: (a.distension ?? 0) > 0 ? 'distended' : a.habitus === 'obese' ? 'obese' : a.habitus === 'thin' || a.cachexia ? 'scaphoid' : 'flat',
      movesWithRespiration: 'normal',
      inspectionExtra: scars.length ? undefined : undefined,
      coughPain: false,
      regions,
      rigidity: 'none',
      liver: { edgeCm: 0, spanCm: 11 },
      gallbladder: { palpable: false, murphy: false },
      spleen: { tipCm: 0 },
      kidneys: { right: false, left: false },
      aorta: { expansile: false },
      bladder: { palpable: false },
      shiftingDullness: false,
      fluidThrill: false,
      bowelSounds: 'normal',
      bruits: {},
      hernias: {
        rightInguinal: noHernia(),
        leftInguinal: noHernia(),
        rightFemoral: noHernia(),
        leftFemoral: noHernia(),
        umbilical: noHernia(),
      },
    },
    legs: { oedema: 'none' },
    completion: {
      dre: 'Perianal inspection normal. Normal anal tone, no palpable masses, the rectum contains soft brown stool; no blood or mucus on the glove.' + (c.patient.sex === 'male' ? ' The prostate is smooth, symmetrical and not enlarged.' : ''),
      genitalia: 'External genitalia appear normal.',
      urinalysis: 'Urine dipstick: no blood, leucocytes, nitrites, protein or glucose.',
      pregnancy: c.patient.sex === 'female' ? 'Urine β-hCG: negative.' : 'Not applicable.',
      obs: `HR ${c.vitals.hr} ${c.vitals.rhythm}, BP ${c.vitals.sbp}/${c.vitals.dbp}, RR ${c.vitals.rr}, SpO₂ ${c.vitals.spo2}%${c.vitals.o2 ? ` on ${c.vitals.o2}` : ' on air'}, T ${c.vitals.temp.toFixed(1)} °C.`,
      hernial: 'Hernial orifices are intact bilaterally with no cough impulse.',
      'femoral-pulses': 'Femoral pulses are palpable and equal bilaterally.',
      'cvs-resp': 'Heart sounds normal, chest clear.',
      bloods: 'Bloods have been sent.',
      imaging: 'Imaging requested.',
    },
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (!patch) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (v === undefined) continue
    const cur = out[k]
    out[k] = isObj(cur) && isObj(v) ? deepMerge(cur, v as DeepPartial<typeof cur>) : v
  }
  return out as T
}

export function abdoFindings(c: CaseDef): AbdoFindings {
  return deepMerge(defaultAbdo(c), c.abdo)
}

/* ------------------------------------------------------------------ */
/* Observation text                                                    */
/* ------------------------------------------------------------------ */

const pn = (c: CaseDef) => (c.patient.sex === 'male' ? { he: 'he', his: 'his', him: 'him', He: 'He', His: 'His' } : { he: 'she', his: 'her', him: 'her', He: 'She', His: 'Her' })

export function maxTender(f: AbdoFindings): { region: RegionId | null; level: Tender } {
  let best: RegionId | null = null
  let lvl: Tender = 0
  for (const r of REGION_ORDER) {
    const t = Math.max(f.abdomen.regions[r].light, f.abdomen.regions[r].deep) as Tender
    if (t > lvl) {
      lvl = t
      best = r
    }
  }
  return { region: best, level: lvl }
}

const TENDER_WORD = ['non-tender', 'mildly tender', 'tender', 'exquisitely tender']

export function palpate(c: CaseDef, f: AbdoFindings, r: RegionId, depth: 'light' | 'deep', analgesia: boolean): Observation {
  const p = pn(c)
  const rf = f.abdomen.regions[r]
  let lvl = (depth === 'light' ? rf.light : Math.max(rf.light, rf.deep)) as number
  if (analgesia && lvl > 0) lvl = Math.max(1, lvl - 1)
  const where = REGION_LABEL[r].toLowerCase()
  const rigid = f.abdomen.rigidity === 'generalised'
  const parts: string[] = []
  let meaning = ''
  let says: string | undefined

  if (rigid) {
    parts.push(`The abdominal wall is rigid — hard as a board — and ${p.he} ${lvl >= 2 ? 'groans as you press' : 'holds very still'}.`)
    meaning = 'Generalised rigidity (involuntary guarding): generalised peritonitis until proven otherwise.'
  } else if (lvl === 0) {
    parts.push(depth === 'light' ? `Soft and non-tender in the ${where}.` : `Deep palpation of the ${where}: soft, non-tender, no masses felt.`)
  } else {
    const react =
      lvl === 1
        ? `${p.he} flinches slightly and says it is a bit sore`
        : lvl === 2
          ? `${p.he} grimaces and draws in a sharp breath`
          : `${p.he} cries out and tries to push your hand away`
    parts.push(`As you press ${depth === 'deep' ? 'deeply ' : ''}in the ${where}, ${react}.`)
    says = lvl === 1 ? 'That’s a little sore.' : lvl === 2 ? 'Ow — that’s where it hurts.' : 'Aah! Please — that really hurts!'
    meaning = `${TENDER_WORD[lvl][0].toUpperCase()}${TENDER_WORD[lvl].slice(1)} in the ${where}.`
  }
  if (!rigid && lvl > 0 && rf.guarding !== 'none') {
    if (rf.guarding === 'involuntary') {
      parts.push('The muscles beneath your hand stay tense even as you distract the patient.')
      meaning += ' Involuntary guarding — suggests local peritonism.'
    } else {
      parts.push(`${p.He} tenses the abdominal muscles as your hand approaches.`)
      meaning += ' Voluntary guarding.'
    }
  }
  if (depth === 'deep' && rf.mass) {
    parts.push(`You feel ${rf.mass.description}.`)
    meaning += ` Mass: ${rf.mass.label}.`
  }
  // Rovsing's sign emerges naturally from deep palpation of the LIF
  if (depth === 'deep' && r === 'LIF' && f.abdomen.rovsing) {
    parts.push(`Pressing here makes ${p.him} wince — but ${p.he} points to the RIGHT iliac fossa.`)
    says = 'Ow — that hurts on the other side, down here on the right.'
    meaning = 'Rovsing’s sign positive: pressure in the LIF causes pain in the RIF (suggests appendicitis).'
  }
  const reaction = rigid ? 0.75 : Math.min(1, lvl / 3 + (rf.guarding === 'involuntary' ? 0.1 : 0))
  return {
    text: parts.join(' '),
    meaning: meaning || undefined,
    abnormal: lvl > 0 || !!rf.mass || rigid || (depth === 'deep' && r === 'LIF' && !!f.abdomen.rovsing),
    reaction: depth === 'deep' && r === 'LIF' && f.abdomen.rovsing ? 0.6 : reaction,
    says,
  }
}

export function percussionTenderness(c: CaseDef, f: AbdoFindings, r: RegionId): Observation {
  const p = pn(c)
  const rf = f.abdomen.regions[r]
  const where = REGION_LABEL[r].toLowerCase()
  if (rf.percussionTender || rf.rebound) {
    return {
      text: `Gentle percussion over the ${where} makes ${p.him} wince sharply.`,
      meaning: 'Percussion tenderness — a kinder test of localised peritonism than rebound.',
      abnormal: true,
      reaction: 0.75,
      says: 'Ah — even that tapping hurts.',
    }
  }
  return { text: `Light percussion over the ${where} is not painful.`, meaning: 'No percussion tenderness.' }
}

export function reboundTest(c: CaseDef, f: AbdoFindings, r: RegionId): Observation {
  const p = pn(c)
  const rf = f.abdomen.regions[r]
  const where = REGION_LABEL[r].toLowerCase()
  if (rf.rebound) {
    return {
      text: `As you release your hand quickly from the ${where}, ${p.he} gasps — the pain is worse on letting go than on pressing.`,
      meaning: 'Rebound tenderness: peritoneal irritation. Macleod’s favours percussion tenderness — it gives the same information more kindly.',
      abnormal: true,
      reaction: 0.95,
      says: 'Ow! That was worse when you let go!',
    }
  }
  return { text: `No rebound tenderness in the ${where}.` }
}

export function percussNote(f: AbdoFindings, r: RegionId): Observation {
  const rf = f.abdomen.regions[r]
  const where = REGION_LABEL[r].toLowerCase()
  const note = rf.note
  return {
    text: `Percussion note over the ${where}: ${note}.`,
    meaning:
      note === 'dull'
        ? 'Dullness: solid organ, mass, fluid or a full bladder beneath.'
        : note === 'tympanic'
          ? f.abdomen.shape === 'distended'
            ? 'Tympanic — gas-filled bowel beneath (consistent with obstruction / gaseous distension).'
            : 'Tympanic — normal gas-containing bowel.'
          : 'Resonant.',
    abnormal: note === 'dull' && r !== 'RUQ',
    media: `perc:${note}`,
  }
}

export function liverResult(c: CaseDef, f: AbdoFindings, startedLow: boolean): Observation {
  const L = f.abdomen.liver
  if (!startedLow && L.edgeCm >= 6) {
    return {
      text: 'You start just below the right costal margin and feel only a vague firmness — no clear edge moves down to meet your hand.',
      meaning: 'Technique error: always begin in the right iliac fossa. Starting too high can miss a massively enlarged liver whose edge lies below your hand.',
      abnormal: true,
    }
  }
  if (L.edgeCm <= 0) {
    return { text: 'Working up from the right iliac fossa with each breath, you do not feel a liver edge.', meaning: 'Liver not palpable (normal).' }
  }
  const tex = L.texture === 'hard-irregular' ? 'hard and irregular' : L.texture === 'nodular' ? 'firm and nodular' : 'smooth'
  return {
    text: `As ${c.patient.sex === 'male' ? 'he' : 'she'} breathes in, the liver edge descends onto your fingers ${L.edgeCm} cm below the right costal margin. It feels ${tex}${L.tender ? ' and is tender' : ', non-tender'}${L.pulsatile ? ', and pulsatile' : ''}.`,
    meaning: `Hepatomegaly (${L.edgeCm} cm). ${L.texture === 'hard-irregular' ? 'A hard, irregular edge suggests malignant infiltration (e.g. metastases).' : L.tender ? 'A smooth, tender liver suggests acute swelling (hepatitis, congestion, cholangitis).' : ''}`,
    abnormal: true,
  }
}

export function liverSpan(f: AbdoFindings): Observation {
  const s = f.abdomen.liver.spanCm
  return {
    text: `Percussing down from the resonant chest in the mid-clavicular line, the upper border is at the 5th intercostal space; percussing up from the RIF, the lower border is ${f.abdomen.liver.edgeCm > 0 ? `${f.abdomen.liver.edgeCm} cm below` : 'at'} the costal margin. Liver span ≈ ${s} cm.`,
    meaning: s > 13 ? 'Increased liver span — hepatomegaly.' : s < 6 ? 'Small liver span (e.g. cirrhosis) — or overlying gas.' : 'Normal liver span.',
    abnormal: s > 13 || s < 6,
    media: 'perc:dull',
  }
}

export function murphyTest(c: CaseDef, f: AbdoFindings, side: 'right' | 'left'): Observation {
  const p = pn(c)
  if (side === 'left') {
    return {
      text: `You repeat the manoeuvre at the tip of the left 9th costal cartilage: ${p.he} breathes in fully without any catch.`,
      meaning: 'The contralateral comparison — a true Murphy’s sign is absent on the left.',
    }
  }
  const g = f.abdomen.gallbladder
  if (g.palpable && !g.murphy) {
    return {
      text: 'Beneath your fingers at the tip of the right 9th costal cartilage is a smooth, globular, non-tender mass that moves down with inspiration.',
      meaning: 'Palpable gallbladder. Courvoisier’s law: a palpable gallbladder in a jaundiced patient is unlikely to be due to gallstones — think pancreatic head or distal bile duct malignancy.',
      abnormal: true,
    }
  }
  if (g.murphy) {
    return {
      text: `As ${p.he} breathes in, ${p.he} suddenly stops mid-breath with a gasp of pain as the gallbladder meets your fingers.`,
      meaning: 'Murphy’s sign positive (and absent on the left) — acute cholecystitis.',
      abnormal: true,
      reaction: 0.85,
      says: 'Ah! I can’t breathe in — it catches!',
    }
  }
  return { text: `${p.He} takes a full breath in without any catch or pain.`, meaning: 'Murphy’s sign negative.' }
}

export function spleenResult(_c: CaseDef, f: AbdoFindings): Observation {
  const t = f.abdomen.spleen.tipCm
  if (t <= 0) return { text: 'Working diagonally from the right iliac fossa towards the left costal margin with each breath, you cannot feel a splenic edge.', meaning: 'Spleen not palpable (normal).' }
  return {
    text: `The splenic tip meets your fingers ${t} cm below the left costal margin on inspiration; you cannot get above it and a notch is felt on its medial border.`,
    meaning: `Splenomegaly (${t} cm).`,
    abnormal: true,
  }
}

export function kidneyResult(f: AbdoFindings): Observation {
  const k = f.abdomen.kidneys
  if (!k.right && !k.left) return { text: 'Bimanual palpation: neither kidney is ballotable.', meaning: 'Kidneys not palpable (normal).' }
  const s = [k.right && 'right', k.left && 'left'].filter(Boolean).join(' and ')
  return { text: `The ${s} kidney${k.right && k.left ? 's are' : ' is'} ballotable — pushed up from behind, it bumps against your anterior hand.`, meaning: 'Ballotable kidney(s): enlargement (e.g. polycystic kidneys, hydronephrosis, renal tumour).', abnormal: true }
}

export function aortaResult(c: CaseDef, f: AbdoFindings): Observation {
  const ao = f.abdomen.aorta
  if (ao.expansile) {
    return {
      text: `Placing your hands either side of the midline above the umbilicus, your fingers are pushed apart with each beat — an expansile, pulsatile mass roughly ${ao.widthCm ?? 6} cm wide${ao.tender ? '; it is tender' : ''}.`,
      meaning: `Expansile pulsatile mass: abdominal aortic aneurysm${ao.tender ? ' — tenderness raises concern for symptomatic / leaking AAA: a surgical emergency' : ''}.`,
      abnormal: true,
      reaction: ao.tender ? 0.6 : 0,
    }
  }
  return {
    text: c.patient.appearance.habitus === 'thin' ? 'You can feel the aortic pulsation just above the umbilicus; your fingers move upwards but not apart.' : 'The aorta is not easily palpable and there is no expansile mass.',
    meaning: 'No aneurysm felt (a transmitted, non-expansile pulsation is normal in slim people).',
  }
}

export function bladderResult(f: AbdoFindings): Observation {
  if (f.abdomen.bladder.palpable)
    return {
      text: 'A smooth, dome-shaped suprapubic mass rises out of the pelvis; you cannot get below it and it is dull to percussion.',
      meaning: 'Palpable bladder — urinary retention.',
      abnormal: true,
      media: 'perc:dull',
    }
  return { text: 'The bladder is not palpable and the suprapubic region is resonant.', meaning: 'Bladder not palpable.' }
}

export function shiftingDullness(f: AbdoFindings): Observation {
  if (f.abdomen.shiftingDullness)
    return {
      text: 'Percussing from the umbilicus towards the flank, the note becomes dull. Keeping your finger there, you roll the patient away from you and wait 30 seconds — the note at that point is now resonant.',
      meaning: 'Shifting dullness positive — ascites (at least ~500 ml of free fluid).',
      abnormal: true,
      media: 'perc:dull',
    }
  return {
    text: f.abdomen.shape === 'distended' ? 'The note is tympanic right out into the flanks and does not shift.' : 'The flanks are resonant; there is no shifting dullness.',
    meaning: 'No shifting dullness.',
    media: 'perc:tympanic',
  }
}

export function fluidThrill(f: AbdoFindings): Observation {
  if (f.abdomen.fluidThrill)
    return {
      text: 'With the patient’s hand edge pressed along the midline, a flick on one flank sends a distinct wave to your hand on the other.',
      meaning: 'Fluid thrill — gross (tense) ascites.',
      abnormal: true,
    }
  return { text: 'No fluid thrill is transmitted.', meaning: 'Fluid thrill absent.' }
}

export function bowelSounds(f: AbdoFindings, seconds: number): Observation {
  const b = f.abdomen.bowelSounds
  if (b === 'absent') {
    if (seconds < 120)
      return {
        text: `You hear nothing in ${Math.round(seconds)} seconds.`,
        meaning: 'You cannot call bowel sounds absent this quickly — listen for at least 2 minutes (Macleod’s suggests up to 2–3 minutes) before concluding they are absent.',
        abnormal: true,
        media: 'bowel:absent',
      }
    return { text: 'After listening for over 2 minutes there are no bowel sounds at all — an eerie silence.', meaning: 'Absent bowel sounds: paralytic ileus or generalised peritonitis.', abnormal: true, media: 'bowel:absent' }
  }
  const map = {
    normal: ['Intermittent soft gurgles every few seconds.', 'Normal bowel sounds.'],
    hyperactive: ['Loud, frequent gurgling and rushes.', 'Hyperactive bowel sounds (e.g. gastroenteritis, early obstruction, GI bleed).'],
    tinkling: ['High-pitched, tinkling bowel sounds with occasional loud rushes.', '“Tinkling” bowel sounds: mechanical bowel obstruction.'],
    reduced: ['Only occasional, quiet gurgles.', 'Reduced bowel sounds (e.g. early ileus, peritonism).'],
  } as const
  const [text, meaning] = map[b]
  return { text, meaning, abnormal: b !== 'normal', media: `bowel:${b}` }
}

export function bruit(f: AbdoFindings, site: 'aortic' | 'renalR' | 'renalL' | 'iliac'): Observation {
  const present = !!f.abdomen.bruits[site]
  const name = { aortic: 'aortic', renalR: 'right renal', renalL: 'left renal', iliac: 'iliac' }[site]
  return present
    ? { text: `A systolic whooshing bruit is audible over the ${name} area.`, meaning: `${name[0].toUpperCase() + name.slice(1)} bruit — turbulent flow (atherosclerosis, stenosis or aneurysm).`, abnormal: true, media: 'bruit' }
    : { text: `No bruit over the ${name} area.`, media: 'steth:quiet' }
}

export function hernia(_c: CaseDef, f: AbdoFindings, key: keyof AbdoFindings['abdomen']['hernias'], cough: boolean): Observation {
  const h = f.abdomen.hernias[key]
  const label = { rightInguinal: 'right inguinal', leftInguinal: 'left inguinal', rightFemoral: 'right femoral', leftFemoral: 'left femoral', umbilical: 'umbilical' }[key]
  if (!h.present) return { text: `No lump or ${cough ? 'cough impulse' : 'swelling'} at the ${label} region.`, meaning: `${label[0].toUpperCase() + label.slice(1)} orifice intact.` }
  const parts = [h.description ?? `A lump in the ${label} region.`]
  if (cough) parts.push(h.coughImpulse ? 'There is a palpable expansile cough impulse.' : 'There is no cough impulse.')
  if (h.reducible !== undefined) parts.push(h.reducible ? 'It reduces with gentle pressure.' : 'It cannot be reduced.')
  if (h.tender) parts.push('It is tender, tense and the overlying skin is warm.')
  return {
    text: parts.join(' '),
    meaning: `${label[0].toUpperCase() + label.slice(1)} hernia${!h.reducible && h.tender ? ' — irreducible and tender: incarcerated/strangulated, a surgical emergency' : ''}.`,
    abnormal: true,
    reaction: h.tender ? 0.6 : 0,
    says: h.tender ? 'Ow — that lump has been sore since yesterday.' : undefined,
  }
}

export { REGION_LABEL }
