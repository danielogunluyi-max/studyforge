'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import EmptyState from '@/app/_components/empty-state';

type WellnessEntry = {
  id: string;
  mood: number;
  energy: number;
  stress: number;
  notes: string | null;
  burnoutScore: number;
  createdAt: string;
};

const moodFaces = ['😩', '😕', '😐', '🙂', '😄'];

function riskInfo(score: number) {
  if (score <= 30) return { label: 'Low Risk', color: 'var(--accent-green)', badge: 'kv-badge-green' };
  if (score <= 60) return { label: 'Moderate', color: 'var(--accent-gold)', badge: 'kv-badge-gold' };
  if (score <= 80) return { label: 'High Risk', color: 'var(--accent-orange)', badge: 'kv-badge-blue' };
  return { label: 'Burnout', color: 'var(--accent-red)', badge: 'kv-badge-red' };
}

function tipsByScore(score: number) {
  if (score <= 30) return ['Keep your study rhythm consistent.', 'Use short breaks to stay fresh.', 'Celebrate progress daily.'];
  if (score <= 60) return ['Reduce sessions by 10-15% this week.', 'Prioritize sleep before late-night review.', 'Use active recall over rereading.'];
  if (score <= 80) return ['Pause heavy tasks for one day.', 'Focus on light review and hydration.', 'Ask for help on hardest topics today.'];
  return ['Take a full recovery block today.', 'Shift to minimum viable study goals.', 'Reach out to a trusted person or counselor.'];
}

function ScoreSelector({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="kv-card-elevated" style={{ padding: 14 }}>
      <p className="kv-label" style={{ marginBottom: 10 }}>{label}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {moodFaces.map((face, idx) => {
          const v = idx + 1;
          const active = value === v;
          return (
            <button
              key={`${label}-${v}`}
              type="button"
              onClick={() => onChange(v)}
              className={active ? 'kv-btn-primary' : 'kv-btn-secondary'}
              style={{ minWidth: 46, padding: '8px 10px' }}
              aria-label={`${label} ${v}`}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{face}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WellnessPage() {
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  async function loadEntries() {
    try {
      const res = await fetch('/api/wellness');
      const data = (await res.json()) as { entries?: WellnessEntry[] };
      setEntries(data.entries || []);
      if (data.entries && data.entries.length > 0) {
        setLatestScore(data.entries[0]!.burnoutScore);
      }
    } catch {
      setEntries([]);
    }
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  async function submitCheckin() {
    setSaving(true);
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, energy, stress, notes: notes.trim() || undefined }),
      });
      const data = (await res.json()) as { burnoutScore?: number };
      if (res.ok) {
        setLatestScore(data.burnoutScore ?? null);
        setNotes('');
        await loadEntries();
      }
    } finally {
      setSaving(false);
    }
  }

  const risk = riskInfo(latestScore ?? 0);
  const tips = useMemo(() => tipsByScore(latestScore ?? 0), [latestScore]);
  const trend = entries.slice(0, 7).reverse();

  return (
    <main className="kv-page kv-animate-in">
      <h1 className="kv-page-title">Wellness Check-ins</h1>
      <p className="kv-page-subtitle">Track mood, energy, stress, and burnout risk over time.</p>

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <div className="kv-grid-3" style={{ marginBottom: 12 }}>
          <ScoreSelector label="Mood" value={mood} onChange={setMood} />
          <ScoreSelector label="Energy" value={energy} onChange={setEnergy} />
          <ScoreSelector label="Stress" value={stress} onChange={setStress} />
        </div>

        <label className="kv-label" htmlFor="wellness-notes">Notes (optional)</label>
        <textarea
          id="wellness-notes"
          className="kv-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did today feel?"
          style={{ marginBottom: 12 }}
        />

        <button type="button" className="kv-btn-primary" onClick={() => void submitCheckin()} disabled={saving}>
          {saving ? (
            <span style={{ opacity: 0.7 }}>Saving...</span>
          ) : (
            <span>Submit Check-in</span>
          )}
        </button>
      </section>

      {latestScore !== null && (
        <section className="kv-card-elevated" style={{ marginBottom: 16 }}>
          <p className="kv-label">Current Burnout Score</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: risk.color }}>{latestScore}</span>
            <span className={`kv-badge ${risk.badge}`}>{risk.label}</span>
          </div>
          <div className="kv-progress-track">
            <div className="kv-progress-fill" style={{ width: `${Math.max(0, Math.min(100, latestScore))}%` }} />
          </div>
        </section>
      )}

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <h2 className="kv-section-title">Last 7 Days Trend</h2>
        {trend.length === 0 ? (
          <div className="kv-empty">
            <p className="kv-empty-title">No entries yet</p>
            <p className="kv-empty-text">Your chart appears after the first check-in.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'end', minHeight: 120, marginTop: 12 }}>
            {trend.map((entry) => (
              <div key={entry.id} style={{ flex: 1 }}>
                <div
                  style={{
                    height: `${Math.max(8, Math.min(100, entry.burnoutScore))}px`,
                    borderRadius: 8,
                    background: 'linear-gradient(180deg, rgba(240,180,41,0.8), rgba(45,212,191,0.8))',
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="kv-card-gold">
        <h2 className="kv-section-title">Wellness Tips</h2>
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--text-secondary)' }}>
          {tips.map((tip) => (
            <li key={tip} style={{ marginBottom: 6 }}>{tip}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
