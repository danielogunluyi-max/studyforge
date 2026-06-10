import * as Sentry from '@sentry/nextjs'

// Edge-runtime Sentry init (middleware / edge routes). Inert unless a DSN is set.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
})
