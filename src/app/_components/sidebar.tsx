'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useState } from 'react'
import NovaPet from '~/app/_components/nova-pet'
import {
  type SidebarDensity,
  type SidebarLabelMode,
  type SidebarPlacement,
  SIDEBAR_PREFERENCES_EVENT,
  persistSidebarDensity,
  persistSidebarLabelMode,
  readSidebarDensity,
  readSidebarLabelMode,
} from '~/app/_components/sidebar-layout'

type SidebarProps = {
  mobileOpen: boolean
  onCloseMobile: () => void
  placement: SidebarPlacement
  onPlacementChange: (next: SidebarPlacement) => void
}

type NavItem = {
  href: string
  label: string
  icon: ReactNode
}

function NavIcon({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <span style={{
      width: '16px',
      height: '16px',
      minWidth: '16px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'currentColor',
      filter: active ? 'drop-shadow(0 0 6px rgba(240,180,41,0.5))' : 'none',
    }}>
      {children}
    </span>
  )
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name?.trim() || email?.trim() || 'SF').split(' ')
  if (source.length >= 2) {
    return `${source[0]?.[0] ?? 'S'}${source[1]?.[0] ?? 'F'}`.toUpperCase()
  }
  return (source[0]?.slice(0, 2) ?? 'SF').toUpperCase()
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({ mobileOpen, onCloseMobile, placement, onPlacementChange }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const [collapseHover, setCollapseHover] = useState(false)
  const [dragHint, setDragHint] = useState<SidebarPlacement | null>(null)
  const [navDensity, setNavDensity] = useState<SidebarDensity>('expanded')
  const [navLabelMode, setNavLabelMode] = useState<SidebarLabelMode>('always')

  useEffect(() => {
    const syncPreferences = () => {
      setNavDensity(readSidebarDensity())
      setNavLabelMode(readSidebarLabelMode())
    }

    syncPreferences()
    window.addEventListener(SIDEBAR_PREFERENCES_EVENT, syncPreferences as EventListener)

    return () => {
      window.removeEventListener(SIDEBAR_PREFERENCES_EVENT, syncPreferences as EventListener)
    }
  }, [])

  function updateNavDensity(next: SidebarDensity) {
    setNavDensity(next)
    persistSidebarDensity(next)
  }

  function updateNavLabelMode(next: SidebarLabelMode) {
    setNavLabelMode(next)
    persistSidebarLabelMode(next)
  }

  const isHorizontal = placement === 'top' || placement === 'bottom'
  const effectiveCollapsed = isHorizontal ? false : collapsed
  const compactDensity = navDensity === 'compact'
  const horizontalDockHeight = compactDensity ? 106 : 122

  // â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const mainItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3.75" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="3.75" y="13.5" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="13.5" width="6.75" height="6.75" rx="1.5" /></svg>,
    },
    {
      href: '/results',
      label: 'My Results',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75h7.5m-8.25-12v3m4.5-3v6m4.5-6v9" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h9l-.75 2.25H8.25L7.5 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 18.75 12 21l2.25-2.25" /></svg>,
    },
    {
      href: '/calendar',
      label: 'Calendar',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3.75" y="5.25" width="16.5" height="15" rx="2.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75v3M16.5 3.75v3M3.75 9.75h16.5" /></svg>,
    },
    {
      href: '/mastery',
      label: 'Mastery Chart',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75 9 4.5l6 2.25 5.25-2.25v12.75L15 19.5 9 17.25l-5.25 2.25V6.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v12.75M15 6.75V19.5" /></svg>,
    },
    {
      href: '/curriculum',
      label: 'Curriculum',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h11.25A2.25 2.25 0 0118 6.75V19.5l-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5V6.75A2.25 2.25 0 014.5 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 9h7.5M7.5 12.75h7.5" /></svg>,
    },
  ]

  // â”€â”€ STUDY TOOLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const studyToolItems: NavItem[] = [
    {
      href: '/my-notes',
      label: 'My Notes',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5v15l-5.25-2.625L6.75 19.5v-15z" /></svg>,
    },
    {
      href: '/classroom-import',
      label: 'Classroom Import',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5 3.75 9 12 13.5 20.25 9 12 4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 11.25v3.75c0 1.243 2.015 2.25 4.5 2.25s4.5-1.007 4.5-2.25v-3.75" /></svg>,
    },
    {
      href: '/upload',
      label: 'Upload File',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V6m0 0 3.75 3.75M12 6 8.25 9.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5v1.5A2.25 2.25 0 006.75 20.25h10.5A2.25 2.25 0 0019.5 18v-1.5" /></svg>,
    },
    {
      href: '/audio',
      label: 'Audio to Notes',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    },
    {
      href: '/scan',
      label: 'Scan Notes',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h3l1.5-2.25h7.5l1.5 2.25h3A1.5 1.5 0 0121.75 9v9.75A1.5 1.5 0 0120.25 20.25H3.75A1.5 1.5 0 012.25 18.75V9A1.5 1.5 0 013.75 7.5z" /><circle cx="12" cy="13" r="3.25" /></svg>,
    },
    {
      href: '/feynman',
      label: 'Feynman Technique',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5a3 3 0 016 0v.4a2.75 2.75 0 012.25 2.7v.9a2.5 2.5 0 011.5 2.3 2.5 2.5 0 01-1.5 2.3v.9a2.75 2.75 0 01-2.25 2.7v.4a3 3 0 01-6 0v-.4A2.75 2.75 0 016.75 14v-.9a2.5 2.5 0 01-1.5-2.3 2.5 2.5 0 011.5-2.3v-.9A2.75 2.75 0 019 4.9v-.4Z" /></svg>,
    },
    {
      href: '/planner',
      label: 'Study Planner',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="16" height="15" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4M16 3v4M4 10h16" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h2M13 14h2M9 17h2" /></svg>,
    },
    {
      href: '/pdfs',
      label: 'PDF Library',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    },
    {
      href: '/listen',
      label: 'Listen to Notes',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    },
  ]

  // â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createItems: NavItem[] = [
    {
      href: '/generator',
      label: 'Generator',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" /></svg>,
    },
    {
      href: '/diagrams',
      label: 'Diagram Generator',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="12" cy="19" r="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.7 10.9 10.3 6.1M13.7 6.1l3.6 4.8M17.3 13.1 13.7 17.9M10.3 17.9 6.7 13.1" /></svg>,
    },
    {
      href: '/presentation',
      label: 'Presentations',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    },
    {
      href: '/photo-quiz',
      label: 'Photo Quiz',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    },
    {
      href: '/podcast',
      label: 'Podcast',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    },
    {
      href: '/cornell',
      label: 'Cornell Notes',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5v15H6.75V4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 16.5h10.5M9 4.5v12" /></svg>,
    },
  ]

  // â”€â”€ FLASHCARDS & EXAMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const flashcardItems: NavItem[] = [
    {
      href: '/flashcards',
      label: 'Flashcards',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="6" width="16" height="12" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" /></svg>,
    },
    {
      href: '/exam-predictor',
      label: 'Exam Predictor',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8.25" /><circle cx="12" cy="12" r="4.25" /><circle cx="12" cy="12" r="1.25" /></svg>,
    },
    {
      href: '/mock-exam',
      label: 'Mock Exam',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h9l3 3v13.5a1.5 1.5 0 01-1.5 1.5h-10.5A1.5 1.5 0 014.5 20.25V5.25A1.5 1.5 0 016 3.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5h6M9 14.25h6M9 18h4.5" /></svg>,
    },
    {
      href: '/quizlet-import',
      label: 'Quizlet Import',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    },
  ]

  // â”€â”€ AI TOOLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const aiToolItems: NavItem[] = [
    {
      href: '/tutor',
      label: 'Nova AI Tutor',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l1.8 3.9L18 9.5l-4.2 1.85L12 15.25l-1.8-3.9L6 9.5l4.2-1.85L12 3.75z" /></svg>,
    },
    {
      href: '/voice-tutor',
      label: 'Voice Tutor',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 10.5V12a7 7 0 11-14 0v-1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5V22.5M9 22.5h6" /></svg>,
    },
    {
      href: '/concept-web',
      label: 'Concept Web',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="12" cy="19" r="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.7 10.9 10.3 6.1M13.7 6.1l3.6 4.8M17.3 13.1 13.7 17.9M10.3 17.9 6.7 13.1" /></svg>,
    },
    {
      href: '/learning-style-quiz',
      label: 'Learning Style',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5a3 3 0 016 0v.4a2.75 2.75 0 012.25 2.7v.9a2.5 2.5 0 011.5 2.3 2.5 2.5 0 01-1.5 2.3v.9a2.75 2.75 0 01-2.25 2.7v.4a3 3 0 01-6 0v-.4A2.75 2.75 0 016.75 14v-.9a2.5 2.5 0 01-1.5-2.3 2.5 2.5 0 011.5-2.3v-.9A2.75 2.75 0 019 4.9v-.4Z" /></svg>,
    },
    {
      href: '/focus',
      label: 'Focus Mode',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    },
  ]

  // â”€â”€ RESEARCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const researchItems: NavItem[] = [
    {
      href: '/citations',
      label: 'Citations',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25A2.25 2.25 0 016.75 3h10.5v16.5H6.75A2.25 2.25 0 014.5 17.25V5.25z" /></svg>,
    },
    {
      href: '/syllabus',
      label: 'Syllabus Scan',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>,
    },
    {
      href: '/youtube-import',
      label: 'YouTube Import',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>,
    },
    {
      href: '/library',
      label: 'Study Library',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
    },
    {
      href: '/search',
      label: 'Search',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 106.15 6.15a7.5 7.5 0 0010.5 10.5z" /></svg>,
    },
    {
      href: '/capture',
      label: 'Quick Capture',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h12a1.5 1.5 0 011.5 1.5v12A1.5 1.5 0 0118 19.5H6A1.5 1.5 0 014.5 18V6A1.5 1.5 0 016 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9h7.5M8.25 12.75h7.5M8.25 16.5h4.5" /></svg>,
    },
    {
      href: '/narrative',
      label: 'Narrative',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h11.25A2.25 2.25 0 0118 6.75V19.5l-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5V6.75A2.25 2.25 0 014.5 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 9h7.5M7.5 12.75h7.5" /></svg>,
    },
  ]

  // â”€â”€ DISCOVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const discoverItems: NavItem[] = [
    {
      href: '/games',
      label: 'Games',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 9h10.5a3 3 0 013 3v3.75a2.25 2.25 0 01-2.25 2.25h-2.25l-2.25-2.25h-3l-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V12a3 3 0 013-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12.75h1.5M9 12v1.5M15.75 12.75h.008v.008h-.008zM17.25 14.25h.008v.008h-.008z" /></svg>,
    },
    {
      href: '/battle',
      label: 'Battle Arena',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m7 5 5 5M5.5 7.5 9 4M4 9l4-4M17 5l-5 5m6.5-2.5L15 4m5 5-4-4" /></svg>,
    },
    {
      href: '/battle-royale',
      label: 'Battle Royale',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
    },
    {
      href: '/study-groups',
      label: 'Study Groups',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75v-1.5a3.75 3.75 0 00-7.5 0v1.5M12.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM19.5 9a1.5 1.5 0 11-3 0" /></svg>,
    },
    {
      href: '/rooms',
      label: 'Study Rooms',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
  ]

  // â”€â”€ ANALYTICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const analyticsItems: NavItem[] = [
    {
      href: '/study-dna',
      label: 'Study DNA',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3c0 3 3 3 3 6s-3 3-3 6M15 3c0 3-3 3-3 6s3 3 3 6M6 8h12M6 16h12" /></svg>,
    },
    {
      href: '/autopsy',
      label: 'Exam Autopsy',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      href: '/decay-alerts',
      label: 'Decay Alerts',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      href: '/concept-collision',
      label: 'Concept Collision',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    },
    {
      href: '/grade-calc',
      label: 'Grade Calc',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5V13.5zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75V13.5zm0 2.25h.008v.008H12.75v-.008zm2.25-4.5h.008v.008H15v-.008zm0 2.25h.008v.008H15V13.5zm6-3V18a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V8.25a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 8.25zm-6-3H9V4.5a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75V5.25z" /></svg>,
    },
  ]

  // â”€â”€ TRAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const trainItems: NavItem[] = [
    {
      href: '/reading-speed',
      label: '⚡ Reading Speed',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12S7.5 6.75 12 6.75 20.25 12 20.25 12 16.5 17.25 12 17.25 3.75 12 3.75 12z" /><circle cx="12" cy="12" r="2.25" /></svg>,
    },
    {
      href: '/micro-lessons',
      label: '📖 Micro-Lessons',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25h6.75v13.5H4.5V5.25zM12.75 5.25h6.75v13.5h-6.75V5.25z" /></svg>,
    },
    {
      href: '/lecture',
      label: '🎤 Live Lecture',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 10.5V12a7 7 0 11-14 0v-1.5" /></svg>,
    },
    {
      href: '/counterargument',
      label: '⚔️ Counterargument',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m7 5 5 5M5.5 7.5 9 4M4 9l4-4M17 5l-5 5m6.5-2.5L15 4m5 5-4-4" /></svg>,
    },
    {
      href: '/adaptive-notes',
      label: '🎯 Adaptive Notes',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8.25" /><circle cx="12" cy="12" r="4.25" /><circle cx="12" cy="12" r="1.25" /></svg>,
    },
  ]

  // â”€â”€ CHALLENGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const challengeItems: NavItem[] = [
    {
      href: '/crossover',
      label: '🔀 Crossover Challenge',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h4.5v4.5H7.5V7.5zM12 12h4.5v4.5H12V12z" /></svg>,
    },
    {
      href: '/debate-judge',
      label: '🧑‍⚖️ Debate Judge',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15M6.75 8.25h10.5M8.25 8.25l-2.25 4.5h4.5l-2.25-4.5zm9.75 0-2.25 4.5h4.5L18 8.25z" /></svg>,
    },
  ]

  // â”€â”€ INTELLIGENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const intelligenceItems: NavItem[] = [
    {
      href: '/kyvex-iq',
      label: '🧬 Kyvex IQ',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75v16.5M8.25 7.5c0 2.07 1.68 3.75 3.75 3.75s3.75 1.68 3.75 3.75" /></svg>,
    },
    {
      href: '/memory-sim',
      label: '🧠 Memory Sim',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5a3 3 0 016 0v.4a2.75 2.75 0 012.25 2.7v.9a2.5 2.5 0 011.5 2.3 2.5 2.5 0 01-1.5 2.3v.9a2.75 2.75 0 01-2.25 2.7v.4a3 3 0 01-6 0v-.4A2.75 2.75 0 016.75 14v-.9a2.5 2.5 0 01-1.5-2.3 2.5 2.5 0 011.5-2.3v-.9A2.75 2.75 0 019 4.9v-.4Z" /></svg>,
    },
    {
      href: '/career-path',
      label: '🗺️ Career Path',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75 9 4.5l6 2.25 5.25-2.25v12.75L15 19.5 9 17.25l-5.25 2.25V6.75z" /></svg>,
    },
    {
      href: '/contract',
      label: '📜 Study Contract',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h9l3 3v13.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V5.25A1.5 1.5 0 016 3.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5h6M9 14.25h6" /></svg>,
    },
    {
      href: '/focus-score',
      label: '🎯 Focus Score',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8.25" /><circle cx="12" cy="12" r="4.25" /><circle cx="12" cy="12" r="1.25" /></svg>,
    },
  ]

  // â”€â”€ NOTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const notesItems: NavItem[] = [
    {
      href: '/note-evolution',
      label: '📈 Note Evolution',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5V4.5m0 15h15" /><path strokeLinecap="round" strokeLinejoin="round" d="m7.5 15 3-3 2.25 2.25L18 9" /></svg>,
    },
  ]

  // â”€â”€ SOCIAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const socialItems: NavItem[] = [
    {
      href: '/community',
      label: 'Community',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75A2.25 2.25 0 016 4.5h12a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0118 16.5H9.75L6 19.5v-3H6a2.25 2.25 0 01-2.25-2.25v-7.5z" /></svg>,
    },
    {
      href: '/match',
      label: 'Study Buddy',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    },
    {
      href: '/peer-review',
      label: '🤝 Peer Review',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75v-1.5a3.75 3.75 0 00-7.5 0v1.5M12 12a3 3 0 100-6 3 3 0 000 6z" /></svg>,
    },
  ]

  // â”€â”€ PERSONAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const personalItems: NavItem[] = [
    {
      href: '/achievements',
      label: 'Achievements',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75v-1.5a3.375 3.375 0 00-3.375-3.375h-1.5A3.375 3.375 0 008.25 17.25v1.5M12 3.75l1.5 3h3l-2.5 2 1 3L12 10.25 9 11.75l1-3L7.5 6.75h3L12 3.75z" /></svg>,
    },
    {
      href: '/wrapped',
      label: 'Wrapped',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
    },
    {
      href: '/study-ghost',
      label: 'Study Ghost',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3C9.24 3 7 5.24 7 8v8l-1.5 1.5A1 1 0 006.5 19h11a1 1 0 00.71-1.71L16 16V8c0-2.76-2.24-5-4-5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 21h6" /></svg>,
    },
    {
      href: '/referral',
      label: 'Referral',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>,
    },
    {
      href: '/wellness',
      label: 'Wellness',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7.5-4.35-7.5-10.05A4.95 4.95 0 0112 7.8a4.95 4.95 0 017.5 3.15C19.5 16.65 12 21 12 21z" /></svg>,
    },
    {
      href: '/habits',
      label: 'Habits',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h9a1.5 1.5 0 011.5 1.5v13.5A1.5 1.5 0 0116.5 21h-9A1.5 1.5 0 016 19.5V6A1.5 1.5 0 017.5 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6M9 13h6M9 17h3" /></svg>,
    },
    {
      href: '/interleave',
      label: 'Interleave',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" /><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 6 2.25 1.5L8.25 9M13.5 10.5l2.25 1.5-2.25 1.5M6.75 15l2.25 1.5L6.75 18" /></svg>,
    },
    {
      href: '/predictor',
      label: 'Predictor',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5V4.5m0 15h15" /><path strokeLinecap="round" strokeLinejoin="round" d="m7.5 15 3-3 2.25 2.25L18 9" /></svg>,
    },
    {
      href: '/essay-grade',
      label: 'Essay Grader',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>,
    },
    {
      href: '/handwriting',
      label: 'Handwriting Scan',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>,
    },
    {
      href: '/compress',
      label: 'Compress',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 6h9M7.5 12h9M7.5 18h5.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 6 16.5 9 19.5 12" /></svg>,
    },
    {
      href: '/debate',
      label: 'Debate',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h6v6h-6zM10.5 16.5h6v6h-6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5h3m-6 9h-3" /></svg>,
    },
  ]
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
    } catch {
    }
    onCloseMobile()
    router.push('/')
    setTimeout(() => window.location.reload(), 100)
  }

  const userName = session?.user?.name ?? 'Kyvex User'
  const userEmail = session?.user?.email ?? 'student@kyvex.app'
  const initials = getInitials(session?.user?.name, session?.user?.email)
  const allItems = [
    ...mainItems,
    ...studyToolItems,
    ...trainItems,
    ...createItems,
    ...flashcardItems,
    ...aiToolItems,
    ...researchItems,
    ...discoverItems,
    ...challengeItems,
    ...analyticsItems,
    ...intelligenceItems,
    ...notesItems,
    ...socialItems,
    ...personalItems,
  ]

  function nearestEdge(x: number, y: number): SidebarPlacement {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const distances: Record<SidebarPlacement, number> = {
      left: x,
      right: Math.max(0, vw - x),
      top: y,
      bottom: Math.max(0, vh - y),
    }
    return Object.entries(distances).sort((a, b) => a[1] - b[1])[0]?.[0] as SidebarPlacement
  }

  function startDockDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (window.innerWidth < 768) return
    event.preventDefault()

    const move = (e: PointerEvent) => {
      setDragHint(nearestEdge(e.clientX, e.clientY))
    }

    const stop = (e: PointerEvent) => {
      const next = nearestEdge(e.clientX, e.clientY)
      setDragHint(null)
      onPlacementChange(next)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  const renderNavGroup = (label: string, items: NavItem[]) => (
    <div style={{ position: 'relative' }}>
      {!effectiveCollapsed && (
        <p style={{
          fontSize: '9px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          padding: '20px 16px 6px',
        }}>
          {label}
        </p>
      )}
      <div>
        {items.map((item) => {
          const active = isActivePath(pathname, item.href)
          const hovered = hoveredHref === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              onMouseEnter={() => setHoveredHref(item.href)}
              onMouseLeave={() => setHoveredHref((current) => (current === item.href ? null : current))}
              title={effectiveCollapsed ? item.label : undefined}
              style={{
                position: 'relative',
                margin: '2px 8px',
                padding: effectiveCollapsed ? '9px 0' : '9px 12px',
                minHeight: compactDensity ? '34px' : '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                gap: effectiveCollapsed ? '0px' : '10px',
                color: active ? '#f0b429' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                background: active
                  ? 'linear-gradient(135deg, rgba(240,180,41,0.18) 0%, rgba(45,212,191,0.08) 100%)'
                  : hovered
                    ? 'var(--bg-elevated)'
                    : 'transparent',
                border: active
                  ? '1px solid rgba(240,180,41,0.3)'
                  : hovered
                    ? '1px solid var(--border-subtle)'
                    : '1px solid transparent',
                boxShadow: active ? '0 2px 12px rgba(240,180,41,0.12)' : 'none',
                transform: hovered ? 'translateX(2px)' : 'translateX(0)',
                textDecoration: 'none',
              }}
            >
              {active && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '-8px',
                    width: '3px',
                    height: '20px',
                    background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                    borderRadius: '999px',
                  }}
                />
              )}
              <NavIcon active={active}>{item.icon}</NavIcon>
              {!effectiveCollapsed && (
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: navLabelMode === 'always' || hovered || active ? '180px' : '0px',
                    opacity: navLabelMode === 'always' || hovered || active ? 1 : 0,
                    transition: 'max-width 0.18s ease, opacity 0.18s ease',
                  }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .sidebar-overlay {
            display: none !important;
          }
          .sidebar-panel {
            position: static !important;
            transform: translateX(0) !important;
          }
        }

        .sidebar-hint {
          position: fixed;
          z-index: 80;
          pointer-events: none;
          background: rgba(240,180,41,0.12);
          border: 1px solid rgba(240,180,41,0.35);
          box-shadow: 0 0 0 1px rgba(45,212,191,0.2) inset;
          backdrop-filter: blur(4px);
          border-radius: 16px;
        }
      `}</style>

      {dragHint && (
        <div
          className="sidebar-hint"
          style={
            dragHint === 'left'
              ? { left: 0, top: 0, bottom: 0, width: 96 }
              : dragHint === 'right'
                ? { right: 0, top: 0, bottom: 0, width: 96 }
                : dragHint === 'top'
                  ? { top: 0, left: 0, right: 0, height: 92 }
                  : { bottom: 0, left: 0, right: 0, height: 92 }
          }
        />
      )}

      <div
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
        className="sidebar-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.6)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      <aside
        className="sidebar-panel"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          width: isHorizontal ? '100%' : effectiveCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          minWidth: isHorizontal ? '100%' : effectiveCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          height: isHorizontal ? `${horizontalDockHeight}px` : '100%',
          minHeight: isHorizontal ? `${horizontalDockHeight}px` : '100%',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease, width 0.2s ease',
          background: 'linear-gradient(180deg, rgba(7, 12, 22, 0.98), rgba(5, 9, 18, 0.98))',
          borderRight: placement === 'left' ? '1px solid rgba(240,180,41,0.12)' : 'none',
          borderLeft: placement === 'right' ? '1px solid rgba(240,180,41,0.12)' : 'none',
          borderBottom: placement === 'top' ? '1px solid rgba(240,180,41,0.12)' : 'none',
          borderTop: placement === 'bottom' ? '1px solid rgba(240,180,41,0.12)' : 'none',
          boxShadow: placement === 'left'
            ? '8px 0 34px rgba(0,0,0,0.42)'
            : placement === 'right'
              ? '-8px 0 34px rgba(0,0,0,0.42)'
              : placement === 'top'
                ? '0 10px 30px rgba(0,0,0,0.36)'
                : '0 -10px 30px rgba(0,0,0,0.36)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Link href="/dashboard" onClick={onCloseMobile} style={{ textDecoration: 'none' }}>
          <div style={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
            gap: effectiveCollapsed ? '0px' : '10px',
            padding: isHorizontal ? '0 14px' : effectiveCollapsed ? '0' : '0 16px',
            borderBottom: '1px solid rgba(240,180,41,0.08)',
            background: 'linear-gradient(90deg, rgba(79, 142, 247, 0.1), transparent)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
              boxShadow: '0 0 16px rgba(240,180,41,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img
                src="/Kyvex-logo.png"
                alt="Kyvex"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
            </div>
            {!effectiveCollapsed && (
              <span style={{
                fontSize: '17px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}>
                Kyvex
              </span>
            )}
          </div>
        </Link>

        {isHorizontal ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: compactDensity ? '6px 10px' : '8px 10px',
            borderBottom: placement === 'top' ? '1px solid var(--border-subtle)' : 'none',
            borderTop: placement === 'bottom' ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <nav
              style={{
                display: 'grid',
                gridAutoFlow: 'column',
                gridAutoColumns: compactDensity ? '60px' : '72px',
                gap: '8px',
                overflowX: 'auto',
                overflowY: 'hidden',
                flex: 1,
                paddingBottom: '4px',
              }}
            >
              {allItems.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    onMouseEnter={() => setHoveredHref(item.href)}
                    onMouseLeave={() => setHoveredHref((current) => (current === item.href ? null : current))}
                    title={navLabelMode === 'hover' ? item.label : undefined}
                    style={{
                      minHeight: compactDensity ? '46px' : '54px',
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: compactDensity ? '2px' : '4px',
                      padding: compactDensity ? '4px' : '6px',
                      width: compactDensity ? '60px' : '72px',
                      minWidth: compactDensity ? '60px' : '72px',
                      color: active ? '#f0b429' : 'var(--text-secondary)',
                      border: active ? '1px solid rgba(240,180,41,0.3)' : '1px solid var(--border-subtle)',
                      background: active ? 'linear-gradient(135deg, rgba(240,180,41,0.18), rgba(45,212,191,0.07))' : 'rgba(255,255,255,0.02)',
                      fontSize: '10px',
                      fontWeight: active ? 700 : 500,
                      textDecoration: 'none',
                      textAlign: 'center',
                      transform: hoveredHref === item.href ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                      transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease',
                    }}
                  >
                    <NavIcon active={active}>{item.icon}</NavIcon>
                    <span
                      style={{
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.1,
                        maxHeight: navLabelMode === 'always' || hoveredHref === item.href || active ? '14px' : '0px',
                        opacity: navLabelMode === 'always' || hoveredHref === item.href || active ? 1 : 0,
                        transition: 'max-height 0.18s ease, opacity 0.18s ease',
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => updateNavDensity(compactDensity ? 'expanded' : 'compact')}
                title={compactDensity ? 'Switch to expanded mode' : 'Switch to compact mode'}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  background: compactDensity ? 'rgba(240,180,41,0.12)' : 'rgba(255,255,255,0.02)',
                  color: compactDensity ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="6" width="16" height="3" rx="1.5" /><rect x="4" y="11" width="16" height="3" rx="1.5" /><rect x="4" y="16" width="16" height="3" rx="1.5" /></svg>
              </button>

              <button
                type="button"
                onClick={() => updateNavLabelMode(navLabelMode === 'always' ? 'hover' : 'always')}
                title={navLabelMode === 'hover' ? 'Show labels always' : 'Reveal labels on hover'}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  background: navLabelMode === 'hover' ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.02)',
                  color: navLabelMode === 'hover' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.5" /></svg>
              </button>

              <Link
                href="/settings"
                onClick={onCloseMobile}
                aria-label="Open settings"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </Link>

              <button
                type="button"
                onPointerDown={startDockDrag}
                title="Drag to dock on any edge"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" /></svg>
              </button>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                title="Sign out"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.08)',
                  color: 'var(--accent-red)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h12m0 0-3-3m3 3-3 3" /></svg>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: effectiveCollapsed ? '8px 0' : '8px 0 12px',
            }}>
              <nav>
                {renderNavGroup('MAIN', mainItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('STUDY TOOLS', studyToolItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('CREATE', createItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('FLASHCARDS & EXAMS', flashcardItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('AI TOOLS', aiToolItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('RESEARCH', researchItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('DISCOVER', discoverItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('TRAIN', trainItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('CHALLENGES', challengeItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('ANALYTICS', analyticsItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('INTELLIGENCE', intelligenceItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('NOTES', notesItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('SOCIAL', socialItems)}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                {renderNavGroup('PERSONAL', personalItems)}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              onMouseEnter={() => setCollapseHover(true)}
              onMouseLeave={() => setCollapseHover(false)}
              style={{
                width: '100%',
                height: '40px',
                border: 'none',
                borderTop: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: collapseHover ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
              aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {effectiveCollapsed ? 'â†’' : 'â†'}
            </button>

            {!effectiveCollapsed && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '8px 10px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => updateNavDensity(compactDensity ? 'expanded' : 'compact')}
                  style={{
                    height: '30px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: compactDensity ? 'rgba(240,180,41,0.12)' : 'rgba(255,255,255,0.02)',
                    color: compactDensity ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {compactDensity ? 'Compact' : 'Expanded'}
                </button>

                <button
                  type="button"
                  onClick={() => updateNavLabelMode(navLabelMode === 'always' ? 'hover' : 'always')}
                  style={{
                    height: '30px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: navLabelMode === 'hover' ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.02)',
                    color: navLabelMode === 'hover' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {navLabelMode === 'hover' ? 'Hover Labels' : 'Always Labels'}
                </button>
              </div>
            )}

            <button
              type="button"
              onPointerDown={startDockDrag}
              title="Drag to dock on left, right, top, or bottom"
              style={{
                width: '100%',
                height: '36px',
                border: 'none',
                borderTop: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'grab',
              }}
            >
              Dock
            </button>

            <div style={{ padding: '12px', borderTop: '1px solid rgba(240,180,41,0.06)' }}>
              <NovaPet />
            </div>
          </>
        )}

        {!isHorizontal && !effectiveCollapsed && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px' }}>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                minWidth: '40px',
                borderRadius: '999px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {userName}
                </p>
                <p style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {userEmail}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={onCloseMobile}
                aria-label="Open settings"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: '1px solid transparent',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  background: 'transparent',
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.08)',
                  color: 'var(--accent-red)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
