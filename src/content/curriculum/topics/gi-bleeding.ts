import type { Topic } from '../types'

const t: Topic = {
  id: 'gi-bleeding',
  title: 'Gastrointestinal bleeding',
  short: 'GI bleeding',
  blurb:
    'Haematemesis, melaena and fresh rectal bleeding: resuscitate first, then risk-stratify (Glasgow–Blatchford, Rockall, Oakland), find the source with endoscopy or CT angiography, and stop it. The session separates peptic ulcer, variceal and lower GI bleeding, because their treatment differs.',
  keyPoints: [
    'ABCDE first: two large-bore cannulae, bloods including crossmatch, fluids then blood; restrictive transfusion (Hb < 70 g/L, < 80 with cardiac disease).',
    'Upper GI bleed: haematemesis (red or coffee-ground) and/or melaena (black, tarry, sticky, offensive). A raised urea out of proportion to creatinine supports an upper source.',
    'Glasgow–Blatchford score 0 → can be managed as an outpatient; endoscopy within 24 h for everyone else, immediately after resuscitation if unstable.',
    'Peptic ulcer is the commonest cause. Endoscopic dual therapy (adrenaline + clips/thermal) for high-risk stigmata (Forrest Ia–IIa), then high-dose PPI and H. pylori eradication.',
    'Suspected varices (liver disease): terlipressin + prophylactic antibiotics before endoscopy, then band ligation. Avoid over-transfusion.',
    'Lower GI bleed: diverticular disease is commonest. Oakland ≤ 8 → discharge; unstable (shock index > 1) → CT angiography → embolisation.',
  ],
  sections: [
    {
      id: 'definitions',
      title: 'Definitions and sources',
      items: [
        '**Upper GI bleeding**: proximal to the ligament of Treitz (duodenojejunal flexure). **Lower**: distal to it.',
        '**Haematemesis**: vomiting fresh blood or coffee grounds (blood altered by acid).',
        '**Melaena**: black, tarry, sticky, foul-smelling stool — at least ~50–100 mL of blood from an upper source (or small bowel/right colon). Distinguish from iron or bismuth (matt black, not sticky).',
        '**Haematochezia**: fresh red blood per rectum — usually lower GI, but a massive upper GI bleed can present this way (with shock and a high urea).',
      ],
      table: {
        head: ['Upper GI causes', 'Lower GI causes'],
        rows: [
          ['Peptic ulcer (commonest, ~35–50%)', 'Diverticular disease (commonest)'],
          ['Oesophagitis, gastritis, erosions', 'Angiodysplasia'],
          ['Oesophageal/gastric varices', 'Colorectal cancer and polyps'],
          ['Mallory–Weiss tear', 'Colitis — ischaemic, infective, inflammatory'],
          ['Upper GI cancer', 'Haemorrhoids, anal fissure'],
          ['Dieulafoy lesion, angiodysplasia, aorto-enteric fistula (previous aortic graft)', 'Post-polypectomy, Meckel’s diverticulum (young), radiation proctitis'],
        ],
      },
      source: 'Macleod’s 14e · Ch 6 · pp 100–101',
    },
    {
      id: 'history',
      title: 'History',
      items: [
        '**What and how much**: fresh blood or coffee grounds; preceded by retching (Mallory–Weiss); melaena; fresh blood mixed with or on the stool, on the paper (anal causes); number of episodes.',
        '**Haemodynamic symptoms**: dizziness, syncope, breathlessness, chest pain.',
        '**Cause clues**: dyspepsia, previous ulcers or bleeds, **NSAIDs, aspirin, steroids, SSRIs**, alcohol and liver disease (varices), weight loss and dysphagia (cancer), change in bowel habit (colorectal cancer), previous aortic surgery (aorto-enteric fistula).',
        '**Anticoagulants and antiplatelets**: warfarin, DOACs, clopidogrel — and why they are prescribed (valve, stent, AF).',
        '**Comorbidities**: heart failure, ischaemic heart disease, renal failure, malignancy — they change the risk scores and transfusion targets.',
      ],
      source: 'Macleod’s 14e · Ch 6 · pp 100–101',
    },
    {
      id: 'exam',
      title: 'Examination',
      kind: 'steps',
      items: [
        '**ABCDE and vital signs**: pulse, blood pressure, postural drop, capillary refill, respiratory rate, consciousness, urine output. Shock index = HR ÷ SBP (> 1 = significant bleeding).',
        '**General**: pallor, sweating, confusion; jaundice.',
        '**Hands**: cool peripheries, slow capillary refill, signs of chronic liver disease (palmar erythema, leuconychia, clubbing, Dupuytren’s), asterixis.',
        '**Face/chest**: conjunctival pallor, spider naevi, gynaecomastia, telangiectasia on lips (hereditary haemorrhagic telangiectasia).',
        '**Abdomen**: epigastric tenderness, hepatomegaly/splenomegaly, ascites, caput medusae (portal hypertension), masses, scars (previous aortic graft).',
        '**Digital rectal examination**: melaena on the glove vs fresh blood; masses, haemorrhoids.',
        '**Complete**: lymph nodes (Virchow’s), bedside urea and Hb.',
      ],
      source: 'Macleod’s 14e · Ch 6 · pp 103–104, 111–112 (Box 6.16)',
    },
    {
      id: 'scores',
      title: 'Risk scores and classification',
      items: [
        '**Glasgow–Blatchford score** (pre-endoscopy, need for intervention): blood urea, haemoglobin, systolic BP, pulse ≥ 100, melaena, syncope, hepatic disease, cardiac failure. **Score 0 (± 1) = low risk: outpatient endoscopy.**',
        '**Rockall score**: pre-endoscopy (age, shock, comorbidity; max 7) and complete (+ endoscopic diagnosis and stigmata; max 11) — predicts rebleeding and death.',
        '**AIMS65**: albumin < 30 g/L, INR > 1.5, altered mental state, SBP ≤ 90, age ≥ 65 — mortality.',
        '**Oakland score** (lower GI): age, sex, previous LGIB admission, DRE findings, HR, SBP, Hb. **≤ 8 = safe for discharge** and outpatient investigation.',
      ],
      table: {
        head: ['Forrest class', 'Endoscopic finding', 'Rebleeding risk (untreated)'],
        rows: [
          ['Ia', 'Spurting arterial bleeding', 'Very high (~90%)'],
          ['Ib', 'Oozing bleeding', 'High'],
          ['IIa', 'Non-bleeding visible vessel', 'High (~50%)'],
          ['IIb', 'Adherent clot', 'Intermediate (~30%)'],
          ['IIc', 'Flat pigmented spot', 'Low'],
          ['III', 'Clean ulcer base', 'Very low (< 5%)'],
        ],
      },
      note: 'Endoscopic therapy for Ia, Ib and IIa (consider removing the clot in IIb); IIc and III need only a PPI.',
      source: 'Macleod’s 14e · Ch 6 · p 101 (Box 6.5)',
    },
    {
      id: 'investigations',
      title: 'Investigations',
      items: [
        '**Bloods**: FBC (Hb may be normal initially — haemodilution takes hours), U&E (**urea ↑** from digested blood), LFT, **coagulation**, **group and crossmatch** (4–6 units if major), VBG/lactate.',
        '**OGD** within 24 h of presentation; immediately after resuscitation if unstable or variceal bleeding suspected.',
        '**CT angiography** for active bleeding not found/controlled at endoscopy, or for haemodynamically unstable lower GI bleeding — locates it for embolisation.',
        '**Colonoscopy** for lower GI bleeding once stable (bowel prep); flexible sigmoidoscopy/proctoscopy for bright-red outlet bleeding.',
        '**Capsule endoscopy** / CT enterography for obscure small-bowel bleeding.',
      ],
    },
    {
      id: 'management',
      title: 'Management',
      items: [
        {
          t: '**Resuscitation (all)**',
          sub: [
            'Airway protection if haematemesis with reduced consciousness; oxygen.',
            'Two large-bore cannulae; crystalloid while blood is prepared; **major haemorrhage protocol** if massive.',
            '**Restrictive transfusion**: transfuse at Hb < 70 g/L to target 70–90 (threshold 80 with cardiovascular disease); platelets if < 50 × 10⁹/L and bleeding; FFP if PT/APTT > 1.5× normal; prothrombin complex concentrate + vitamin K for warfarin; specific reversal for DOACs (idarucizumab, andexanet) if life-threatening.',
            'Hold anticoagulants/antiplatelets (discuss restarting aspirin early if for secondary prevention); catheter and fluid balance; NBM.',
          ],
        },
        {
          t: '**Non-variceal (peptic ulcer)**',
          sub: [
            'Endoscopic **dual therapy**: adrenaline injection + mechanical clips or thermal coagulation (or haemostatic powder) for high-risk stigmata.',
            '**PPI after endoscopy** (high-dose IV for 72 h after haemostasis); not routinely before endoscopy (NICE).',
            'Test and eradicate **H. pylori**; stop NSAIDs.',
            'Rebleeding: repeat endoscopy → **interventional radiology embolisation** (gastroduodenal artery) → surgery (under-run the ulcer).',
          ],
        },
        {
          t: '**Variceal bleeding**',
          sub: [
            '**Terlipressin** (splanchnic vasoconstriction) and **prophylactic IV antibiotics** (reduce infection and mortality) before endoscopy.',
            '**Band ligation** for oesophageal varices; cyanoacrylate glue injection for gastric varices.',
            'Uncontrolled: **Sengstaken–Blakemore tube** as a bridge, then **TIPS**.',
            'Avoid over-transfusion (raises portal pressure); lactulose to prevent encephalopathy.',
            'Secondary prevention: non-selective β-blocker (propranolol/carvedilol) + banding programme.',
          ],
        },
        {
          t: '**Lower GI bleeding**',
          sub: [
            'Most stop spontaneously. Stable, Oakland ≤ 8 → discharge and outpatient colonoscopy.',
            'Major but stable → inpatient colonoscopy. Unstable (shock index > 1) → **CT angiography → catheter embolisation**; if CTA negative, OGD (a brisk upper bleed may be the cause).',
            'Laparotomy (ideally with the source localised) only if all else fails.',
          ],
        },
      ],
    },
  ],
  cases: ['bleeding-du', 'variceal-bleed', 'diverticular-bleed'],
  qa: [
    { q: 'How do you manage an upper GI bleed?', a: 'ABCDE: protect the airway, oxygen, two large-bore cannulae, bloods (FBC, U&E, LFT, coagulation, crossmatch, VBG), fluids then blood with a restrictive threshold (Hb < 70 g/L; < 80 with cardiac disease), correct coagulopathy, hold anticoagulants/antiplatelets. Risk-stratify (Glasgow–Blatchford, Rockall). If variceal bleeding is suspected: terlipressin + IV antibiotics. OGD within 24 h (immediately after resuscitation if unstable) with endoscopic therapy; high-dose PPI after endoscopy for ulcers; H. pylori eradication. Rebleeding: repeat endoscopy, embolisation or surgery.', k: ['UGIB management', 'haematemesis management', 'melaena management'] },
    { q: 'How do you define upper vs lower GI bleeding?', a: 'Upper GI bleeding arises proximal to the ligament of Treitz (duodenojejunal flexure); lower GI bleeding distal to it. Upper presents with haematemesis and/or melaena; lower with fresh/maroon rectal bleeding — though a massive upper bleed can cause haematochezia.', k: ['ligament of Treitz', 'UGIB', 'LGIB'] },
    { q: 'What are the causes of upper GI bleeding?', a: 'Peptic ulcer (commonest), oesophagitis/gastritis/duodenitis and erosions, oesophageal and gastric varices, Mallory–Weiss tear, upper GI malignancy, Dieulafoy lesion, angiodysplasia/GAVE, aorto-enteric fistula, haemobilia.', k: ['haematemesis causes'] },
    { q: 'What are the causes of lower GI bleeding?', a: 'Diverticular disease (commonest in adults), angiodysplasia, colorectal cancer and polyps, colitis (ischaemic, infective, IBD), haemorrhoids and fissure, post-polypectomy bleeding, radiation proctitis, Meckel’s diverticulum (young patients).', k: ['rectal bleeding causes'] },
    { q: 'What is melaena and how do you distinguish it from iron-stained stool?', a: 'Black, tarry, sticky, shiny stool with a characteristic offensive smell, from digested blood (usually an upper GI source). Iron or bismuth produce matt black/grey-green, formed stools without the stickiness or smell.' },
    { q: 'Why is urea raised in upper GI bleeding?', a: 'Blood proteins are digested and absorbed in the small bowel, and urea is generated in the liver; hypovolaemia also reduces renal clearance. A urea disproportionately high relative to creatinine suggests an upper GI source.' },
    { q: 'What is the Glasgow–Blatchford score?', a: 'A pre-endoscopy score predicting the need for intervention (transfusion, endoscopic therapy, surgery) using urea, haemoglobin, systolic BP, pulse, melaena, syncope, hepatic disease and cardiac failure. A score of 0 (or 1 per some guidelines) identifies low-risk patients suitable for outpatient management.', k: ['GBS', 'Blatchford'] },
    { q: 'What is the Rockall score?', a: 'Predicts rebleeding and mortality in upper GI bleeding. Pre-endoscopy: age, shock (HR, SBP), comorbidity (max 7). Complete (post-endoscopy) adds the endoscopic diagnosis and stigmata of recent haemorrhage (max 11). A complete score ≥ 8 carries ~25% mortality.' },
    { q: 'What is the Forrest classification?', a: 'Endoscopic classification of bleeding peptic ulcers by rebleeding risk: Ia spurting, Ib oozing, IIa non-bleeding visible vessel, IIb adherent clot, IIc flat pigmented spot, III clean base. Ia–IIa need endoscopic therapy; IIb consider clot removal; IIc–III PPI only.', k: ['stigmata of recent haemorrhage'] },
    { q: 'What is the Oakland score?', a: 'A risk score for lower GI bleeding (age, sex, previous LGIB admission, DRE blood, heart rate, systolic BP, haemoglobin). A score of ≤ 8 predicts a > 95% chance of safe discharge for outpatient investigation.' },
    { q: 'What transfusion threshold do you use in GI bleeding?', a: 'Restrictive: transfuse when Hb < 70 g/L, aiming for 70–90 g/L; use < 80 g/L in patients with cardiovascular disease. Liberal transfusion increases rebleeding and mortality, especially in variceal bleeding. Massive haemorrhage follows the major haemorrhage protocol (balanced red cells, plasma, platelets).', k: ['blood transfusion'] },
    { q: 'When should endoscopy be done in upper GI bleeding?', a: 'Within 24 hours of presentation for all except low-risk (Blatchford 0) patients; immediately after resuscitation in unstable patients or suspected variceal bleeding.' },
    { q: 'How is a bleeding peptic ulcer treated endoscopically?', a: 'Dual therapy for high-risk stigmata: adrenaline (1:10 000) injection combined with a mechanical method (clips) or thermal coagulation (heater probe/bipolar); haemostatic powder as an adjunct/rescue. Adrenaline alone is not enough.' },
    { q: 'When do you give a PPI in upper GI bleeding?', a: 'After endoscopy: high-dose IV PPI (e.g. 80 mg bolus + infusion or intermittent high dose) for 72 hours after endoscopic haemostasis of high-risk ulcers, then oral. NICE advises against PPI before endoscopy (it does not change outcomes), though many give it while awaiting a delayed endoscopy.' },
    { q: 'What do you do if an ulcer rebleeds after endoscopic therapy?', a: 'Resuscitate and repeat endoscopy with further haemostasis. If that fails: interventional radiology embolisation (e.g. gastroduodenal artery for a posterior DU) — or surgery: laparotomy, duodenotomy and under-running of the bleeding vessel.' },
    { q: 'Which artery bleeds from a posterior duodenal ulcer?', a: 'The gastroduodenal artery, which runs behind the first part of the duodenum. Anterior duodenal ulcers tend to perforate; posterior ulcers tend to bleed.', k: ['gastroduodenal artery'] },
    { q: 'How do you manage a suspected variceal bleed?', a: 'ABCDE (airway protection if needed), restrictive transfusion, correct clotting judiciously; terlipressin and prophylactic IV antibiotics before endoscopy; urgent OGD with band ligation (oesophageal) or cyanoacrylate injection (gastric). If uncontrolled: Sengstaken–Blakemore tube, then TIPS. Lactulose; then β-blocker and banding programme.', k: ['oesophageal varices', 'terlipressin'] },
    { q: 'Why give antibiotics in variceal bleeding?', a: 'Bacterial infection is common in cirrhotic patients with GI bleeding and precipitates rebleeding, encephalopathy, renal failure and death. Prophylactic antibiotics (e.g. ceftriaxone or ciprofloxacin per local policy) reduce infection, rebleeding and mortality.' },
    { q: 'What is a Sengstaken–Blakemore tube?', a: 'A balloon tamponade tube for uncontrolled variceal bleeding: a gastric balloon (inflated and pulled against the cardia) ± an oesophageal balloon, with aspiration ports. A temporary bridge (< 24 h) to TIPS or definitive endoscopy; risks aspiration, oesophageal necrosis/rupture. Protect the airway first.', k: ['balloon tamponade', 'Minnesota tube'] },
    { q: 'What is TIPS?', a: 'Transjugular intrahepatic portosystemic shunt: a stent placed via the jugular vein between a hepatic vein and the portal vein, lowering portal pressure. Used for refractory variceal bleeding and refractory ascites; risk of hepatic encephalopathy.' },
    { q: 'What is a Mallory–Weiss tear?', a: 'A longitudinal mucosal tear at the gastro-oesophageal junction after forceful retching/vomiting (often alcohol). Haematemesis follows several bouts of vomiting. Usually stops spontaneously; endoscopic therapy if active. Contrast with Boerhaave’s (full-thickness rupture).' },
    { q: 'How do you manage a major lower GI bleed?', a: 'Resuscitate; calculate the shock index. Unstable (shock index > 1): CT angiography to localise, then catheter embolisation; if CTA negative, urgent OGD to exclude an upper source. Stable major bleed: colonoscopy during admission. Surgery is a last resort, ideally after localisation.' },
    { q: 'What is angiodysplasia?', a: 'Dilated, tortuous submucosal vessels, typically in the caecum/right colon of elderly patients; causes recurrent painless bleeding or iron-deficiency anaemia. Associated with aortic stenosis (Heyde’s syndrome). Treated with argon plasma coagulation at endoscopy, embolisation or resection.', k: ['Heyde syndrome'] },
    { q: 'What is an aorto-enteric fistula?', a: 'A communication between the aorta (usually a previous aortic graft) and the bowel (usually the third/fourth part of the duodenum). A small “herald bleed” may precede catastrophic haemorrhage — suspect in any GI bleed after aortic surgery; CT angiography.' },
    { q: 'How do you manage antiplatelets and anticoagulants in GI bleeding?', a: 'Withhold during active bleeding; reverse warfarin with prothrombin complex concentrate + IV vitamin K, DOACs with specific agents if life-threatening. Restart aspirin for secondary prevention as soon as haemostasis is achieved (usually within days) — discuss with cardiology for stents.' },
  ],
}

export default t
