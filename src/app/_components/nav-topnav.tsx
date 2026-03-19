'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV_SECTIONS } from '~/lib/nav-config'

export default function NavTopNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav
      ref={ref}
      style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '0 8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {NAV_SECTIONS.map(section => {
        const isActive = section.items.some(i => pathname.startsWith(i.href))
        const isOpen = open === section.key

        return (
          <div key={section.key} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(isOpen ? null : section.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px',
                border: isOpen
                  ? '1px solid rgba(240,180,41,0.2)'
                  : '1px solid transparent',
                background: isOpen
                  ? 'rgba(240,180,41,0.08)'
                  : isActive
                  ? 'rgba(255,255,255,0.05)'
                  : 'transparent',
                color: isActive || isOpen
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
                fontSize: '13px', fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '14px' }}>{section.icon}</span>
              {section.label}
              <span style={{
                fontSize: '9px', color: 'var(--text-muted)',
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}>
                ▾
              </span>
            </button>

            {isOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)',
                left: '50%', transform: 'translateX(-50%)',
                zIndex: 500,
                background: 'rgba(8,13,26,0.98)',
                border: '1px solid rgba(240,180,41,0.15)',
                borderRadius: '16px',
                padding: '8px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
                minWidth: '200px',
              }}>
                {section.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 12px', borderRadius: '10px',
                      color: pathname === item.href
                        ? section.color
                        : 'var(--text-secondary)',
                      textDecoration: 'none', fontSize: '13px',
                      fontWeight: pathname === item.href ? 700 : 500,
                      background: pathname === item.href
                        ? `${section.color}10`
                        : 'transparent',
                      transition: 'all 0.1s ease',
                      border: pathname === item.href
                        ? `1px solid ${section.color}20`
                        : '1px solid transparent',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (pathname !== item.href)
                        e.currentTarget.style.background = 'var(--bg-elevated)'
                    }}
                    onMouseLeave={e => {
                      if (pathname !== item.href)
                        e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
