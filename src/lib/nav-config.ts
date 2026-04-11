export const NAV_SECTIONS = [
  {
    key: 'home',
    label: 'Home',
    icon: '🏠',
    color: '#f0b429',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: '🏠' },
      { key: 'curriculum', label: 'Ontario Curriculum', href: '/curriculum', icon: '🍁' },
    ],
  },
  {
    key: 'study',
    label: 'Study',
    icon: '📚',
    color: '#2dd4bf',
    items: [
      { key: 'my-notes', label: 'My Notes', href: '/my-notes', icon: '📝' },
      { key: 'flashcards', label: 'Flashcards', href: '/flashcards', icon: '🃏' },
      { key: 'capture', label: 'Capture', href: '/capture', icon: '📸' },
    ],
  },
  {
    key: 'ai',
    label: 'AI',
    icon: '🤖',
    color: '#8b5cf6',
    items: [
      { key: 'tutor', label: 'Nova AI Tutor', href: '/tutor', icon: '🤖' },
    ],
  },
] as const

export type NavSection = (typeof NAV_SECTIONS)[number]
export type NavItem = NavSection['items'][number]
export type NavStyle = 'minimal' | 'icons' | 'bottom' | 'topnav'
