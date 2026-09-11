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

  test('sidebar nav links work', async ({ page }) => {
    await setNavStyle(page, 'sidebar')

    const aside = page.locator('aside').first()

    await aside.getByRole('link', { name: /my notes/i }).click()
    await expect(page).toHaveURL(/\/my-notes$/)

    await aside.getByRole('link', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings$/)

    await aside.getByRole('link', { name: /dashboard/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('top nav links work', async ({ page }) => {
    await setNavStyle(page, 'topnav')

    const topnav = page.locator('header nav').first()

    await topnav.getByRole('button', { name: /study/i }).click()
    await expect(topnav.locator('a[href="/my-notes"]')).toBeVisible()
    await topnav.locator('a[href="/my-notes"]').click()
    await expect(page).toHaveURL(/\/my-notes$/)

    await goToDashboard(page)
    await setNavStyle(page, 'topnav')

    await topnav.getByRole('button', { name: /^you$/i }).click()
    await expect(topnav.locator('a[href="/settings"]')).toBeVisible()
    await topnav.locator('a[href="/settings"]').click()
    await expect(page).toHaveURL(/\/settings$/)
  })
})
