import { lerpPt } from '../../anatomy/geometry'
import { baseRules, before, COMM_ACTIONS, completionSteps, prepSteps, step } from './builders'
import type { StationAction, StationDef } from './types'

const A: StationAction[] = [
  ...COMM_ACTIONS,
  { id: 'groin.stand', label: 'Ask the patient to stand', short: 'Stand up', view: 'standing', group: 'Standing', contact: false, cue: 'stand' },
  { id: 'groin.inspect', label: 'Inspect both groins and the scrotum (standing)', short: 'Inspect', view: 'standing', group: 'Standing', contact: false, intimate: true },
  { id: 'groin.coughLook', label: 'Ask the patient to cough — watch both groins', short: 'Cough (look)', view: 'standing', group: 'Standing', contact: false, cue: 'cough' },
  {
    id: 'groin.palpate',
    label: 'Palpate the lump: size, shape, consistency, tenderness, temperature',
    short: 'Palpate lump',
    view: 'standing',
    group: 'Standing',
    contact: true,
    intimate: true,
    hotspot: (lm) => lerpPt(lm.deepRingR, lm.superficialRingR, 0.6),
  },
  { id: 'groin.tubercle', label: 'Locate the pubic tubercle — is the lump above/medial or below/lateral?', short: 'Pubic tubercle', view: 'standing', group: 'Standing', contact: true, intimate: true, hotspot: (lm) => lm.pubicTubercleR },
  { id: 'groin.coughFeel', label: 'Feel for an expansile cough impulse', short: 'Cough impulse', view: 'standing', group: 'Standing', contact: true, intimate: true, cue: 'cough' },
  { id: 'groin.getAbove', label: 'Can you get above the swelling?', short: 'Get above it?', view: 'standing', group: 'Standing', contact: true, intimate: true },
  { id: 'groin.scrotum', label: 'Examine the scrotum and both testes', short: 'Scrotum & testes', view: 'standing', group: 'Standing', contact: true, intimate: true, sex: 'male' },
  { id: 'groin.other', label: 'Examine the other groin', short: 'Other side', view: 'standing', group: 'Standing', contact: true, intimate: true, hotspot: (lm) => lerpPt(lm.deepRingL, lm.superficialRingL, 0.6) },
  { id: 'groin.lie', label: 'Ask the patient to lie down — does it reduce?', short: 'Lie down', view: 'lying', group: 'Lying', contact: false, cue: 'lie' },
  { id: 'groin.reduce', label: 'Ask the patient to reduce it (or reduce it gently)', short: 'Reduce', view: 'lying', group: 'Lying', contact: true, intimate: true, cue: 'reduce' },
  { id: 'groin.deepRing', label: 'Deep ring occlusion test: press over the deep ring, ask to cough', short: 'Deep ring test', view: 'lying', group: 'Lying', contact: true, intimate: true, cue: 'deep-ring', hotspot: (lm) => lm.deepRingR },
  { id: 'groin.release', label: 'Release pressure and watch where it reappears', short: 'Release', view: 'lying', group: 'Lying', contact: true, intimate: true, cue: 'cough' },
  { id: 'groin.auscultate', label: 'Auscultate the swelling for bowel sounds', short: 'Auscultate', view: 'lying', group: 'Lying', contact: true, intimate: true },
  { id: 'complete.abdomen', label: 'State: examine the abdomen (causes of raised intra-abdominal pressure, scars)', short: 'Abdomen', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.dre', label: 'State: consider DRE / prostate (straining from prostatism)', short: 'DRE', view: 'any', group: 'Completion', contact: false },
]

const contact = new Set(A.filter((a) => a.contact).map((a) => a.id))
const intimate = new Set(A.filter((a) => a.intimate).map((a) => a.id))

export const GROIN: StationDef = {
  kind: 'groin',
  title: 'Groin & hernia examination',
  task: 'Examine this patient’s groin',
  consentText: 'You explain that you would like to examine the groin (and, in men, the scrotum), first standing then lying down, and that this is an intimate examination.',
  positionText: 'You ask the patient to stand facing you, then later to lie flat on the couch.',
  exposeText: 'You expose the patient from the umbilicus to the upper thighs, including the scrotum, keeping them covered otherwise.',
  exposure: 'standing-groin',
  intimate: true,
  views: [
    { id: 'standing', label: 'Standing', shot: { cx: 0, cy: 392, w: 230, h: 190 } },
    { id: 'lying', label: 'Lying', shot: { cx: 0, cy: 380, w: 220, h: 180 } },
  ],
  actions: A,
  steps: [
    ...prepSteps({ chaperone: 'critical', position: 'Examine standing first', expose: 'Expose from the umbilicus to the upper thighs' }),
    step('st.stand', 'Standing', 'Examine the patient standing', 1, ['groin.stand'], 'Hernias are most visible when intra-abdominal pressure is highest — standing.'),
    step('st.inspect', 'Standing', 'Inspect both groins and the scrotum', 1, ['groin.inspect'], 'Look for a swelling, its position, size and shape, scars from previous repair, and whether it extends into the scrotum.', {
      look: 'Swelling above the inguinal ligament (inguinal) or below it (femoral); scrotal extension; skin changes; scars.',
    }),
    step('st.coughLook', 'Standing', 'Ask the patient to cough and watch', 1, ['groin.coughLook'], 'A visible impulse on coughing is the hallmark of a hernia.'),
    step('st.palpate', 'Standing', 'Palpate the swelling', 1, ['groin.palpate'], 'Size, shape, consistency, tenderness and temperature — a tender, tense lump suggests incarceration.'),
    step('st.tubercle', 'Standing', 'Relate it to the pubic tubercle', 2, ['groin.tubercle'], 'Inguinal hernias arise above and medial to the pubic tubercle; femoral hernias below and lateral to it.', {
      how: 'Find the pubic tubercle by following the adductor longus tendon up to its origin, or palpate along the inguinal ligament medially.',
    }),
    step('st.coughFeel', 'Standing', 'Feel for an expansile cough impulse', 1, ['groin.coughFeel'], 'An expansile impulse confirms communication with the abdominal cavity.'),
    step('st.getAbove', 'Standing', 'Try to get above the swelling', 1, ['groin.getAbove'], 'If you can get above a scrotal swelling it arises in the scrotum; if not, it is an inguinoscrotal hernia.'),
    step('st.scrotum', 'Standing', 'Examine the scrotum and testes', 1, ['groin.scrotum'], 'Both testes should be present and separate from the swelling.', { applies: (x) => x.c.patient.sex === 'male' }),
    step('st.other', 'Standing', 'Examine the other side', 1, ['groin.other'], 'Hernias are often bilateral.'),
    step('ly.lie', 'Lying', 'Re-examine lying down', 1, ['groin.lie'], 'Hernias often reduce spontaneously when the patient lies down.'),
    step('ly.reduce', 'Lying', 'Reduce the hernia', 1, ['groin.reduce'], 'Ask the patient to reduce it — they know how. Never force a tender, irreducible hernia.'),
    step('ly.deepRing', 'Lying', 'Deep ring occlusion test', 2, ['groin.deepRing'], 'After reduction, press over the deep ring (midpoint of the inguinal ligament, ~1.5 cm above the femoral pulse) and ask the patient to cough: controlled = indirect; not controlled = direct.', {
      how: 'Reduce first. The deep ring lies just above the midpoint of the inguinal ligament (between ASIS and pubic tubercle).',
    }),
    step('ly.release', 'Lying', 'Release and observe', 1, ['groin.release'], 'An indirect hernia reappears obliquely along the canal; a direct one bulges straight forward.'),
    step('ly.auscultate', 'Lying', 'Auscultate the swelling', 0.5, ['groin.auscultate'], 'Bowel sounds confirm bowel within the sac.'),
    ...completionSteps([
      step('end.abdomen', 'Completion', 'Offer to examine the abdomen', 1, ['complete.abdomen'], 'Look for causes of raised intra-abdominal pressure (masses, ascites, bladder), previous scars and other hernias.'),
    ]),
  ],
  rules: [
    ...baseRules((a) => contact.has(a), (a) => intimate.has(a)),
    before('groin.stand', 'groin.lie', 'Examine the groin standing first — hernias may not be visible when lying down.'),
    before('groin.inspect', 'groin.palpate', 'Inspect before you palpate.'),
    before('groin.reduce', 'groin.deepRing', 'The deep ring test is only valid once the hernia has been reduced.', 0.5, true),
  ],
  normal: {
    'groin.stand': { text: 'The patient stands facing you.' },
    'groin.inspect': { text: 'Both groins look symmetrical. No visible swelling, scars or skin changes. The scrotum looks normal.' },
    'groin.coughLook': { text: 'No visible impulse in either groin on coughing.' },
    'groin.palpate': { text: 'No palpable swelling in either groin.' },
    'groin.tubercle': { text: 'The pubic tubercle is easily identified; there is no swelling nearby.' },
    'groin.coughFeel': { text: 'No palpable cough impulse on either side.' },
    'groin.getAbove': { text: 'There is no swelling to get above.' },
    'groin.scrotum': { text: 'Both testes are present, normal in size and consistency, with normal epididymes and cords.' },
    'groin.other': { text: 'The other groin is normal, with no cough impulse.' },
    'groin.lie': { text: 'The patient lies supine.' },
    'groin.reduce': { text: 'Nothing to reduce.' },
    'groin.deepRing': { text: 'No hernia is felt or seen on coughing with pressure over the deep ring.' },
    'groin.release': { text: 'No swelling appears on release.' },
    'groin.auscultate': { text: 'Nothing to auscultate.' },
    'complete.abdomen': { text: 'Abdomen: soft, non-tender, no masses or organomegaly; no other hernias.' },
    'complete.dre': { text: 'Prostate smooth and not enlarged.' },
  },
}
