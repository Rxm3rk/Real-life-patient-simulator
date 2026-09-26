import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page, hash = '/') {
  await page.goto('/#/')
  await page.evaluate(() => localStorage.clear())
  await page.goto(`/#${hash}`)
}

async function tap(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).last().click()
}

test('home shows the ward and navigation', async ({ page }) => {
  await fresh(page)
  await expect(page.getByText('Your patients are waiting on the surgical ward.')).toBeVisible()
  await page.getByRole('link', { name: /Ward/ }).first().click()
  await expect(page).toHaveURL(/#\/ward/)
})

test('take a history and examine the abdomen', async ({ page }) => {
  await fresh(page, '/case/appendicitis')
  await tap(page, /Practice/)
  await tap(page, /See the patient/)
  const box = page.getByLabel('Ask the patient')
  await box.fill('What brought you in today?')
  await box.press('Enter')
  await expect(page.getByText(/pain in my tummy/i)).toBeVisible()
  await page.getByRole('button', { name: /^Examine$/ }).first().click()
  for (const b of [/^Hand hygiene/, /^Introduce/, /^Consent/, /^Expose/]) await tap(page, b)
  await tap(page, /^End of bed/)
  await expect(page.getByText(/lying very still/i).first()).toBeVisible()
})

test('groin station: stand, inspect and find the hernia', async ({ page }) => {
  await fresh(page, '/case/inguinal-hernia')
  await tap(page, /Practice/)
  await tap(page, /See the patient/)
  await page.getByRole('button', { name: /^Examine$/ }).first().click()
  for (const b of [/^Hand hygiene/, /^Consent/, /^Chaperone/, /^Expose/, /^Stand up/, /^Inspect$/]) await tap(page, b)
  await expect(page.getByText(/oval swelling about 4 × 3 cm in the right groin/).first()).toBeVisible()
})

test('learn hub and signs atlas', async ({ page }) => {
  await fresh(page, '/learn')
  await expect(page.getByRole('heading', { name: /Learn the routines/ })).toBeVisible()
  await page.goto('/#/learn/signs/clubbing')
  await expect(page.getByRole('dialog').getByText('Causes & associations')).toBeVisible()
})

test('OSCE circuit starts with reading time', async ({ page }) => {
  await fresh(page, '/osce')
  await page.getByRole('tab', { name: '3' }).click()
  await page.getByRole('button', { name: /Start circuit/ }).click()
  await expect(page.getByText('Candidate instructions')).toBeVisible()
  await expect(page.getByRole('button', { name: /Enter station/ })).toBeEnabled()
})

test('share links open the right patient and circuit', async ({ page }) => {
  await fresh(page, '/')
  await page.goto('/#case.inguinal-hernia')
  await expect(page.getByRole('button', { name: /See the patient/ })).toBeVisible()
  await expect(page.getByText('Lump in the right groin').first()).toBeVisible()
  await page.goto('/#osce~480~appendicitis.graves.lipoma')
  await expect(page.getByText('You’ve been challenged to a circuit')).toBeVisible()
})

test('theme follows the system until the user picks one', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await fresh(page, '/')
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(await bg()).toBe('rgb(7, 11, 20)')
  await page.emulateMedia({ colorScheme: 'light' })
  expect(await bg()).toBe('rgb(244, 246, 249)')
  await page.goto('/#/settings')
  await page.getByRole('tab', { name: /Dark/ }).click()
  expect(await bg()).toBe('rgb(7, 11, 20)')
})
