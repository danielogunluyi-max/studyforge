import { expect, test } from '@playwright/test'

const WORDS = [
  'a mock exam.',
  'flashcards.',
  'structured notes.',
  'a plan that sticks.',
] as const

test.describe('landing motion', () => {
  test('serif cycle + marquee move; no console errors', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => {
      errors.push(String(err))
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('em.kv-cycle')).toBeVisible()
    await expect(page.locator('.ticker-track')).toBeVisible()

    const read = async () =>
      page.evaluate(() => {
        const em = document.querySelector('em.kv-cycle')
        const typed =
          em?.querySelector('[aria-hidden="true"]')?.textContent ??
          em?.textContent ??
          ''
        const track = document.querySelector('.ticker-track') as HTMLElement | null
        const transform = track ? getComputedStyle(track).transform : ''
        return { typed, transform, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches }
      })

    await page.waitForTimeout(1000)
    const t1 = await read()
    expect(t1.reduce).toBe(false)
    const movedAt1 =
      t1.typed !== WORDS[0] ||
      (t1.transform !== 'none' && t1.transform !== 'matrix(1, 0, 0, 1, 0, 0)')
    expect(movedAt1).toBe(true)

    const transformAt1 = t1.transform
    const phrases = new Set<string>([t1.typed])

    await page.waitForTimeout(2000)
    const t3 = await read()
    phrases.add(t3.typed)

    await page.waitForTimeout(3000)
    const t6 = await read()
    phrases.add(t6.typed)

    const phraseChanged = [...phrases].some((p) => p !== WORDS[0]) || phrases.size > 1
    expect(phraseChanged).toBe(true)

    const marqueeMoved =
      t1.transform !== t3.transform ||
      t3.transform !== t6.transform ||
      t1.transform !== t6.transform
    expect(marqueeMoved).toBe(true)
    expect(transformAt1).not.toBe('')

    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])

    // Report samples for the agent log / CI output
    console.log(
      JSON.stringify(
        {
          samples: [
            { t: '1s', ...t1 },
            { t: '3s', ...t3 },
            { t: '6s', ...t6 },
          ],
        },
        null,
        2,
      ),
    )
  })
})
