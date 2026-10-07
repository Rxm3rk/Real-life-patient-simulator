import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page, hash = '/') {
  await page.goto('/#/')
  await page.evaluate(() => localStorage.clear())
  await page.goto(`/#${hash}`)
}

async function tap(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).last().click()
}

test('today shows the session day and navigation', async ({ page }) => {
  await fresh(page)
  await expect(page.getByRole('heading', { name: /General surgery · Day 1/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bariatric surgery' }).first()).toBeVisible()
  await page.getByRole('radio', { name: /Day 4/ }).click()
  await expect(page.getByRole('heading', { name: 'Gastrointestinal bleeding' }).first()).toBeVisible()
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

test('the examination opens on the light illustrated patient, and recovers from a 3D crash', async ({ page }) => {
  await fresh(page, '/case/appendicitis')
  await tap(page, /Practice/)
  await tap(page, /See the patient/)
  await page.getByRole('button', { name: /^Examine$/ }).first().click()
  await expect(page.getByRole('button', { name: /^Hand hygiene/ }).last()).toBeVisible()
  await expect(page.getByRole('img', { name: /Drag to look around/ })).toHaveCount(0)
  // a 3D examination that never finished loading (the page died) switches 3D off next time
  await page.goto('/#/')
  await page.evaluate(() => {
    localStorage.setItem('bedside.settings', JSON.stringify({ state: { exam3d: true }, version: 1 }))
    localStorage.setItem('bedside.exam3d.loading', String(Date.now()))
  })
  await page.reload()
  await expect(page.getByText('Switched to the illustrated patient')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bedside.settings') ?? '{}').state.exam3d)).toBe(false)
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

test('no page scrolls sideways', async ({ page }) => {
  await fresh(page, '/')
  for (const route of ['/', '/ask?q=charcot', '/topic/complicated-hernia', '/topic/perianal/case/anal-fissure', '/ward', '/osce', '/learn', '/learn/routine/abdominal', '/learn/signs', '/progress', '/settings', '/case/appendicitis']) {
    await page.goto(`/#${route}`)
    await page.waitForTimeout(300)
    const [client, scroll] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth])
    expect(scroll, `${route} is wider than the screen`).toBeLessThanOrEqual(client)
  }
})
