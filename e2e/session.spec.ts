import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page, hash = '/') {
  await page.goto('/#/')
  await page.evaluate(() => localStorage.clear())
  await page.goto(`/#${hash}`)
}

test('the search bar on Today answers as you type', async ({ page }) => {
  await fresh(page)
  await page.getByLabel('Search questions, topics and cases').fill('charcot')
  await expect(page.getByRole('heading', { name: /Charcot’s triad/ }).first()).toBeVisible()
})

test('Ask finds answers, filters by topic and remembers the search', async ({ page }) => {
  await fresh(page, '/ask')
  const box = page.getByLabel('Search questions, topics and cases')
  await box.fill('goodsals rule')
  await expect(page.getByText(/Goodsall/).first()).toBeVisible()
  await box.fill('signs of strangulation')
  await page.getByRole('button', { name: 'Hernia', exact: true }).click()
  await expect(page.getByText(/strangulat/i).first()).toBeVisible()
  await expect(page).toHaveURL(/q=signs/)
})

test('a topic guide jumps to sections and opens a case card', async ({ page }) => {
  await fresh(page, '/topic/gi-bleeding')
  await expect(page.getByRole('heading', { name: 'Gastrointestinal bleeding', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: /^Questions/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Questions the doctors ask' })).toBeInViewport()
  await page.getByRole('link', { name: 'Case card' }).first().click()
  const card = page.getByRole('dialog')
  await expect(card.getByText('What you find')).toBeVisible()
  await card.getByRole('button', { name: 'Quiz me' }).click()
  await expect(card.getByRole('button', { name: 'Show diagnosis' })).toBeVisible()
  await card.getByRole('button', { name: 'Show diagnosis' }).click()
  await expect(card.getByText('Differentials')).toBeVisible()
})

test('perianal station: inspect, then defer a painful DRE', async ({ page }) => {
  await fresh(page, '/case/anal-fissure')
  await page.getByRole('button', { name: /Practice/ }).last().click()
  await page.getByRole('button', { name: /See the patient/ }).last().click()
  await page.getByRole('button', { name: /^Examine$/ }).first().click()
  for (const b of [/^Hand hygiene/, /^Consent/, /^Chaperone/, /^Position/, /^Expose/, /^Gloves & light/, /^Part & inspect/])
    await page.getByRole('button', { name: b }).last().click()
  await expect(page.getByText(/posterior midline \(6 o’clock\)/).first()).toBeVisible()
  await page.getByRole('button', { name: /^Insert finger/ }).last().click()
  await expect(page.getByText(/sphincter clamps shut/).first()).toBeVisible()
})
