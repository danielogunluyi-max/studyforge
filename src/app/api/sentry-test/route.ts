// THROWAWAY verification route. Always throws so Sentry's onRequestError hook
// (src/instrumentation.ts) captures a server-side error with a readable stack
// trace. Delete this file once Sentry is confirmed working.
export function GET() {
  throw new Error('Kyvex Sentry test — intentional server route error')
}
