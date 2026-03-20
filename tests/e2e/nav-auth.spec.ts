import { expect, test } from '@playwright/test'

import {
  applyPreset,
  createTestUser,
  goToDashboard,
  registerUser,
  setNavStyle,
} from './support/auth'

test.describe('authenticated nav variants', () => {
  test.beforeEach(async ({ page }) => {
    const user = createTestUser()
    await registerUser(page, user)
    await applyPreset(page, 'HIGHSCHOOL')
    await goToDashboard(page)
  })

  test('minimal nav links work', async ({ page }) => {
    await setNavStyle(page, 'minimal')

    const aside = page.locator('aside').first()

    await aside.getByRole('link', { name: /my notes/i }).click()
    await expect(page).toHaveURL(/\/my-notes$/)

    await aside.getByRole('link', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings$/)

    await aside.getByRole('link', { name: /dashboard/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('icons nav links work', async ({ page }) => {
    await setNavStyle(page, 'icons')

    await page.locator('button[title="Tools"]').click()
    await page.getByRole('link', { name: /originality check/i }).click()
    await expect(page).toHaveURL(/\/plagiarism$/)

    await goToDashboard(page)
    await setNavStyle(page, 'icons')

    await page.locator('a[href="/settings"][title="Settings"]').click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('bottom nav links work', async ({ page }) => {
    await setNavStyle(page, 'bottom')

    await page.getByRole('link', { name: /study/i }).click()
    await expect(page).toHaveURL(/\/my-notes$/)

    await goToDashboard(page)
    await setNavStyle(page, 'bottom')

    await page.getByRole('button', { name: /more/i }).click()
    await page.getByRole('button', { name: /tools/i }).click()
    await page.getByRole('link', { name: /originality check/i }).click()
    await expect(page).toHaveURL(/\/plagiarism$/)
  })

  test('top nav links work', async ({ page }) => {
    await setNavStyle(page, 'topnav')

    const topnav = page.locator('nav').first()

    await topnav.getByRole('button', { name: /study/i }).click()
    await expect(topnav.locator('a[href="/my-notes"]')).toBeVisible()
    await topnav.locator('a[href="/my-notes"]').click()
    await expect(page).toHaveURL(/\/my-notes$/)

    await goToDashboard(page)
    await setNavStyle(page, 'topnav')

    await topnav.getByRole('button', { name: /tools/i }).click()
    await expect(topnav.locator('a[href="/plagiarism"]')).toBeVisible()
    await topnav.locator('a[href="/plagiarism"]').click()
    await expect(page).toHaveURL(/\/plagiarism$/)
  })
})