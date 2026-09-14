'use client';

import { useEffect, useState } from 'react';

type Props = {
  onSelect: (preset: string) => void;
  onSkip: () => void;
};

const PRESETS = [
  {
    key: 'HIGHSCHOOL',
    title: 'High school',
    description: 'Gr. 9–12 · Ontario curriculum · Exam prep',
  },
  {
    key: 'COLLEGE',
    title: 'College',
    description: 'Diploma programs · Applied learning · Co-op ready',
  },
  {
    key: 'UNIVERSITY',
    title: 'University',
    description: 'Degree programs · Essays · Deep theory',
  },
] as const;

export default function PresetModal({ onSelect, onSkip }: Props) {
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  async function submit() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      // Academic level on the user row…
      const presetResponse = await fetch('/api/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: selected }),
      });

      if (!presetResponse.ok) {
        throw new Error('Failed to save preset');
      }

      // …sidebar defaults to THE LOOP (Focused), not the full zoo.
      const featureResponse = await fetch('/api/feature-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToPreset: true,
          preset: 'FOCUSED',
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

  async function skipAndClose() {
    setSaving(true);
    setError(null);
    try {
      // Mark academic preset set so the gate never traps again; keep Focused features.
      await fetch('/api/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: 'HIGHSCHOOL' }),
      });
      await fetch('/api/feature-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToPreset: true,
          preset: 'FOCUSED',
        }),
      });
    } catch {
      // Still dismiss — never trap the student.
    } finally {
      setSaving(false);
      onSkip();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preset-modal-title"
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
      <div className="kv-card" style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
        <button
          type="button"
          className="kv-btn-ghost"
          onClick={() => void skipAndClose()}
          disabled={saving}
          aria-label="Skip and continue"
          style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px' }}
        >
          Skip
        </button>

        <h2 id="preset-modal-title" className="kv-page-title" style={{ marginBottom: 4, paddingRight: 64 }}>
          Who are you studying as?
        </h2>
        <p className="kv-page-subtitle" style={{ marginBottom: 16 }}>
          We&apos;ll keep the sidebar on The Loop. Escape or Skip anytime.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {PRESETS.map((preset) => {
            const active = selected === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                className={active ? 'kv-chip-course' : 'kv-btn-ghost'}
                onClick={() => setSelected(preset.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13 }}>{preset.title}</span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 4,
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontWeight: 400,
                  }}
                >
                  {preset.description}
                </span>
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
