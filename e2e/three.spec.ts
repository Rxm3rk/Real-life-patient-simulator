import { expect, test, type Page } from '@playwright/test'

// The 3D patients. CI runners have no GPU, so WebGL runs in SwiftShader: allow it,
// and tell the app to draw in 3D anyway (it defaults to the illustrations on a software GPU).
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } })
test.setTimeout(180_000)
// software rendering is slow; one viewport is enough to prove the 3D path works end to end
test.skip(({ isMobile }) => isMobile, 'desktop only')

async function fresh3d(page: Page, hash: string) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/#/')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('bedside.force3d', '1')
    // the 3D examination is opt-in
    localStorage.setItem('bedside.settings', JSON.stringify({ state: { exam3d: true }, version: 1 }))
  })
  await page.goto(`/#${hash}`)
  // start the app afresh so it reads the stored preference
  await page.reload()
  return errors
}

async function tap(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).last().click()
}

test('examine the abdomen on the 3D patient', async ({ page }) => {
  const errors = await fresh3d(page, '/case/appendicitis')
  await tap(page, /Practice/)
  await tap(page, /See the patient/)
  await page.getByRole('button', { name: /^Examine$/ }).first().click()
  const stage = page.getByRole('img', { name: /Drag to look around/ })
  await expect(stage).toHaveClass(/opacity-100/, { timeout: 90_000 })
  for (const b of [/^Hand hygiene/, /^Introduce/, /^Consent/, /^Any pain\?/, /^Expose/]) await tap(page, b)
  await page.getByRole('button', { name: /^Abdomen$/ }).first().click()
  await page.getByRole('button', { name: /^Light$/ }).first().click()
  await page.getByRole('button', { name: 'Umbilical', exact: true }).first().click()
  await expect(page.getByText(/umbilical region/i).first()).toBeVisible()
  // the scene is still alive after the camera moves
  await expect(stage).toBeVisible()
  expect(errors).toEqual([])
})

test('signs atlas shows a sign on a 3D patient', async ({ page }) => {
  const errors = await fresh3d(page, '/learn/signs/goitre')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('img', { name: /A patient showing the sign: goitre/ })).toHaveClass(/opacity-100/, { timeout: 90_000 })
  await dialog.getByRole('button', { name: /Swallow/ }).click()
  await expect(dialog.getByRole('img', { name: /A patient showing the sign: goitre/ })).toBeVisible()
  expect(errors).toEqual([])
})
