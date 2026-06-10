import * as Sentry from '@sentry/nextjs'

// Next.js server/edge instrumentation hook. Loads the matching Sentry config
// for the active runtime. Both configs are inert unless a DSN is set.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Captures uncaught errors thrown in App Router server components, route
// handlers, and server actions (this is where Prisma query failures surface).
export const onRequestError = Sentry.captureRequestError
