'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const PINNED = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'My Notes', href: '/my-notes', icon: '📝' },
  { label: 'Flashcards', href: '/flashcards', icon: '🃏' },
  { label: 'AI Tutor', href: '/tutor', icon: '🤖' },
  { label: 'Study Mode', href: '/study-mode', icon: '🎯' },
  { label: 'Mock Exam', href: '/mock-exam', icon: '📋' },
  { label: 'Mastery', href: '/mastery', icon: '🏆' },
  { label: 'Community', href: '/community', icon: '🌍' },
]

export default function NavMinimal() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: '200px', flexShrink: 0,
      height: 'calc(100vh - 52px)',
      position: 'sticky', top: '52px',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      overflowY: 'auto',
      padding: '16px 8px 88px',
    }}>
      {/* Command palette hint */}
      <div style={{
        margin: '0 4px 16px',
        padding: '8px 12px',
        background: 'rgba(240,180,41,0.06)',
        border: '1px solid rgba(240,180,41,0.15)',
        borderRadius: '10px',
        cursor: 'pointer',
      }}
        onClick={() => {
          const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
          window.dispatchEvent(event)
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700,
          color: '#f0b429', marginBottom: '2px' }}>
          ⌘K Search all features
        </p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          80+ tools, instant access
        </p>
      </div>

      {/* Pinned items */}
      <p style={{ fontSize: '9px', fontWeight: 800,
        color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.1em', padding: '0 8px 8px' }}>
        Pinned
      </p>
      {PINNED.map(item => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', borderRadius: '10px',
            margin: '1px 0',
            background: pathname === item.href
              ? 'rgba(240,180,41,0.1)'
              : 'transparent',
            border: pathname === item.href
              ? '1px solid rgba(240,180,41,0.2)'
              : '1px solid transparent',
            color: pathname === item.href
              ? '#f0b429'
              : 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '13px', fontWeight: pathname === item.href ? 700 : 500,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            if (pathname !== item.href) {
              e.currentTarget.style.background = 'var(--bg-elevated)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={e => {
            if (pathname !== item.href) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      {/* Bottom links */}
      <div style={{ marginTop: 'auto', paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        position: 'sticky', bottom: '80px',
        background: 'var(--bg-surface)' }}>
        {[
          { label: 'All Features', href: '/features', icon: '⚙️' },
          { label: 'Settings', href: '/settings', icon: '⚙️' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: '10px',
            color: 'var(--text-muted)', textDecoration: 'none',
            fontSize: '12px', fontWeight: 600,
            transition: 'color 0.15s ease',
          }}>
            <span>{item.icon}</span>{item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
