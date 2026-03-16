'use client'

import { useEffect, useMemo, useState } from 'react'

type Preset = 'HIGHSCHOOL' | 'COLLEGE' | 'UNIVERSITY'

type Feature = {
  key: string
  label: string
  icon: string
  category: string
}

type FeaturePrefsResponse = {
  prefs?: {
    preset?: Preset
    enabledFeatures?: string[]
    hiddenFeatures?: string[]
    customized?: boolean
  }
}

const ALL_FEATURES: Feature[] = [
  { key: 'study-mode', label: 'Study Mode', icon: '\u{1F3AF}', category: 'Learning Core' },
  { key: 'my-notes', label: 'My Notes', icon: '\u{1F4DA}', category: 'Learning Core' },
  { key: 'classroom-import', label: 'Google Classroom Import', icon: '\u{1F3EB}', category: 'Learning Core' },
  { key: 'smart-upload', label: 'Smart Upload', icon: '\u{1F4E4}', category: 'Learning Core' },
  { key: 'audio', label: 'Audio Notes', icon: '\u{1F3A4}', category: 'Learning Core' },
  { key: 'scan', label: 'Scan & Solve', icon: '\u{1F4F7}', category: 'Learning Core' },
  { key: 'feynman', label: 'Feynman Explain', icon: '\u{1F9E0}', category: 'Learning Core' },
  { key: 'planner', label: 'Planner', icon: '\u{1F4C6}', category: 'Learning Core' },
  { key: 'pdf-library', label: 'PDF Library', icon: '\u{1F4C4}', category: 'Learning Core' },

  { key: 'generator', label: 'Generator', icon: '\u26A1', category: 'Creator Suite' },
  { key: 'diagrams', label: 'Diagrams', icon: '\u{1F5FA}\uFE0F', category: 'Creator Suite' },
  { key: 'presentations', label: 'Presentations', icon: '\u{1F3A8}', category: 'Creator Suite' },
  { key: 'photo-quiz', label: 'Photo Quiz', icon: '\u{1F4F8}', category: 'Creator Suite' },
  { key: 'podcast', label: 'Podcast', icon: '\u{1F3A7}', category: 'Creator Suite' },
  { key: 'cornell', label: 'Cornell Notes', icon: '\u{1F4DD}', category: 'Creator Suite' },

  { key: 'flashcards', label: 'Flashcards', icon: '\u{1F0CF}', category: 'Practice & Exams' },
  { key: 'predictor', label: 'Exam Predictor', icon: '\u{1F4CA}', category: 'Practice & Exams' },
  { key: 'mock-exam', label: 'Mock Exam', icon: '\u{1F4DD}', category: 'Practice & Exams' },
  { key: 'quizlet-import', label: 'Quizlet Import', icon: '\u{1F504}', category: 'Practice & Exams' },

  { key: 'tutor', label: 'AI Tutor', icon: '\u{1F9D1}\u{1F3EB}', category: 'AI Tools' },
  { key: 'voice-tutor', label: 'Voice Tutor', icon: '\u{1F399}\uFE0F', category: 'AI Tools' },
  { key: 'concept-web', label: 'Concept Web', icon: '\u{1F578}\uFE0F', category: 'AI Tools' },
  { key: 'citations', label: 'Citations', icon: '\u{1F4DA}', category: 'AI Tools' },
  { key: 'syllabus', label: 'Syllabus Analyzer', icon: '\u{1F4D8}', category: 'AI Tools' },

  { key: 'youtube-import', label: 'YouTube Import', icon: '\u{1F3AC}', category: 'Research' },
  { key: 'library', label: 'Research Library', icon: '\u{1F50D}', category: 'Research' },
  { key: 'search', label: 'Search', icon: '\u{1F310}', category: 'Research' },
  { key: 'capture', label: 'Capture', icon: '\u{1F4CC}', category: 'Research' },

  { key: 'narrative', label: 'Narrative', icon: '\u{1F4D6}', category: 'Discover' },
  { key: 'knowledge-map', label: 'Knowledge Map', icon: '\u{1F5FA}\uFE0F', category: 'Discover' },
  { key: 'content-hub', label: 'Content Hub', icon: '\u{1F3AF}', category: 'Discover' },

  { key: 'games', label: 'Games', icon: '\u{1F3AE}', category: 'Challenges' },
  { key: 'battle', label: 'Battle', icon: '\u2694', category: 'Challenges' },
  { key: 'battle-royale', label: 'Battle Royale', icon: '\u{1F3C6}', category: 'Challenges' },

  { key: 'rooms', label: 'Study Rooms', icon: '\u{1F3E0}', category: 'Social' },
]

const PRESET_LABELS: Record<Preset, string> = {
  HIGHSCHOOL: 'High School',
  COLLEGE: 'College',
  UNIVERSITY: 'University',
}

export default function FeaturesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('HIGHSCHOOL')
  const [savedEnabled, setSavedEnabled] = useState<Set<string>>(new Set())
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [customized, setCustomized] = useState(false)

  const allKeys = useMemo(() => ALL_FEATURES.map((feature) => feature.key), [])

  const categories = useMemo(() => {
    const grouped = new Map<string, Feature[]>()
    for (const feature of ALL_FEATURES) {
      if (!grouped.has(feature.category)) {
        grouped.set(feature.category, [])
      }
      grouped.get(feature.category)?.push(feature)
    }
    return Array.from(grouped.entries())
  }, [])

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

      setPreset(presetFromApi)
      setSavedEnabled(new Set(enabledFromApi))
      setEnabled(new Set(enabledFromApi))
      setCustomized(Boolean(data.prefs?.customized))
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

    const enabledList = allKeys.filter((key) => enabled.has(key))
    const hiddenList = allKeys.filter((key) => !enabled.has(key))

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
    setEnabled(new Set(savedEnabled))
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
        <h1 className="kv-title">Feature Toggles</h1>
        <p className="kv-muted">Enable only the tools you want in your learning workspace.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <span className="kv-badge">Preset: {PRESET_LABELS[preset]}</span>
          <span className="kv-badge">Enabled: {enabledCount}/{ALL_FEATURES.length}</span>
          {customized && <span className="kv-badge">Customized</span>}
        </div>
      </header>

      <section className="kv-card">
        <h2 className="kv-title" style={{ fontSize: '18px' }}>Reset To Preset Defaults</h2>
        <p className="kv-muted" style={{ marginBottom: '12px' }}>Pick a preset to restore a curated default set instantly.</p>
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
          <h3 className="kv-title" style={{ fontSize: '18px', marginBottom: '12px' }}>{category}</h3>
          <div className="kv-grid-3">
            {features.map((feature) => {
              const isEnabled = enabled.has(feature.key)
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => toggleFeature(feature.key)}
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
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: isEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.25)',
                      color: isEnabled ? '#bbf7d0' : 'var(--text-muted)',
                    }}
                  >
                    {isEnabled ? 'Enabled' : 'Hidden'}
                  </span>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{feature.icon}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{feature.label}</div>
                  <div className="kv-muted" style={{ fontSize: '12px' }}>{feature.key}</div>
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
