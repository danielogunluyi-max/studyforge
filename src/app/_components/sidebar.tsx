'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { type ReactNode, useState } from 'react'
import NovaPet from '~/app/_components/nova-pet'

type SidebarProps = {
  mobileOpen: boolean
  onCloseMobile: () => void
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

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const [collapseHover, setCollapseHover] = useState(false)

  const mainItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3.75" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="3.75" y="13.5" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="13.5" width="6.75" height="6.75" rx="1.5" /></svg>,
    },
    {
      href: '/mastery',
      label: 'Mastery Chart',
      icon: <span aria-hidden="true">🗺</span>,
    },
    {
      href: '/calendar',
      label: 'Calendar',
      icon: <span aria-hidden="true">📆</span>,
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
      icon: <span aria-hidden="true">🗺</span>,
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
      icon: <span aria-hidden="true">🧠</span>,
    },
    {
      href: '/planner',
      label: 'Study Planner',
      icon: <span aria-hidden="true">📅</span>,
    },
    {
      href: '/podcast',
      label: 'Podcast',
      icon: <span aria-hidden="true">🎙</span>,
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

  const renderNavGroup = (label: string, items: NavItem[]) => (
    <div style={{ position: 'relative' }}>
      {!collapsed && (
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
              title={collapsed ? item.label : undefined}
              style={{
                position: 'relative',
                margin: '2px 8px',
                padding: collapsed ? '9px 0' : '9px 12px',
                minHeight: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? '0px' : '10px',
                color: active ? '#f0b429' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: active
                  ? 'linear-gradient(135deg, rgba(240,180,41,0.15) 0%, rgba(45,212,191,0.08) 100%)'
                  : hovered
                    ? 'var(--bg-elevated)'
                    : 'transparent',
                border: active
                  ? '1px solid rgba(240,180,41,0.25)'
                  : hovered
                    ? '1px solid var(--border-subtle)'
                    : '1px solid transparent',
                boxShadow: active ? '0 2px 12px rgba(240,180,41,0.12)' : 'none',
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
                    background: 'var(--gradient-primary)',
                    borderRadius: '999px',
                  }}
                />
              )}
              <NavIcon active={active}>{item.icon}</NavIcon>
              {!collapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
      `}</style>

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
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          minWidth: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease, width 0.2s ease',
          background: 'var(--bg-surface)',
          borderRight: '1px solid rgba(240,180,41,0.08)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Link href="/dashboard" onClick={onCloseMobile} style={{ textDecoration: 'none' }}>
          <div style={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? '0px' : '10px',
            padding: collapsed ? '0' : '0 16px',
            borderBottom: '1px solid rgba(240,180,41,0.08)',
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
                src="/kyvex-logo.png"
                alt="Kyvex"
                style={{ width: '18px', height: '18px', objectFit: 'contain' }}
              />
            </div>
            {!collapsed && (
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

        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: collapsed ? '8px 0' : '8px 0 12px',
        }}>
          <nav>
            {renderNavGroup('MAIN', mainItems)}
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: collapsed ? '8px 8px' : '8px 16px' }} />
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
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>

        <div style={{ padding: '12px', borderTop: '1px solid rgba(240,180,41,0.06)' }}>
          <NovaPet />
        </div>

        {!collapsed && (
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
