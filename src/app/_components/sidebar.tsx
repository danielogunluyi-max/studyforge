'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useState } from 'react'
import {
  LayoutGrid,
  BookOpen,
  StickyNote,
  Layers,
  Sparkles,
  ScanLine,
  Settings,
  LogOut,
  PanelLeft,
  Eye,
  GripHorizontal,
} from 'lucide-react'
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

type FilterableNavItem = NavItem & {
  key: string
  alwaysVisible?: boolean
}

const NAV_KEY_BY_HREF: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/results': 'results',
  '/calendar': 'calendar',
  '/mastery': 'mastery',
  '/curriculum': 'curriculum',
  '/study-mode': 'study-mode',
  '/my-notes': 'my-notes',
  '/classroom-import': 'classroom-import',
  '/upload': 'smart-upload',
  '/audio': 'audio',
  '/scan': 'scan',
  '/feynman': 'feynman',
  '/planner': 'planner',
  '/pdfs': 'pdf-library',
  '/listen': 'listen',
  '/generator': 'generator',
  '/diagrams': 'diagrams',
  '/presentation': 'presentations',
  '/photo-quiz': 'photo-quiz',
  '/podcast': 'podcast',
  '/cornell': 'cornell',
  '/flashcards': 'flashcards',
  '/exam-predictor': 'predictor',
  '/mock-exam': 'mock-exam',
  '/quizlet-import': 'quizlet-import',
  '/tutor': 'tutor',
  '/voice-tutor': 'voice-tutor',
  '/concept-web': 'concept-web',
  '/learning-style-quiz': 'learning-style-quiz',
  '/focus': 'focus',
  '/citations': 'citations',
  '/syllabus': 'syllabus',
  '/youtube-import': 'youtube-import',
  '/library': 'library',
  '/search': 'search',
  '/capture': 'capture',
  '/narrative': 'narrative',
  '/knowledge-map': 'knowledge-map',
  '/content-hub': 'content-hub',
  '/games': 'games',
  '/battle': 'battle',
  '/battle-royale': 'battle-royale',
  '/study-groups': 'study-groups',
  '/rooms': 'rooms',
  '/study-dna': 'study-dna',
  '/autopsy': 'autopsy',
  '/decay-alerts': 'decay-alerts',
  '/concept-collision': 'concept-collision',
  '/grade-calc': 'grade-calc',
  '/reading-speed': 'reading-speed',
  '/micro-lessons': 'micro-lessons',
  '/lecture': 'lecture',
  '/counterargument': 'counterargument',
  '/adaptive-notes': 'adaptive-notes',
  '/crossover': 'crossover',
  '/debate-judge': 'debate-judge',
  '/kyvex-iq': 'kyvex-iq',
  '/memory-sim': 'memory-sim',
  '/career-path': 'career-path',
  '/contract': 'contract',
  '/focus-score': 'focus-score',
  '/note-evolution': 'note-evolution',
  '/community': 'community',
  '/match': 'match',
  '/peer-review': 'peer-review',
  '/achievements': 'achievements',
  '/wrapped': 'wrapped',
  '/study-ghost': 'study-ghost',
  '/referral': 'referral',
  '/wellness': 'wellness',
  '/habits': 'habits',
  '/interleave': 'interleave',
  '/predictor': 'predictor',
  '/essay-grade': 'essay-grade',
  '/handwriting': 'handwriting',
  '/compress': 'compress',
  '/debate': 'debate',
  '/smart-upload': 'smart-upload',
  '/grammar': 'grammar',
  '/plagiarism': 'plagiarism',
}

const ALWAYS_VISIBLE_FEATURE_KEYS = new Set<string>(['dashboard', 'results'])

function withFeatureKeys(items: NavItem[]): FilterableNavItem[] {
  return items.map((item) => {
    const key = NAV_KEY_BY_HREF[item.href] ?? item.href.replace(/^\//, '')
    return {
      ...item,
      key,
      alwaysVisible: ALWAYS_VISIBLE_FEATURE_KEYS.has(key),
    }
  })
}

function NavIcon({ children, active, hovered = false }: { children: ReactNode; active: boolean; hovered?: boolean }) {
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
      transform: hovered ? 'translateY(-0.5px) scale(1.06)' : 'translateY(0) scale(1)',
      transition: 'transform 0.18s ease',
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
  const [enabledFeatureKeys, setEnabledFeatureKeys] = useState<Set<string>>(new Set())
  const [featureFilterLoaded, setFeatureFilterLoaded] = useState(false)
  const [featureFilterFailed, setFeatureFilterFailed] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    const loadFeaturePreferences = async () => {
      try {
        const response = await fetch('/api/feature-preferences', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load feature preferences')
        }

        const data = await response.json()
        const enabled = Array.isArray(data?.prefs?.enabledFeatures) ? data.prefs.enabledFeatures : []

        if (!cancelled) {
          setEnabledFeatureKeys(new Set(enabled))
          setFeatureFilterFailed(false)
          setFeatureFilterLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setFeatureFilterFailed(true)
          setFeatureFilterLoaded(true)
        }
      }
    }

    void loadFeaturePreferences()

    return () => {
      cancelled = true
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

  // MAIN
  const mainItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutGrid size={18} strokeWidth={1.5} />,
    },
    {
      href: '/curriculum',
      label: 'Curriculum',
      icon: <BookOpen size={18} strokeWidth={1.5} />,
    },
  ]

  // STUDY TOOLS
  const studyToolItems: NavItem[] = [
    {
      href: '/my-notes',
      label: 'My Notes',
      icon: <StickyNote size={18} strokeWidth={1.5} />,
    },
  ]

  // FLASHCARDS & EXAMS
  const flashcardItems: NavItem[] = [
    {
      href: '/flashcards',
      label: 'Flashcards',
      icon: <Layers size={18} strokeWidth={1.5} />,
    },
  ]

  // AI TOOLS
  const aiToolItems: NavItem[] = [
    {
      href: '/tutor',
      label: 'AI Tutor',
      icon: <Sparkles size={18} strokeWidth={1.5} />,
    },
  ]

  // RESEARCH
  const researchItems: NavItem[] = [
    {
      href: '/capture',
      label: 'Capture',
      icon: <ScanLine size={18} strokeWidth={1.5} />,
    },
  ]

  const mainItemsWithKeys = withFeatureKeys(mainItems)
  const studyToolItemsWithKeys = withFeatureKeys(studyToolItems)
  const flashcardItemsWithKeys = withFeatureKeys(flashcardItems)
  const aiToolItemsWithKeys = withFeatureKeys(aiToolItems)
  const researchItemsWithKeys = withFeatureKeys(researchItems)

  const filterNavItems = (items: FilterableNavItem[]) => {
    if (!featureFilterLoaded || featureFilterFailed) {
      return items
    }

    return items.filter((item) => item.alwaysVisible || enabledFeatureKeys.has(item.key))
  }

  const filteredMainItems = filterNavItems(mainItemsWithKeys)
  const filteredStudyToolItems = filterNavItems(studyToolItemsWithKeys)
  const filteredFlashcardItems = filterNavItems(flashcardItemsWithKeys)
  const filteredAiToolItems = filterNavItems(aiToolItemsWithKeys)
  const filteredResearchItems = filterNavItems(researchItemsWithKeys)

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
    ...filteredMainItems,
    ...filteredStudyToolItems,
    ...filteredFlashcardItems,
    ...filteredAiToolItems,
    ...filteredResearchItems,
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
          fontSize: '10px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.11em',
          color: '#6f7da4',
          padding: '18px 16px 8px',
          animation: 'sidebar-group-in 260ms ease both',
        }}>
          {label}
        </p>
      )}
      <div>
        {items.map((item, itemIndex) => {
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
                margin: '3px 10px',
                padding: effectiveCollapsed ? '10px 0' : '10px 12px',
                minHeight: compactDensity ? '36px' : '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                gap: effectiveCollapsed ? '0px' : '10px',
                color: active ? '#f0b429' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13.5px',
                fontWeight: active ? 700 : hovered ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                background: active
                  ? 'linear-gradient(135deg, rgba(240,180,41,0.2) 0%, rgba(45,212,191,0.1) 100%)'
                  : hovered
                    ? 'rgba(255,255,255,0.035)'
                    : 'transparent',
                border: active
                  ? '1px solid rgba(240,180,41,0.34)'
                  : hovered
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid transparent',
                boxShadow: active ? '0 6px 18px rgba(240,180,41,0.12)' : 'none',
                transform: hovered ? 'translateX(3px)' : 'translateX(0)',
                textDecoration: 'none',
                animation: !effectiveCollapsed ? 'sidebar-item-in 300ms ease both' : 'none',
                animationDelay: `${Math.min(260, itemIndex * 18)}ms`,
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
              <NavIcon active={active} hovered={hovered}>{item.icon}</NavIcon>
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
        @keyframes sidebar-group-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sidebar-item-in {
          from {
            opacity: 0;
            transform: translateX(-5px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

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
          background: 'black',
          backdropFilter: 'blur(12px)',
          borderRight: placement === 'left' ? '1px solid rgba(255,255,255,0.1)' : 'none',
          borderLeft: placement === 'right' ? '1px solid rgba(255,255,255,0.1)' : 'none',
          borderBottom: placement === 'top' ? '1px solid rgba(255,255,255,0.1)' : 'none',
          borderTop: placement === 'bottom' ? '1px solid rgba(255,255,255,0.1)' : 'none',
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
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
            gap: effectiveCollapsed ? '0px' : '10px',
            padding: isHorizontal ? '0 14px' : effectiveCollapsed ? '0' : '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'transparent',
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
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontFamily: '"Space Grotesk", var(--font-inter), sans-serif',
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
                const hovered = hoveredHref === item.href
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
                    <NavIcon active={active} hovered={hovered}>{item.icon}</NavIcon>
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
                <PanelLeft size={16} strokeWidth={1.5} />
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
                <Eye size={16} strokeWidth={1.5} />
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
                <Settings size={16} strokeWidth={1.5} />
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
                <GripHorizontal size={16} strokeWidth={1.5} />
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
                <LogOut size={16} strokeWidth={1.5} />
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
                {[
                  { label: 'MAIN', items: filteredMainItems },
                  { label: 'STUDY TOOLS', items: filteredStudyToolItems },
                  { label: 'FLASHCARDS & EXAMS', items: filteredFlashcardItems },
                  { label: 'AI TOOLS', items: filteredAiToolItems },
                  { label: 'RESEARCH', items: filteredResearchItems },
                ]
                  .filter((group) => group.items.length > 0)
                  .map((group, groupIndex) => (
                    <div key={group.label}>
                      {groupIndex > 0 && (
                        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: effectiveCollapsed ? '8px 8px' : '8px 16px' }} />
                      )}
                      {renderNavGroup(group.label, group.items)}
                    </div>
                  ))}
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
              {effectiveCollapsed ? '>' : '<'}
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

            <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <NovaPet />
            </div>
          </>
        )}

        {!isHorizontal && !effectiveCollapsed && (
          <div className="border-t border-white/5 p-3">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-[12px] font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {userEmail}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={onCloseMobile}
                aria-label="Open settings"
                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Settings size={16} strokeWidth={1.5} />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] py-2 text-[13px] font-medium text-zinc-500 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={14} strokeWidth={1.5} />
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
