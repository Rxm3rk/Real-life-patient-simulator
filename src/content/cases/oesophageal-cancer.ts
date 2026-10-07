import type { CaseDef } from '../../engine/types'
import { FBC, lab, LFT, r, UE } from './helpers'

const c: CaseDef = {
  id: 'oesophageal-cancer',
  title: 'Adenocarcinoma of the lower oesophagus arising in Barrett’s oesophagus',
  presenting: 'Difficulty swallowing and weight loss',
  specialty: 'Upper GI',
  exam: 'abdominal',
  difficulty: 2,
  setting: 'Outpatient clinic',
  stem: 'Upper GI clinic (urgent suspected-cancer referral). Brian Lewis, 66, has been referred by his GP because food is sticking when he swallows. Take a history, examine his abdomen, request investigations and discuss your plan.',
  components: ['history', 'exam', 'investigations', 'diagnosis', 'viva'],
  tags: ['dysphagia', 'heartburn', 'Barrett’s', '2WW', 'weight loss'],
  patient: {
    name: 'Brian Lewis',
    title: 'Mr Lewis',
    age: 66,
    sex: 'male',
    dob: '04/02/1960',
    occupation: 'a retired lorry driver',
    appearance: {
      sex: 'male',
      age: 66,
      skinTone: 1,
      habitus: 'thin',
      cachexia: true,
      hair: 'receding',
      hairColor: 'grey',
      eyeColor: 'blue',
      facialHair: 'moustache',
      pallor: 0.45,
      scars: ['right-inguinal'],
    },
    persona: { mood: 'stoic', style: 'brief' },
  },
  vitals: { hr: 88, rhythm: 'regular', sbp: 128, dbp: 76, rr: 14, spo2: 97, temp: 36.6, avpu: 'A', pain: 2 },
  history: {
    opening: { text: 'Food’s been sticking, doctor. It started with bread and meat a few months back, and now it’s most things. I’ve lost a lot of weight.', cue: 'taps the lower end of his breastbone' },
    answers: {
      'gi.dysphagia': 'Yes — food sticks on the way down. It’s been getting steadily worse for about four months.',
      'gi.dysphagia_type': 'Solids at first — steak, bread, chips. Now even mince and potatoes stick unless I mash them. Drinks and soup still go down.',
      'gi.dysphagia_course': 'Steadily worse. It never goes back to normal now.',
      'gi.dysphagia_level': { text: 'Down here — behind the bottom of my breastbone.', cue: 'points to the lower sternum' },
      'gi.odynophagia': 'Sometimes a sharp pain as a lump of food goes down.',
      'gi.regurgitation': 'If it sticks, I have to bring it back up — it comes up just as I swallowed it. I don’t cough or choke, though.',
      'gi.reflux': 'Heartburn for twenty years or more — I lived on Rennies. The GP gave me omeprazole years ago and I take it when it’s bad. Funny thing is, the heartburn’s been better lately.',
      'gi.weight': 'About ten kilos in four months. I’ve had to take my belt in three notches.',
      'gi.appetite': 'I’m hungry — I just can’t get it down.',
      'gi.vomiting': 'Only when food sticks and I bring it back.',
      'gi.vomit_content': 'Just the food I’ve eaten. Never any blood.',
      'gi.melaena': 'Now and again my stools have looked darker. Not tarry.',
      'gi.bowel_change': 'A bit constipated since I’ve been eating less.',
      'gi.stool_blood': 'No.',
      'pain.site': 'There’s no real pain — just the sticking, and an ache behind the breastbone when it happens.',
      'pain.severity': 'Two, maybe.',
      'sys.fatigue': 'Tired out. I get breathless on the stairs.',
      'ros.sob': 'On the stairs, yes. Not when I’m sitting.',
      'ros.cough': 'No.',
      'thy.voice': 'No, my voice is the same as ever.',
      'sys.lumps': 'No lumps that I’ve noticed.',
      'sys.sweats': 'No.',
      'pmh.conditions': 'High blood pressure. And they said I had “Barrett’s” on a camera test about ten years ago — I was meant to have another one, but I never went back.',
      'pmh.gi': 'The Barrett’s, and a hiatus hernia they found at the same time.',
      'pmh.surgery': 'A hernia repair in my right groin, years ago.',
      'dh.meds': 'Amlodipine for my blood pressure, and omeprazole when I remember.',
      'dh.nsaids': 'No.',
      'sh.smoking': 'Thirty a day for forty years. I stopped five years ago.',
      'sh.alcohol': 'Two or three pints at the weekend. I used to drink more.',
      'sh.diet': 'Soup and mashed food now, and the supplement drinks the GP gave me.',
      'sh.living': 'With my wife, Carol.',
      'fh.cancer': 'No, not that I know of.',
      'comm.questions': 'Is it cancer? Be straight with me.',
    },
    key: [
      'comm.open',
      'gi.dysphagia',
      'gi.dysphagia_type',
      'gi.dysphagia_course',
      'gi.dysphagia_level',
      'gi.odynophagia',
      'gi.regurgitation',
      'gi.weight',
      'gi.reflux',
      'gi.vomit_content',
      'gi.melaena',
      'pmh.gi',
      'dh.meds',
      'dh.nsaids',
      'sh.smoking',
      'sh.alcohol',
      'fh.cancer',
    ],
    critical: ['gi.weight', 'gi.dysphagia_type'],
    ideas: 'I thought it might be a narrowing from all the acid over the years.',
    concerns: 'That it’s cancer. My wife thinks so too — she made me come.',
    expectations: 'To get it sorted so I can eat a proper meal again.',
    social: {
      smoking: 'Ex-smoker: thirty a day for forty years. Stopped five years ago.',
      alcohol: 'Two or three pints at the weekend.',
      living: 'With my wife, Carol.',
    },
  },
  abdo: {
    general: {
      endOfBed:
        'Mr Lewis is a thin, tired-looking man sitting comfortably in the chair. His clothes look too big for him and his belt has been taken in. He is not jaundiced or breathless at rest. There are no lines, drains or stomas.',
    },
    hands: { pallorCreases: true, temperature: 'warm' },
    face: { conjunctiva: 'pale', tongue: 'pale', angularCheilitis: true },
    abdomen: {
      inspectionExtra: 'Scaphoid abdomen with obvious loss of subcutaneous fat.',
      regions: {
        EPI: r(0, 1),
      },
    },
    completion: {
      dre: 'Soft dark-brown stool with no blood or melaena; no rectal mass.',
    },
  },
  criticalSteps: ['neck.nodes', 'face.eyes'],
  investigations: {
    ogd: {
      report:
        'Hiatus hernia. A long segment of salmon-pink Barrett’s mucosa from 30 to 35 cm. From 35 to 39 cm an irregular, ulcerated, friable tumour narrows the lumen circumferentially; the standard endoscope passes with resistance. It reaches the gastro-oesophageal junction (Siewert type I). Multiple biopsies taken.',
      interpretation: 'Histology: moderately differentiated adenocarcinoma arising in Barrett’s oesophagus.',
      abnormal: true,
    },
    fbc: { values: FBC(104, 6.9, 4.4, 410, 74), interpretation: 'Microcytic anaemia with a reactive thrombocytosis — iron deficiency from chronic blood loss.' },
    haematinics: {
      values: [lab('Ferritin', 9, 'µg/L', '30–300', 'L'), lab('Vitamin B₁₂', 312, 'ng/L', '197–771'), lab('Folate', 4.2, 'µg/L', '> 3.9')],
      interpretation: 'Iron deficiency.',
    },
    ue: { values: UE(141, 4.0, 6.8, 78, '> 90'), interpretation: 'Normal renal function.' },
    lft: { values: LFT(9, 18, 92, 34, 31), interpretation: 'Low albumin from malnutrition. No biochemical evidence of liver metastases.' },
    'ct-cap': {
      report:
        'Circumferential thickening of the distal oesophagus over 5 cm extending to the gastro-oesophageal junction, with loss of the fat plane posteriorly. Two enlarged (11 mm) para-oesophageal lymph nodes. No liver, lung or peritoneal metastases. No ascites.',
      interpretation: 'Locally advanced distal oesophageal tumour with regional nodes; no distant metastases on CT.',
      abnormal: true,
    },
    'pet-ct': {
      report: 'FDG-avid distal oesophageal primary and two avid para-oesophageal nodes. No distant FDG-avid disease.',
      interpretation: 'No distant metastases — potentially curable.',
      abnormal: true,
    },
    eus: {
      report: 'Tumour extends through the muscularis propria into the adventitia (T3), with two round, hypoechoic peri-oesophageal nodes (N1). Coeliac axis clear.',
      interpretation: 'T3 N1 M0 — locally advanced but potentially resectable.',
      abnormal: true,
    },
    'barium-swallow': {
      report: 'An irregular, shouldered (“apple-core”) stricture of the distal oesophagus with mucosal destruction and proximal dilatation.',
      interpretation: 'A malignant-looking stricture — but OGD with biopsy is still needed, so a barium swallow only adds a step.',
      abnormal: true,
    },
  },
  investigationRubric: {
    essential: [
      { id: 'ogd', why: '!Urgent direct-access OGD with biopsies is the first-line test for dysphagia (NICE NG12).' },
      { id: 'fbc', why: 'Anaemia from chronic blood loss.' },
      { id: 'ue', why: 'Baseline renal function before contrast CT.' },
      { id: 'lft', why: 'Liver involvement and nutritional state (albumin).' },
      { id: 'ct-cap', why: 'Staging: distant metastases change everything.' },
    ],
    helpful: [
      { id: 'pet-ct', why: 'Finds occult metastases in patients being considered for curative treatment.' },
      { id: 'eus', why: 'Defines the depth of invasion (T) and nodal (N) stage.' },
      { id: 'haematinics', why: 'Confirms iron deficiency.' },
    ],
  },
  diagnosis: {
    correct: 'oesophageal-cancer',
    differentials: ['peptic-stricture', 'achalasia', 'gastric-cancer', 'pharyngeal-pouch', 'gord'],
  },
  management: {
    essential: [
      { id: 'mdt', why: 'Every new cancer is discussed at the upper GI MDT to agree staging and treatment.' },
      { id: 'breaking-news', why: 'Break the news honestly, with his wife present if he wishes, and introduce a clinical nurse specialist.' },
      { id: 'nutrition', why: 'He has lost 10 kg: dietitian review, high-calorie supplements, and tube feeding (e.g. a feeding jejunostomy) if he cannot keep up.' },
      {
        id: 'oesophagectomy',
        why: '!For a fit patient with T3 N1 M0 adenocarcinoma: perioperative chemotherapy (e.g. FLOT) or neoadjuvant chemoradiotherapy, then oesophagectomy (e.g. Ivor Lewis).',
      },
    ],
    helpful: [{ id: 'iron', why: 'Correct the iron-deficiency anaemia before treatment (IV iron works faster).' }],
    avoid: [
      { id: 'oesophageal-stent', why: 'Stents palliate dysphagia in incurable disease. Before curative treatment they cause complications and can compromise surgery — feed through a tube instead if needed.' },
      { id: 'reassure', why: 'Progressive dysphagia with weight loss must never be put down to reflux.' },
      { id: 'discharge', why: 'He needs a cancer pathway, not discharge.' },
    ],
  },
  viva: [
    {
      id: 'nice',
      q: 'Under NICE NG12, who needs an urgent direct-access OGD (within 2 weeks) for suspected oesophageal or stomach cancer?',
      options: ['Anyone with dysphagia', 'Only people over 55 with dysphagia', 'Anyone with dyspepsia', 'Only people with dysphagia and weight loss'],
      correct: 0,
      answer: 'Anyone with dysphagia, at any age — or anyone aged 55 or over with weight loss plus upper abdominal pain, reflux or dyspepsia. Dysphagia is an alarm symptom on its own.',
      topic: 'Guidelines',
    },
    {
      id: 'pattern',
      q: 'How does the pattern of dysphagia help you tell a stricture from a motility disorder?',
      answer:
        'Mechanical obstruction (cancer, peptic stricture, rings) causes dysphagia to solids first, progressing to liquids; a short, relentlessly progressive history with weight loss suggests cancer. Motility disorders such as achalasia cause dysphagia to solids and liquids from the start, often intermittent and long-standing, with regurgitation of undigested food and night-time cough. A pharyngeal pouch causes high dysphagia, gurgling, halitosis and regurgitation of old food.',
      topic: 'History',
    },
    {
      id: 'barretts',
      q: 'What is Barrett’s oesophagus, and why does it matter?',
      answer:
        'The normal stratified squamous lining of the distal oesophagus is replaced by metaplastic columnar epithelium (usually with intestinal metaplasia) because of chronic reflux. It is the main precursor of oesophageal adenocarcinoma — the risk is a few per thousand per year without dysplasia, and higher with it — so patients have endoscopic surveillance with biopsies. Dysplasia and early cancer are treated endoscopically (resection and radiofrequency ablation).',
      topic: 'Pathology',
    },
    {
      id: 'types',
      q: 'Which risk factors point to oesophageal squamous cell carcinoma rather than adenocarcinoma?',
      options: ['Smoking and heavy alcohol', 'Obesity', 'Gastro-oesophageal reflux', 'Barrett’s oesophagus'],
      correct: 0,
      answer:
        'Squamous cell carcinoma affects the upper and middle oesophagus and is linked to smoking, alcohol, achalasia, caustic injury, Plummer–Vinson syndrome and very hot drinks. Adenocarcinoma — now the commonest type in the UK — affects the lower oesophagus and junction and is linked to reflux, Barrett’s, obesity, male sex and smoking.',
      topic: 'Epidemiology',
    },
    {
      id: 'staging',
      q: 'How would you stage this tumour, and what is the curative treatment?',
      answer:
        'CT chest, abdomen and pelvis for distant disease; PET-CT for occult metastases; endoscopic ultrasound for T and N stage; and staging laparoscopy for junctional tumours with a gastric component. Fit patients with locally advanced disease have perioperative chemotherapy (e.g. FLOT) or neoadjuvant chemoradiotherapy, then oesophagectomy — for example an Ivor Lewis (abdominal and right thoracic) approach. Fitness is assessed with cardiopulmonary exercise testing, and nutrition is optimised. Tumours confined to the mucosa can be resected endoscopically.',
      topic: 'Management',
    },
    {
      id: 'achalasia',
      q: 'Which finding is typical of achalasia?',
      options: [
        'A “bird’s beak” on barium swallow, with failure of the lower oesophageal sphincter to relax on manometry',
        'An irregular, shouldered “apple-core” stricture',
        'A “corkscrew” oesophagus',
        'A posterior outpouching just above cricopharyngeus',
      ],
      correct: 0,
      answer:
        'Achalasia is loss of the inhibitory neurons of the myenteric plexus: the lower oesophageal sphincter fails to relax and peristalsis is lost. Barium swallow shows a dilated oesophagus tapering to a “bird’s beak”, and high-resolution manometry is diagnostic. Always do an OGD to exclude a tumour at the cardia (pseudo-achalasia). An apple-core stricture suggests carcinoma, a corkscrew oesophagus suggests distal oesophageal spasm, and a posterior outpouching above cricopharyngeus is a pharyngeal pouch.',
      topic: 'Differentials',
    },
  ],
  teaching: {
    summary:
      'Oesophageal adenocarcinoma in a 66-year-old ex-smoker with Barrett’s oesophagus lost to surveillance: four months of progressive dysphagia, solids before liquids, with 10 kg weight loss, regurgitation and iron-deficiency anaemia — while his long-standing heartburn has improved.',
    keyFindings: [
      'Progressive dysphagia over 4 months: solids first, now soft food; liquids still pass',
      'Food sticks behind the lower sternum; regurgitation of undigested food',
      '10 kg weight loss with a preserved appetite',
      'Long-standing reflux and Barrett’s oesophagus without surveillance; 60 pack-year ex-smoker',
      'Cachexia, conjunctival pallor and angular cheilitis; no Virchow’s node, no hepatomegaly',
      'Microcytic anaemia with low ferritin and albumin',
    ],
    pearls: [
      'Dysphagia is an alarm symptom at any age — refer for urgent direct-access OGD.',
      'Solids progressing to liquids suggests a mechanical stricture; both from the start suggests a motility disorder.',
      'Heartburn that eases as dysphagia appears is a sinister combination.',
      'Always feel for a left supraclavicular (Virchow’s) node and an enlarged, irregular liver.',
      'Nutrition is part of cancer treatment — involve a dietitian early.',
    ],
    presentation:
      'Mr Lewis is a 66-year-old retired lorry driver referred with four months of progressive dysphagia, initially to solids and now to soft food, with food sticking behind the lower sternum, regurgitation of undigested food and about 10 kg of weight loss despite a good appetite. He has had reflux for over twenty years and was found to have Barrett’s oesophagus ten years ago but missed his surveillance; he is a 60 pack-year ex-smoker. On examination he is cachectic and pale with angular cheilitis; there is no supraclavicular lymphadenopathy, the abdomen is soft and non-tender with no masses or hepatomegaly, and rectal examination shows no melaena. He has a microcytic anaemia with low ferritin and albumin. The most likely diagnosis is oesophageal adenocarcinoma, and OGD confirmed a tumour at 35–39 cm arising in Barrett’s mucosa. I would complete staging with CT, PET-CT and EUS, discuss him at the upper GI MDT, optimise his nutrition and anaemia and, as he has T3 N1 M0 disease, offer neoadjuvant treatment followed by oesophagectomy if he is fit enough.',
    references: [
      'NICE NG12: Suspected cancer — recognition and referral (upper gastrointestinal tract cancers)',
      'British Society of Gastroenterology guidelines on the diagnosis and management of Barrett’s oesophagus',
      'Macleod’s Clinical Examination, 14th ed. — Ch. 6: the gastrointestinal system (dysphagia)',
    ],
  },
}

export default c
