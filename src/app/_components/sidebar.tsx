'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import NovaPet from '~/app/_components/nova-pet'
import { type SidebarPlacement } from '~/app/_components/sidebar-layout'

type SidebarProps = {
  mobileOpen: boolean
  onCloseMobile: () => void
  placement: SidebarPlacement
  onPlacementChange: (next: SidebarPlacement) => void
}

type NavItem = {
  label: string
  href: string
  key: string
  icon: string
  alwaysVisible?: boolean
}

type SidebarSection = {
  id: string
  title: string
  collapsible: boolean
  defaultOpen: boolean
  items: NavItem[]
}

type FeaturePrefsResponse = {
  prefs?: {
    enabledFeatures?: string[]
  }
}

const SECTION_STORAGE_PREFIX = 'kyvex:sidebar:section:'

const sections: SidebarSection[] = [
  {
    id: 'home',
    title: '\u{1F3E0} HOME',
    collapsible: false,
    defaultOpen: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', key: 'dashboard', icon: '\u25A3', alwaysVisible: true },
      { label: 'Content Hub', href: '/content-hub', key: 'content-hub', icon: '\u{1F4E6}' },
      { label: 'Study Mode', href: '/study-mode', key: 'study-mode', icon: '\u{1F3AF}' },
      { label: 'Search', href: '/search', key: 'search', icon: '\u{1F50D}' },
    ],
  },
  {
    id: 'create',
    title: '\u{1F4E5} CREATE',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Generator', href: '/generator', key: 'generator', icon: '\u2728' },
      { label: 'Smart Upload', href: '/smart-upload', key: 'smart-upload', icon: '\u26A1' },
      { label: 'Audio to Notes', href: '/audio', key: 'audio', icon: '\u{1F3A4}' },
      { label: 'YouTube Import', href: '/youtube-import', key: 'youtube-import', icon: '\u{1F3AC}' },
      { label: 'Handwriting Scan', href: '/handwriting', key: 'handwriting', icon: '\u270D\uFE0F' },
      { label: 'Live Lecture', href: '/lecture', key: 'lecture', icon: '\u{1F399}\uFE0F' },
      { label: 'Classroom Import', href: '/classroom-import', key: 'classroom-import', icon: '\u{1F3EB}' },
      { label: 'Scan', href: '/scan', key: 'scan', icon: '\u{1F4F7}' },
      { label: 'Photo Quiz', href: '/photo-quiz', key: 'photo-quiz', icon: '\u{1F4F8}' },
    ],
  },
  {
    id: 'study',
    title: '\u{1F4DA} STUDY',
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: 'My Notes', href: '/my-notes', key: 'my-notes', icon: '\u{1F4D3}' },
      { label: 'Flashcards', href: '/flashcards', key: 'flashcards', icon: '\u{1F0CF}' },
      { label: 'Feynman', href: '/feynman', key: 'feynman', icon: '\u{1F9E0}' },
      { label: 'Micro-Lessons', href: '/micro-lessons', key: 'micro-lessons', icon: '\u{1F4D6}' },
      { label: 'Adaptive Notes', href: '/adaptive-notes', key: 'adaptive-notes', icon: '\u{1F3AF}' },
      { label: 'Cornell Notes', href: '/cornell', key: 'cornell', icon: '\u{1F4DD}' },
      { label: 'Narrative Memory', href: '/narrative', key: 'narrative', icon: '\u{1F4D6}' },
      { label: 'Compress', href: '/compress', key: 'compress', icon: '\u{1F5DC}\uFE0F' },
      { label: 'Reading Trainer', href: '/reading-speed', key: 'reading-speed', icon: '\u{1F4D8}' },
      { label: 'PDF Library', href: '/pdfs', key: 'pdf-library', icon: '\u{1F4C4}' },
    ],
  },
  {
    id: 'deep-learn',
    title: '\u{1F9E0} DEEP LEARN',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'AI Tutor', href: '/tutor', key: 'tutor', icon: '\u{1F916}' },
      { label: 'Voice Tutor', href: '/voice-tutor', key: 'voice-tutor', icon: '\u{1F399}\uFE0F' },
      { label: 'Debate', href: '/debate', key: 'debate', icon: '\u2694\uFE0F' },
      { label: 'Counterargument', href: '/counterargument', key: 'counterargument', icon: '\u{1F5E3}\uFE0F' },
      { label: 'Concept Web', href: '/concept-web', key: 'concept-web', icon: '\u{1F578}\uFE0F' },
      { label: 'Concept Collision', href: '/concept-collision', key: 'concept-collision', icon: '\u{1F4A5}' },
    ],
  },
  {
    id: 'test',
    title: '\u{1F4CB} TEST',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Mock Exam', href: '/mock-exam', key: 'mock-exam', icon: '\u{1F4CB}' },
      { label: 'Battle Arena', href: '/battle', key: 'battle', icon: '\u2694\uFE0F' },
      { label: 'Boss Battle', href: '/battle?mode=boss', key: 'battle', icon: '\u{1F451}' },
      { label: 'Battle Royale', href: '/battle-royale', key: 'battle-royale', icon: '\u{1F3C6}' },
      { label: 'Debate Judge', href: '/debate-judge', key: 'debate-judge', icon: '\u2696\uFE0F' },
      { label: 'Crossover Challenge', href: '/crossover', key: 'crossover', icon: '\u{1F500}' },
      { label: 'Exam Predictor', href: '/exam-predictor', key: 'predictor', icon: '\u{1F4CA}' },
    ],
  },
  {
    id: 'track',
    title: '\u{1F4CA} TRACK',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Mastery', href: '/mastery', key: 'mastery', icon: '\u{1F4C8}' },
      { label: 'Kyvex IQ', href: '/kyvex-iq', key: 'kyvex-iq', icon: '\u{1F9EC}' },
      { label: 'Study DNA', href: '/study-dna', key: 'study-dna', icon: '\u{1F9EA}' },
      { label: 'Exam Autopsy', href: '/autopsy', key: 'autopsy', icon: '\u{1FA7A}' },
      { label: 'Decay Alerts', href: '/decay-alerts', key: 'decay-alerts', icon: '\u23F3' },
      { label: 'Memory Sim', href: '/memory-sim', key: 'memory-sim', icon: '\u{1F9E0}' },
      { label: 'Note Evolution', href: '/note-evolution', key: 'note-evolution', icon: '\u{1F4C8}' },
      { label: 'Focus Score', href: '/focus-score', key: 'focus-score', icon: '\u{1F3AF}' },
    ],
  },
  {
    id: 'plan',
    title: '\u{1F3AF} PLAN',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'AI Planner', href: '/planner', key: 'planner', icon: '\u{1F5D3}\uFE0F' },
      { label: 'Calendar', href: '/calendar', key: 'calendar', icon: '\u{1F4C5}' },
      { label: 'Syllabus Scanner', href: '/syllabus', key: 'syllabus', icon: '\u{1F4D8}' },
      { label: 'Study Contract', href: '/contract', key: 'contract', icon: '\u{1F4DC}' },
      { label: 'Interleaving', href: '/interleave', key: 'interleave', icon: '\u21C4' },
      { label: 'Grade Calculator', href: '/grade-calc', key: 'grade-calc', icon: '\u{1F522}' },
    ],
  },
  {
    id: 'social',
    title: '\u{1F30D} SOCIAL',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Community', href: '/community', key: 'community', icon: '\u{1F465}' },
      { label: 'Study Rooms', href: '/rooms', key: 'rooms', icon: '\u{1F3E0}' },
      { label: 'Peer Review', href: '/peer-review', key: 'peer-review', icon: '\u{1F91D}' },
      { label: 'Study Library', href: '/library', key: 'library', icon: '\u{1F4DA}' },
      { label: 'Study Buddy', href: '/match', key: 'match', icon: '\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}' },
    ],
  },
  {
    id: 'grow',
    title: '\u{1F9EC} GROW',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Achievements', href: '/achievements', key: 'achievements', icon: '\u{1F3C5}' },
      { label: 'Study Ghost', href: '/study-ghost', key: 'study-ghost', icon: '\u{1F47B}' },
      { label: 'Wrapped', href: '/wrapped', key: 'wrapped', icon: '\u{1F381}' },
      { label: 'Career Path', href: '/career-path', key: 'career-path', icon: '\u{1F9ED}' },
      { label: 'Wellness', href: '/wellness', key: 'wellness', icon: '\u2764\uFE0F' },
      { label: 'Habits', href: '/habits', key: 'habits', icon: '\u{1F9F1}' },
    ],
  },
  {
    id: 'tools',
    title: '\u{1F6E0}\uFE0F TOOLS',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Diagrams', href: '/diagrams', key: 'diagrams', icon: '\u{1F5FA}\uFE0F' },
      { label: 'Presentations', href: '/presentation', key: 'presentations', icon: '\u{1F3A8}' },
      { label: 'Citations', href: '/citations', key: 'citations', icon: '\u{1F4DA}' },
      { label: 'Podcast', href: '/podcast', key: 'podcast', icon: '\u{1F3A7}' },
      { label: 'Essay Grader', href: '/essay-grade', key: 'essay-grade', icon: '\u270D\uFE0F' },
      { label: 'Grammar Check', href: '/grammar', key: 'grammar', icon: '\u{1F4DD}' },
      { label: 'Originality Check', href: '/plagiarism', key: 'plagiarism', icon: '\u{1F50E}' },
      { label: 'Quizlet Import', href: '/quizlet-import', key: 'quizlet-import', icon: '\u{1F504}' },
      { label: 'Ontario Curriculum', href: '/curriculum', key: 'curriculum', icon: '\u{1F3DB}\uFE0F' },
    ],
  },
  {
    id: 'discover',
    title: '\u{1F5FA}\uFE0F DISCOVER',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Knowledge Map', href: '/knowledge-map', key: 'knowledge-map', icon: '\u{1F5FA}\uFE0F' },
      { label: 'Smart Search', href: '/search', key: 'search', icon: '\u{1F50D}' },
      { label: 'Quick Capture', href: '/capture', key: 'capture', icon: '\u{1F4CC}' },
    ],
  },
  {
    id: 'settings',
    title: '\u2699\uFE0F SETTINGS',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Features', href: '/features', key: 'features', icon: '\u2699\uFE0F', alwaysVisible: true },
      { label: 'Settings', href: '/settings', key: 'settings', icon: '\u2699\uFE0F', alwaysVisible: true },
      { label: 'Referral', href: '/referral', key: 'referral', icon: '\u{1F4E3}', alwaysVisible: true },
      { label: 'About', href: '/about', key: 'about', icon: '\u2139\uFE0F', alwaysVisible: true },
    ],
  },
]

function sectionStorageKey(id: string) {
  return `${SECTION_STORAGE_PREFIX}${id}`
}

function pathMatches(pathname: string | null, href: string) {
  if (!pathname) return false
  const baseHref = href.split('?')[0] ?? href
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`)
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name?.trim() || email?.trim() || 'SF').split(' ')
  if (source.length >= 2) {
    return `${source[0]?.[0] ?? 'S'}${source[1]?.[0] ?? 'F'}`.toUpperCase()
  }
  return (source[0]?.slice(0, 2) ?? 'SF').toUpperCase()
}

export function Sidebar({ mobileOpen, onCloseMobile, placement, onPlacementChange }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()

  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.id, section.defaultOpen])),
  )
  const [enabledFeatureKeys, setEnabledFeatureKeys] = useState<Set<string>>(new Set())
  const [featureFilterLoaded, setFeatureFilterLoaded] = useState(false)
  const [featureFilterFailed, setFeatureFilterFailed] = useState(false)

  useEffect(() => {
    const nextState: Record<string, boolean> = {}
    for (const section of sections) {
      const saved = window.localStorage.getItem(sectionStorageKey(section.id))
      nextState[section.id] = saved == null ? section.defaultOpen : saved === '1'
    }
    setSectionOpen(nextState)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadFeaturePreferences = async () => {
      try {
        const response = await fetch('/api/feature-preferences', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load feature preferences')
        }

        const data = (await response.json().catch(() => ({}))) as FeaturePrefsResponse
        const enabled = Array.isArray(data.prefs?.enabledFeatures) ? data.prefs?.enabledFeatures : []

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

  useEffect(() => {
    if (!pathname) return

    const activeSection = sections.find((section) => section.items.some((item) => pathMatches(pathname, item.href)))
    if (!activeSection || !activeSection.collapsible) return

    setSectionOpen((current) => {
      if (current[activeSection.id]) return current
      const next = { ...current, [activeSection.id]: true }
      window.localStorage.setItem(sectionStorageKey(activeSection.id), '1')
      return next
    })
  }, [pathname])

  const visibleSections = useMemo(() => {
    const showAll = !featureFilterLoaded || featureFilterFailed

    return sections.map((section) => {
      const items = section.items.filter((item) => {
        if (item.alwaysVisible) return true
        if (showAll) return true
        return enabledFeatureKeys.has(item.key)
      })

      return {
        ...section,
        visibleItems: items,
      }
    })
  }, [enabledFeatureKeys, featureFilterFailed, featureFilterLoaded])

  const userName = session?.user?.name ?? 'Kyvex User'
  const userEmail = session?.user?.email ?? 'student@kyvex.app'
  const initials = getInitials(session?.user?.name, session?.user?.email)

  const handleToggleSection = (section: SidebarSection) => {
    if (!section.collapsible) return

    setSectionOpen((current) => {
      const nextValue = !current[section.id]
      window.localStorage.setItem(sectionStorageKey(section.id), nextValue ? '1' : '0')
      return { ...current, [section.id]: nextValue }
    })
  }

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
    } catch {
    }
    onCloseMobile()
    router.push('/')
    setTimeout(() => window.location.reload(), 100)
  }

  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
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
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          width: 'var(--sidebar-width)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
          background: 'linear-gradient(180deg, rgba(7, 12, 22, 0.98), rgba(5, 9, 18, 0.98))',
          borderRight: placement === 'left' ? '1px solid rgba(240,180,41,0.12)' : 'none',
          borderLeft: placement === 'right' ? '1px solid rgba(240,180,41,0.12)' : 'none',
          boxShadow: '8px 0 34px rgba(0,0,0,0.42)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Link href="/dashboard" onClick={onCloseMobile} style={{ textDecoration: 'none' }}>
          <div
            style={{
              height: 'var(--topbar-height)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '10px',
              padding: '0 16px',
              borderBottom: '1px solid rgba(240,180,41,0.08)',
              background: 'linear-gradient(90deg, rgba(79, 142, 247, 0.1), transparent)',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                boxShadow: '0 0 16px rgba(240,180,41,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src="/Kyvex-logo.png"
                alt="Kyvex"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
            </div>
            <span
              style={{
                fontSize: '17px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}
            >
              Kyvex
            </span>
          </div>
        </Link>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: '8px' }}>
          {visibleSections.map((section) => {
            const open = section.collapsible ? Boolean(sectionOpen[section.id]) : true
            const count = section.visibleItems.length

            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => handleToggleSection(section)}
                  disabled={!section.collapsible}
                  style={{
                    width: '100%',
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    cursor: section.collapsible ? 'pointer' : 'default',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 16px 4px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    {section.title} ({count})
                  </span>
                  <span>{open ? '?' : '?'}</span>
                </button>

                {open && (
                  <div>
                    {section.visibleItems.map((item) => {
                      const active = pathMatches(pathname, item.href)
                      return (
                        <Link
                          key={`${section.id}:${item.href}`}
                          href={item.href}
                          onClick={onCloseMobile}
                          style={{
                            position: 'relative',
                            margin: '2px 8px',
                            padding: '9px 12px',
                            minHeight: '38px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: active ? '#f0b429' : 'var(--text-secondary)',
                            fontSize: '13px',
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            background: active
                              ? 'linear-gradient(135deg, rgba(240,180,41,0.18) 0%, rgba(45,212,191,0.08) 100%)'
                              : 'transparent',
                            border: active ? '1px solid rgba(240,180,41,0.3)' : '1px solid transparent',
                            boxShadow: active ? '0 2px 12px rgba(240,180,41,0.12)' : 'none',
                            textDecoration: 'none',
                          }}
                        >
                          <span style={{ width: '18px', textAlign: 'center' }}>{item.icon}</span>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.label}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px' }}>
          <Link
            href="/features"
            onClick={onCloseMobile}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'var(--accent-gold)',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            \u2699\uFE0F Manage Features
          </Link>

          <div style={{ marginBottom: '10px' }}>
            <NovaPet />
          </div>

          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
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
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userName}
              </p>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userEmail}
              </p>
            </div>
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
            }}
          >
            Sign out
          </button>

          <button
            type="button"
            onClick={() => onPlacementChange(placement === 'left' ? 'right' : 'left')}
            style={{
              width: '100%',
              marginTop: '8px',
              height: '30px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'rgba(255,255,255,0.02)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Dock {placement === 'left' ? 'Right' : 'Left'}
          </button>
        </div>
      </aside>
    </>
  )
}
