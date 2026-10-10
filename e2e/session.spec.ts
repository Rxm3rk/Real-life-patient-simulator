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
  await page.getByRole('radio', { name: /Practice/ }).click()
  await page.getByRole('button', { name: /See the patient/ }).last().click()
  await page.getByRole('button', { name: /^Examine$/ }).first().click()
  for (const b of [/^Hand hygiene/, /^Consent/, /^Chaperone/, /^Position/, /^Expose/, /^Gloves & light/, /^Part & inspect/])
    await page.getByRole('button', { name: b }).last().click()
  await expect(page.getByText(/posterior midline \(6 o’clock\)/).first()).toBeVisible()
  await page.getByRole('button', { name: /^Insert finger/ }).last().click()
  await expect(page.getByText(/sphincter clamps shut/).first()).toBeVisible()
})

test('Ask Claude appears only on claude.ai and answers with the notes', async ({ page }) => {
  await fresh(page)
  await page.getByLabel('Search questions, topics and cases').fill('signs of strangulated hernia')
  await expect(page.getByRole('heading', { name: /signs of a strangulated hernia/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Ask Claude/ })).toHaveCount(0)

  // a stand-in for claude.ai's runtime: streams a fixed answer and records what it was asked
  await page.addInitScript(() => {
    const w = window as unknown as { __asked: unknown[]; claude: unknown }
    w.__asked = []
    const sample = (input: unknown, opts: { onText?: (u: { text: string; delta: string }) => void; modelTier?: string } = {}) => {
      w.__asked.push(JSON.parse(JSON.stringify({ input, tier: opts.modelTier ?? null })))
      const text = 'A **strangulated hernia** has lost its blood supply.\n\n- Tense, tender, irreducible'
      return new Promise((res) => setTimeout(() => (opts.onText?.({ text, delta: text }), res({ text, truncated: false })), 200))
    }
    w.claude = { use: async (name: string) => (name === 'sample' ? sample : null) }
  })
  await page.reload()
  const box = page.getByLabel('Search questions, topics and cases')
  await box.fill('signs of strangulated hernia')
  await box.press('Enter')
  await expect(page.getByText('has lost its blood supply')).toBeVisible()
  const asked = await page.evaluate(() => (window as unknown as { __asked: { input: { content: string }[]; tier: string }[] }).__asked)
  expect(asked).toHaveLength(1)
  expect(asked[0].tier).toBe('quick')
  expect(asked[0].input[0].content).toContain('signs of strangulated hernia')
  expect(asked[0].input[0].content).toContain("The student's notes")
  await expect(page.getByRole('button', { name: 'Go deeper' })).toBeVisible()
})
