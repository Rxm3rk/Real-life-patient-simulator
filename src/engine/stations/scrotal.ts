import { baseRules, before, COMM_ACTIONS, completionSteps, prepSteps, step } from './builders'
import type { StationAction, StationDef } from './types'

const A: StationAction[] = [
  ...COMM_ACTIONS,
  { id: 'scr.gloves', label: 'Put on gloves', short: 'Gloves', view: 'scrotum', group: 'Preparation', contact: false },
  { id: 'scr.inspect', label: 'Inspect standing: skin, swelling, symmetry, lie of the testes', short: 'Inspect', view: 'scrotum', group: 'Inspection', contact: false, intimate: true },
  { id: 'scr.normal', label: 'Palpate the NORMAL testis first', short: 'Normal testis', view: 'scrotum', group: 'Palpation', contact: true, intimate: true, cue: 'press' },
  { id: 'scr.affected', label: 'Palpate the affected testis (size, consistency, surface)', short: 'Affected testis', view: 'scrotum', group: 'Palpation', contact: true, intimate: true, cue: 'press' },
  { id: 'scr.epididymis', label: 'Palpate the epididymis (head, body, tail)', short: 'Epididymis', view: 'scrotum', group: 'Palpation', contact: true, intimate: true },
  { id: 'scr.cord', label: 'Palpate the spermatic cord and vas', short: 'Cord & vas', view: 'scrotum', group: 'Palpation', contact: true, intimate: true },
  { id: 'scr.getAbove', label: 'Can you get above the swelling?', short: 'Get above it?', view: 'scrotum', group: 'Palpation', contact: true, intimate: true },
  { id: 'scr.separate', label: 'Is the swelling separate from the testis?', short: 'Separate?', view: 'scrotum', group: 'Palpation', contact: true, intimate: true },
  { id: 'scr.transilluminate', label: 'Transilluminate with a pen torch', short: 'Transilluminate', view: 'scrotum', group: 'Special tests', contact: true, intimate: true, cue: 'transilluminate' },
  { id: 'scr.cough', label: 'Cough impulse', short: 'Cough', view: 'scrotum', group: 'Special tests', contact: true, intimate: true, cue: 'cough' },
  { id: 'scr.lie', label: 'Re-examine lying down (does it empty?)', short: 'Lie down', view: 'scrotum', group: 'Special tests', contact: true, intimate: true, cue: 'lie' },
  { id: 'scr.cremasteric', label: 'Cremasteric reflex (stroke the inner thigh)', short: 'Cremasteric', view: 'scrotum', group: 'Special tests', contact: true, intimate: true },
  { id: 'scr.nodes', label: 'Inguinal lymph nodes', short: 'Inguinal nodes', view: 'scrotum', group: 'Special tests', contact: true },
  { id: 'complete.abdomen', label: 'State: abdominal examination (para-aortic nodes, masses)', short: 'Abdomen', view: 'any', group: 'Completion', contact: false },
]

const contact = new Set(A.filter((a) => a.contact).map((a) => a.id))
const intimate = new Set(A.filter((a) => a.intimate).map((a) => a.id))

export const SCROTAL: StationDef = {
  kind: 'scrotal',
  title: 'Scrotal & testicular examination',
  task: 'Examine this patient’s scrotum',
  consentText: 'You explain that you would like to examine the testicles and scrotum, first standing and then lying down, and that it is an intimate examination.',
  positionText: 'You examine the patient standing first, then lying down.',
  exposeText: 'You expose the patient from the umbilicus to the upper thighs, keeping a sheet available.',
  exposure: 'standing-groin',
  intimate: true,
  views: [{ id: 'scrotum', label: 'Scrotum', closeup: 'scrotum' }],
  actions: A,
  steps: [
    ...prepSteps({ chaperone: 'critical', position: 'Examine standing, then lying', expose: 'Expose from the umbilicus to the thighs' }),
    step('prep.gloves', 'Preparation', 'Wear gloves', 1, ['scr.gloves'], 'Gloves for genital examination.'),
    step('in.inspect', 'Inspection', 'Inspect the scrotum', 1, ['scr.inspect'], 'Skin (erythema, oedema, sebaceous cysts), swelling, asymmetry, lie of the testes (a high, horizontal lie suggests torsion).'),
    step('pa.normal', 'Palpation', 'Examine the normal side first', 2, ['scr.normal'], 'Establishes the baseline and is kinder; the testis is smooth, rubbery and ~4–5 cm long.'),
    step('pa.affected', 'Palpation', 'Examine the affected testis', 1, ['scr.affected'], 'Size, consistency, surface, tenderness — a hard, irregular testis is a tumour until proven otherwise.'),
    step('pa.epididymis', 'Palpation', 'Examine the epididymis', 1, ['scr.epididymis'], 'Posterolateral to the testis; tender swelling (epididymitis) or a separate cyst.'),
    step('pa.cord', 'Palpation', 'Examine the cord and vas', 0.5, ['scr.cord'], 'Thickening, varicocele (“bag of worms”), vas present?'),
    step('pa.above', 'Palpation', 'Can you get above it?', 2, ['scr.getAbove'], 'If you cannot get above a scrotal swelling, it is an inguinoscrotal hernia.'),
    step('pa.separate', 'Palpation', 'Is it separate from the testis?', 1, ['scr.separate'], 'Epididymal cysts are separate from the testis; hydroceles surround it (testis impalpable within).'),
    step('sp.trans', 'Special tests', 'Transillumination', 1, ['scr.transilluminate'], 'Hydroceles and epididymal cysts transilluminate; tumours, haematoceles and hernias do not.'),
    step('sp.cough', 'Special tests', 'Cough impulse', 0.5, ['scr.cough'], 'Hernias and varicoceles have a cough impulse.'),
    step('sp.lie', 'Special tests', 'Examine lying down', 0.5, ['scr.lie'], 'A varicocele empties when lying (if it doesn’t, suspect renal vein obstruction, e.g. left renal tumour).'),
    step('sp.crem', 'Special tests', 'Cremasteric reflex', 0.5, ['scr.cremasteric'], 'Usually absent in testicular torsion.'),
    step('sp.nodes', 'Special tests', 'Inguinal lymph nodes', 0.5, ['scr.nodes'], 'Scrotal skin drains to inguinal nodes; the testis drains to para-aortic nodes.'),
    ...completionSteps([step('end.abdomen', 'Completion', 'Offer an abdominal examination', 1, ['complete.abdomen'], 'Para-aortic lymphadenopathy (testicular tumour), renal masses (left varicocele).')]),
  ],
  rules: [
    ...baseRules((a) => contact.has(a), (a) => intimate.has(a)),
    before('scr.normal', 'scr.affected', 'Examine the normal testis first.', 0.5, true),
    before('scr.gloves', ['scr.normal', 'scr.affected', 'scr.epididymis'], 'Put gloves on before genital examination.', 0.5, true),
  ],
  normal: {
    'scr.gloves': { text: 'Gloves on.' },
    'scr.inspect': { text: 'Normal scrotal skin; both testes lie vertically at the same level.' },
    'scr.normal': { text: 'The testis is smooth, rubbery, non-tender and ~4.5 cm long.' },
    'scr.affected': { text: 'Normal testis.' },
    'scr.epididymis': { text: 'Normal epididymis.' },
    'scr.cord': { text: 'Normal cord; vas palpable.' },
    'scr.getAbove': { text: 'You can get above the testes; there is no swelling.' },
    'scr.separate': { text: 'No separate swelling.' },
    'scr.transilluminate': { text: 'Nothing transilluminates.' },
    'scr.cough': { text: 'No cough impulse.' },
    'scr.lie': { text: 'No change lying down.' },
    'scr.cremasteric': { text: 'Cremasteric reflex present bilaterally.' },
    'scr.nodes': { text: 'No inguinal lymphadenopathy.' },
    'complete.abdomen': { text: 'Abdomen normal, no palpable para-aortic nodes.' },
  },
}
