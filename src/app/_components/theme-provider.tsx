'use client'
import { useEffect, useState, createContext, useContext } from 'react'

export type VisualTheme = 'system' | 'dark' | 'light'

const ThemeContext = createContext<{
  theme: VisualTheme
  setTheme: (t: VisualTheme) => void
}>({ theme: 'dark', setTheme: () => {} })

export const useTheme = () => useContext(ThemeContext)

const LEGACY_DARK = new Set([
  'midnight',
  'focus',
  'arcade',
  'velocity',
  'campus',
  'studio',
  'dark',
])

function normalizeTheme(raw: string | null): VisualTheme {
  if (!raw) return 'dark'
  if (raw === 'light' || raw === 'paper') return 'light'
  if (raw === 'system' || raw === 'auto') return 'system'
  if (LEGACY_DARK.has(raw)) return 'dark'
  return 'dark'
}

function resolvedDataTheme(theme: VisualTheme): 'dark' | 'light' {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: VisualTheme) {
  document.documentElement.setAttribute('data-theme', resolvedDataTheme(theme))
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<VisualTheme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = normalizeTheme(localStorage.getItem('kyvex-theme'))
    setThemeState(saved)
    applyTheme(saved)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mounted, theme])

  const setTheme = (t: VisualTheme) => {
    setThemeState(t)
    localStorage.setItem('kyvex-theme', t)
    applyTheme(t)
  }

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
