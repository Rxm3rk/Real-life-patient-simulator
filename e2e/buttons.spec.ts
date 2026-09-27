import { expect, test, type Page } from '@playwright/test'

// Examination buttons must respond however quickly they're pressed, and must not move under a finger.

async function examine(page: Page, caseId: string) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/#/')
  await page.evaluate(() => localStorage.clear())
  await page.goto(`/#/case/${caseId}`)
  await page.getByRole('button', { name: /Practice/ }).last().click()
  await page.getByRole('button', { name: /See the patient|Enter the station/ }).last().click()
  await page.getByRole('button', { name: /^Examine$/ }).first().click()
  return errors
}

const action = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).first()
const ticked = (page: Page, name: string) => action(page, name).locator('.bg-success')

async function prepare(page: Page, names: string[]) {
  for (const n of names) await page.getByRole('button', { name: new RegExp(`^${n}`) }).last().click()
}

test('abdominal manoeuvres pressed in quick succession are all performed', async ({ page }) => {
  const errors = await examine(page, 'appendicitis')
  await prepare(page, ['Hand hygiene', 'Introduce', 'Consent', 'Expose'])
  await page.getByRole('button', { name: /^Abdomen$/ }).first().click()
  // scripted manoeuvres and a stethoscope, each pressed before the last has finished
  const steps = ['Murphy’s', 'Murphy’s (L)', 'Spleen', 'Bowel sounds', 'Kidneys']
  for (const n of steps) await action(page, n).click()
  for (const n of steps) await expect(ticked(page, n)).toHaveCount(1, { timeout: 8000 })
  expect(errors).toEqual([])
})

test('station manoeuvres pressed in quick succession are all performed', async ({ page }) => {
  const errors = await examine(page, 'graves')
  await prepare(page, ['Hand hygiene', 'Introduce', 'Consent', 'Expose'])
  const steps = ['Eyes', 'Lid lag', 'Eye movements']
  for (const n of steps) await action(page, n).click()
  for (const n of steps) await expect(ticked(page, n)).toHaveCount(1, { timeout: 8000 })
  expect(errors).toEqual([])
})

test('buttons stay put when a finding comes in', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the finding strip sits above the buttons on phones')
  await examine(page, 'appendicitis')
  await prepare(page, ['Hand hygiene', 'Introduce', 'Consent', 'Expose'])
  await page.getByRole('button', { name: /^Abdomen$/ }).first().click()
  const probe = action(page, 'Kidneys')
  await probe.scrollIntoViewIfNeeded()
  const before = await probe.boundingBox()
  // a click from script, so the test itself doesn't scroll anything
  await action(page, 'Inspect').evaluate((b: HTMLElement) => b.click())
  await expect(page.getByText(/lying very still|Inspect/i).first()).toBeVisible()
  for (const wait of [50, 150, 400]) {
    await page.waitForTimeout(wait)
    expect((await probe.boundingBox())?.y).toBe(before?.y)
  }
})

test('the region pad palpates whichever tool is selected', async ({ page }) => {
  const errors = await examine(page, 'appendicitis')
  await prepare(page, ['Hand hygiene', 'Introduce', 'Consent', 'Expose'])
  await page.getByRole('button', { name: /^Abdomen$/ }).first().click()
  await page.getByRole('button', { name: /^Look$/ }).first().click()
  await action(page, 'RIF').click()
  await expect(page.getByText(/right iliac fossa/i).first()).toBeVisible()
  expect(errors).toEqual([])
})
