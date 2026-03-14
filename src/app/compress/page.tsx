'use client';

import { useMemo, useState } from 'react';

type CompressionResult = {
  compressed: string;
  wordCount: number;
  compressionScore: number;
  cutConcepts: string[];
};

const TARGETS = [25, 50, 75, 100] as const;

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function CompressPage() {
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [targetWords, setTargetWords] = useState<(typeof TARGETS)[number]>(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState('');

  const originalWordCount = useMemo(() => countWords(text), [text]);

  async function compress() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, topic, targetWords }),
      });
      const data = (await res.json()) as CompressionResult | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Compression failed');
        return;
      }
      setResult(data as CompressionResult);
    } catch {
      setError('Compression failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Knowledge Compression</h1>
      <p className="kv-page-subtitle">Explain your notes in fewer words without losing core meaning.</p>

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <div className="kv-grid-2" style={{ marginBottom: 12 }}>
          <div>
            <label className="kv-label" htmlFor="compress-topic">Topic</label>
            <input
              id="compress-topic"
              className="kv-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Newton's Laws"
            />
          </div>
          <div>
            <label className="kv-label">Target Words</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TARGETS.map((target) => (
                <button
                  key={target}
                  type="button"
                  className={targetWords === target ? 'kv-btn-primary' : 'kv-btn-secondary'}
                  onClick={() => setTargetWords(target)}
                >
                  {target}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="kv-label" htmlFor="compress-text">Source Text</label>
        <textarea
          id="compress-text"
          className="kv-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste study content to compress..."
          style={{ minHeight: 190, marginBottom: 12 }}
        />

        <button
          className="kv-btn-primary"
          disabled={loading || text.trim().length < 10}
          onClick={() => void compress()}
        >
          {loading ? 'Compressing...' : 'Compress'}
        </button>
      </section>

      {error && <div className="kv-alert-error">{error}</div>}

      {result && (
        <section className="kv-card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="kv-badge kv-badge-gold">{result.wordCount} words</span>
            <span className="kv-badge kv-badge-blue">Original {originalWordCount} words</span>
            <span className="kv-badge kv-badge-teal">Target {targetWords}</span>
          </div>

          <article className="kv-card" style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 12 }}>
            {result.compressed}
          </article>

          <div style={{ marginBottom: 10 }}>
            <p className="kv-label" style={{ marginBottom: 6 }}>Compression Score</p>
            <div className="kv-progress-track">
              <div className="kv-progress-fill" style={{ width: `${Math.max(0, Math.min(100, result.compressionScore || 0))}%` }} />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              {Math.round(result.compressionScore || 0)}% preserved
            </p>
          </div>

          <div>
            <p className="kv-label" style={{ marginBottom: 6 }}>Cut Concepts</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(result.cutConcepts || []).length === 0 && <span className="kv-badge kv-badge-green">None cut</span>}
              {(result.cutConcepts || []).map((concept) => (
                <span key={concept} className="kv-badge kv-badge-red">{concept}</span>
              ))}
            </div>
          </div>

          <div className="kv-divider" />
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            Compression: {originalWordCount} → {result.wordCount} words
          </p>
        </section>
      )}
    </main>
  );
}
