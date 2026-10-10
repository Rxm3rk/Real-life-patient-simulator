import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page, hash = '/') {
  await page.goto('/#/')
  await page.evaluate(() => localStorage.clear())
  await page.goto(`/#${hash}`)
}

test('quiz a topic: the answer is remembered on the guide', async ({ page }) => {
  await fresh(page, '/quiz?deck=topic:acute-abdomen')
  await expect(page.getByRole('heading', { name: 'Acute abdomen', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Show answer' }).click()
  await page.getByRole('button', { name: 'Knew it' }).click()
  await expect(page.getByText(/^1 of \d+ known in this deck/)).toBeVisible()
  await page.goto('/#/topic/acute-abdomen')
  await expect(page.getByRole('link', { name: /Quiz me/ }).first()).toContainText(/1\/\d+/)
  await expect(page.getByRole('img', { name: 'You know this one' })).toHaveCount(1)
})

test('a missed card comes back in the same sitting and is listed to revise', async ({ page }) => {
  await fresh(page, '/quiz?deck=general')
  const first = (await page.getByRole('heading', { level: 2 }).first().textContent())!.trim()
  await page.getByRole('button', { name: 'Show answer' }).click()
  await page.getByRole('button', { name: 'Didn’t know' }).click()
  // fifteen cards, plus the missed one again
  for (let i = 0; i < 15; i++) {
    await page.getByRole('button', { name: 'Show answer' }).click()
    await page.getByRole('button', { name: 'Knew it' }).click()
  }
  await expect(page.getByRole('heading', { name: 'You knew 14 of 15' })).toBeVisible()
  await expect(page.getByRole('button', { name: first })).toBeVisible()
})

test('reviews that are due show on Today and open in the quiz', async ({ page }) => {
  await fresh(page, '/')
  await page.evaluate(() => {
    const now = Date.now()
    const card = { box: 0, due: now - 1000, seen: 1, lapses: 0, last: now - 600_000 }
    localStorage.setItem('bedside.study', JSON.stringify({ state: { cards: { 'acute-abdomen:qa:0': card } }, version: 1 }))
  })
  await page.reload()
  await page.getByRole('link', { name: /1 question due for review/ }).click()
  await expect(page.getByRole('heading', { name: 'Due for review', level: 1 })).toBeVisible()
  await expect(page.getByText('1 / 1')).toBeVisible()
})

test('the debrief says what to work on next', async ({ page }) => {
  await fresh(page, '/case/appendicitis')
  await page.getByRole('button', { name: /See the patient/ }).click()
  await page.getByRole('button', { name: /^Finish/ }).first().click()
  await page.getByRole('button', { name: /Finish station/ }).click()
  await expect(page.getByRole('heading', { name: 'What to work on next' })).toBeVisible()
  await page.getByRole('link', { name: /^Routine/ }).first().click()
  await expect(page).toHaveURL(/#\/learn\/routine\/abdominal/)
})

test('search is one tap away from any page', async ({ page }) => {
  await fresh(page, '/learn')
  await page.getByRole('link', { name: 'Search' }).first().click()
  await expect(page).toHaveURL(/#\/ask/)
  await expect(page.getByLabel('Search questions, topics and cases')).toBeVisible()
})

test('on a phone the start button, every phase and Finish are in reach', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await fresh(page, '/case/appendicitis')
  const start = page.getByRole('button', { name: /See the patient/ })
  await expect(start).toBeInViewport()
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await start.click()
  for (const name of ['History', 'Examine', 'Tests', 'Plan', 'Viva']) await expect(page.getByRole('button', { name, exact: true })).toBeInViewport()
  await expect(page.getByRole('button', { name: /^Finish/ })).toBeInViewport()
})
