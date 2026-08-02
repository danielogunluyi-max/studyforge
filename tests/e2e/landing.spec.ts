import { expect, test } from '@playwright/test'

test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
  })

  test('renders the hero and primary CTAs', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /study smarter/i, level: 1 }),
    ).toBeVisible()

    const header = page.getByRole('banner')
    await expect(header.locator('a[href="/register"]').first()).toBeVisible()
    await expect(header.locator('a[href="/login"]').first()).toBeVisible()

    await expect(
      page.getByRole('link', { name: /start for free/i }),
    ).toHaveAttribute('href', '/register')
    await expect(
      header.getByRole('link', { name: /^get started$/i }),
    ).toHaveAttribute('href', '/register')
    await expect(
      header.getByRole('link', { name: /log in/i }),
    ).toHaveAttribute('href', '/login')
  })

  test('navbar anchors point at sections that render', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /main navigation/i })

    for (const anchor of ['#features', '#how-it-works', '#pricing', '#faq']) {
      await expect(nav.locator(`a[href="${anchor}"]`)).toBeVisible()
      await expect(page.locator(anchor)).toHaveCount(1)
    }

    await nav.locator('a[href="#pricing"]').click()
    await expect(page).toHaveURL(/#pricing$/)
    await expect(page.locator('#pricing')).toBeVisible()
  })

  test('faq accordion opens and closes', async ({ page }) => {
    const questions = page.locator('button[id^="faq-question-"]')
    const first = questions.first()
    const second = questions.nth(1)

    await expect(first).toHaveAttribute('aria-expanded', 'true')
    await expect(second).toHaveAttribute('aria-expanded', 'false')

    await second.click()
    await expect(second).toHaveAttribute('aria-expanded', 'true')
    await expect(first).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#faq-answer-1')).toBeVisible()

    await second.click()
    await expect(second).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#faq-answer-1')).toHaveCount(0)
  })

  test('mobile menu toggles', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload({ waitUntil: 'domcontentloaded' })

    const menuButton = page.getByRole('button', { name: /navigation menu/i })
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    await menuButton.click()
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#mobile-menu a[href="#features"]')).toBeVisible()

    await menuButton.click()
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  test('footer legal links point at real routes', async ({ page }) => {
    const footer = page.getByRole('contentinfo')

    await expect(
      footer.getByRole('link', { name: /privacy policy/i }),
    ).toHaveAttribute('href', '/privacy')
    await expect(
      footer.getByRole('link', { name: /terms of service/i }),
    ).toHaveAttribute('href', '/terms')

    for (const anchor of ['#features', '#how-it-works', '#pricing', '#faq']) {
      await expect(footer.locator(`a[href="${anchor}"]`)).toHaveCount(1)
    }

    await expect(footer.locator('a[href="#"]')).toHaveCount(0)

    await footer.getByRole('link', { name: /privacy policy/i }).click()
    await expect(page).toHaveURL(/\/privacy$/)
  })
})
