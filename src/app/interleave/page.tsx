'use client';

import { useState } from 'react';

type Block = {
  subject: string;
  minutes: number;
  task: string;
  type: string;
};

type InterleaveResult = {
  blocks: Block[];
  rationale: string;
  expectedBenefit: string;
};

const DURATIONS = [30, 60, 90, 120] as const;
const ACCENTS = ['var(--accent-gold)', 'var(--accent-teal)', 'var(--accent-blue)', 'var(--accent-indigo)', 'var(--accent-pink)'];

export default function InterleavePage() {
  const [subjectInput, setSubjectInput] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [totalMinutes, setTotalMinutes] = useState<(typeof DURATIONS)[number]>(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InterleaveResult | null>(null);
  const [error, setError] = useState('');

  function addSubject() {
    const value = subjectInput.trim();
    if (!value) return;
    if (subjects.includes(value)) {
      setSubjectInput('');
      return;
    }
    setSubjects((prev) => [...prev, value]);
    setSubjectInput('');
  }

  function removeSubject(value: string) {
    setSubjects((prev) => prev.filter((s) => s !== value));
  }

  async function generateSchedule() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/interleave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects, totalMinutes }),
      });
      const data = (await res.json()) as InterleaveResult | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Failed to generate schedule');
        return;
      }
      setResult(data as InterleaveResult);
    } catch {
      setError('Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Interleaving Scheduler</h1>
      <p className="kv-page-subtitle">Mix subjects intentionally for stronger long-term retention.</p>

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <label className="kv-label" htmlFor="subject-input">Add Subject</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <input
            id="subject-input"
            className="kv-input"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubject();
              }
            }}
            placeholder="e.g. Biology"
            style={{ flex: 1, minWidth: 220 }}
          />
          <button type="button" className="kv-btn-secondary" onClick={addSubject}>Add subject</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {subjects.length === 0 && <span className="kv-badge kv-badge-blue">No subjects yet</span>}
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              className="kv-badge kv-badge-gold"
              style={{ cursor: 'pointer' }}
              onClick={() => removeSubject(subject)}
              title="Remove subject"
            >
              {subject} ×
            </button>
          ))}
        </div>

        <label className="kv-label">Total Minutes</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={totalMinutes === minutes ? 'kv-btn-primary' : 'kv-btn-secondary'}
              onClick={() => setTotalMinutes(minutes)}
            >
              {minutes}
            </button>
          ))}
        </div>

        <button
          className="kv-btn-primary"
          disabled={loading || subjects.length === 0}
          onClick={() => void generateSchedule()}
        >
          {loading ? 'Generating...' : 'Generate Schedule'}
        </button>
      </section>

      {error && <div className="kv-alert-error">{error}</div>}

      {result && (
        <section className="kv-card-elevated">
          <h2 className="kv-section-title">Schedule Timeline</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 10, marginBottom: 12 }}>
            {(result.blocks || []).map((block, idx) => {
              const color = ACCENTS[idx % ACCENTS.length] as string;
              return (
                <article
                  key={`${block.subject}-${idx}`}
                  className="kv-card-sm"
                  style={{ borderLeft: `4px solid ${color}`, boxShadow: `0 0 14px color-mix(in srgb, ${color} 20%, transparent)` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{block.subject}</p>
                    <span className="kv-badge kv-badge-teal">{block.type}</span>
                  </div>
                  <p style={{ margin: '6px 0 4px', color: 'var(--text-secondary)' }}>{block.task}</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>{block.minutes} minutes</p>
                </article>
              );
            })}
          </div>

          <div className="kv-card-elevated" style={{ marginBottom: 10 }}>
            <p className="kv-label" style={{ marginBottom: 6 }}>Rationale</p>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{result.rationale}</p>
          </div>

          <div className="kv-card-teal">
            <p className="kv-label" style={{ marginBottom: 6 }}>Expected Benefit</p>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{result.expectedBenefit}</p>
          </div>
        </section>
      )}
    </main>
  );
}
