'use client'
import { useEffect, useState, createContext, useContext } from 'react'

type Theme = 'midnight' | 'focus' | 'arcade' | 'velocity' | 'campus' | 'light'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'midnight', setTheme: () => {} })

export const useTheme = () => useContext(ThemeContext)

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('midnight')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kyvex-theme') as Theme || 'midnight'
    setThemeState(saved)
    if (saved !== 'midnight') {
      document.documentElement.setAttribute('data-theme', saved)
    }
    setMounted(true)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('kyvex-theme', t)
    if (t === 'midnight') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', t)
    }
  }

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
