import type { CaseDef } from '../../engine/types'

const c: CaseDef = {
  id: 'thyroglossal-cyst',
  title: 'Thyroglossal duct cyst',
  presenting: 'OSCE: examine this patient’s neck lump',
  specialty: 'Endocrine',
  exam: 'thyroid',
  difficulty: 1,
  setting: 'Outpatient clinic',
  stem: 'OSCE station (6 minutes). Holly Evans, 19, has a lump in the middle of her neck. Please examine the lump and her neck, and present your findings.',
  components: ['exam', 'diagnosis', 'viva'],
  tags: ['OSCE', 'midline neck lump', 'tongue protrusion'],
  patient: {
    name: 'Holly Evans',
    title: 'Miss Evans',
    age: 19,
    sex: 'female',
    dob: '03/03/2007',
    occupation: 'a university student',
    appearance: { sex: 'female', age: 19, skinTone: 2, habitus: 'average', hair: 'long', hairColor: 'auburn', eyeColor: 'green' },
    persona: { mood: 'calm', style: 'normal' },
  },
  vitals: { hr: 70, rhythm: 'regular', sbp: 112, dbp: 70, rr: 14, spo2: 99, temp: 36.7, avpu: 'A', pain: 0 },
  visual: { neck: { thyroglossal: { sizeCm: 2 } } },
  history: { opening: 'I’ve noticed a lump in the middle of my neck.', answers: {}, key: [] },
  keyed: {
    'comm.pain': { text: '', says: 'No, it’s not sore.' },
    'thy.general': { text: 'A well young woman at rest; clinically euthyroid.' },
    'thy.neckInspect': { text: 'A smooth, round, 2 cm swelling in the midline of the upper neck, just below the hyoid bone. Normal skin; no sinus or scars.', abnormal: true, meaning: 'A midline swelling near the hyoid is typically a thyroglossal cyst (or a dermoid cyst / lymph node).' },
    'thy.swallow': { text: 'The swelling moves up on swallowing.', abnormal: true },
    'thy.tongue': {
      text: 'The swelling moves UP when she protrudes her tongue.',
      abnormal: true,
      meaning: 'Movement with tongue protrusion is the key sign: the cyst is tethered to the foramen caecum by the remnant of the thyroglossal duct.',
    },
    'thy.palpate': { text: 'A smooth, spherical, 2 cm, non-tender, fluctuant midline swelling. The thyroid gland itself feels normal in size and position.', abnormal: true },
    'thy.nodes': { text: 'No cervical lymphadenopathy.' },
    'thy.trachea': { text: 'Trachea central.' },
    'thy.percuss': { text: 'Resonant.' },
    'thy.bruit': { text: 'No bruit.' },
  },
  criticalSteps: ['neck.tongue'],
  investigations: {},
  investigationRubric: { essential: [] },
  diagnosis: { correct: 'thyroglossal-cyst', differentials: ['branchial-cyst', 'reactive-node', 'solitary-nodule', 'epidermoid-cyst'] },
  management: {
    essential: [{ id: 'excision', why: 'Sistrunk’s operation: excision of the cyst, its tract and the central part of the hyoid bone (reduces recurrence to < 5%).' }],
    helpful: [{ id: 'reassure', why: 'Benign; infection is the main reason to remove it.' }],
    avoid: [{ id: 'incision-drainage', why: 'Simple drainage leads to a persistent thyroglossal fistula — only for acute abscess.' }],
  },
  viva: [
    {
      id: 'embryo',
      q: 'Describe the embryological origin of a thyroglossal cyst.',
      answer: 'The thyroid develops at the foramen caecum (junction of the anterior two-thirds and posterior third of the tongue) and descends to the neck via the thyroglossal duct, passing close to (usually through or in front of) the hyoid bone. The duct normally obliterates by around the 10th week; a persistent segment can form a cyst anywhere along its course, most commonly just below the hyoid.',
      topic: 'Embryology',
    },
    {
      id: 'us-first',
      q: 'What must you confirm before excising a thyroglossal cyst?',
      options: ['That the patient is euthyroid', 'That there is normal thyroid tissue in the neck (the cyst is not the only thyroid tissue)', 'That the cyst transilluminates', 'That the calcium is normal'],
      correct: 1,
      answer: 'Ultrasound confirms normally sited thyroid tissue, so you do not remove an ectopic thyroid that is the patient’s only functioning thyroid tissue. Ultrasound also characterises the cyst (rarely, papillary carcinoma arises in the tract).',
      topic: 'Management',
    },
    {
      id: 'sistrunk',
      q: 'Why is the central part of the hyoid removed in Sistrunk’s procedure?',
      answer: 'The duct is intimately related to (often passing through) the body of the hyoid. Removing the central hyoid with the tract up towards the foramen caecum reduces recurrence from about 50% (simple excision) to under 5%.',
      topic: 'Surgery',
    },
  ],
  teaching: {
    summary: 'A smooth midline neck swelling just below the hyoid that rises with swallowing AND with tongue protrusion — a thyroglossal duct cyst, treated by Sistrunk’s operation after confirming normal thyroid tissue on ultrasound.',
    keyFindings: ['Midline swelling at the level of the hyoid', 'Moves on swallowing and on tongue protrusion', 'Smooth, fluctuant, non-tender', 'Normal thyroid gland; no lymphadenopathy'],
    pearls: ['Tongue protrusion is the discriminating test for a midline neck lump.', 'Lateral neck lumps: think branchial cyst (anterior to the upper SCM), lymph nodes, carotid body tumour.', 'Always ask the patient to swallow AND protrude the tongue.'],
    presentation:
      'I examined Miss Holly Evans, a 19-year-old woman who was clinically euthyroid. In the midline of the upper neck, just below the hyoid, there is a 2 cm smooth, spherical, non-tender, fluctuant swelling with normal overlying skin and no sinus. It moves upwards both on swallowing and on protrusion of the tongue. The thyroid gland feels normal, the trachea is central and there is no cervical lymphadenopathy. These findings are consistent with a thyroglossal duct cyst. I would arrange an ultrasound to confirm a normally sited thyroid and refer for Sistrunk’s procedure.',
    references: ['Macleod’s Clinical Examination, 14th ed. — Ch. 10: The endocrine system (examination of a neck lump)'],
  },
}

export default c
