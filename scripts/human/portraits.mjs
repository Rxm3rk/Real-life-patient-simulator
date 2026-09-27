// Renders a 3D head-and-shoulders portrait of every case's patient into src/assets/portraits/<id>.webp.
// Needs the dev server (npm run dev) on http://127.0.0.1:5173 and a Chromium for Playwright.
//   node scripts/human/portraits.mjs [caseId…]
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const out = new URL('../../src/assets/portraits/', import.meta.url)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.error('page error', String(e)))
await page.goto(`${base}/#/lab/portrait`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__caseIds, null, { timeout: 60000 })
const ids = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => window.__caseIds)
for (const id of ids) {
  // rendered at 512 px and scaled down: smooth hair edges without a GPU's multisampling
  await page.goto(`${base}/#/lab/portrait?case=${id}&size=512`, { waitUntil: 'load' })
  await page.waitForFunction((want) => document.querySelector('[data-status]')?.getAttribute('data-status') === `ready:${want}`, id, { timeout: 120000 })
  const png = await page.locator('canvas[data-portrait]').screenshot({ omitBackground: true })
  await sharp(png).resize(192, 192).webp({ quality: 82, alphaQuality: 90 }).toFile(new URL(`${id}.webp`, out).pathname)
  console.log('portrait', id)
}
await browser.close()
