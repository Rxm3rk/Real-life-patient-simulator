import type { CaseDef } from '../../engine/types'
import { lab, r, UE } from './helpers'

const c: CaseDef = {
  id: 'caecal-cancer',
  title: 'Caecal adenocarcinoma presenting with iron-deficiency anaemia and a right iliac fossa mass',
  presenting: 'Tiredness, weight loss and a lump in the tummy',
  specialty: 'Colorectal',
  exam: 'abdominal',
  difficulty: 2,
  setting: 'Outpatient clinic',
  stem: 'Joyce Palmer, 76, has been referred on the suspected lower GI cancer pathway because of anaemia. Take a history, examine her abdomen, request investigations and discuss your plan.',
  components: ['history', 'exam', 'investigations', 'diagnosis', 'viva'],
  tags: ['RIF mass', 'anaemia', '2WW', 'colorectal cancer'],
  patient: {
    name: 'Joyce Palmer',
    title: 'Mrs Palmer',
    age: 76,
    sex: 'female',
    dob: '15/08/1950',
    occupation: 'a retired shop owner',
    appearance: {
      sex: 'female',
      age: 76,
      skinTone: 3,
      habitus: 'thin',
      hair: 'bob',
      hairColor: 'grey',
      eyeColor: 'brown',
      pallor: 0.75,
      glasses: true,
    },
    persona: { mood: 'anxious', style: 'normal' },
  },
  vitals: { hr: 94, rhythm: 'regular', sbp: 132, dbp: 70, rr: 16, spo2: 98, temp: 36.7, avpu: 'A', pain: 1 },
  history: {
    opening: 'I’ve been so tired for the last few months, doctor. I get out of breath just going up the stairs, and my GP says my blood count is low.',
    answers: {
      'sys.fatigue': 'Exhausted. I have to sit down halfway through the hoovering.',
      'ros.sob': 'Breathless on the stairs — I never used to be.',
      'ros.chest_pain': 'No chest pain.',
      'ros.dizzy': 'A bit light-headed when I stand up quickly.',
      'gi.weight': 'About five kilos over the last four months. I haven’t been dieting.',
      'gi.appetite': 'Not as good as it was.',
      'gi.bowel_change': 'They’ve been looser for the last few months — two or three times a day.',
      'gi.diarrhoea': 'Loose, but not watery.',
      'gi.stool_blood': 'I haven’t seen any blood.',
      'gi.melaena': 'Not black, no — maybe a bit dark.',
      'gi.mucus': 'No.',
      'pain.site': 'Just a vague ache low down on the right sometimes. Nothing bad.',
      'pain.severity': 'One or two — hardly anything.',
      'sys.lumps': 'Now you mention it, I thought I felt something hard on the right side of my tummy when I was lying in bed.',
      'sys.fever': 'No.',
      'sys.sweats': 'No.',
      'gi.dysphagia': 'No trouble swallowing.',
      'gi.reflux': 'No indigestion.',
      'gyn.bleeding': 'No bleeding — I went through the change at fifty.',
      'pmh.conditions': 'Just high cholesterol.',
      'pmh.surgery': 'Nothing.',
      'dh.meds': 'Atorvastatin, and iron tablets the GP started last week.',
      'dh.nsaids': 'No.',
      'dh.anticoag': 'No.',
      'fh.cancer': 'My father had bowel cancer in his seventies.',
      'sh.diet': 'I eat a lot of red meat, not much fibre.',
      'sh.smoking': 'I stopped years ago.',
      'sh.alcohol': 'Very little.',
      'sh.living': 'With my husband; I’m his carer — he has dementia.',
      'comm.questions': 'Is it cancer? Who will look after my husband if I need an operation?',
    },
    key: ['comm.open', 'sys.fatigue', 'ros.sob', 'gi.weight', 'gi.bowel_change', 'gi.stool_blood', 'gi.melaena', 'sys.lumps', 'gyn.bleeding', 'gi.dysphagia', 'dh.nsaids', 'dh.anticoag', 'dh.meds', 'fh.cancer', 'sh.living'],
    critical: ['gi.weight', 'fh.cancer'],
    ideas: 'My dad had bowel cancer, so I have been worrying.',
    concerns: 'That it’s cancer — and what happens to my husband if I’m in hospital.',
    expectations: 'I want to know, whatever it is.',
  },
  abdo: {
    general: {
      endOfBed: 'Mrs Palmer is a slim elderly woman who looks pale but comfortable at rest. She is not jaundiced. No lines, drains or stomas.',
    },
    hands: { koilonychia: true, pallorCreases: true, temperature: 'warm' },
    face: { conjunctiva: 'pale', angularCheilitis: true, tongue: 'pale' },
    abdomen: {
      regions: {
        RIF: r(0, 1, 'none', {
          note: 'dull',
          mass: {
            description: 'a firm, irregular, non-tender 6 cm mass in the right iliac fossa; you can get above it, it does not move with respiration, is not pulsatile, and is dull to percussion',
            label: 'RIF mass',
            sizeCm: 6,
          },
        }),
      },
    },
    completion: {
      dre: 'No rectal mass. Soft brown stool; faecal occult blood — you would not rely on this; FIT is used instead.',
      urinalysis: 'Normal.',
    },
  },
  criticalSteps: ['palp.deep', 'face.eyes'],
  investigations: {
    fbc: {
      values: [
        lab('Haemoglobin', 82, 'g/L', '115–155', 'L'),
        lab('MCV', 71, 'fL', '80–100', 'L'),
        lab('White cells', 7.8, '×10⁹/L', '4.0–11.0'),
        lab('Platelets', 452, '×10⁹/L', '150–400', 'H'),
        lab('Ferritin', 6, 'µg/L', '15–300', 'L'),
      ],
      interpretation: 'Microcytic iron-deficiency anaemia (reactive thrombocytosis). In a post-menopausal woman this needs lower and upper GI investigation.',
    },
    ue: { values: UE(139, 4.2, 5.2, 70, '72', 'female'), interpretation: 'Normal.' },
    lft: { values: [lab('Bilirubin', 9, 'µmol/L', '< 21'), lab('ALT', 18, 'U/L', '< 40'), lab('ALP', 96, 'U/L', '30–130'), lab('Albumin', 34, 'g/L', '35–50', 'L')], interpretation: 'Normal (no evidence of liver metastases).' },
    cea: { values: [lab('CEA', 18, 'µg/L', '< 5', 'H')], interpretation: 'Raised — useful as a baseline for monitoring, not for diagnosis.' },
    colonoscopy: {
      report: 'Complete colonoscopy to the caecum. A circumferential, ulcerated, friable tumour in the caecum. Biopsies taken; tattoo placed. No synchronous lesions.',
      interpretation: 'Caecal tumour — histology: moderately differentiated adenocarcinoma.',
      abnormal: true,
    },
    'ct-cap': {
      report: '6 cm caecal mass with pericolic fat stranding and three enlarged ileocolic lymph nodes. No liver or lung metastases.',
      interpretation: 'Locally advanced caecal cancer without distant spread (radiological T3 N1 M0).',
      abnormal: true,
    },
    'ct-ap': { report: 'Caecal mass with local lymphadenopathy. No liver lesions.', interpretation: 'Caecal carcinoma.', abnormal: true },
    ogd: { report: 'Normal oesophagus, stomach and duodenum. Duodenal biopsies: no coeliac disease.', interpretation: 'No upper GI source.' },
    'us-abdo': { report: 'Solid-appearing mass in the right iliac fossa inseparable from the caecum. Normal liver.', interpretation: 'Right iliac fossa mass — needs colonoscopy/CT.', abnormal: true },
  },
  investigationRubric: {
    essential: [
      { id: 'fbc', why: 'Confirm iron-deficiency anaemia (MCV, ferritin).' },
      { id: 'colonoscopy', why: 'Visualise and biopsy the lesion (tissue diagnosis).' },
      { id: 'ct-cap', why: 'Stage the disease: chest, abdomen and pelvis.' },
    ],
    helpful: [
      { id: 'cea', why: 'Baseline tumour marker.' },
      { id: 'ue', why: 'Baseline, before contrast.' },
      { id: 'lft', why: 'Baseline.' },
      { id: 'ogd', why: 'IDA work-up (upper GI source, coeliac biopsies) if the colon is normal or both are needed.' },
      { id: 'gs', why: 'Pre-operative.' },
    ],
  },
  diagnosis: {
    correct: 'caecal-cancer',
    accept: ['colorectal-cancer'],
    differentials: ['crohns', 'appendix-mass', 'lymphoma', 'ovarian-cyst'],
  },
  management: {
    essential: [
      { id: 'mdt', why: 'Colorectal cancer MDT to agree treatment after staging.' },
      { id: 'right-hemicolectomy', why: '!Curative treatment for a non-metastatic caecal cancer.' },
      { id: 'iron', why: 'Correct iron deficiency before surgery (IV iron works fastest).' },
      { id: 'breaking-news', why: 'Break the diagnosis sensitively with a colorectal nurse specialist present.' },
    ],
    helpful: [
      { id: '2ww', why: 'She is already on the suspected cancer pathway — keep within targets.' },
      { id: 'transfusion', why: 'Consider if symptomatic (breathless, light-headed) before surgery.' },
      { id: 'nutrition', why: 'Pre-operative optimisation (prehabilitation).' },
      { id: 'vte', why: 'Cancer and surgery increase VTE risk.' },
    ],
    avoid: [
      { id: 'reassure', why: 'Unexplained iron-deficiency anaemia in a 76-year-old needs investigation, not reassurance.' },
      { id: 'discharge', why: 'She needs a cancer pathway.' },
    ],
  },
  viva: [
    {
      id: 'rif-mass',
      q: 'List the differential diagnosis of a right iliac fossa mass.',
      answer:
        'Gut: caecal/ascending colon carcinoma, appendix mass/abscess, Crohn’s disease (terminal ileum), ileocaecal TB (important in endemic areas), intussusception. Gynae: ovarian cyst/tumour, fibroid. Urological: transplanted kidney, pelvic kidney. Other: psoas abscess, iliac lymphadenopathy (lymphoma), iliac artery aneurysm, a Spigelian hernia.',
      topic: 'Differential',
    },
    {
      id: 'nice-ng12',
      q: 'Which of these meets the NICE NG12 criteria for an urgent colorectal cancer referral?',
      options: ['Age ≥ 60 with iron-deficiency anaemia', 'Age 30 with a single episode of bright red blood on the paper', 'Age 45 with constipation for 2 weeks', 'Age 25 with irritable bowel symptoms'],
      correct: 0,
      answer: 'NG12 suspected colorectal cancer: ≥ 40 with unexplained weight loss and abdominal pain; ≥ 50 with unexplained rectal bleeding; ≥ 60 with iron-deficiency anaemia or change in bowel habit; a positive faecal immunochemical test (FIT ≥ 10 µg Hb/g); or a rectal/abdominal mass.',
      topic: 'Guidelines',
    },
    {
      id: 'right-vs-left',
      q: 'Why do right-sided colon cancers present differently from left-sided ones?',
      answer:
        'The right colon is wide and its contents liquid, so tumours rarely obstruct; they bleed occultly and present with iron-deficiency anaemia, weight loss or a mass. Left-sided and rectal tumours (narrower lumen, formed stool) present with altered bowel habit, visible rectal bleeding, tenesmus or obstruction.',
      topic: 'Pathology',
    },
    {
      id: 'hemicolectomy',
      q: 'Which vessels are divided in a right hemicolectomy?',
      options: ['Ileocolic, right colic and the right branch of the middle colic', 'Inferior mesenteric artery', 'Sigmoid arteries', 'Left colic artery'],
      correct: 0,
      answer: 'The ileocolic and right colic vessels (branches of the SMA) and usually the right branch of the middle colic, with en-bloc removal of the draining lymph nodes; an ileocolic anastomosis restores continuity. An extended right hemicolectomy (for hepatic flexure/transverse tumours) divides the middle colic trunk.',
      topic: 'Surgery',
    },
  ],
  teaching: {
    summary:
      'Caecal adenocarcinoma: a 76-year-old with symptomatic iron-deficiency anaemia (pallor, koilonychia, angular stomatitis), weight loss, looser stools and a firm, irregular, non-tender right iliac fossa mass; staged T3 N1 M0 and suitable for right hemicolectomy.',
    keyFindings: [
      'Fatigue and exertional breathlessness from anaemia (Hb 82, MCV 71, ferritin 6)',
      'Five kilograms of unintentional weight loss; change in bowel habit; father had bowel cancer',
      'Conjunctival pallor, pale palmar creases, koilonychia, angular stomatitis',
      'Firm, irregular, non-tender 6 cm RIF mass, dull, not moving with respiration',
      'Colonoscopy: ulcerated caecal tumour; CT: no metastases',
    ],
    pearls: [
      'Iron-deficiency anaemia in a man, or a post-menopausal woman, is GI cancer until proven otherwise.',
      'Describe every mass: site, size, shape, surface, edge, consistency, tenderness, mobility, pulsatility, percussion and whether you can get above it.',
      'Right-sided colon cancers bleed silently rather than obstruct.',
      'Ask about carer responsibilities — they matter for discharge planning.',
    ],
    presentation:
      'Mrs Palmer is a 76-year-old woman referred with iron-deficiency anaemia. She has three months of fatigue and exertional breathlessness, 5 kg of unintentional weight loss and looser stools, without visible bleeding; her father had bowel cancer. She is pale with conjunctival pallor, koilonychia and angular stomatitis, and there is a firm, irregular, non-tender 6 cm mass in the right iliac fossa that is dull to percussion and does not move with respiration. Her Hb is 82 with an MCV of 71 and a ferritin of 6; CEA is 18. Colonoscopy shows an ulcerated caecal tumour and CT staging shows local nodal disease without metastases. The diagnosis is caecal adenocarcinoma. I would discuss her at the colorectal MDT, correct her iron deficiency with IV iron, break the news with a specialist nurse and plan a right hemicolectomy, making arrangements for her husband’s care.',
    references: ['NICE NG12 Suspected cancer: recognition and referral', 'NICE NG151 Colorectal cancer (2020)', 'Macleod’s Clinical Examination, 14th ed. — Ch. 6: abdominal masses'],
  },
}

export default c
