# Bedside — surgical patient simulator

Bedside is a general-surgery patient simulator for final-year students. You take a history, then examine the patient step by step in Macleod's order: you wash your hands, gain consent, expose, look, feel and listen. The patient responds as you go. Each encounter finishes with investigations, a management plan, examiner viva questions and a marked OSCE debrief.

The patients are lifelike 3D people you can turn, zoom and examine by touch. It runs in the browser on phones, tablets and laptops, works offline once it has loaded, and can be installed to the home screen as an app.

> **Educational use only.** The cases are simulated and the content is simplified for exam preparation. Nothing here is medical advice or a substitute for clinical supervision.

## What's inside

### Today: your clinical sessions

The home page follows the general-surgery session schedule: six days, two sessions a day, twelve topics. Pick the day you are on and both sessions appear with their key points and patients.

| Day | Session 1 (8:30–10:30) | Session 2 (11:00–1:00) |
| --- | --- | --- |
| 1 | Bariatric surgery | Complicated hernia |
| 2 | Acute abdomen | Abdominal distension |
| 3 | Breast lump & nipple discharge | Dysphagia and heartburn |
| 4 | Right hypochondrial pain & jaundice | Gastrointestinal bleeding |
| 5 | Pre- & post-operative care | Epigastric pain |
| 6 | Neck lump | Painful perianal conditions |

- **Topic guides.** Each topic has key points, the history and the Macleod's examination for it (with page references), tables, investigations and management, and about 25 questions the doctors ask, with a hide-answers mode and stars.
- **Case cards.** A one-page summary of any patient for the ten minutes before a session: vital signs, what you find, the diagnosis and differentials, investigations with their results, management, how to present the case, pearls and the viva. A quiz mode hides the answers until you tap.
- **Ask.** When a doctor asks you something, type it into the search bar on Today or on the Ask page. It searches every question, guide point and case as you type, offline. It understands abbreviations (UGIB, GORD, DRE), British and American spellings and small typos, and can be limited to one topic or today's sessions. Press `/` on a laptop to jump to it.

### 46 patients on the ward

The ward is grouped by session topic. Stations outside the schedule (vascular, scrotal, lumps) are kept in their own section for OSCE practice.

| Examination | Cases |
| --- | --- |
| Abdomen | Appendicitis, acute cholecystitis, small-bowel obstruction from a femoral hernia, strangulated inguinal hernia, perforated duodenal ulcer, bleeding duodenal ulcer, variceal bleed, diverticular bleed, acute pancreatitis, diverticulitis, ascending cholangitis, hydatid cyst of the liver, ruptured AAA, mesenteric ischaemia, sigmoid volvulus, pancreatic cancer, caecal cancer, gastric cancer, oesophageal cancer, achalasia, leak after sleeve gastrectomy, bariatric assessment, anastomotic leak after bowel surgery, chronic liver disease (OSCE), ileostomy (OSCE) |
| Groin | Indirect inguinal hernia, irreducible femoral hernia, direct inguinal hernia |
| Perianal & rectal | Perianal abscess, anal fissure, thrombosed haemorrhoids |
| Lump | Lipoma, epidermoid cyst |
| Thyroid & neck | Graves' disease, multinodular goitre, thyroglossal cyst, papillary thyroid carcinoma |
| Breast | Fibroadenoma, breast carcinoma, intraductal papilloma |
| Peripheral arterial | Chronic limb-threatening ischaemia, intermittent claudication |
| Varicose veins | Venous ulcer with varicose veins |
| Scrotum | Testicular torsion, hydrocele, testicular tumour |

Each case covers some or all of five parts:

1. **History.** Type or dictate your questions in free text and the patient answers in character. SOCRATES, systems review, PMH, drugs, allergies, family and social history, and ICE are all tracked.
2. **Examination.** The patient is a 3D model on a bed, couch or chair, and changes as you examine. They cough, stand, swallow, stick out their tongue, raise their arms, wince when you palpate the tender spot, and turn pale when you raise the leg. Some steps are hands-on:
   - count a pulse against the clock
   - listen for bruits and bowel sounds
   - run a hand-held Doppler, with synthesised triphasic, biphasic and monophasic signals and venous reflux on calf squeeze
   - do Buerger's test with an elevation slider
   - apply a tourniquet test
   - measure and transilluminate a lump
   - reduce a hernia and occlude the deep ring
3. **Investigations.** Order tests and read the results.
4. **Diagnosis and plan.** Commit to a diagnosis and a management plan.
5. **Viva.** Answer the questions an examiner would ask, as open answers or multiple choice.

Your **debrief** marks the encounter the way an OSCE examiner would. You get domain scores, missed critical steps, steps done out of order (for example palpating before you inspected), and a global grade.

### 3D patients

Every patient is a full 3D person built from their case: sex, age, build, skin tone and hair. Their signs are on the body itself, and they move the way the examination needs:

- **You examine by touch.** Tap a region to palpate or percuss it, and your hand presses into the abdomen. Listen with a stethoscope, feel a pulse, and press a pitting ankle.
- **The signs are real shapes on the skin.** A hernia bulges and swells on coughing, a goitre rises when the patient swallows, and a thyroglossal cyst moves when they stick their tongue out. Breast lumps tether the skin, lumps stand proud and transilluminate, varicose veins fill on standing, and ulcers, gangrene, scars, stomas, jaundice, caput medusae and Cullen's sign all appear.
- **The patient is placed for each part of the examination.** They lie flat at 45° or 0°, sit on the edge of the bed, stand, turn round, raise their arms or rest their hands on their hips. The camera moves to each view. On a phone it looks down from the foot of the bed, so the patient reads head-up like a chart.
- **The face stays in view.** A picture-in-picture inset shows the face while you palpate, so you can watch for a wince.
- **The bedside is set up for each case**, with a cannula and drip, oxygen, a catheter bag, a vomit bowl and an observations chart where they belong.
- **You talk to them in 3D.** During history taking on a laptop, or a tablet held sideways, you talk to the patient in 3D.
- **Every case has a portrait**, a pre-rendered 3D image used as the patient's avatar.

The scrotal and perianal examinations keep their illustrated close-ups. The perianal one is drawn on the lithotomy clock face (12 o'clock anterior) used to document findings. The 3D patients need WebGL 2 and are loaded only when you first see one. A device without graphics acceleration defaults to the lighter illustrated patients. You can switch between the two under **Settings → 3D patients**.

### Learn

- **Routines.** The Macleod's sequence for all nine examinations, with the reasoning behind each step.
- **Drills.** Put the steps in order, one chunk at a time, one section at a time, or the whole routine.
- **Signs atlas.** 26 signs, with what each one means and how to elicit it. 18 of them can be shown on a 3D patient you can turn round, with buttons to make the patient cough, swallow, stick out their tongue or raise their arms. The rest are illustrated.
- **Scar atlas.** The classic abdominal incisions on a 3D torso, with an explore mode and a quiz.
- **Viva flashcards.** 120 examiner questions, served weakest first.

### OSCE mode

- **Timed circuits** of 3, 5 or 8 stations, with a minute of reading time and a bell. Circuits can be examination-only, history-only or mixed.
- **Circuit results** at the end, with a pass or fail for each station.
- **Challenge links** so you can send a friend the exact same circuit.
- **A peer examiner mark sheet**, so one friend can examine another in person using a real OSCE checklist.

### Progress

The progress page charts your recent scores, your average in each marking domain and the steps you miss most often. It also lists every attempt so you can reopen its debrief. Everything is stored locally in your browser. You can export your progress to a file and import it on another device from **Settings**.

## Sources

The examination routines follow the sequences taught in **Macleod's Clinical Examination (14th edition)**, supplemented by current UK guidance. That guidance includes NICE (NG12 suspected cancer, CG188 gallstones, NG104 pancreatitis, NG147 diverticular disease, NG156 abdominal aortic aneurysm, CG147 peripheral arterial disease, CG168 varicose veins, NG145 thyroid disease, NG101 breast cancer), British Thyroid Association guidance, the HerniaSurge international guidelines, European Association of Urology guidance on the acute scrotum and testicular cancer, and the European Society for Vascular Surgery / Global Vascular Guidelines on CLTI.

No textbook text or figures are reproduced in the app: the guides paraphrase the examination sequences and cite page numbers. `.gitignore` excludes `*.pdf`, but that does not stop a file uploaded through GitHub's website.

## Share it with friends

### Option 1: GitHub Pages (recommended)

This repository ships a workflow (`.github/workflows/pages.yml`) that publishes the simulator as a website. Enable it once:

1. On GitHub, open the repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Re-run the **Deploy to GitHub Pages** workflow from the **Actions** tab, or push any commit.

The site is then served at `https://rxm3rk.github.io/Real-life-patient-simulator/`. Send that link to friends. On a phone, open it and choose **Add to Home Screen** to install it like an app.

Until Pages is enabled, the workflow skips deployment and doesn't fail.

### Option 2: a single HTML file

```bash
npm run build:single
```

This writes `dist-single/index.html`, a self-contained file of about 7 MB, 3D patients included, with no server needed. You can send it over WhatsApp or email, or put it on a USB stick. It opens by double-clicking. Progress is saved in whichever browser opens it.

### Option 3: any static host

`npm run build` writes a normal static site to `dist/`, which works on Netlify, Vercel, Cloudflare Pages or any web server. All paths are relative, so it also works from a sub-folder.

## Run it locally

You need Node.js 22 (or 20.19 or newer).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build the installable PWA into `dist/` |
| `npm run build:single` | Build the single-file version into `dist-single/` |
| `npm run build:embed` | Build the single file for sites that run pages inside a locked-down frame, into `dist-embed/`. Dictation is hidden and progress moves by copy and paste instead of a file download. Set `VITE_SHARE_URL` to the page's public address so share links point there. |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript project check |
| `npm run lint` | oxlint |
| `npm test` | Unit tests (Vitest) for case data integrity, history matching and scoring |
| `npm run e2e` | End-to-end tests (Playwright) on a desktop and a phone viewport, including the 3D patients (drawn in software on machines without a GPU) |

The first time you run the end-to-end tests on a new machine, install a browser with `npx playwright install chromium`.

## How it's built

- **React 19, TypeScript and Vite.** Styling is Tailwind CSS v4, with light and dark themes. Animation uses Motion. State lives in Zustand and is persisted to `localStorage`.
- **The 3D patients** (`src/anatomy3d/`) use three.js. Each body is baked offline from the CC0 MakeHuman base mesh and rig to match the patient's appearance (see `scripts/human/README.md`). The skin, hair, gowns, bedding and props are generated at runtime. The clinical signs are drawn in the skin shader: swellings displace the surface, while patches, scars, veins and the region grid are painted on. Poses come from the rig, and the camera frames each step. Nothing is a stock photo or a hand-made model.
- **The illustrated patients are parametric SVG** (`src/anatomy/`), drawn from the same appearance description and signs. They are the fallback when 3D isn't available, and the examination logic works in their coordinates. A tap on the 3D body is mapped back into them.
- **The examination engine** (`src/engine/`) defines each station's actions, its steps in Macleod's order, the order rules and the normal findings. Each case overrides only what is abnormal, which keeps the cases short and consistent.
- **Audio** (bowel sounds, bruits, Doppler signals, the monitor tone) is synthesised with the Web Audio API.
- **Offline support.** A Workbox service worker precaches the app.

### Adding a case

1. Create a file in `src/content/cases/` that exports a `CaseDef`. Copy a case that uses the same examination.
2. Register it in `src/content/cases/index.ts`.
3. Run `npm test`. The case-integrity tests check that every history question, investigation, diagnosis, management option and examination finding the case refers to actually exists, and that each multiple-choice answer is valid.

## Licence and disclaimer

The 3D human base mesh, shape targets, expressions and rig come from [MakeHuman](http://www.makehumancommunity.org/) and [MPFB2](https://github.com/makehumancommunity/mpfb2) assets released under CC0 1.0. None of their program code is used.

This project is for personal and educational use. Clinical content is simplified for teaching. Always follow local guidelines and senior advice in real practice.
