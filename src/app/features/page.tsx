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
  allFeatureKeys?: string[]
}

function humanizeFeatureKey(key: string): string {
  return key
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

const ALL_FEATURES: Feature[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '\u{1F3E0}', category: 'Main' },
  { key: 'results', label: 'My Results', icon: '\u{1F4CA}', category: 'Main' },
  { key: 'calendar', label: 'Calendar', icon: '\u{1F4C5}', category: 'Main' },
  { key: 'mastery', label: 'Mastery Chart', icon: '\u{1F4C8}', category: 'Main' },
  { key: 'curriculum', label: 'Curriculum', icon: '\u{1F4DA}', category: 'Main' },

  { key: 'study-mode', label: 'Study Mode', icon: '\u{1F3AF}', category: 'Study Tools' },
  { key: 'my-notes', label: 'My Notes', icon: '\u{1F4DD}', category: 'Study Tools' },
  { key: 'classroom-import', label: 'Classroom Import', icon: '\u{1F3EB}', category: 'Study Tools' },
  { key: 'smart-upload', label: 'Upload File', icon: '\u{1F4E4}', category: 'Study Tools' },
  { key: 'audio', label: 'Audio to Notes', icon: '\u{1F3A4}', category: 'Study Tools' },
  { key: 'scan', label: 'Scan Notes', icon: '\u{1F4F7}', category: 'Study Tools' },
  { key: 'feynman', label: 'Feynman Technique', icon: '\u{1F9E0}', category: 'Study Tools' },
  { key: 'planner', label: 'Study Planner', icon: '\u{1F4C6}', category: 'Study Tools' },
  { key: 'pdf-library', label: 'PDF Library', icon: '\u{1F4C4}', category: 'Study Tools' },
  { key: 'listen', label: 'Listen to Notes', icon: '\u{1F50A}', category: 'Study Tools' },

  { key: 'generator', label: 'Generator', icon: '\u26A1', category: 'Create' },
  { key: 'diagrams', label: 'Diagram Generator', icon: '\u{1F5FA}\uFE0F', category: 'Create' },
  { key: 'presentations', label: 'Presentations', icon: '\u{1F3A8}', category: 'Create' },
  { key: 'photo-quiz', label: 'Photo Quiz', icon: '\u{1F4F8}', category: 'Create' },
  { key: 'podcast', label: 'Podcast', icon: '\u{1F3A7}', category: 'Create' },
  { key: 'cornell', label: 'Cornell Notes', icon: '\u{1F4DD}', category: 'Create' },

  { key: 'flashcards', label: 'Flashcards', icon: '\u{1F0CF}', category: 'Flashcards & Exams' },
  { key: 'predictor', label: 'Exam Predictor', icon: '\u{1F4CA}', category: 'Flashcards & Exams' },
  { key: 'mock-exam', label: 'Mock Exam', icon: '\u{1F4DD}', category: 'Flashcards & Exams' },
  { key: 'quizlet-import', label: 'Quizlet Import', icon: '\u{1F504}', category: 'Flashcards & Exams' },

  { key: 'tutor', label: 'Nova AI Tutor', icon: '\u{1F9D1}\u{1F3EB}', category: 'AI Tools' },
  { key: 'voice-tutor', label: 'Voice Tutor', icon: '\u{1F399}\uFE0F', category: 'AI Tools' },
  { key: 'concept-web', label: 'Concept Web', icon: '\u{1F578}\uFE0F', category: 'AI Tools' },
  { key: 'learning-style-quiz', label: 'Learning Style', icon: '\u{1F9E0}', category: 'AI Tools' },
  { key: 'focus', label: 'Focus Mode', icon: '\u{1F3AF}', category: 'AI Tools' },

  { key: 'citations', label: 'Citations', icon: '\u{1F4DA}', category: 'Research' },
  { key: 'syllabus', label: 'Syllabus Scan', icon: '\u{1F4D8}', category: 'Research' },
  { key: 'youtube-import', label: 'YouTube Import', icon: '\u{1F3AC}', category: 'Research' },
  { key: 'library', label: 'Study Library', icon: '\u{1F50D}', category: 'Research' },
  { key: 'search', label: 'Search', icon: '\u{1F310}', category: 'Research' },
  { key: 'capture', label: 'Quick Capture', icon: '\u{1F4CC}', category: 'Research' },
  { key: 'narrative', label: 'Narrative', icon: '\u{1F4D6}', category: 'Research' },

  { key: 'knowledge-map', label: 'Knowledge Map', icon: '\u{1F5FA}\uFE0F', category: 'Discover' },
  { key: 'content-hub', label: 'Content Hub', icon: '\u{1F4E6}', category: 'Discover' },
  { key: 'games', label: 'Games', icon: '\u{1F3AE}', category: 'Discover' },
  { key: 'battle', label: 'Battle Arena', icon: '\u2694', category: 'Discover' },
  { key: 'battle-royale', label: 'Battle Royale', icon: '\u{1F3C6}', category: 'Discover' },
  { key: 'study-groups', label: 'Study Groups', icon: '\u{1F465}', category: 'Discover' },
  { key: 'rooms', label: 'Study Rooms', icon: '\u{1F3E0}', category: 'Discover' },

  { key: 'reading-speed', label: 'Reading Speed', icon: '\u26A1', category: 'Train' },
  { key: 'micro-lessons', label: 'Micro-Lessons', icon: '\u{1F4D6}', category: 'Train' },
  { key: 'lecture', label: 'Live Lecture', icon: '\u{1F3A4}', category: 'Train' },
  { key: 'counterargument', label: 'Counterargument', icon: '\u2694', category: 'Train' },
  { key: 'adaptive-notes', label: 'Adaptive Notes', icon: '\u{1F3AF}', category: 'Train' },

  { key: 'crossover', label: 'Crossover Challenge', icon: '\u{1F500}', category: 'Challenges' },
  { key: 'debate-judge', label: 'Debate Judge', icon: '\u{1F9D1}\u200D\u2696\uFE0F', category: 'Challenges' },

  { key: 'study-dna', label: 'Study DNA', icon: '\u{1F9EC}', category: 'Analytics' },
  { key: 'autopsy', label: 'Exam Autopsy', icon: '\u{1F52C}', category: 'Analytics' },
  { key: 'decay-alerts', label: 'Decay Alerts', icon: '\u{1F514}', category: 'Analytics' },
  { key: 'concept-collision', label: 'Concept Collision', icon: '\u{1F4A5}', category: 'Analytics' },
  { key: 'grade-calc', label: 'Grade Calc', icon: '\u{1F4C9}', category: 'Analytics' },

  { key: 'kyvex-iq', label: 'Kyvex IQ', icon: '\u{1F9EC}', category: 'Intelligence' },
  { key: 'memory-sim', label: 'Memory Sim', icon: '\u{1F9E0}', category: 'Intelligence' },
  { key: 'career-path', label: 'Career Path', icon: '\u{1F5FA}\uFE0F', category: 'Intelligence' },
  { key: 'contract', label: 'Study Contract', icon: '\u{1F4DC}', category: 'Intelligence' },
  { key: 'focus-score', label: 'Focus Score', icon: '\u{1F3AF}', category: 'Intelligence' },

  { key: 'note-evolution', label: 'Note Evolution', icon: '\u{1F4C8}', category: 'Notes' },

  { key: 'community', label: 'Community', icon: '\u{1F465}', category: 'Social' },
  { key: 'match', label: 'Study Buddy', icon: '\u{1F91D}', category: 'Social' },
  { key: 'peer-review', label: 'Peer Review', icon: '\u{1F91D}', category: 'Social' },

  { key: 'achievements', label: 'Achievements', icon: '\u{1F3C5}', category: 'Personal' },
  { key: 'wrapped', label: 'Wrapped', icon: '\u{1F381}', category: 'Personal' },
  { key: 'study-ghost', label: 'Study Ghost', icon: '\u{1F47B}', category: 'Personal' },
  { key: 'referral', label: 'Referral', icon: '\u{1F4E3}', category: 'Personal' },
  { key: 'wellness', label: 'Wellness', icon: '\u{1F9D8}', category: 'Personal' },
  { key: 'habits', label: 'Habits', icon: '\u{1F4AA}', category: 'Personal' },
  { key: 'interleave', label: 'Interleave', icon: '\u{1F500}', category: 'Personal' },
  { key: 'essay-grade', label: 'Essay Grader', icon: '\u{1F4DD}', category: 'Personal' },
  { key: 'handwriting', label: 'Handwriting Scan', icon: '\u270D\uFE0F', category: 'Personal' },
  { key: 'compress', label: 'Compress', icon: '\u{1F5DC}\uFE0F', category: 'Personal' },
  { key: 'debate', label: 'Debate', icon: '\u{1F5E3}\uFE0F', category: 'Personal' },

  { key: 'grammar', label: 'Grammar Check', icon: '\u270D\uFE0F', category: 'Tools' },
  { key: 'plagiarism', label: 'Originality Check', icon: '\u{1F50D}', category: 'Tools' },
]

const PRESET_LABELS: Record<Preset, string> = {
  HIGHSCHOOL: 'High School',
  COLLEGE: 'College',
  UNIVERSITY: 'University',
}

const PINNED_FEATURE_KEYS = new Set(['dashboard', 'results'])

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
    return Array.from(mergedKeys).map((key) => {
      const known = featureLookup.get(key)
      if (known) return known
      return {
        key,
        label: humanizeFeatureKey(key),
        icon: '\u2728',
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

      setPreset(presetFromApi)
      const normalizedEnabled = new Set([...enabledFromApi, ...Array.from(PINNED_FEATURE_KEYS)])
      setSavedEnabled(normalizedEnabled)
      setEnabled(normalizedEnabled)
      setCustomized(Boolean(data.prefs?.customized))
      setApiFeatureKeys(Array.from(new Set([...allFeatureKeysFromApi, ...enabledFromApi, ...hiddenFromApi])))
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
          <span className="kv-badge">Enabled: {enabledCount}/{ALL_FEATURES.length}</span>
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
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{feature.icon}</div>
                  <div className="kv-heading-card">{feature.label}</div>
                  <div className="kv-text-description">{feature.key}</div>
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
