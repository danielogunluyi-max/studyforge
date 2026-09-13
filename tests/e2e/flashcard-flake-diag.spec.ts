/**
 * Diagnostic: money-path flashcards create→generate ×10 (skips Inbox paste).
 * Records fail site + network/console + race timings on each failure.
 */
import { expect, type Page, test } from '@playwright/test'
import { applyPreset, registerUser, type TestUser } from './support/auth'

const FIXTURE_CARDS = [
  { front: 'What is photosynthesis?', back: 'Light energy stored as glucose.' },
  { front: 'Where is chlorophyll found?', back: 'Thylakoid membranes of chloroplasts.' },
  { front: 'What do light reactions produce?', back: 'ATP, NADPH, and oxygen.' },
  { front: 'What does the Calvin cycle fix?', back: 'CO2 into sugars using ATP and NADPH.' },
] as const

function apiPath(url: string | URL): string {
  const parsed = typeof url === 'string' ? new URL(url) : url
  return parsed.pathname.replace(/\/$/, '') || '/'
}

async function installGenerateMock(page: Page) {
  await page.route(
    (url) => /\/api\/decks\/[^/]+\/generate\/?$/.test(apiPath(url)),
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      const deckId = apiPath(route.request().url()).split('/')[3]
      if (!deckId) {
        await route.fulfill({ status: 500, json: { error: 'Missing deck id' } })
        return
      }
      const origin = new URL(route.request().url()).origin
      const cookie = route.request().headers().cookie ?? ''
      const cards: unknown[] = []
      for (const pair of FIXTURE_CARDS) {
        const seed = await fetch(`${origin}/api/decks/${deckId}/cards`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie },
          body: JSON.stringify({ front: pair.front, back: pair.back }),
        })
        if (!seed.ok) {
          await route.fulfill({
            status: 500,
            json: { error: `seed failed ${seed.status}` },
          })
          return
        }
        const payload = (await seed.json()) as { card?: unknown }
        if (payload.card) cards.push(payload.card)
      }
      await route.fulfill({ status: 200, json: { cards, count: cards.length } })
    },
  )
}

test.describe('flashcard flake diag', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.describe.configure({ timeout: 900_000 })

  test('flashcards create+generate ×10', async ({ page }) => {
    const results: Array<Record<string, unknown>> = []

    const user: TestUser = {
      email: `flake-${Date.now()}@example.com`,
      password: 'MoneyPath123!',
      name: 'Flake Diag',
    }

    await registerUser(page, user)
    await applyPreset(page, 'HIGHSCHOOL')
    await installGenerateMock(page)

    // Feature prefs via browser session (page.request is unauthenticated here)
    const prefs = await page.evaluate(async () => {
      const res = await fetch('/api/feature-preferences', { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      const enabled = body?.prefs?.enabledFeatures ?? body?.enabledFeatures ?? []
      const hidden = body?.prefs?.hiddenFeatures ?? body?.hiddenFeatures ?? []
      return {
        status: res.status,
        preset: body?.prefs?.preset ?? body?.preset,
        flashcardsEnabled: Array.isArray(enabled) ? enabled.includes('flashcards') : null,
        flashcardsHidden: Array.isArray(hidden) ? hidden.includes('flashcards') : null,
        hiddenSample: Array.isArray(hidden) ? hidden.slice(0, 12) : hidden,
        enabledLen: Array.isArray(enabled) ? enabled.length : null,
      }
    })
    console.log('FEATURE_PREFS', JSON.stringify(prefs))

    // Create note via real API (same as Inbox save) — isolates flashcards race
    const noteId = await page.evaluate(async () => {
      const content = [
        `Photosynthesis flake-diag ${Date.now()}`,
        '',
        'Photosynthesis is how plants convert light energy into chemical energy stored in glucose.',
        'Chlorophyll in chloroplasts absorbs mostly blue and red wavelengths.',
        'The Calvin cycle uses ATP and NADPH to fix carbon dioxide into sugars.',
      ].join('\n')
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: content.split('\n')[0],
          content,
          format: 'paragraph',
          tags: ['Inbox'],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(`notes create ${res.status}: ${JSON.stringify(data)}`)
      return data.note?.id ?? data.id ?? null
    })
    expect(noteId).toBeTruthy()
    console.log('NOTE_ID', noteId)

    for (let i = 1; i <= 10; i++) {
      const consoleLines: string[] = []
      const onConsole = (msg: { type: () => string; text: () => string }) => {
        consoleLines.push(`[${msg.type()}] ${msg.text()}`)
      }
      page.on('console', onConsole)

      let decksPost = false
      let generatePost = false
      let decksStatus: number | undefined
      let generateStatus: number | undefined
      let generateReqAt = 0
      let generateResAt = 0
      let navAt = 0
      let clickAt = 0
      let armAt = 0

      const onRequest = (req: { url: () => string; method: () => string }) => {
        const p = apiPath(req.url())
        if (req.method() === 'POST' && p === '/api/decks') decksPost = true
        if (req.method() === 'POST' && /\/api\/decks\/[^/]+\/generate$/.test(p)) {
          generatePost = true
          generateReqAt = Date.now()
        }
      }
      const onResponse = (res: {
        url: () => string
        request: () => { method: () => string }
        status: () => number
      }) => {
        const p = apiPath(res.url())
        if (res.request().method() === 'POST' && p === '/api/decks') decksStatus = res.status()
        if (res.request().method() === 'POST' && /\/api\/decks\/[^/]+\/generate$/.test(p)) {
          generateStatus = res.status()
          generateResAt = Date.now()
        }
      }
      page.on('request', onRequest)
      page.on('response', onResponse)

      let diedAt: string | null = null
      let ok = false
      let sessionBeforeNav: string[] = []
      let sessionAfter: string[] = []
      let dialogErr: string | null = null
      let raceMiss = false

      try {
        await page.goto(`/flashcards?generateFrom=${encodeURIComponent(String(noteId))}`, {
          waitUntil: 'domcontentloaded',
        })
        const createDialog = page.getByRole('dialog', { name: 'Create Deck' })
        await expect(createDialog).toBeVisible({ timeout: 20_000 })
        await expect(async () => {
          await createDialog.getByLabel('Title', { exact: true }).fill(`Deck ${i}`)
          await createDialog.getByLabel('Subject', { exact: true }).fill('Biology')
          expect(await createDialog.getByLabel('Title', { exact: true }).inputValue()).toBe(`Deck ${i}`)
        }).toPass({ timeout: 15_000 })
        await expect(createDialog.locator('#deck-note')).toHaveValue(String(noteId))

        // MONEY-PATH ORDER: arm waitForResponse, then click, then URL, then await generate
        armAt = Date.now()
        const generateDone = page.waitForResponse(
          (response) =>
            /\/api\/decks\/[^/]+\/generate\/?$/.test(apiPath(response.url())) &&
            response.request().method() === 'POST',
          { timeout: 45_000 },
        )

        clickAt = Date.now()
        const navPromise = page.waitForURL(/\/flashcards\/[^/?#]+/, { timeout: 45_000 }).then(() => {
          navAt = Date.now()
        })

        await createDialog.getByRole('button', { name: 'Create & Generate' }).click()

        // Peek sessionStorage shortly after click (before/during nav)
        await page.waitForTimeout(50)
        sessionBeforeNav = await page.evaluate(() => {
          const keys: string[] = []
          for (let j = 0; j < sessionStorage.length; j++) {
            const k = sessionStorage.key(j)
            if (k?.startsWith('kyvex-deck-gen:')) keys.push(k)
          }
          return keys
        })

        try {
          await navPromise
        } catch {
          diedAt = 'URL_ASSERT'
          dialogErr = await createDialog
            .locator('[role="alert"], .text-red-500, p')
            .filter({ hasText: /fail|required|error|Provide/i })
            .first()
            .textContent()
            .catch(() => null)
          throw new Error('URL assert failed')
        }

        // Race check: did generate request happen before arm? (impossible if arm before click)
        // More useful: did generate request happen BEFORE nav commit?
        if (generateReqAt && navAt && generateReqAt < navAt) {
          // generate fired during soft nav — still OK if listener was armed
        }
        if (generateReqAt && generateReqAt < armAt) {
          raceMiss = true
          diedAt = 'RACE_BEFORE_ARM'
        }

        try {
          await generateDone
        } catch {
          diedAt = 'GENERATE_WAIT'
          // If generate already completed before listener — raceMiss
          if (generatePost && generateResAt && generateResAt < armAt) {
            raceMiss = true
            diedAt = 'GENERATE_WAIT_RACE'
          } else if (generatePost) {
            diedAt = 'GENERATE_WAIT_BUT_SAW_POST'
          } else if (!generatePost) {
            diedAt = 'GENERATE_WAIT_NO_POST'
          }
          throw new Error('generate waitForResponse failed')
        }

        for (const card of FIXTURE_CARDS) {
          try {
            await expect(page.getByText(card.front, { exact: true })).toBeVisible({ timeout: 20_000 })
          } catch {
            diedAt = 'CARDS_ASSERT'
            throw new Error(`card assert failed: ${card.front}`)
          }
        }
        ok = true
      } catch {
        if (!diedAt) diedAt = 'OTHER'
      }

      sessionAfter = await page
        .evaluate(() => {
          const keys: string[] = []
          for (let j = 0; j < sessionStorage.length; j++) {
            const k = sessionStorage.key(j)
            if (k?.startsWith('kyvex-deck-gen:')) keys.push(k)
          }
          return keys
        })
        .catch(() => [] as string[])

      const row = {
        i,
        ok,
        diedAt,
        url: page.url(),
        posts: { decks: decksPost, generate: generatePost, decksStatus, generateStatus },
        sessionBeforeNav,
        sessionAfter,
        dialogErr,
        raceMiss,
        timings: {
          armToClickMs: clickAt && armAt ? clickAt - armAt : null,
          clickToGenerateReqMs: generateReqAt && clickAt ? generateReqAt - clickAt : null,
          clickToNavMs: navAt && clickAt ? navAt - clickAt : null,
          generateReqVsNavMs:
            generateReqAt && navAt ? generateReqAt - navAt : null, // negative = gen before nav commit
          armVsGenerateResMs: generateResAt && armAt ? generateResAt - armAt : null,
        },
        consoleTail: consoleLines.slice(-25),
      }
      results.push(row)
      console.log(ok ? `OK #${i}` : `FAIL #${i}`, JSON.stringify(row))

      page.off('console', onConsole)
      page.off('request', onRequest)
      page.off('response', onResponse)
    }

    const fails = results.filter((r) => !r.ok)
    const bySite: Record<string, number> = {}
    for (const f of fails) {
      const k = String(f.diedAt)
      bySite[k] = (bySite[k] ?? 0) + 1
    }
    console.log(
      'SUMMARY',
      JSON.stringify({
        runs: results.length,
        fails: fails.length,
        failRate: `${fails.length}/${results.length}`,
        bySite,
        prefs,
        results,
      }),
    )

    expect(fails, `fail rate ${fails.length}/10`).toHaveLength(0)
  })
})
