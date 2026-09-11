'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  groupNavEntries,
  isNavEntryEnabled,
  navEntriesFor,
  SECTION_LABELS,
} from '~/lib/nav-registry'
import { useEnabledFeatureSet } from '~/lib/use-feature-enabled'

const PALETTE_ENTRIES = navEntriesFor('palette')

export default function CommandPalette({ showTrigger = true }: { showTrigger?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const enabledFeatures = useEnabledFeatureSet()
  const paletteRoutes = useMemo(
    () => PALETTE_ENTRIES.filter((entry) => isNavEntryEnabled(entry, enabledFeatures)),
    [enabledFeatures],
  )

  const filtered = query.length < 1
    ? paletteRoutes.slice(0, 8)
    : paletteRoutes.filter(r => {
        const q = query.toLowerCase()
        return (
          r.label.toLowerCase().includes(q) ||
          SECTION_LABELS[r.section].toLowerCase().includes(q) ||
          r.keywords.some(k => k.includes(q))
        )
      }).slice(0, 10)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setSelected(0)
      }
      if (!open) return
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selected]) {
          router.push(filtered[selected].href)
          setOpen(false)
          setQuery('')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected, router])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => { setSelected(0) }, [query])

  const grouped = groupNavEntries(filtered)

  if (!open) {
    if (!showTrigger) return null
    return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="kv-btn-ghost"
    >
      <span>Search</span>
      <span className="kv-chip">⌘K</span>
    </button>
  )
  }

  return (
    <>
      <div
        onClick={() => { setOpen(false); setQuery('') }}
        className="fixed inset-0 z-[9998]"
        style={{ background: 'color-mix(in srgb, var(--bg-base) 80%, transparent)' }}
      />

      <div
        className="fixed z-[9999] w-[560px] max-w-[90vw] overflow-hidden"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--kv-radius)',
          boxShadow: 'none',
        }}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border-default)' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search features, tools, pages..."
            className="kv-field"
          />
          <span className="kv-chip">ESC</span>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-2 py-2">
          {filtered.length === 0 && (
            <div className="kv-sub px-3 py-8 text-center">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.length < 1 ? (
            <div>
              <p className="kv-meta px-3.5 py-2">Popular</p>
              {filtered.map((route, i) => {
                const Icon = route.icon
                return (
                <button
                  key={route.href}
                  type="button"
                  className={`kv-palette-item ${selected === i ? 'on' : ''}`}
                  onClick={() => { router.push(route.href); setOpen(false); setQuery('') }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="flex w-7 shrink-0 justify-center">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <div className="flex-1">
                    <p className="kv-row-title">{route.label}</p>
                  </div>
                  <span className="kv-chip">{SECTION_LABELS[route.section]}</span>
                </button>
                )
              })}
            </div>
          ) : (
            grouped.map(({ id, label, items }) => (
              <div key={id}>
                <p className="kv-meta px-3.5 py-2">{label}</p>
                {items.map(route => {
                  const globalIndex = filtered.indexOf(route)
                  const Icon = route.icon
                  return (
                    <button
                      key={route.href}
                      type="button"
                      className={`kv-palette-item ${selected === globalIndex ? 'on' : ''}`}
                      onClick={() => { router.push(route.href); setOpen(false); setQuery('') }}
                      onMouseEnter={() => setSelected(globalIndex)}
                    >
                      <span className="flex w-7 shrink-0 justify-center">
                        <Icon size={18} strokeWidth={1.75} />
                      </span>
                      <div className="flex-1">
                        <p className="kv-row-title">{route.label}</p>
                      </div>
                      {selected === globalIndex && (
                        <span className="kv-chip">↵ Enter</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t px-4 py-2.5" style={{ borderColor: 'var(--border-default)' }}>
          {[
            { key: '↑↓', desc: 'navigate' },
            { key: '↵', desc: 'open' },
            { key: 'esc', desc: 'close' },
          ].map(hint => (
            <div key={hint.key} className="flex items-center gap-1.5">
              <span className="kv-chip">{hint.key}</span>
              <span className="kv-meta">{hint.desc}</span>
            </div>
          ))}
          <span className="kv-row-side ml-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </>
  )
}
