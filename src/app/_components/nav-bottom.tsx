'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV_SECTIONS } from '~/lib/nav-config'

const BOTTOM_TABS = [
  { key: 'home', label: 'Home', icon: '🏠', href: '/dashboard' },
  { key: 'study', label: 'Study', icon: '📚', href: '/my-notes' },
  { key: 'test', label: 'Test', icon: '📋', href: '/mock-exam' },
  { key: 'track', label: 'Track', icon: '📊', href: '/mastery' },
  { key: 'more', label: 'More', icon: '⋯', href: null as string | null },
]

export default function NavBottom() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [moreSection, setMoreSection] = useState<string | null>(null)

  return (
    <>
      {/* MORE PANEL (slides up) */}
      {moreOpen && (
        <>
          <div
            onClick={() => { setMoreOpen(false); setMoreSection(null) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 998,
              background: 'rgba(5,8,16,0.7)',
              pointerEvents: 'auto',
            }}
          />
          <div style={{
            position: 'fixed', bottom: '64px', left: 0, right: 0,
            zIndex: 999, maxHeight: '70vh', overflowY: 'auto',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-default)',
            borderRadius: '20px 20px 0 0',
            padding: '16px',
            pointerEvents: 'auto',
          }}>
            {moreSection === null ? (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px'
              }}>
                {NAV_SECTIONS.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setMoreSection(s.key)}
                    style={{
                      padding: '16px 8px', borderRadius: '12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '6px',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{s.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700,
                      color: 'var(--text-secondary)' }}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              (() => {
                const section = NAV_SECTIONS.find(s => s.key === moreSection)
                if (!section) return null
                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => setMoreSection(null)}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600,
                        fontFamily: 'inherit', marginBottom: '12px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      ← Back
                    </button>
                    <p style={{ fontSize: '12px', fontWeight: 800,
                      color: section.color, textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: '12px' }}>
                      {section.icon} {section.label}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {section.items.map(item => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => { setMoreOpen(false); setMoreSection(null) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px', borderRadius: '10px',
                            background: pathname === item.href
                              ? `${section.color}12`
                              : 'var(--bg-elevated)',
                            border: pathname === item.href
                              ? `1px solid ${section.color}25`
                              : '1px solid var(--border-subtle)',
                            color: pathname === item.href
                              ? section.color
                              : 'var(--text-secondary)',
                            textDecoration: 'none', fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <span>{item.icon}</span>
                          <span style={{ overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontSize: '12px' }}>
                            {item.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </>
      )}

      {/* BOTTOM BAR */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 200, height: '64px',
        background: 'rgba(8,13,26,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px',
      }}>
        {BOTTOM_TABS.map(tab => {
          const isActive = tab.href
            ? pathname === tab.href || pathname.startsWith(tab.href + '/')
            : moreOpen

          return tab.href ? (
            <Link
              key={tab.key}
              href={tab.href}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 'var(--kv-bottom-nav-gap)',
                padding: '8px 16px', borderRadius: '12px',
                textDecoration: 'none',
                background: isActive ? 'rgba(240,180,41,0.1)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '22px' }}>{tab.icon}</span>
              <span style={{
                fontSize: '10px', fontWeight: isActive ? 700 : 500,
                color: isActive ? '#f0b429' : 'var(--kv-text-secondary)',
              }}>
                {tab.label}
              </span>
            </Link>
          ) : (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMoreOpen(o => !o)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 'var(--kv-bottom-nav-gap)',
                padding: '8px 16px', borderRadius: '12px',
                border: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
                background: isActive ? 'rgba(240,180,41,0.1)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '22px' }}>{tab.icon}</span>
              <span style={{
                fontSize: '10px', fontWeight: isActive ? 700 : 500,
                color: isActive ? '#f0b429' : 'var(--kv-text-secondary)',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
