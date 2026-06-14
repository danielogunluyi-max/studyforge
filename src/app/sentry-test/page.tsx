'use client'

import * as Sentry from '@sentry/nextjs'
import { useState, type CSSProperties } from 'react'

// THROWAWAY verification page. Delete (this file + src/app/api/sentry-test/
// route.ts, and the '/sentry-test' entry in middleware.ts) once Sentry is
// confirmed working. Sentry only reports when a DSN is configured (production,
// or by adding NEXT_PUBLIC_SENTRY_DSN/SENTRY_DSN to .env.local).
export default function SentryTestPage() {
  const [status, setStatus] = useState('')

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Sentry test page</h1>
      <p style={{ color: '#666', marginBottom: 24, lineHeight: 1.5 }}>
        Throwaway page to verify Sentry <strong>Issues</strong>, <strong>Traces</strong>,{' '}
        <strong>Logs</strong>, and <strong>Session Replay</strong>. Click a button, then check
        your Sentry dashboard. Delete this page once confirmed.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          style={btn}
          onClick={() => {
            throw new Error('Kyvex Sentry test — uncaught client error')
          }}
        >
          1. Throw uncaught client error (tests error boundary + Replay)
        </button>

        <button
          style={btn}
          onClick={() => {
            Sentry.captureException(new Error('Kyvex Sentry test — handled exception'))
            setStatus(`Sent captureException at ${new Date().toLocaleTimeString()}`)
          }}
        >
          2. Capture handled exception
        </button>

        <button
          style={btn}
          onClick={() => {
            Sentry.captureMessage('Kyvex Sentry test — captureMessage', 'info')
            setStatus(`Sent captureMessage at ${new Date().toLocaleTimeString()}`)
          }}
        >
          3. Send test message
        </button>

        <button
          style={btn}
          onClick={() => {
            Sentry.logger.info('Kyvex Sentry test — structured log', { source: 'sentry-test' })
            setStatus(`Sent structured log at ${new Date().toLocaleTimeString()}`)
          }}
        >
          4. Send structured log (tests Logs)
        </button>

        <button
          style={btn}
          onClick={async () => {
            setStatus('Calling /api/sentry-test ...')
            const res = await fetch('/api/sentry-test')
            setStatus(`Server responded ${res.status} (500 expected) — check Sentry for the server error`)
          }}
        >
          5. Trigger server error via /api/sentry-test (tests server capture)
        </button>
      </div>

      {status && <p style={{ marginTop: 20, color: '#0a7', fontWeight: 600 }}>{status}</p>}
    </main>
  )
}

const wrap: CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  padding: '48px 24px',
  fontFamily: 'system-ui, sans-serif',
}

const btn: CSSProperties = {
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#f7f7f8',
  cursor: 'pointer',
  fontSize: 15,
  textAlign: 'left',
}
