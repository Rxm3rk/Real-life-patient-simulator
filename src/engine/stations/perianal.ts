import { baseRules, before, COMM_ACTIONS, completionSteps, did, prepSteps, step } from './builders'
import type { StationAction, StationDef, StepCtx } from './types'

const A: StationAction[] = [
  ...COMM_ACTIONS,
  { id: 'pr.gloves', label: 'Gloves on, and a good light', short: 'Gloves & light', view: 'perianal', group: 'Preparation', contact: false },
  { id: 'pr.inspect', label: 'Part the buttocks and inspect the perianal skin', short: 'Part & inspect', view: 'perianal', group: 'Inspection', contact: true, intimate: true, cue: 'part' },
  { id: 'pr.strain', label: 'Ask the patient to bear down (strain)', short: 'Strain', view: 'perianal', group: 'Inspection', contact: false, intimate: true, cue: 'strain' },
  { id: 'pr.palpate', label: 'Palpate the perianal skin (tenderness, induration, fluctuance)', short: 'Palpate skin', view: 'perianal', group: 'Inspection', contact: true, intimate: true, cue: 'press' },
  { id: 'pr.lubricate', label: 'Lubricate the index finger and warn the patient', short: 'Lubricate', view: 'perianal', group: 'Digital rectal examination', contact: false },
  { id: 'pr.insert', label: 'Pulp on the anal margin, steady pressure, insert gently', short: 'Insert finger', view: 'perianal', group: 'Digital rectal examination', contact: true, intimate: true, cue: 'finger' },
  { id: 'pr.tone', label: 'Resting tone, then ask the patient to squeeze', short: 'Tone & squeeze', view: 'perianal', group: 'Digital rectal examination', contact: true, intimate: true, cue: 'finger' },
  { id: 'pr.sweep', label: 'Palpate all round the rectal wall (masses, tenderness)', short: 'Sweep the wall', view: 'perianal', group: 'Digital rectal examination', contact: true, intimate: true, cue: 'finger' },
  { id: 'pr.anterior', label: 'Feel anteriorly: the prostate (male) or cervix (female)', short: 'Prostate / cervix', view: 'perianal', group: 'Digital rectal examination', contact: true, intimate: true, cue: 'finger' },
  { id: 'pr.glove', label: 'Withdraw and inspect the glove (stool, blood, mucus)', short: 'Inspect glove', view: 'perianal', group: 'Digital rectal examination', contact: false },
  { id: 'pr.proctoscope', label: 'Proctoscopy: inspect the anal canal as you withdraw, patient straining', short: 'Proctoscopy', view: 'perianal', group: 'Proctoscopy', contact: true, intimate: true, cue: 'proctoscope' },
  { id: 'pr.nodes', label: 'Palpate the inguinal lymph nodes', short: 'Inguinal nodes', view: 'perianal', group: 'Completion', contact: true },
  { id: 'complete.abdomen', label: 'State: abdominal examination', short: 'Abdomen', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.scope', label: 'State: flexible sigmoidoscopy / colonoscopy if indicated', short: 'Endoscopy', view: 'any', group: 'Completion', contact: false },
]

const contact = new Set(A.filter((a) => a.contact).map((a) => a.id))
const intimate = new Set(A.filter((a) => a.intimate).map((a) => a.id))

/** A painful fissure (sphincter spasm): the digital and proctoscopic examination is deferred. */
const canDre = (x: StepCtx) => !x.c.visual?.perianal?.spasm

export const PERIANAL: StationDef = {
  kind: 'perianal',
  title: 'Perianal & rectal examination',
  task: 'Examine this patient’s perianal area and rectum',
  consentText:
    'You explain that you would like to look at the skin around the back passage and then examine inside with a gloved, lubricated finger — it may be uncomfortable but should not be painful, and they can ask you to stop at any time.',
  positionText: 'You help the patient into the left lateral position: buttocks at the edge of the couch, knees drawn up to the chest, heels clear of the perineum.',
  exposeText: 'You lower the clothing from the waist to the knees and keep a sheet over everything you are not examining.',
  exposure: 'groin',
  intimate: true,
  views: [{ id: 'perianal', label: 'Perianal', closeup: 'perianal' }],
  actions: A,
  steps: [
    ...prepSteps({ chaperone: 'critical', position: 'Left lateral, knees to chest, buttocks at the couch edge', expose: 'Expose from the waist to the knees, with a sheet' }),
    step('prep.gloves', 'Preparation', 'Gloves and a good light', 1, ['pr.gloves'], 'Gloves for any perianal or rectal examination, and an effective light source to see the skin.'),
    step('in.inspect', 'Inspection', 'Part the buttocks and inspect', 2, ['pr.inspect'], 'Look for skin tags, external haemorrhoids, a fissure (usually posterior midline), fistula openings, an abscess, excoriation, warts or a tumour.', {
      look: 'Describe position with the clock face in the lithotomy position: 12 o’clock anterior, 6 o’clock posterior.',
    }),
    step('in.strain', 'Inspection', 'Ask the patient to strain', 0.5, ['pr.strain'], 'Prolapsing haemorrhoids or a rectal prolapse appear on straining; note perineal descent.'),
    step('pa.skin', 'Inspection', 'Palpate around the anus', 1, ['pr.palpate'], 'Tenderness, induration (a fistula track feels like a cord), and fluctuance (an abscess ready to drain).'),
    step('dre.lube', 'Digital rectal examination', 'Lubricate and warn the patient', 0.5, ['pr.lubricate'], 'Water-based gel; tell the patient before you start.', { applies: canDre }),
    step('dre.insert', 'Digital rectal examination', 'Insert the finger gently', 1, ['pr.insert'], 'Pulp of the forefinger on the anal margin, steady pressure until the sphincter relaxes; if there is spasm, ask them to breathe in deeply and relax.', { applies: canDre }),
    step('dre.tone', 'Digital rectal examination', 'Anal tone and voluntary squeeze', 1, ['pr.tone'], 'Weak squeeze suggests sphincter injury or a neurological cause (e.g. cauda equina).', { applies: canDre }),
    step('dre.sweep', 'Digital rectal examination', 'Palpate around the whole rectum', 2, ['pr.sweep'], 'Feel the full circumference. Record any mass: distance from the anal verge and how much of the circumference it involves. Lateralised tenderness suggests pelvic peritonitis.', { applies: canDre }),
    step('dre.anterior', 'Digital rectal examination', 'Prostate or cervix', 1, ['pr.anterior'], 'Prostate: size, shape, consistency, median groove, tenderness. In women the cervix is felt through the anterior wall.', { applies: canDre }),
    step('dre.glove', 'Digital rectal examination', 'Inspect the glove', 1, ['pr.glove'], 'Stool colour, fresh blood, melaena, mucus or pus.', { applies: canDre }),
    step('dre.defer', 'Digital rectal examination', 'Recognise that DRE is too painful and defer it', 2, (x) => did(x, 'pr.inspect') && !did(x, 'pr.sweep') && !did(x, 'pr.proctoscope'), 'With an acutely painful anal condition (fissure, thrombosed piles) and sphincter spasm, do not force a finger or a proctoscope: use local anaesthetic gel, or examine under anaesthesia if needed (Macleod’s).', {
      applies: (x) => !canDre(x),
      action: 'pr.inspect',
    }),
    step('pro.scope', 'Proctoscopy', 'Proctoscopy (after DRE)', 1, ['pr.proctoscope'], 'Insert with the obturator towards the umbilicus, remove the obturator, then inspect as you withdraw with the patient straining: haemorrhoids, fissure, prolapse.', { applies: canDre }),
    ...completionSteps([
      step('end.nodes', 'Completion', 'Inguinal lymph nodes', 0.5, ['pr.nodes'], 'The anal canal below the dentate line drains to the inguinal nodes (anal squamous cancer, infection).'),
      step('end.abdomen', 'Completion', 'Offer an abdominal examination', 0.5, ['complete.abdomen'], 'Masses, tenderness, distension.'),
      step('end.scope', 'Completion', 'Offer endoscopy where indicated', 0.5, ['complete.scope'], 'Proctoscopy sees only the anal canal; rectal bleeding with a change in bowel habit, or in older patients, needs flexible sigmoidoscopy or colonoscopy.'),
    ]),
  ],
  rules: [
    ...baseRules((a) => contact.has(a), (a) => intimate.has(a)),
    before('pr.gloves', ['pr.inspect', 'pr.palpate', 'pr.insert'], 'Put gloves on before touching the perianal area.', 0.5, true),
    before('pr.inspect', 'pr.insert', 'Inspect the perianal skin before inserting a finger.', 0.5, true),
    before('pr.lubricate', 'pr.insert', 'Lubricate your finger before inserting it.', 0.5),
    before('pr.insert', 'pr.proctoscope', 'Always perform a digital rectal examination before proctoscopy.', 0.5),
    {
      id: 'order.spasm',
      message: 'You persisted with an internal examination despite severe pain and spasm — it should be deferred (topical anaesthetic or examination under anaesthesia).',
      penalty: 1,
      violated: (x) => !canDre(x) && (did(x, 'pr.sweep') || did(x, 'pr.proctoscope')),
    },
  ],
  normal: {
    'pr.gloves': { text: 'Gloves on; the lamp is angled onto the perineum.' },
    'pr.inspect': { text: 'The perianal skin is normal: no tags, fissure, haemorrhoids, openings or swelling.' },
    'pr.strain': { text: 'Nothing prolapses on straining; no perineal descent.' },
    'pr.palpate': { text: 'The perianal skin is soft and non-tender, with no induration or fluctuance.' },
    'pr.lubricate': { text: 'You lubricate your gloved index finger and tell the patient you are about to start.' },
    'pr.insert': { text: 'The finger passes easily through the anal canal into the rectum.' },
    'pr.tone': { text: 'Normal resting tone and a good voluntary squeeze.' },
    'pr.sweep': { text: 'The rectal wall is smooth all the way round; no masses, no tenderness. Soft stool in the rectum.' },
    'pr.anterior': { text: 'The prostate (or cervix) feels normal.' },
    'pr.glove': { text: 'Brown stool on the glove; no blood or mucus.' },
    'pr.proctoscope': { text: 'Normal pink anal canal mucosa; no haemorrhoids, fissure or prolapse on straining.' },
    'pr.nodes': { text: 'No inguinal lymphadenopathy.' },
    'complete.abdomen': { text: 'Abdomen soft and non-tender; no masses.' },
    'complete.scope': { text: 'You would arrange flexible sigmoidoscopy if the bleeding were not explained by what you have seen.' },
  },
}
