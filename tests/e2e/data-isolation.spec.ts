import { expect, test } from '@playwright/test'

import { createTestUser, registerUser } from './support/auth'

type CalendarEvent = { id: string; title: string }

test.describe('cross-user data isolation', () => {
  test('User B cannot read or delete User A calendar events', async ({ browser }) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const uniqueTitle = `isolation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // ── User A creates a private calendar event ──────────────────────────
    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    const userA = createTestUser()
    await registerUser(pageA, userA)

    const created = await pageA.evaluate(
      async ({ title, date }) => {
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date, type: 'reminder' }),
        })
        return {
          status: res.status,
          body: (await res.json()) as { event?: { id: string } },
        }
      },
      { title: uniqueTitle, date: now.toISOString() },
    )
    expect(created.status).toBe(200)
    const eventId = created.body.event?.id
    expect(eventId, 'expected a created event id').toBeTruthy()

    // ── User B (separate session) must not see A's event in their list ───
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()
    const userB = createTestUser()
    await registerUser(pageB, userB)

    const bView = await pageB.evaluate(
      async ({ year, month }) => {
        const res = await fetch(`/api/calendar?year=${year}&month=${month}`)
        return {
          status: res.status,
          body: (await res.json()) as { events?: CalendarEvent[] },
        }
      },
      { year, month },
    )
    expect(bView.status).toBe(200)
    const bEvents = bView.body.events ?? []
    expect(bEvents.map((e) => e.id)).not.toContain(eventId)
    expect(bEvents.map((e) => e.title)).not.toContain(uniqueTitle)

    // ── User B cannot delete A's event (write isolation) ─────────────────
    await pageB.evaluate(async (id) => {
      await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
    }, eventId as string)

    // ── A's event still exists afterwards ────────────────────────────────
    const aView = await pageA.evaluate(
      async ({ year, month }) => {
        const res = await fetch(`/api/calendar?year=${year}&month=${month}`)
        return (await res.json()) as { events?: CalendarEvent[] }
      },
      { year, month },
    )
    expect((aView.events ?? []).map((e) => e.id)).toContain(eventId)

    await contextA.close()
    await contextB.close()
  })
})
