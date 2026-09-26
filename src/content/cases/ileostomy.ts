import type { CaseDef } from '../../engine/types'

const c: CaseDef = {
  id: 'ileostomy',
  title: 'End ileostomy after panproctocolectomy for ulcerative colitis',
  presenting: 'OSCE: examine this patient’s abdomen (stoma)',
  specialty: 'Colorectal',
  exam: 'abdominal',
  difficulty: 1,
  setting: 'Outpatient clinic',
  stem: 'OSCE station (8 minutes). Tom Bennett, 34, attends the colorectal clinic for review. Please examine his abdomen and present your findings. The examiner will then ask you some questions.',
  components: ['exam', 'diagnosis', 'viva'],
  tags: ['OSCE', 'stoma', 'scars', 'IBD'],
  patient: {
    name: 'Tom Bennett',
    title: 'Mr Bennett',
    age: 34,
    sex: 'male',
    dob: '11/10/1991',
    occupation: 'a graphic designer',
    appearance: {
      sex: 'male',
      age: 34,
      skinTone: 2,
      habitus: 'thin',
      hair: 'short',
      hairColor: 'brown',
      eyeColor: 'green',
      facialHair: 'beard',
      scars: ['midline'],
      stoma: { type: 'ileostomy', side: 'right', bag: false },
    },
    persona: { mood: 'calm', style: 'chatty' },
  },
  vitals: { hr: 72, rhythm: 'regular', sbp: 122, dbp: 76, rr: 14, spo2: 99, temp: 36.6, avpu: 'A', pain: 0 },
  history: {
    opening: 'I’m just here for my check-up — I had my bowel removed three years ago.',
    answers: {
      'pmh.conditions': 'Ulcerative colitis since I was nineteen. It didn’t respond to medicines so they took my whole large bowel out.',
      'pmh.surgery': 'The whole large bowel and rectum were removed three years ago — I’ve had the bag since.',
      'dh.meds': 'Just loperamide if my output gets high.',
      'comm.questions': 'Could I have a pouch operation one day so I don’t need the bag?',
    },
    key: ['comm.open'],
  },
  abdo: {
    general: {
      endOfBed: 'Mr Bennett is a slim young man sitting comfortably. A stoma bag is visible under his shirt on the right side of his abdomen. He has a beard; no jaundice or pallor.',
    },
    abdomen: {
      inspectionExtra:
        'The stoma in the RIF is spouted (about 2.5 cm), pink and healthy, with a single lumen; the bag contains green, porridge-like effluent. Coughing produces no bulge around the stoma (no parastomal hernia). There is a healed midline laparotomy scar.',
      headLift: 'As he lifts his head, there is no bulge along the midline scar or around the stoma — no incisional or parastomal hernia.',
    },
    completion: {
      dre: 'Not possible — the anus and rectum have been excised (look for a healed perineal scar).',
      genitalia: 'Normal external genitalia. A healed perineal wound where the anus was excised.',
    },
  },
  criticalSteps: ['abdo.inspect', 'abdo.cough'],
  investigations: {},
  investigationRubric: { essential: [] },
  diagnosis: {
    correct: 'stoma-ileostomy',
    differentials: ['stoma-colostomy', 'uc', 'crohns'],
  },
  management: { essential: [] },
  viva: [
    {
      id: 'ileo-vs-colo',
      q: 'How do you tell an ileostomy from a colostomy on examination?',
      options: [
        'Ileostomy: usually RIF, spouted, liquid effluent. Colostomy: usually LIF, flush, formed stool',
        'Ileostomy: LIF and flush. Colostomy: RIF and spouted',
        'They cannot be distinguished clinically',
        'Colostomies always have two lumens',
      ],
      correct: 0,
      answer: 'Ileostomy: typically in the right iliac fossa, spouted (2–3 cm) to keep the irritant enzyme-rich small-bowel effluent off the skin, with liquid/porridge-like output. Colostomy: typically in the left iliac fossa, flush with the skin, passing formed stool. A urostomy (ileal conduit) is spouted like an ileostomy but drains urine. Loop stomas have two lumens.',
      topic: 'Stomas',
    },
    {
      id: 'indications',
      q: 'Give indications for an end ileostomy and a loop ileostomy.',
      answer: 'End ileostomy: after panproctocolectomy (UC, familial adenomatous polyposis), after subtotal colectomy for acute severe colitis or emergency (e.g. perforated/ischaemic colon). Loop ileostomy: temporary defunctioning to protect a distal anastomosis (e.g. after low anterior resection or ileoanal pouch), reversed later.',
      topic: 'Indications',
    },
    {
      id: 'complications',
      q: 'List complications of an ileostomy.',
      answer: 'Early: ischaemia/necrosis, retraction, high output (dehydration, hypokalaemia, hypomagnesaemia, AKI), skin excoriation. Late: parastomal hernia, prolapse, stenosis, retraction, fistula, psychosocial/body-image issues, renal stones and gallstones (bile salt loss).',
      topic: 'Complications',
    },
    {
      id: 'pouch',
      q: 'He asks about avoiding a permanent bag. What operation might be offered?',
      answer: 'Restorative proctocolectomy with an ileal pouch–anal anastomosis (IPAA, “J-pouch”), usually with a temporary loop ileostomy. Suitable for many with UC or FAP; not usually for Crohn’s disease (high pouch failure).',
      topic: 'Surgery',
    },
  ],
  teaching: {
    summary:
      'Classic OSCE stoma station: a spouted, single-lumen stoma in the RIF with liquid effluent (end ileostomy), a healed midline laparotomy scar and absent anus — consistent with panproctocolectomy, most commonly for ulcerative colitis.',
    keyFindings: [
      'Spouted stoma in the RIF, pink and healthy, single lumen, liquid effluent',
      'Healed midline laparotomy scar',
      'No parastomal or incisional hernia on coughing/head lift',
      'Anus excised — DRE not possible (perineal scar)',
    ],
    pearls: [
      'Describe a stoma: site, spouted or flush, number of lumens, mucosal health, contents of the bag, surrounding skin, hernia on cough.',
      'Always ask the patient to cough to look for a parastomal hernia.',
      'Offer to examine the perineum — an absent anus clinches panproctocolectomy.',
      'Look at the rest of the abdomen for other scars (e.g. a previous stoma site).',
    ],
    presentation:
      'I examined Mr Tom Bennett, a 34-year-old man who looked well. There were no peripheral stigmata of gastrointestinal disease. On inspection of the abdomen there was a healed midline laparotomy scar and a spouted, single-lumen stoma in the right iliac fossa; the mucosa was pink and healthy and the bag contained liquid green effluent. There was no parastomal or incisional hernia on coughing or head lift. The abdomen was soft and non-tender with no organomegaly, and bowel sounds were normal. These findings are consistent with an end ileostomy. Together with the midline scar, and if the anus has been excised, this suggests a panproctocolectomy — most commonly for ulcerative colitis. I would complete my examination by inspecting the perineum.',
    references: ['Macleod’s Clinical Examination, 14th ed. — Ch. 6: inspection of the abdomen (scars and stomas)', 'Association of Coloproctology of Great Britain and Ireland (ACPGBI) guidance'],
  },
}

export default c
