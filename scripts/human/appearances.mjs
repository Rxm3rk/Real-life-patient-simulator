// Dump every patient's appearance (from the case files) plus the extra bodies the
// Learn atlases use, so the offline bake knows which bodies to build.
// Run from the repository root: node scripts/human/appearances.mjs
import { writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
try {
  const { CASES, loadCase } = await server.ssrLoadModule('/src/content/cases/index.ts')
  const { ATLAS_APPEARANCES } = await server.ssrLoadModule('/src/anatomy3d/atlasBodies.ts')
  const out = {}
  for (const m of CASES) {
    const c = await loadCase(m.id)
    out[`case:${m.id}`] = c.patient.appearance
  }
  for (const [id, a] of Object.entries(ATLAS_APPEARANCES)) out[`atlas:${id}`] = a
  writeFileSync(new URL('./appearances.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
  console.log(`wrote ${Object.keys(out).length} appearances`)
} finally {
  await server.close()
}
