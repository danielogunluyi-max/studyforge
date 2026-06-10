// Thin, no-op-safe wrapper around posthog-js. Components import from here
// instead of posthog-js directly, so analytics is a guaranteed no-op whenever
// NEXT_PUBLIC_POSTHOG_KEY is unset (local dev, preview, tests).
import posthog from 'posthog-js'

let initialized = false

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    persistence: 'localStorage+cookie',
  })
  initialized = true
}

export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function identifyUser(id: string, properties?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.identify(id, properties)
}

export function resetAnalytics(): void {
  if (!initialized) return
  posthog.reset()
}
