import * as Sentry from '@sentry/nextjs'

// Server-runtime Sentry init. Inert unless SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN)
// is set, so local/dev/test never phone home.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,

  // Attach user IP + request headers to events for richer debugging context.
  sendDefaultPii: true,

  // Full tracing in dev, sampled in prod to control event volume.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Attach local variable values to server-side stack frames.
  includeLocalVariables: true,

  // Structured logs via Sentry.logger.*.
  enableLogs: true,

  debug: false,
})
