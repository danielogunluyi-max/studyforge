'use client';

import { useEffect, useState } from 'react';

type DebateArg = {
  point: string;
  evidence: string;
  strength: number;
};

type DebatePayload = {
  topic: string;
  for: DebateArg[];
  against: DebateArg[];
  keyTension?: string;
  verdict?: string;
};

type DebateHistoryItem = {
  id: string;
  topic: string;
  forArguments: DebateArg[];
  againstArguments: DebateArg[];
  verdict: string | null;
  createdAt: string;
};

function clampStrength(v: number) {
  return Math.max(0, Math.min(100, v));
}

export default function DebatePage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<DebatePayload | null>(null);
  const [history, setHistory] = useState<DebateHistoryItem[]>([]);

  async function loadHistory() {
    try {
      const res = await fetch('/api/debate/generate');
      const data = (await res.json()) as { sessions?: DebateHistoryItem[] };
      setHistory(data.sessions || []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function onGenerate() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/debate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = (await res.json()) as DebatePayload | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Failed to generate debate');
        return;
      }
      setCurrent(data as DebatePayload);
      await loadHistory();
    } catch {
      setError('Failed to generate debate');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">AI Debate Mode</h1>
      <p className="kv-page-subtitle">Generate rigorous arguments on both sides of any topic.</p>

      <div className="kv-card" style={{ marginBottom: 16 }}>
        <label className="kv-label" htmlFor="debate-topic">Topic</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            id="debate-topic"
            className="kv-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Example: Should homework be abolished?"
            style={{ flex: 1, minWidth: 260 }}
          />
          <button className="kv-btn-primary" onClick={() => void onGenerate()} disabled={loading || topic.trim().length < 3}>
            {loading ? 'Generating...' : 'Generate Debate'}
          </button>
        </div>
      </div>

      {error && <div className="kv-alert-error">{error}</div>}

      {loading && (
        <div className="kv-card-elevated" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="kv-spinner" />
          <span>Building arguments...</span>
        </div>
      )}

      {current && !loading && (
        <>
          <div className="kv-alert-gold" style={{ marginBottom: 16 }}>
            <strong>Key Tension:</strong> {current.keyTension || 'Balancing practical impact against principle.'}
          </div>

          <section className="kv-grid-2" style={{ alignItems: 'start', marginBottom: 16 }}>
            <div className="kv-card-gold">
              <h2 className="kv-section-title">FOR</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {current.for?.map((item, idx) => (
                  <article key={`for-${idx}`} className="kv-card-sm">
                    <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{item.point}</p>
                    <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 13 }}>{item.evidence}</p>
                    <div className="kv-progress-track">
                      <div className="kv-progress-fill" style={{ width: `${clampStrength(item.strength)}%` }} />
                    </div>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>
                      Strength {clampStrength(item.strength)}%
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="kv-card-teal">
              <h2 className="kv-section-title">AGAINST</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {current.against?.map((item, idx) => (
                  <article key={`against-${idx}`} className="kv-card-sm">
                    <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{item.point}</p>
                    <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 13 }}>{item.evidence}</p>
                    <div className="kv-progress-track">
                      <div className="kv-progress-fill" style={{ width: `${clampStrength(item.strength)}%` }} />
                    </div>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>
                      Strength {clampStrength(item.strength)}%
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <div className="kv-card-elevated" style={{ marginBottom: 18 }}>
            <h3 className="kv-section-title">Verdict</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{current.verdict || 'No verdict generated.'}</p>
          </div>
        </>
      )}

      <section className="kv-card">
        <h2 className="kv-section-title">Recent Debates</h2>
        {history.length === 0 ? (
          <div className="kv-empty">
            <p className="kv-empty-title">No debate history yet</p>
            <p className="kv-empty-text">Generate your first debate to start building history.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className="kv-card-sm"
                style={{ textAlign: 'left', cursor: 'pointer' }}
                onClick={() => {
                  setCurrent({
                    topic: item.topic,
                    for: item.forArguments || [],
                    against: item.againstArguments || [],
                    verdict: item.verdict || '',
                    keyTension: '',
                  });
                }}
              >
                <p style={{ margin: 0, fontWeight: 700 }}>{item.topic}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
