'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV_SECTIONS } from '~/lib/nav-config'

export default function NavIcons() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const currentSection = NAV_SECTIONS.find(s =>
    s.items.some(i => pathname.startsWith(i.href))
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)',
      position: 'sticky', top: '52px' }}>

      {/* ICON RAIL (56px) */}
      <div style={{
        width: '56px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '4px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '8px 0 88px',
        overflowY: 'auto',
      }}>
        {NAV_SECTIONS.map(section => {
          const isActive = section.key === (activeSection || currentSection?.key)
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(
                activeSection === section.key ? null : section.key
              )}
              title={section.label}
              style={{
                width: '40px', height: '40px',
                borderRadius: '10px', border: 'none',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px', cursor: 'pointer',
                background: isActive
                  ? `${section.color}15`
                  : 'transparent',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {section.icon}
            </button>
          )
        })}

        <div style={{ marginTop: 'auto', display: 'flex',
          flexDirection: 'column', gap: '4px', alignItems: 'center',
          position: 'sticky', bottom: '80px',
          background: 'var(--bg-surface)' }}>
          <Link href="/settings" title="Settings" style={{
            width: '40px', height: '40px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', textDecoration: 'none',
          }}>
            ⚙️
          </Link>
        </div>
      </div>

      {/* SECTION PANEL (slides in, 180px) */}
      {activeSection && (() => {
        const section = NAV_SECTIONS.find(s => s.key === activeSection)
        if (!section) return null
        return (
          <div style={{
            width: '180px', flexShrink: 0,
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border-subtle)',
            overflowY: 'auto', padding: '12px 8px 88px',
          }}>
            <p style={{ fontSize: '9px', fontWeight: 800,
              color: section.color, textTransform: 'uppercase',
              letterSpacing: '0.1em', padding: '0 8px 10px' }}>
              {section.label}
            </p>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setActiveSection(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 10px', borderRadius: '8px',
                  margin: '1px 0',
                  background: pathname === item.href
                    ? `${section.color}12`
                    : 'transparent',
                  color: pathname === item.href
                    ? section.color
                    : 'var(--text-secondary)',
                  textDecoration: 'none', fontSize: '13px',
                  fontWeight: pathname === item.href ? 700 : 500,
                  transition: 'all 0.15s ease',
                  border: pathname === item.href
                    ? `1px solid ${section.color}25`
                    : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
