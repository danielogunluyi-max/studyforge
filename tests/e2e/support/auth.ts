import { expect, type Page } from '@playwright/test'

export type StudyPreset = 'HIGHSCHOOL' | 'COLLEGE' | 'UNIVERSITY'
export type NavStyle = 'minimal' | 'icons' | 'bottom' | 'topnav'

export type TestUser = {
  email: string
  password: string
  name: string
}

type ApiResult = {
  ok: boolean
  status?: number
  stage?: string
  body?: string
}

export function createTestUser(): TestUser {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    email: `navtest-${token}@example.com`,
    password: 'NavTest123!',
    name: 'Nav Test',
  }
}

async function disableOnboardingTour(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('kyvex-onboarded', '1')
  })
}

async function dismissOnboardingTour(page: Page) {
  const skipTour = page.getByRole('button', { name: /skip tour/i }).first()
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click()
  }
}

export async function registerUser(page: Page, user: TestUser) {
  await disableOnboardingTour(page)
  await page.goto('/register', { waitUntil: 'domcontentloaded' })
  await dismissOnboardingTour(page)

  await page.getByPlaceholder('Your name').fill(user.name)
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)

  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes('/api/auth/signup') &&
        response.request().method() === 'POST',
      { timeout: 60_000 },
    ),
    page.getByRole('button', { name: /create account/i }).click({ noWaitAfter: true }),
  ])

  await page.waitForFunction(
    () =>
      window.location.pathname === '/dashboard' ||
      (window.location.pathname === '/login' && window.location.search.includes('registered=true')),
    { timeout: 60_000 },
  )

  if (new URL(page.url()).pathname === '/login') {
    await loginUser(page, user)
    return
  }

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 })
}

export async function loginUser(page: Page, user: TestUser) {
  await disableOnboardingTour(page)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await dismissOnboardingTour(page)

  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)

  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes('/api/auth/callback/credentials') &&
        response.request().method() === 'POST',
      { timeout: 60_000 },
    ),
    page.getByRole('button', { name: /sign in/i }).click({ noWaitAfter: true }),
  ])

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 })
}

async function postPreset(page: Page, preset: StudyPreset): Promise<ApiResult> {
  return page.evaluate(async (value) => {
    localStorage.setItem('kyvex-onboarded', '1')

    const presetResponse = await fetch('/api/preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: value }),
    })

    const presetBody = await presetResponse.text()
    if (!presetResponse.ok) {
      return {
        ok: false,
        stage: 'preset',
        status: presetResponse.status,
        body: presetBody,
      }
    }

    const featureResponse = await fetch('/api/feature-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToPreset: true,
        preset: value,
      }),
    })

    const featureBody = await featureResponse.text()
    if (!featureResponse.ok) {
      return {
        ok: false,
        stage: 'feature-preferences',
        status: featureResponse.status,
        body: featureBody,
      }
    }

    return { ok: true }
  }, preset)
}

export async function dismissPresetModal(page: Page, preset: StudyPreset = 'HIGHSCHOOL') {
  const getStarted = page.getByRole('button', { name: /get started/i })
  const visible = await getStarted.isVisible().catch(() => false)
  if (!visible) return

  const labels: Record<StudyPreset, RegExp> = {
    HIGHSCHOOL: /high school/i,
    COLLEGE: /college/i,
    UNIVERSITY: /university/i,
  }

  await page.getByRole('button', { name: labels[preset] }).click()
  await getStarted.click()
  await getStarted.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined)
}

export async function applyPreset(page: Page, preset: StudyPreset = 'HIGHSCHOOL') {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await postPreset(page, preset)
    if (result.ok) {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await dismissPresetModal(page, preset)
      return
    }

    if (result.status !== 401 || attempt === 1) {
      expect(result.ok, JSON.stringify(result)).toBeTruthy()
    }

    await page.waitForTimeout(1_000)
    await page.reload({ waitUntil: 'domcontentloaded' })
  }
}

export async function goToDashboard(page: Page) {
  await disableOnboardingTour(page)
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await dismissOnboardingTour(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('main')).toBeVisible()
}

export async function setNavStyle(page: Page, style: NavStyle) {
  await page.evaluate((value) => {
    localStorage.setItem('kyvex-nav-style', value)
    window.dispatchEvent(new CustomEvent('kyvex-nav-changed', { detail: value }))
  }, style)
  await page.waitForTimeout(300)
}