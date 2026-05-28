'use client'

import { useEffect } from 'react'

export function LandingBodyMarker({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.setAttribute('data-landing-page', 'true')
    return () => document.body.removeAttribute('data-landing-page')
  }, [])

  return <>{children}</>
}
