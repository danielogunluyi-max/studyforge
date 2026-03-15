'use client';

import { useEffect, useState } from 'react';

type StudyDNA = {
  visualScore: number;
  auditoryScore: number;
  readWriteScore: number;
  kinestheticScore: number;
  bestTimeOfDay: string;
  avgSessionMinutes: number;
  learningVelocity: number;
  profile: {
    type: string;
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
    superpower: string;
    kryptonite: string;
  };
};

const STYLE_BARS = [
  { key: 'visualScore' as const, label: 'Visual', color: '#f0b429' },
  { key: 'auditoryScore' as const, label: 'Auditory', color: '#2dd4bf' },
  { key: 'readWriteScore' as const, label: 'Read / Write', color: '#5b7fff' },
  { key: 'kinestheticScore' as const, label: 'Kinesthetic', color: '#a78bfa' },
];

export default function StudyDNAPage() {
  const [dna, setDna] = useState<StudyDNA | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/study-dna')
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as { dna?: StudyDNA } | null;
        if (data?.dna) setDna(data.dna);
      })
      .catch(() => undefined)
      .finally(() => setFetching(false));
  }, []);

  async function analyze() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/study-dna', { method: 'POST' });
      const data = (await r.json().catch(() => null)) as { dna?: StudyDNA; error?: string } | null;
      if (data?.dna) {
        setDna(data.dna);
      } else {
        setError(data?.error ?? 'Analysis failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          🧬 AI Study DNA
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Discover your unique learning profile based on 90 days of study activity.
        </p>
      </div>

      {error && (
        <div className="kv-card" style={{ border: '1px solid rgba(239,68,68,0.3)', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <button
          className="kv-btn-primary"
          onClick={() => void analyze()}
          disabled={loading || fetching}
        >
          {loading ? '🔬 Analyzing 90 days of your study patterns...' : '🧬 Analyze My Study DNA'}
        </button>
      </div>

      {fetching && !dna && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: '12px' }} />
          ))}
        </div>
      )}

      {dna && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header card */}
          <div className="kv-card-gold" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🧬</div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              Your Study DNA
            </h2>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '20px',
                background: 'rgba(240,180,41,0.15)',
                border: '1px solid rgba(240,180,41,0.4)',
                fontSize: '13px',
                fontWeight: 700,
                color: '#f0b429',
                marginBottom: '16px',
              }}
            >
              {dna.profile?.type ?? 'Unknown'}
            </div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#f0b429', marginBottom: '8px' }}>
              ⚡ {dna.profile?.superpower}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              ⚠️ {dna.profile?.kryptonite}
            </p>
          </div>

          {/* Learning style bars */}
          <div className="kv-card-elevated">
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              📊 Learning Style Profile
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {STYLE_BARS.map((bar) => {
                const val = dna[bar.key] ?? 0;
                return (
                  <div key={bar.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{bar.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: bar.color }}>{val}%</span>
                    </div>
                    <div className="kv-progress-track">
                      <div
                        className="kv-progress-fill"
                        style={{ width: `${val}%`, background: bar.color, transition: 'width 0.6s ease' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'Best Time', value: dna.bestTimeOfDay ?? '—', emoji: '🕐' },
              { label: 'Avg Session', value: `${dna.avgSessionMinutes ?? 0}m`, emoji: '⏱' },
              { label: 'Velocity', value: `${(dna.learningVelocity ?? 1).toFixed(1)}×`, emoji: '🚀' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="kv-card"
                style={{ textAlign: 'center', padding: '16px 10px' }}
              >
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{stat.emoji}</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '2px' }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
            <div className="kv-card" style={{ textAlign: 'center', padding: '16px 10px' }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>🏆</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#f0b429', marginBottom: '2px' }}>
                {dna.profile?.type?.split(' ')[0] ?? '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Style Type</div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="kv-card-elevated">
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              🎯 Recommendations
            </h3>

            {(dna.profile?.strengths ?? []).length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Strengths
                </p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: 0, margin: 0, listStyle: 'none' }}>
                  {dna.profile.strengths.map((s) => (
                    <li key={s} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✅</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(dna.profile?.weaknesses ?? []).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Areas to Improve
                </p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: 0, margin: 0, listStyle: 'none' }}>
                  {dna.profile.weaknesses.map((w) => (
                    <li key={w} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚠️</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dna.profile?.recommendation && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(91,127,255,0.08)',
                  border: '1px solid rgba(91,127,255,0.2)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                💡 {dna.profile.recommendation}
              </div>
            )}
          </div>
        </div>
      )}

      {!fetching && !dna && !loading && (
        <div className="kv-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🧬</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No DNA Profile Yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto' }}>
            Hit "Analyze My Study DNA" above to generate your personalized learning profile.
          </p>
        </div>
      )}
    </div>
  );
}
