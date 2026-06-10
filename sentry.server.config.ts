import * as Sentry from '@sentry/nextjs'

// Server-runtime Sentry init. Inert unless SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN)
// is set, so local/dev/test never phone home.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
})
