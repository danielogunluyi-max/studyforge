'use client';

import { useEffect, useState } from 'react';

type Collision = {
  id?: string;
  concept1: string;
  concept2: string;
  subject1: string;
  subject2: string;
  connection: string;
  strength: number;
  insight?: string;
};

export default function ConceptCollisionPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Collision[] | null>(null);
  const [history, setHistory] = useState<Collision[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/concept-collision')
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as { collisions?: Collision[] } | null;
        setHistory(data?.collisions ?? []);
      })
      .catch(() => undefined);
  }, []);

  async function findCollisions() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/concept-collision', { method: 'POST' });
      const data = (await r.json().catch(() => null)) as { collisions?: Collision[]; error?: string } | null;
      if (data?.collisions) {
        setResult(data.collisions);
        setHistory((prev) => [...(data.collisions ?? []), ...prev].slice(0, 30));
      } else {
        setError(data?.error ?? 'Analysis failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function CollisionCard({ c }: { c: Collision }) {
    return (
      <div className="kv-card">
        {/* Subject badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '99px',
              background: 'rgba(240,180,41,0.12)',
              color: '#f0b429',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {c.subject1}
          </span>
          <span style={{ fontSize: '18px' }}>↔️</span>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '99px',
              background: 'rgba(45,212,191,0.12)',
              color: '#2dd4bf',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {c.subject2}
          </span>
        </div>

        {/* Concepts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              minWidth: 120,
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(240,180,41,0.08)',
              border: '1px solid rgba(240,180,41,0.2)',
              fontSize: '13px',
              fontWeight: 700,
              color: '#f0b429',
            }}
          >
            {c.concept1}
          </div>
          <span style={{ fontSize: '20px', color: 'var(--text-muted)' }}>←→</span>
          <div
            style={{
              flex: 1,
              minWidth: 120,
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(45,212,191,0.08)',
              border: '1px solid rgba(45,212,191,0.2)',
              fontSize: '13px',
              fontWeight: 700,
              color: '#2dd4bf',
            }}
          >
            {c.concept2}
          </div>
        </div>

        {/* Connection */}
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
          {c.connection}
        </p>

        {/* Strength bar */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Connection Strength
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#5b7fff' }}>{c.strength}%</span>
          </div>
          <div className="kv-progress-track">
            <div
              className="kv-progress-fill"
              style={{ width: `${c.strength}%`, background: 'linear-gradient(90deg, #5b7fff, #2dd4bf)', transition: 'width 0.6s ease' }}
            />
          </div>
        </div>

        {/* Insight */}
        {c.insight && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
            💡 {c.insight}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          💥 Concept Collision
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Discover hidden connections between your subjects — moments where different fields collide.
        </p>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <button className="kv-btn-primary" onClick={() => void findCollisions()} disabled={loading}>
          {loading ? '🔍 Scanning your notes for hidden connections...' : '💥 Find Collisions'}
        </button>
      </div>

      {error && (
        <div
          className="kv-card"
          style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '14px', marginBottom: '20px' }}
        >
          {error === 'Need notes from at least 2 subjects to find collisions'
            ? '📚 Add notes from at least 2 different subjects to find collisions.'
            : error}
        </div>
      )}

      {result && result.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
            ✨ New Collisions Found ({result.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
            {result.map((c, i) => (
              <CollisionCard key={c.id ?? i} c={c} />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
            📂 Past Collisions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
            {history.slice(0, 10).map((c, i) => (
              <CollisionCard key={c.id ?? `h${i}`} c={c} />
            ))}
          </div>
        </div>
      )}

      {!loading && !result && history.length === 0 && (
        <div className="kv-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>💥</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Collisions Yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto' }}>
            Add notes from at least 2 different subjects, then hit "Find Collisions" to discover surprising connections.
          </p>
        </div>
      )}
    </div>
  );
}
