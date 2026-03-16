'use client';

import { useState } from 'react';

type Props = {
  onSelect: (preset: string) => void;
};

const PRESETS = [
  {
    key: 'HIGHSCHOOL',
    title: 'HIGH SCHOOL 🍁',
    description: 'Gr. 9-12 · Ontario curriculum integration · Exam prep · Credit courses',
  },
  {
    key: 'COLLEGE',
    title: 'COLLEGE 🎓',
    description: 'Diploma programs · Applied learning · Practical skills · Co-op ready',
  },
  {
    key: 'UNIVERSITY',
    title: 'UNIVERSITY 🏛',
    description: 'Degree programs · Research skills · Essay writing · Deep theory',
  },
] as const;

export default function PresetModal({ onSelect }: Props) {
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const presetResponse = await fetch('/api/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: selected }),
      });

      if (!presetResponse.ok) {
        throw new Error('Failed to save preset');
      }

      const featureResponse = await fetch('/api/feature-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToPreset: true,
          preset: selected,
        }),
      });

      if (!featureResponse.ok) {
        throw new Error('Failed to reset feature preferences');
      }

      onSelect(selected);
      window.location.reload();
    } catch {
      setError('Could not apply this preset. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,8,16,0.95)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="kv-card" style={{ width: '100%', maxWidth: 480 }}>
        <h2 className="kv-page-title" style={{ marginBottom: 4 }}>Who are you studying as?</h2>
        <p className="kv-page-subtitle" style={{ marginBottom: 16 }}>We'll customize Kyvex for your level</p>

        <div className="kv-grid-3" style={{ marginBottom: 16 }}>
          {PRESETS.map((preset) => {
            const active = selected === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                className={active ? 'kv-card-gold' : 'kv-card'}
                onClick={() => setSelected(preset.key)}
                style={{
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: 180,
                  position: 'relative',
                  borderColor: active ? undefined : 'rgba(240,180,41,0.12)',
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: 'var(--accent-gold)',
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </span>
                )}
                <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 12 }}>{preset.title}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>{preset.description}</p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="kv-btn-primary"
          disabled={!selected || saving}
          onClick={() => void submit()}
          style={{ width: '100%' }}
        >
          {saving ? 'Saving...' : 'Get Started'}
        </button>

        {error && (
          <p className="kv-page-subtitle" style={{ marginTop: 12, color: '#fecaca' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
