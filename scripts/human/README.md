# 3D patients: the offline bake

The 3D patients are generated from **MakeHuman** assets. The base mesh, body-shape targets, expression units, skeleton and skin weights all come from MakeHuman and MPFB2, and all of them are released under **CC0 1.0** (public domain). No MakeHuman or MPFB2 program code is used.

This folder turns those assets into the compact files the app loads from `src/assets/human/`:

| Output | What it holds |
| --- | --- |
| `base.bin` | Shared topology, UVs and skin weights (a 53-bone game-engine skeleton). Also the face-expression and abdominal morphs, the per-vertex occlusion, flush, eyelid, body-hair and scalp fields, and the landmark vertices. |
| `bodies/<key>.bin` | One body per patient: the exact MakeHuman macro shape for their sex, age, build and ancestry, the fitted skeleton and the eye positions |
| `regionsA.png`, `regionsB.png` | Skin region maps: eyebrows, beard area, scalp hairline, lips, areolae, nails, palms and soles |

All binary files are deflate-compressed.

## Re-baking

Only needed after changing a patient's appearance in a case file, or after changing the bake itself.

```bash
# 1. local copies of the CC0 sources (read-only; nothing from them is committed except the outputs)
git clone --depth 1 https://github.com/makehumancommunity/makehuman ../makehuman
git clone --depth 1 https://github.com/makehumancommunity/mpfb2 ../mpfb2

# 2. tooling (sharp, for the region maps)
cd scripts/human && npm install && cd ../..

# 3. export appearances from the case files, then bake
node scripts/human/appearances.mjs
MH_DATA=../makehuman/makehuman/data MPFB_DATA=../mpfb2/src/mpfb/data node scripts/human/bake.mjs
```

The first bake computes per-vertex ambient occlusion by ray tracing, which takes about 5 minutes. The result is cached in `.cache/`, so later bakes take a few seconds.

The mapping from a patient's appearance to MakeHuman's macro settings lives in `src/anatomy3d/macro.ts`. The bake and the app share it, so a patient always loads the body baked for them. An appearance that hasn't been baked falls back to the nearest baked body.

## Portraits

Each case's patient also has a pre-rendered 3D portrait (`src/assets/portraits/<case>.webp`), used for avatars on the home screen, the ward and in the header. Re-render them after changing a patient's appearance or the skin, hair or lighting. With the dev server running:

```bash
npm run dev &
node scripts/human/portraits.mjs            # every case
node scripts/human/portraits.mjs lipoma mng # just these
```

The script opens `/#/lab/portrait?case=<id>` in Chromium through Playwright and saves a transparent 192 × 192 WebP. Set `CHROMIUM` to a Chromium binary if it isn't at `/opt/pw-browsers/chromium`.
