import { expect, type Page, test } from '@playwright/test'

import { applyPreset, registerUser, type TestUser } from './support/auth'

/**
 * Money-path E2E: real auth + real notes DB, AI mocked only at page.route().
 *
 * Mocked:
 *   POST /api/decks/:id/generate
 *   POST /api/mock-exam/:id/generate
 *   GET+POST /api/mock-exam/:id/attempt
 *   POST /api/tutor  (exact path; not /api/tutor/conversations)
 *
 * Not mocked: /api/auth/*, GET /api/notes, POST /api/notes, POST /api/mock-exam (draft), page loads.
 *
 * Generate persist lives inside the Groq route. Mocking that POST would leave
 * the deck empty because the editor loads cards via unmocked GET /api/decks/:id.
 * The generate handler therefore seeds four Q/A pairs through the real
 * POST /api/decks/:id/cards (Node fetch + the browser Cookie header, no Groq)
 * before fulfilling { cards, count }.
 */

const EXAM_ID = 'e2e-money-path-exam'
const QUESTION_ID = 'e2e-money-q1'
const MC_CORRECT = 'It absorbs mostly blue and red light'
const NOVA_REPLY =
  'Chlorophyll in the thylakoid membrane captures light to drive ATP and NADPH production.'

const FIXTURE_CARDS = [
  { front: 'What is photosynthesis?', back: 'Light energy stored as glucose.' },
  { front: 'Where is chlorophyll found?', back: 'Thylakoid membranes of chloroplasts.' },
  { front: 'What do light reactions produce?', back: 'ATP, NADPH, and oxygen.' },
  { front: 'What does the Calvin cycle fix?', back: 'CO2 into sugars using ATP and NADPH.' },
] as const

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-CA').format(n)
}

function createMoneyUser(): TestUser {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    email: `money-${token}@example.com`,
    password: 'MoneyPath123!',
    name: 'Money Path',
  }
}

function pasteNotes(): string {
  const stamp = `Photosynthesis money-path ${Date.now()}`
  return [
    stamp,
    '',
    'Photosynthesis is how plants convert light energy into chemical energy stored in glucose. Chlorophyll in chloroplasts absorbs mostly blue and red wavelengths, driving the light-dependent reactions that split water and produce ATP and NADPH.',
    '',
    'The Calvin cycle then uses that ATP and NADPH to fix carbon dioxide into sugars. Rate depends on light intensity, carbon dioxide concentration, and temperature, which is why Ontario greenhouses carefully control those three factors.',
  ].join('\n')
}

function apiPath(url: string | URL): string {
  const parsed = typeof url === 'string' ? new URL(url) : url
  return parsed.pathname.replace(/\/$/, '') || '/'
}

async function installAiMocks(page: Page) {
  await page.route(
    (url) => /\/api\/decks\/[^/]+\/generate\/?$/.test(apiPath(url)),
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }

      const deckId = apiPath(route.request().url()).split('/')[3]
      if (!deckId) {
        await route.fulfill({ status: 500, json: { error: 'Missing deck id in generate mock' } })
        return
      }

      // Seed through Node fetch (not page.request) so we don't deadlock the
      // paused generate intercept. Cookie header is copied from the browser.
      // Parallel + per-request timeout: sequential seeds were hanging on Neon
      // and leaving waitForResponse armed forever (GENERATE_WAIT_BUT_SAW_POST).
      const origin = new URL(route.request().url()).origin
      const cookie = route.request().headers().cookie ?? ''
      try {
        const seeded = await Promise.all(
          FIXTURE_CARDS.map(async (pair) => {
            const seed = await fetch(`${origin}/api/decks/${deckId}/cards`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                cookie,
              },
              body: JSON.stringify({ front: pair.front, back: pair.back }),
              signal: AbortSignal.timeout(20_000),
            })
            if (!seed.ok) {
              const body = await seed.text()
              throw new Error(`Fixture card seed failed (${seed.status}): ${body.slice(0, 200)}`)
            }
            const payload = (await seed.json()) as { card?: unknown }
            return payload.card
          }),
        )
        const cards = seeded.filter(Boolean)
        await route.fulfill({
          status: 200,
          json: { cards, count: cards.length },
        })
      } catch (err) {
        await route.fulfill({
          status: 500,
          json: { error: err instanceof Error ? err.message : 'Fixture card seed failed' },
        })
      }
    },
  )

  await page.route(
    (url) => /\/api\/mock-exam\/[^/]+\/generate\/?$/.test(apiPath(url)),
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      const examId = apiPath(route.request().url()).split('/')[3] ?? EXAM_ID
      await route.fulfill({
        status: 201,
        json: {
          exam: {
            id: examId,
            title: 'Photosynthesis Check',
            subject: 'Biology',
            curriculumCode: 'SBI4U',
            instructions: 'Answer every question.',
            timeLimit: 10,
            questions: [],
          },
        },
      })
    },
  )

  await page.route(
    (url) => /\/api\/mock-exam\/[^/]+\/attempt\/?$/.test(apiPath(url)),
    async (route) => {
      const examId = apiPath(route.request().url()).split('/')[3] ?? EXAM_ID
      const method = route.request().method()

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            exam: {
              id: examId,
              title: 'Photosynthesis Check',
              subject: 'Biology',
              curriculumCode: 'SBI4U',
              instructions: 'Choose the best answer.',
              timeLimit: 10,
              createdAt: '2026-01-15T12:00:00.000Z',
              questions: [
                {
                  id: QUESTION_ID,
                  type: 'multiple_choice',
                  prompt: 'Which statement about chlorophyll is accurate?',
                  options: [
                    'It absorbs mostly green light and reflects blue',
                    MC_CORRECT,
                    'It is found only in mitochondria',
                    'It converts glucose into carbon dioxide',
                  ],
                  unit: 'Photosynthesis',
                  points: 1,
                },
              ],
            },
          },
        })
        return
      }

      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          json: {
            attemptId: 'e2e-money-attempt',
            scorePercent: 100,
            earnedPoints: 1,
            totalPoints: 1,
            timeTakenSec: 12,
            breakdown: {
              perQuestion: [
                {
                  questionId: QUESTION_ID,
                  type: 'multiple_choice',
                  unit: 'Photosynthesis',
                  prompt: 'Which statement about chlorophyll is accurate?',
                  points: 1,
                  earned: 1,
                  isCorrect: true,
                  yourIndex: 1,
                  yourOption: MC_CORRECT,
                  correctIndex: 1,
                  correctOption: MC_CORRECT,
                },
              ],
              unitFocus: [{ unit: 'Photosynthesis', earned: 1, total: 1, percent: 100 }],
              strengths: ['Photosynthesis'],
              weaknesses: [],
              gotRight: 1,
              missed: 0,
            },
          },
        })
        return
      }

      await route.continue()
    },
  )

  await page.route(
    (url) => apiPath(url) === '/api/tutor',
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        json: {
          message: NOVA_REPLY,
          conversationId: null,
          persona: 'Nova, your Kyvex AI Tutor',
          subject: 'General',
          command: null,
        },
      })
    },
  )
}

async function pasteIntoInboxDropzone(page: Page, text: string) {
  const dropzone = page.locator('section.kv-dropzone').first()
  await dropzone.click({ force: true })
  await dropzone.focus()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  }).catch(() => undefined)
  await page.evaluate(async (pasted) => {
    await navigator.clipboard.writeText(pasted).catch(() => undefined)
    const dt = new DataTransfer()
    dt.setData('text/plain', pasted)
    dt.setData('text', pasted)
    const target =
      document.querySelector('section.kv-dropzone') ??
      document.activeElement ??
      document.querySelector('section.kv-card')
    if (!target) return
    target.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, text)
  await page.keyboard.press('Control+v')
}

test.describe('money path', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.describe.configure({ timeout: 300_000 })

  test('register through Inbox, flashcards, mock exam, and Nova with AI mocked', async ({ page }) => {
    const user = createMoneyUser()
    const notesText = pasteNotes()
    const noteTitle = notesText.split('\n')[0]!.trim()
    const expectedBadge = `Text · ${formatCount(countWords(notesText))} words`

    // 1. Register through the real UI
    await registerUser(page, user)
    await expect(page).toHaveURL(/\/dashboard$/)
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((cookie) => /session|authjs|next-auth/i.test(cookie.name))
    expect(sessionCookie, `expected a session cookie; saw ${cookies.map((c) => c.name).join(', ')}`).toBeTruthy()
    expect(sessionCookie?.value.length ?? 0).toBeGreaterThan(10)

    await applyPreset(page, 'HIGHSCHOOL')
    await installAiMocks(page)

    // 2. Inbox: paste text, badge, save, follow-up
    await page.goto('/smart-upload', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
    await expect(async () => {
      await pasteIntoInboxDropzone(page, notesText)
      await expect(page.getByText(/^Text · .+ words$/)).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    await expect(page.getByText(expectedBadge, { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: noteTitle })).toBeVisible()

    await Promise.all([
      page.waitForResponse(
        (response) =>
          apiPath(response.url()) === '/api/notes' &&
          response.request().method() === 'POST' &&
          response.ok(),
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: 'Save to My Notes' }).click(),
    ])

    await expect(page.getByText(/Saved to My Notes/)).toBeVisible()
    const followUp = page.locator('section.kv-card').filter({ hasText: 'Saved to My Notes' })
    const makeFlashcards = followUp.getByRole('link', { name: 'Make flashcards' })
    await expect(makeFlashcards).toBeVisible()
    await expect(followUp.getByRole('link', { name: 'Mock exam' })).toBeVisible()
    await expect(followUp.getByRole('link', { name: 'Ask Nova' })).toBeVisible()

    const generateHref = await makeFlashcards.getAttribute('href')
    expect(generateHref).toMatch(/\/flashcards\?generateFrom=/)
    const noteId = new URL(generateHref ?? '', 'http://127.0.0.1').searchParams.get('generateFrom')
    expect(noteId).toBeTruthy()

    // 3. My Notes: new note + Inbox tag
    await page.goto('/my-notes', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'My Notes' })).toBeVisible()
    await expect(page.getByText(noteTitle).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Inbox' }).first()).toBeVisible()

    // 4. Flashcards: Make-flashcards entry, mocked generate, cards render
    await page.goto(`/flashcards?generateFrom=${encodeURIComponent(noteId!)}`, {
      waitUntil: 'domcontentloaded',
    })
    const createDialog = page.getByRole('dialog', { name: 'Create Deck' })
    await expect(createDialog).toBeVisible()
    await expect(async () => {
      await createDialog.getByLabel('Title', { exact: true }).fill('Photosynthesis deck')
      await createDialog.getByLabel('Subject', { exact: true }).fill('Biology')
      expect(await createDialog.getByLabel('Title', { exact: true }).inputValue()).toBe('Photosynthesis deck')
      expect(await createDialog.getByLabel('Subject', { exact: true }).inputValue()).toBe('Biology')
    }).toPass({ timeout: 15_000 })
    await expect(createDialog.locator('#deck-note')).toHaveValue(noteId!)

    // Arm listeners BEFORE click. Generate runs on the deck page after redirect;
    // create POST itself is often 10–25s on Neon — wait for it explicitly so a
    // hung create fails here (URL_ASSERT) instead of looking like a generate race.
    const createDone = page.waitForResponse(
      (response) =>
        apiPath(response.url()) === '/api/decks' &&
        response.request().method() === 'POST',
      { timeout: 90_000 },
    )
    const generateDone = page.waitForResponse(
      (response) =>
        /\/api\/decks\/[^/]+\/generate\/?$/.test(apiPath(response.url())) &&
        response.request().method() === 'POST',
      { timeout: 90_000 },
    )

    await createDialog.getByRole('button', { name: 'Create & Generate' }).click()

    const createRes = await createDone
    expect(createRes.ok(), `POST /api/decks failed: ${createRes.status()}`).toBeTruthy()

    // Redirect is immediate after create (may still have ?generating=1).
    await expect(page).toHaveURL(/\/flashcards\/[^/?#]+(?:\?|$)/, { timeout: 30_000 })
    const generateRes = await generateDone
    expect(generateRes.ok(), `POST generate failed: ${generateRes.status()}`).toBeTruthy()
    for (const card of FIXTURE_CARDS) {
      await expect(page.getByText(card.front, { exact: true })).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(`→ ${card.back}`)).toBeVisible()
    }

    // 5. Mock exam: Batch L draft → /:id?generating=1 → mocked generate → engage
    await page.goto(`/mock-exam?noteId=${encodeURIComponent(noteId!)}`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByRole('heading', { name: /Configure the simulation/i })).toBeVisible()
    const startExam = page.getByRole('button', { name: /Start Mock Exam/ })
    await expect(startExam).toBeEnabled({ timeout: 20_000 })

    // Arm listeners BEFORE click (same Batch L pattern as flashcards).
    const mockCreateDone = page.waitForResponse(
      (response) =>
        apiPath(response.url()) === '/api/mock-exam' &&
        response.request().method() === 'POST',
      { timeout: 90_000 },
    )
    const mockGenerateDone = page.waitForResponse(
      (response) =>
        /\/api\/mock-exam\/[^/]+\/generate\/?$/.test(apiPath(response.url())) &&
        response.request().method() === 'POST',
      { timeout: 90_000 },
    )

    await startExam.click()

    const mockCreateRes = await mockCreateDone
    expect(mockCreateRes.ok(), `POST /api/mock-exam draft failed: ${mockCreateRes.status()}`).toBeTruthy()

    await expect(page).toHaveURL(/\/mock-exam\/[^/?#]+(?:\?|$)/, { timeout: 30_000 })
    const mockGenerateRes = await mockGenerateDone
    expect(mockGenerateRes.ok(), `POST mock generate failed: ${mockGenerateRes.status()}`).toBeTruthy()

    await expect(page.getByRole('button', { name: /Engage Simulation/ })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole('button', { name: /Engage Simulation/ }).click()
    await page.getByRole('button', { name: MC_CORRECT }).click()
    await page.getByRole('button', { name: 'Submit Exam' }).click()
    await expect(page.getByText('Result', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('questions correct')).toBeVisible()
    await expect(page.getByText('100%', { exact: true })).toBeVisible()

    // 6. Nova: intercept chat, reply + linked note context
    await page.goto(`/tutor?noteId=${encodeURIComponent(noteId!)}`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByRole('heading', { name: 'Nova' })).toBeVisible()
    const contextPanel = page.getByRole('complementary', { name: 'Context panel' })
    await expect(contextPanel.getByRole('heading', { name: 'Linked Note' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(contextPanel.getByText(noteTitle, { exact: true })).toBeVisible()
    await expect(contextPanel.getByRole('button', { name: 'Unlink note' })).toBeVisible()

    await page.locator('#nova-input').fill('What does chlorophyll do in photosynthesis?')
    await page.getByRole('button', { name: 'Send message to Nova' }).click()
    await expect(page.getByText(NOVA_REPLY)).toBeVisible({ timeout: 20_000 })
  })
})
