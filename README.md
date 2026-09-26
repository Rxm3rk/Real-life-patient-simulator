# Bedside — surgical patient simulator

Bedside is a general-surgery patient simulator for final-year students. You take a history, then examine the patient step by step in Macleod's order: you wash your hands, gain consent, expose, look, feel and listen. The patient responds as you go. Each encounter finishes with investigations, a management plan, examiner viva questions and a marked OSCE debrief.

It runs in the browser on phones, tablets and laptops, works offline once it has loaded, and can be installed to the home screen as an app.

> **Educational use only.** The cases are simulated and the content is simplified for exam preparation. Nothing here is medical advice or a substitute for clinical supervision.

## What's inside

### 29 patients on the ward

| Examination | Cases |
| --- | --- |
| Abdomen | Appendicitis, acute cholecystitis, small-bowel obstruction from a femoral hernia, perforated duodenal ulcer, acute pancreatitis, diverticulitis, ascending cholangitis, ruptured AAA, mesenteric ischaemia, pancreatic cancer, caecal cancer, chronic liver disease (OSCE), ileostomy (OSCE) |
| Groin | Indirect inguinal hernia, irreducible femoral hernia, direct inguinal hernia |
| Lump | Lipoma, epidermoid cyst |
| Thyroid & neck | Graves' disease, multinodular goitre, thyroglossal cyst |
| Breast | Fibroadenoma, breast carcinoma |
| Peripheral arterial | Chronic limb-threatening ischaemia, intermittent claudication |
| Varicose veins | Venous ulcer with varicose veins |
| Scrotum | Testicular torsion, hydrocele, testicular tumour |

Each case covers some or all of five parts:

1. **History.** Type or dictate your questions in free text and the patient answers in character. SOCRATES, systems review, PMH, drugs, allergies, family and social history, and ICE are all tracked.
2. **Examination.** The patient is drawn anatomically and changes as you examine. They cough, stand, swallow, stick out their tongue, raise their arms, wince when you palpate the tender spot, and turn pale when you raise the leg. Some steps are hands-on:
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

### Learn

- **Routines.** The Macleod's sequence for all eight examinations, with the reasoning behind each step.
- **Drills.** Put the steps in order, one chunk at a time, one section at a time, or the whole routine.
- **Signs atlas.** 26 signs, drawn by the same anatomy engine, with what each one means and how to elicit it.
- **Scar atlas.** The classic abdominal incisions, with an explore mode and a quiz.
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

No textbook text or figures are reproduced. The repository deliberately ignores `*.pdf` so that a copy of the book can never be committed by accident.

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

This writes `dist-single/index.html`, a self-contained file of about 1.8 MB with no server needed. You can send it over WhatsApp or email, or put it on a USB stick. It opens by double-clicking. Progress is saved in whichever browser opens it.

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
| `npm run e2e` | End-to-end tests (Playwright) on a desktop and a phone viewport |

The first time you run the end-to-end tests on a new machine, install a browser with `npx playwright install chromium`.

## How it's built

- **React 19, TypeScript and Vite.** Styling is Tailwind CSS v4, with light and dark themes. Animation uses Motion. State lives in Zustand and is persisted to `localStorage`.
- **The anatomy is parametric SVG** (`src/anatomy/`). Every patient is generated from an appearance description (sex, age, habitus, skin tone, hair) plus the case's signs, so the same renderer draws a goitre, a hernia, an ulcer or a scar. Nothing is a stock photo.
- **The examination engine** (`src/engine/`) defines each station's actions, its steps in Macleod's order, the order rules and the normal findings. Each case overrides only what is abnormal, which keeps the cases short and consistent.
- **Audio** (bowel sounds, bruits, Doppler signals, the monitor tone) is synthesised with the Web Audio API.
- **Offline support.** A Workbox service worker precaches the app.

### Adding a case

1. Create a file in `src/content/cases/` that exports a `CaseDef`. Copy a case that uses the same examination.
2. Register it in `src/content/cases/index.ts`.
3. Run `npm test`. The case-integrity tests check that every history question, investigation, diagnosis, management option and examination finding the case refers to actually exists, and that each multiple-choice answer is valid.

## Licence and disclaimer

This project is for personal and educational use. Clinical content is simplified for teaching. Always follow local guidelines and senior advice in real practice.
