'use client'
import { useState, useEffect } from 'react'
import NavMinimal from './nav-minimal'
import NavIcons from './nav-icons'
import NavBottom from './nav-bottom'

import type { NavStyle } from '~/lib/nav-config'
export type { NavStyle } from '~/lib/nav-config'

export default function NavController() {
  const [navStyle, setNavStyle] = useState<NavStyle>('minimal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kyvex-nav-style') as NavStyle || 'minimal'
    setNavStyle(saved)
    setMounted(true)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const style = (e as CustomEvent).detail as NavStyle
      if (style) setNavStyle(style)
      else {
        const updated = localStorage.getItem('kyvex-nav-style') as NavStyle || 'minimal'
        setNavStyle(updated)
      }
    }
    window.addEventListener('kyvex-nav-changed', handler)
    return () => window.removeEventListener('kyvex-nav-changed', handler)
  }, [])

  if (!mounted) return null
  if (navStyle === 'icons') return <NavIcons />
  if (navStyle === 'bottom') return <NavBottom />
  if (navStyle === 'topnav') return null // topnav renders in topbar
  return <NavMinimal />
}
