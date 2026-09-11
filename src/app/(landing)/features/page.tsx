'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, type LucideIcon } from 'lucide-react'
import { NAV_ENTRIES, SECTION_LABELS } from '~/lib/nav-registry'

type Preset = 'HIGHSCHOOL' | 'COLLEGE' | 'UNIVERSITY'

type Feature = {
  key: string
  label: string
  icon: LucideIcon
  category: string
  description?: string
}

type FeaturePrefsResponse = {
  prefs?: {
    preset?: Preset
    enabledFeatures?: string[]
    hiddenFeatures?: string[]
    customized?: boolean
  }
  allFeatureKeys?: string[]
}

function humanizeFeatureKey(key: string): string {
  return key
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

const ALL_FEATURES: Feature[] = NAV_ENTRIES.filter(
  (entry) => entry.surfaces.landing && entry.featureKey,
).map((entry) => ({
  key: entry.featureKey!,
  label: entry.label,
  icon: entry.icon,
  category: SECTION_LABELS[entry.section],
  description: entry.description,
}))

const PRESET_LABELS: Record<Preset, string> = {
  HIGHSCHOOL: 'High School',
  COLLEGE: 'College',
  UNIVERSITY: 'University',
}

const PINNED_FEATURE_KEYS = new Set(['dashboard', 'results'])
const DELETED_FEATURE_KEYS = new Set([
  'generator',
  'diagrams',
  'presentations',
  'photo-quiz',
  'podcast',
  'cornell',
  'predictor',
  'plagiarism',
  'kyvex-iq',
  'study-dna',
  'mock-exam',
  'quizlet-import',
])

export default function FeaturesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('HIGHSCHOOL')
  const [savedEnabled, setSavedEnabled] = useState<Set<string>>(new Set())
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [customized, setCustomized] = useState(false)
  const [apiFeatureKeys, setApiFeatureKeys] = useState<string[]>([])

  const featureLookup = useMemo(() => {
    return new Map(ALL_FEATURES.map((feature) => [feature.key, feature]))
  }, [])

  const mergedFeatures = useMemo(() => {
    const mergedKeys = new Set<string>([...ALL_FEATURES.map((feature) => feature.key), ...apiFeatureKeys])
    return Array.from(mergedKeys)
      .filter((key) => !DELETED_FEATURE_KEYS.has(key))
      .map((key) => {
        const known = featureLookup.get(key)
        if (known) return known
        return {
          key,
          label: humanizeFeatureKey(key),
          icon: Sparkles,
          category: 'All Features',
        }
      })
  }, [apiFeatureKeys, featureLookup])

  const allKeys = useMemo(() => mergedFeatures.map((feature) => feature.key), [mergedFeatures])

  const categories = useMemo(() => {
    const grouped = new Map<string, Feature[]>()
    for (const feature of mergedFeatures) {
      if (!grouped.has(feature.category)) {
        grouped.set(feature.category, [])
      }
      grouped.get(feature.category)?.push(feature)
    }
    return Array.from(grouped.entries())
  }, [mergedFeatures])

  const loadPrefs = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/feature-preferences', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch feature preferences')
      }

      const data: FeaturePrefsResponse = await response.json()
      const presetFromApi = data.prefs?.preset ?? 'HIGHSCHOOL'
      const enabledFromApi = Array.isArray(data.prefs?.enabledFeatures) ? data.prefs?.enabledFeatures : []
      const hiddenFromApi = Array.isArray(data.prefs?.hiddenFeatures) ? data.prefs?.hiddenFeatures : []
      const allFeatureKeysFromApi = Array.isArray(data.allFeatureKeys) ? data.allFeatureKeys : []

      const filteredEnabledFromApi = enabledFromApi.filter((key) => !DELETED_FEATURE_KEYS.has(key))
      const filteredHiddenFromApi = hiddenFromApi.filter((key) => !DELETED_FEATURE_KEYS.has(key))
      const filteredAllFeatureKeysFromApi = allFeatureKeysFromApi.filter((key) => !DELETED_FEATURE_KEYS.has(key))

      setPreset(presetFromApi)
      const normalizedEnabled = new Set([...filteredEnabledFromApi, ...Array.from(PINNED_FEATURE_KEYS)])
      setSavedEnabled(normalizedEnabled)
      setEnabled(normalizedEnabled)
      setCustomized(Boolean(data.prefs?.customized))
      setApiFeatureKeys(Array.from(new Set([...filteredAllFeatureKeysFromApi, ...filteredEnabledFromApi, ...filteredHiddenFromApi])))
    } catch {
      setError('Could not load your feature preferences. Showing last known state.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPrefs()
  }, [])

  const enabledCount = enabled.size
  const hasChanges = allKeys.some((key) => savedEnabled.has(key) !== enabled.has(key))

  const toggleFeature = (key: string) => {
    setEnabled((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const saveChanges = async () => {
    setSaving(true)
    setError(null)

    const enabledList = allKeys.filter((key) => enabled.has(key) || PINNED_FEATURE_KEYS.has(key))
    const hiddenList = allKeys.filter((key) => !enabled.has(key) && !PINNED_FEATURE_KEYS.has(key))

    try {
      const response = await fetch('/api/feature-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledFeatures: enabledList,
          hiddenFeatures: hiddenList,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save feature preferences')
      }

      setSavedEnabled(new Set(enabled))
      setCustomized(true)
    } catch {
      setError('Could not save feature preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const resetToSaved = () => {
    setEnabled(new Set([...savedEnabled, ...Array.from(PINNED_FEATURE_KEYS)]))
  }

  const resetToPreset = async (nextPreset: Preset) => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/feature-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToPreset: true,
          preset: nextPreset,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reset to preset')
      }

      await loadPrefs()
    } catch {
      setError('Could not reset to preset defaults. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="kv-stack">
        <div className="kv-card">
          <p className="kv-muted">Loading feature controls...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kv-stack" style={{ paddingBottom: hasChanges ? '96px' : undefined }}>
      <header className="kv-card">
        <h1 className="kv-heading-page">Feature Toggles</h1>
        <p className="kv-text-description">Enable only the tools you want in your learning workspace.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <span className="kv-badge">Preset: {PRESET_LABELS[preset]}</span>
          <span className="kv-badge">Enabled: {enabledCount}/{allKeys.length}</span>
          {customized && <span className="kv-badge">Customized</span>}
        </div>
      </header>

      <section className="kv-card">
        <h2 className="kv-heading-section">Reset To Preset Defaults</h2>
        <p className="kv-text-description" style={{ marginBottom: '12px' }}>Pick a preset to restore a curated default set instantly.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="kv-btn" onClick={() => void resetToPreset('HIGHSCHOOL')} disabled={saving}>High School</button>
          <button className="kv-btn" onClick={() => void resetToPreset('COLLEGE')} disabled={saving}>College</button>
          <button className="kv-btn" onClick={() => void resetToPreset('UNIVERSITY')} disabled={saving}>University</button>
        </div>
      </section>

      {error && (
        <section className="kv-card" style={{ borderColor: 'rgba(239, 68, 68, 0.5)' }}>
          <p className="kv-muted" style={{ color: '#fecaca' }}>{error}</p>
        </section>
      )}

      {categories.map(([category, features]) => (
        <section key={category} className="kv-card">
          <h3 className="kv-heading-section" style={{ marginBottom: '12px' }}>{category}</h3>
          <div className="kv-grid-3">
            {features.map((feature) => {
              const isPinned = PINNED_FEATURE_KEYS.has(feature.key)
              const isEnabled = isPinned || enabled.has(feature.key)
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => {
                    if (isPinned) return
                    toggleFeature(feature.key)
                  }}
                  disabled={isPinned}
                  className="kv-card"
                  style={{
                    textAlign: 'left',
                    position: 'relative',
                    borderColor: isEnabled ? 'rgba(240, 180, 41, 0.7)' : 'var(--border-subtle)',
                    background: isEnabled
                      ? 'linear-gradient(135deg, rgba(240, 180, 41, 0.12), rgba(16, 185, 129, 0.08))'
                      : 'rgba(255,255,255,0.02)',
                    filter: isEnabled ? 'none' : 'grayscale(1)',
                    transition: 'all 0.2s ease',
                    cursor: isPinned ? 'not-allowed' : 'pointer',
                    opacity: isPinned ? 0.95 : 1,
                  }}
                >
                  {isPinned && (
                    <span
                      className="kv-badge-pinned"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                      }}
                    >
                      Pinned
                    </span>
                  )}
                  <span
                    className={isEnabled ? 'kv-badge-enabled' : 'kv-badge'}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: isEnabled ? undefined : 'rgba(100,116,139,0.25)',
                      color: isEnabled ? undefined : 'var(--kv-text-muted)',
                    }}
                  >
                    {isEnabled ? 'Enabled' : 'Hidden'}
                  </span>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {(() => { const Icon = feature.icon; return <Icon size={24} strokeWidth={1.5} /> })()}
                  </div>
                  <div className="kv-heading-card">{feature.label}</div>
                  <div className="kv-text-description">{feature.description ?? feature.key}</div>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {hasChanges && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            padding: '12px 16px',
            borderTop: '1px solid var(--border-default)',
            background: 'linear-gradient(180deg, rgba(7,12,22,0.95), rgba(7,12,22,0.99))',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', maxWidth: '1200px', margin: '0 auto' }}>
            <p className="kv-muted" style={{ margin: 0 }}>You have unsaved feature changes.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="kv-btn" onClick={resetToSaved} disabled={saving}>Reset</button>
              <button className="kv-btn" onClick={() => void saveChanges()} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
