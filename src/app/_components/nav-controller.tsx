'use client'
import { useState, useEffect } from 'react'
import NavMinimal from './nav-minimal'
import NavIcons from './nav-icons'
import NavBottom from './nav-bottom'

export type { NavStyle } from '~/lib/nav-config'

export default function NavController() {
  const [navStyle, setNavStyle] = useState<string>('minimal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kyvex-nav-style') || 'minimal'
    setNavStyle(saved)
    setMounted(true)

    const handler = () => {
      const updated = localStorage.getItem('kyvex-nav-style') || 'minimal'
      setNavStyle(updated)
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
