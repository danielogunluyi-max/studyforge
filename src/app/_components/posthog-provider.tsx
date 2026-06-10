'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { initAnalytics, identifyUser, resetAnalytics } from '~/lib/analytics'

// Initializes PostHog once on the client. Renders nothing; safe no-op when
// NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is unset. Mounted in the root layout.
export function PostHogProvider() {
  const { data: session, status } = useSession()

  useEffect(() => {
    initAnalytics()
  }, [])

  // Tie analytics events to the signed-in user; clear identity on sign-out.
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      identifyUser(session.user.id)
    } else if (status === 'unauthenticated') {
      resetAnalytics()
    }
  }, [status, session?.user?.id])

  return null
}
