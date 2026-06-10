import { expect, test } from '@playwright/test'

import { createTestUser, loginUser, registerUser } from './support/auth'

test.describe('auth redirects', () => {
  test('credentials login lands on /dashboard', async ({ browser }) => {
    // Create the account in a throwaway context...
    const setup = await browser.newContext()
    const setupPage = await setup.newPage()
    const user = createTestUser()
    await registerUser(setupPage, user)
    await setup.close()

    // ...then sign in from a fresh, unauthenticated session and confirm the
    // post-login destination is the dashboard.
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginUser(page, user)
    await expect(page).toHaveURL(/\/dashboard$/)
    await context.close()
  })

  test('unauthenticated deep link returns to the target after login', async ({ browser }) => {
    const setup = await browser.newContext()
    const setupPage = await setup.newPage()
    const user = createTestUser()
    await registerUser(setupPage, user)
    await setup.close()

    const context = await browser.newContext()
    const page = await context.newPage()
    await page.addInitScript(() => {
      window.localStorage.setItem('kyvex-onboarded', '1')
    })

    // Visiting a protected route while signed out should bounce to /login with
    // the original destination preserved as ?callbackUrl=.
    await page.goto('/my-notes', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login\?.*callbackUrl=.*my-notes/)

    await page.locator('input[type="email"]').fill(user.email)
    await page.locator('input[type="password"]').fill(user.password)
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/auth/callback/credentials') &&
          response.request().method() === 'POST',
        { timeout: 60_000 },
      ),
      page.getByRole('button', { name: /sign in/i }).click({ noWaitAfter: true }),
    ])

    // After sign-in the user should land on the originally requested page,
    // not the default /dashboard.
    await expect(page).toHaveURL(/\/my-notes/, { timeout: 60_000 })
    await context.close()
  })
})
