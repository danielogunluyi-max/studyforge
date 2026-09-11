'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  groupNavEntries,
  isNavEntryEnabled,
  navEntriesFor,
} from '~/lib/nav-registry'
import { useEnabledFeatureSet } from '~/lib/use-feature-enabled'

const TOPNAV_ENTRIES = navEntriesFor('mobile')

export default function NavTopNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const enabledFeatures = useEnabledFeatureSet()
  const topnavGroups = useMemo(
    () =>
      groupNavEntries(
        TOPNAV_ENTRIES.filter((entry) => isNavEntryEnabled(entry, enabledFeatures)),
      ),
    [enabledFeatures],
  )

  useEffect(() => {
    setOpen(null)
  }, [pathname])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <nav ref={ref} className="kv-tabs relative overflow-x-auto overflow-y-visible" style={{ borderBottom: 'none', gap: 22, paddingLeft: 12 }}>
      {topnavGroups.map(section => {
        const isActive = section.items.some(i => pathname.startsWith(i.href))
        const isOpen = open === section.id

        return (
          <div key={section.id} className="relative" style={{ zIndex: isOpen ? 1001 : undefined }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : section.id)}
              className={`kv-tab ${isActive || isOpen ? 'on' : ''}`}
            >
              {section.label}
            </button>

            {isOpen && (
              <div className="kv-dropdown">
                <p className="kv-meta px-2 pb-2">{section.label}</p>
                {section.items.map(item => {
                  const Icon = item.icon
                  const active = pathname === item.href
                  return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(null)}
                    className={`kv-palette-item ${active ? 'on' : ''}`}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    {item.label}
                  </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
