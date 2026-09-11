'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useDisclosurePanel } from '~/lib/hooks/use-disclosure-panel'
import {
  groupNavEntries,
  navEntriesFor,
  type NavSectionId,
} from '~/lib/nav-registry'

const BOTTOM_TABS = [
  { key: 'home', label: 'Home', icon: '🏠', href: '/dashboard' },
  { key: 'study', label: 'Study', icon: '📚', href: '/my-notes' },
  { key: 'test', label: 'Test', icon: '📋', href: '/mock-exam' },
  { key: 'track', label: 'Track', icon: '📊', href: '/mastery' },
  { key: 'more', label: 'More', icon: '⋯', href: null as string | null },
]

const MOBILE_GROUPS = groupNavEntries(navEntriesFor('mobile'))

export default function NavBottom() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [moreSection, setMoreSection] = useState<NavSectionId | null>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const morePanelRef = useRef<HTMLDivElement>(null)

  const closeMore = useCallback(() => {
    setMoreOpen(false)
    setMoreSection(null)
  }, [])

  useEffect(() => {
    setMoreOpen(false)
    setMoreSection(null)
  }, [pathname])

  useDisclosurePanel({
    open: moreOpen,
    onClose: closeMore,
    panelRef: morePanelRef,
    triggerRef: moreButtonRef,
  })

  const openGroup = MOBILE_GROUPS.find((group) => group.id === moreSection)

  return (
    <div className="md:hidden">
      {moreOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={closeMore}
            className="fixed inset-0 z-[998]"
            style={{ background: 'color-mix(in srgb, var(--bg-base) 70%, transparent)' }}
          />
          <div
            ref={morePanelRef}
            id="kyvex-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More"
            tabIndex={-1}
            className="kv-bottom-sheet"
          >
            {openGroup === undefined ? (
              <div className="grid grid-cols-3 gap-2">
                {MOBILE_GROUPS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setMoreSection(s.id)}
                    className="kv-btn-ghost flex-col"
                  >
                    <span className="kv-meta">{s.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setMoreSection(null)}
                  className="kv-btn-ghost mb-3"
                >
                  ← Back
                </button>
                <p className="kv-meta mb-3">{openGroup.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {openGroup.items.map(item => {
                    const Icon = item.icon
                    const active = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-nav-item ${active ? 'is-active' : ''}`}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                        <span className="truncate text-xs">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <nav className="kv-bottom-nav">
        {BOTTOM_TABS.map(tab => {
          const isActive = tab.href
            ? pathname === tab.href || pathname.startsWith(tab.href + '/')
            : moreOpen

          return tab.href ? (
            <Link
              key={tab.key}
              href={tab.href}
              className={`kv-bottom-tab ${isActive ? 'on' : ''}`}
            >
              <span className="dot" aria-hidden="true" />
              <span className="label">{tab.label}</span>
            </Link>
          ) : (
            <button
              key={tab.key}
              ref={moreButtonRef}
              type="button"
              onClick={() => (moreOpen ? closeMore() : setMoreOpen(true))}
              aria-expanded={moreOpen}
              aria-controls={moreOpen ? 'kyvex-more-sheet' : undefined}
              aria-label={moreOpen ? 'Close menu' : 'Open menu'}
              className={`kv-bottom-tab ${isActive ? 'on' : ''}`}
            >
              <span className="dot" aria-hidden="true" />
              <span className="label">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
