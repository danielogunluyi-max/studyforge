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

  const mainItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3.75" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="3.75" y="13.5" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="13.5" width="6.75" height="6.75" rx="1.5" /></svg>,
    },
    {
      href: '/mastery',
      label: 'Mastery Chart',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75 9 4.5l6 2.25 5.25-2.25v12.75L15 19.5 9 17.25l-5.25 2.25V6.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v12.75M15 6.75V19.5" /></svg>,
    },
    {
      href: '/calendar',
      label: 'Calendar',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3.75" y="5.25" width="16.5" height="15" rx="2.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75v3M16.5 3.75v3M3.75 9.75h16.5" /></svg>,
    },
    {
      href: '/curriculum',
      label: 'Curriculum',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h11.25A2.25 2.25 0 0118 6.75V19.5l-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5V6.75A2.25 2.25 0 014.5 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 9h7.5M7.5 12.75h7.5" /></svg>,
    },
    {
      href: '/results',
      label: 'My Results',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75h7.5m-8.25-12v3m4.5-3v6m4.5-6v9" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h9l-.75 2.25H8.25L7.5 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 18.75 12 21l2.25-2.25" /></svg>,
    },
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
      href: '/upload',
      label: 'Upload File',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V6m0 0 3.75 3.75M12 6 8.25 9.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5v1.5A2.25 2.25 0 006.75 20.25h10.5A2.25 2.25 0 0019.5 18v-1.5" /></svg>,
    },
    {
      href: '/photo-quiz',
      label: 'Photo Quiz',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    },
    {
      href: '/audio',
      label: 'Audio to Notes',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    },
    {
      href: '/my-notes',
      label: 'My Notes',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5v15l-5.25-2.625L6.75 19.5v-15z" /></svg>,
    },
    {
      href: '/listen',
      label: 'Listen to Notes',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
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
      href: '/podcast',
      label: 'Podcast',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    },
    {
      href: '/pdfs',
      label: 'PDF Library',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    },
    {
      href: '/citations',
      label: 'Citations',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25A2.25 2.25 0 016.75 3h10.5v16.5H6.75A2.25 2.25 0 014.5 17.25V5.25z" /></svg>,
    },
    {
      href: '/scan',
      label: 'Scan Notes',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h3l1.5-2.25h7.5l1.5 2.25h3A1.5 1.5 0 0121.75 9v9.75A1.5 1.5 0 0120.25 20.25H3.75A1.5 1.5 0 012.25 18.75V9A1.5 1.5 0 013.75 7.5z" /><circle cx="12" cy="13" r="3.25" /></svg>,
    },
  ]

  const featureItems: NavItem[] = [
    {
      href: '/presentation',
      label: 'Presentations',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    },
    {
      href: '/focus',
      label: 'Focus Mode',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    },
    {
      href: '/tutor',
      label: 'Nova AI Tutor',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l1.8 3.9L18 9.5l-4.2 1.85L12 15.25l-1.8-3.9L6 9.5l4.2-1.85L12 3.75z" /></svg>,
    },
    {
      href: '/battle',
      label: 'Battle Arena',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m7 5 5 5M5.5 7.5 9 4M4 9l4-4M17 5l-5 5m6.5-2.5L15 4m5 5-4-4" /></svg>,
    },
    {
      href: '/flashcards',
      label: 'Flashcards',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="6" width="16" height="12" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" /></svg>,
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
    {
      href: '/exam-predictor',
      label: 'Exam Predictor',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8.25" /><circle cx="12" cy="12" r="4.25" /><circle cx="12" cy="12" r="1.25" /></svg>,
    },
    {
      href: '/learning-style-quiz',
      label: 'Learning Style',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5a3 3 0 016 0v.4a2.75 2.75 0 012.25 2.7v.9a2.5 2.5 0 011.5 2.3 2.5 2.5 0 01-1.5 2.3v.9a2.75 2.75 0 01-2.25 2.7v.4a3 3 0 01-6 0v-.4A2.75 2.75 0 016.75 14v-.9a2.5 2.5 0 01-1.5-2.3 2.5 2.5 0 011.5-2.3v-.9A2.75 2.75 0 019 4.9v-.4Z" /></svg>,
    },
    {
      href: '/concept-web',
      label: 'Concept Web',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="12" cy="19" r="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.7 10.9 10.3 6.1M13.7 6.1l3.6 4.8M17.3 13.1 13.7 17.9M10.3 17.9 6.7 13.1" /></svg>,
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
  const allItems = [...mainItems, ...featureItems]

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
          height: isHorizontal ? '94px' : '100%',
          minHeight: isHorizontal ? '94px' : '100%',
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
            padding: '8px 10px',
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
                {renderNavGroup('FEATURES', featureItems)}
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
              {effectiveCollapsed ? '→' : '←'}
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
