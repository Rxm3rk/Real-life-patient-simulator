import { baseRules, before, COMM_ACTIONS, completionSteps, prepSteps, step } from './builders'
import type { StationAction, StationDef } from './types'

const A: StationAction[] = [
  ...COMM_ACTIONS,
  { id: 'br.inspectSide', label: 'Inspect: sitting, arms by the sides', short: 'Arms by sides', view: 'chest', group: 'Inspection', contact: false, intimate: true, cue: 'arms-side' },
  { id: 'br.inspectHips', label: 'Inspect: hands pressing on hips (tense pectorals)', short: 'Hands on hips', view: 'chest', group: 'Inspection', contact: false, intimate: true, cue: 'hands-hips' },
  { id: 'br.inspectUp', label: 'Inspect: arms raised above the head', short: 'Arms up', view: 'chest', group: 'Inspection', contact: false, intimate: true, cue: 'arms-up' },
  { id: 'br.palpNormal', label: 'Palpate the NORMAL breast first — all quadrants and axillary tail', short: 'Normal breast', view: 'chest', group: 'Palpation', contact: true, intimate: true, cue: 'press' },
  { id: 'br.palpAffected', label: 'Palpate the affected breast — all quadrants and axillary tail', short: 'Affected breast', view: 'chest', group: 'Palpation', contact: true, intimate: true, cue: 'press' },
  { id: 'br.lump', label: 'Characterise the lump (position, size, shape, consistency, mobility, fixity)', short: 'Describe lump', view: 'chest', group: 'Palpation', contact: true, intimate: true, cue: 'press' },
  { id: 'br.fixity', label: 'Test fixity: move the lump with pectorals relaxed and tensed', short: 'Fixity', view: 'chest', group: 'Palpation', contact: true, intimate: true, cue: 'hands-hips' },
  { id: 'br.nipple', label: 'Examine the nipple — retraction, discharge (ask patient to express)', short: 'Nipple', view: 'chest', group: 'Palpation', contact: true, intimate: true },
  { id: 'br.axillaR', label: 'Right axillary nodes (support the arm)', short: 'R axilla', view: 'chest', group: 'Lymph nodes', contact: true, intimate: true },
  { id: 'br.axillaL', label: 'Left axillary nodes (support the arm)', short: 'L axilla', view: 'chest', group: 'Lymph nodes', contact: true, intimate: true },
  { id: 'br.scf', label: 'Supraclavicular and cervical nodes', short: 'Neck nodes', view: 'chest', group: 'Lymph nodes', contact: true },
  { id: 'complete.triple', label: 'State: triple assessment (clinical, imaging, biopsy)', short: 'Triple assessment', view: 'any', group: 'Completion', contact: false },
  { id: 'complete.spine', label: 'State: examine the spine, liver and chest for metastases', short: 'Metastases', view: 'any', group: 'Completion', contact: false },
]

const contact = new Set(A.filter((a) => a.contact).map((a) => a.id))
const intimate = new Set(A.filter((a) => a.intimate).map((a) => a.id))

export const BREAST: StationDef = {
  kind: 'breast',
  title: 'Breast examination',
  task: 'Examine this patient’s breasts',
  consentText: 'You explain that you would like to examine both breasts and the lymph nodes in the armpits and neck, and that this is an intimate examination.',
  positionText: 'You sit the patient on the edge of the couch for inspection, then recline them to 45° with the hand behind the head for palpation.',
  exposeText: 'You ask the patient to undress to the waist, offering a sheet to cover up when not being examined.',
  exposure: 'torso',
  intimate: true,
  views: [{ id: 'chest', label: 'Chest', shot: { cx: 0, cy: 212, w: 270, h: 210 } }],
  actions: A,
  steps: [
    ...prepSteps({ chaperone: 'critical', position: 'Sit the patient on the edge of the couch, then recline to 45° for palpation', expose: 'Expose to the waist (offer a gown to cover when not examining)' }),
    step('in.side', 'Inspection', 'Inspect with arms by the sides', 1, ['br.inspectSide'], 'Symmetry, size, contour, skin changes (peau d’orange, dimpling, erythema, ulceration), nipple inversion or discharge, Paget’s eczema, scars.'),
    step('in.hips', 'Inspection', 'Inspect with hands on hips', 1, ['br.inspectHips'], 'Tensing pectoralis major accentuates skin tethering or dimpling over a fixed tumour.'),
    step('in.up', 'Inspection', 'Inspect with arms raised', 1, ['br.inspectUp'], 'Reveals tethering, lumps in the inframammary folds and the axillae.'),
    step('pa.normal', 'Palpation', 'Examine the normal breast first', 2, ['br.palpNormal'], 'It sets the patient’s baseline texture — and is kinder. Use the flat of the fingers, covering every quadrant and the axillary tail.', {
      how: 'Patient reclined at 45°, hand behind the head on the side being examined; palpate systematically (quadrants, spiral or strips).',
    }),
    step('pa.affected', 'Palpation', 'Examine the affected breast', 1, ['br.palpAffected'], 'All four quadrants, retroareolar region and the axillary tail.'),
    step('pa.lump', 'Palpation', 'Characterise any lump', 2, ['br.lump'], 'Position (clock face and distance from the nipple), size, shape, surface, edge, consistency, tenderness, mobility.'),
    step('pa.fixity', 'Palpation', 'Test fixity to skin and pectoralis', 1, ['br.fixity'], 'Fixity to pectoralis major (lump moves less with the muscle tensed) indicates deep invasion.'),
    step('pa.nipple', 'Palpation', 'Examine the nipple', 1, ['br.nipple'], 'Ask the patient to express any discharge: bloody, single-duct discharge needs investigation.'),
    step('ln.axilla', 'Lymph nodes', 'Examine both axillae', 2, (x) => ['br.axillaR', 'br.axillaL'].filter((a) => x.log.some((e) => e.action === a)).length / 2, 'Support the patient’s arm and palpate the apical, central, anterior, posterior and lateral groups.', { action: 'br.axillaR' }),
    step('ln.scf', 'Lymph nodes', 'Supraclavicular and cervical nodes', 1, ['br.scf'], 'Supraclavicular nodes indicate advanced disease.'),
    ...completionSteps([
      step('end.triple', 'Completion', 'Explain triple assessment', 1, ['complete.triple'], 'Every breast lump needs triple assessment: clinical examination, imaging (US < 40 years, mammography + US ≥ 40) and core biopsy.'),
      step('end.mets', 'Completion', 'Offer to look for metastatic spread', 0.5, ['complete.spine'], 'Spine (bone tenderness), liver (hepatomegaly), lungs (effusion).'),
    ]),
  ],
  rules: [
    ...baseRules((a) => contact.has(a), (a) => intimate.has(a)),
    before(['br.inspectSide', 'br.inspectHips', 'br.inspectUp'], ['br.palpNormal', 'br.palpAffected', 'br.lump'], 'Inspect in all three positions before palpating.'),
    before('br.palpNormal', ['br.palpAffected', 'br.lump'], 'Examine the normal breast first — it is your baseline.', 0.5, true),
  ],
  normal: {
    'br.inspectSide': { text: 'Both breasts are symmetrical with normal skin and nipples. No scars.' },
    'br.inspectHips': { text: 'No tethering or dimpling appears.' },
    'br.inspectUp': { text: 'No tethering; inframammary folds and axillae look normal.' },
    'br.palpNormal': { text: 'Normal glandular texture throughout, no discrete lump.' },
    'br.palpAffected': { text: 'No discrete lump.' },
    'br.lump': { text: 'There is no discrete lump to describe.' },
    'br.fixity': { text: 'Nothing fixed.' },
    'br.nipple': { text: 'Normal nipples with no discharge.' },
    'br.axillaR': { text: 'No palpable right axillary nodes.' },
    'br.axillaL': { text: 'No palpable left axillary nodes.' },
    'br.scf': { text: 'No supraclavicular or cervical lymphadenopathy.' },
    'complete.triple': { text: 'Triple assessment: clinical examination, imaging and core biopsy.' },
    'complete.spine': { text: 'No spinal tenderness, hepatomegaly or pleural effusion.' },
  },
}
