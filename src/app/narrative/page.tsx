'use client';

import { useEffect, useMemo, useState } from 'react';

type NarrativeItem = {
  id: string;
  topic: string;
  sourceText: string;
  narrative: string;
  createdAt: string;
};

function extractAnchors(text: string) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.filter((line) => line.startsWith('-') || line.startsWith('•'));
}

export default function NarrativePage() {
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [history, setHistory] = useState<NarrativeItem[]>([]);
  const [error, setError] = useState('');

  const anchors = useMemo(() => extractAnchors(narrative), [narrative]);

  async function loadHistory() {
    try {
      const res = await fetch('/api/narrative/generate');
      const data = (await res.json()) as { items?: NarrativeItem[] };
      setHistory(data.items || []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function generateNarrative() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/narrative/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText, topic }),
      });
      const data = (await res.json()) as { narrative?: string; error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to generate narrative');
        return;
      }
      setNarrative(data.narrative || '');
      await loadHistory();
    } catch {
      setError('Failed to generate narrative');
    } finally {
      setLoading(false);
    }
  }

  async function copyStory() {
    try {
      await navigator.clipboard.writeText(narrative);
    } catch {
      setError('Unable to copy story');
    }
  }

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Narrative Memory</h1>
      <p className="kv-page-subtitle">Turn dense notes into memorable stories.</p>

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <div className="kv-grid-2" style={{ marginBottom: 12 }}>
          <div>
            <label className="kv-label" htmlFor="narrative-topic">Topic</label>
            <input
              id="narrative-topic"
              className="kv-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              className="kv-btn-primary"
              disabled={loading || topic.trim().length < 2 || sourceText.trim().length < 10}
              onClick={() => void generateNarrative()}
            >
              {loading ? 'Turning into story...' : 'Turn into Story'}
            </button>
          </div>
        </div>

        <label className="kv-label" htmlFor="narrative-notes">Study Notes</label>
        <textarea
          id="narrative-notes"
          className="kv-textarea"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Paste notes here..."
          style={{ minHeight: 180 }}
        />
      </section>

      {error && <div className="kv-alert-error">{error}</div>}

      {narrative && (
        <section className="kv-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <h2 className="kv-section-title" style={{ margin: 0 }}>Generated Story</h2>
            <button className="kv-btn-secondary" onClick={() => void copyStory()}>Copy Story</button>
          </div>

          <article
            className="kv-card-elevated"
            style={{ fontFamily: 'Georgia, serif', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: 16 }}
          >
            {narrative}
          </article>

          {anchors.length > 0 && (
            <div className="kv-card-gold" style={{ marginTop: 12 }}>
              <p className="kv-label" style={{ marginBottom: 8 }}>Memory Anchors</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {anchors.map((anchor, idx) => (
                  <li key={`${anchor}-${idx}`} style={{ color: 'var(--accent-gold)', marginBottom: 4 }}>{anchor.replace(/^[-•]\s*/, '')}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="kv-card">
        <h2 className="kv-section-title">Narrative History</h2>
        {history.length === 0 ? (
          <div className="kv-empty">
            <p className="kv-empty-title">No narratives yet</p>
            <p className="kv-empty-text">Generate your first story to build memory history.</p>
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
                  setTopic(item.topic);
                  setSourceText(item.sourceText);
                  setNarrative(item.narrative);
                }}
              >
                <p style={{ margin: 0, fontWeight: 700 }}>{item.topic}</p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 12 }}>
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
