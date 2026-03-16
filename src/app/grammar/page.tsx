'use client';

import { useMemo, useState } from 'react';

type Mode = 'grammar' | 'style' | 'academic';

type ChangeItem = {
  original: string;
  corrected: string;
  type: string;
  explanation: string;
};

type GrammarResult = {
  corrected?: string;
  changes?: ChangeItem[];
  overallScore?: number;
  summary?: string;
};

function highlightText(text: string, phrases: string[], cls: string): string {
  let value = text;
  for (const phrase of phrases) {
    if (!phrase?.trim()) continue;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    value = value.replace(new RegExp(escaped, 'gi'), `<mark class="${cls}">$&</mark>`);
  }
  return value;
}

function mapTypeLabel(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes('spell')) return 'Spelling';
  if (normalized.includes('word')) return 'Word Choice';
  if (normalized.includes('style')) return 'Style';
  return 'Grammar';
}

export default function GrammarPage() {
  const [mode, setMode] = useState<Mode>('grammar');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [error, setError] = useState('');

  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);

  const originalHighlights = useMemo(() => {
    if (!result?.changes?.length) return text;
    return highlightText(text, result.changes.map((item) => item.original), 'bg-yellow-200 text-black rounded px-1');
  }, [text, result?.changes]);

  const correctedText = result?.corrected || '';
  const correctedHighlights = useMemo(() => {
    if (!result?.changes?.length) return correctedText;
    return highlightText(correctedText, result.changes.map((item) => item.corrected), 'bg-teal-200 text-black rounded px-1');
  }, [correctedText, result?.changes]);

  async function checkWriting() {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type: mode }),
      });
      const data = (await res.json().catch(() => ({}))) as GrammarResult & { error?: string };
      if (!res.ok) {
        setError(data.error || 'Grammar check failed');
        return;
      }
      setResult(data);
    } catch {
      setError('Grammar check failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">Grammar Check ✍️</h1>
        <p className="kv-subtitle">Fix grammar, improve style, or elevate to academic writing</p>

        <div className="kv-tabs mt-5">
          <button type="button" className={`kv-tab ${mode === 'grammar' ? 'active' : ''}`} onClick={() => setMode('grammar')}>Grammar Fix</button>
          <button type="button" className={`kv-tab ${mode === 'style' ? 'active' : ''}`} onClick={() => setMode('style')}>Style Improve</button>
          <button type="button" className={`kv-tab ${mode === 'academic' ? 'active' : ''}`} onClick={() => setMode('academic')}>Academic Upgrade</button>
        </div>

        <div className="kv-card mt-4">
          <textarea
            className="kv-textarea"
            style={{ minHeight: 250 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your writing here..."
          />
          <p className="mt-2 text-sm text-[var(--text-muted)]">{words} words</p>
          <button className="kv-btn-primary mt-3" disabled={loading || !text.trim()} onClick={() => void checkWriting()}>
            {loading ? 'Analyzing your writing...' : 'Check & Improve'}
          </button>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>

        {result && (
          <>
            <section className="mt-5" style={{ display: 'grid', gridTemplateColumns: '45% 55%', gap: 14 }}>
              <article className="kv-card">
                <h3 className="mb-2 text-lg font-semibold">Original text</h3>
                <div className="text-sm leading-7" dangerouslySetInnerHTML={{ __html: originalHighlights.replace(/\n/g, '<br/>') }} />
              </article>

              <article className="kv-card-teal">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Corrected text</h3>
                  <button className="kv-btn-secondary" onClick={() => void navigator.clipboard.writeText(correctedText)}>Copy corrected</button>
                </div>
                <div className="text-sm leading-7" dangerouslySetInnerHTML={{ __html: correctedHighlights.replace(/\n/g, '<br/>') }} />
              </article>
            </section>

            <div className="kv-card mt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="kv-badge kv-badge-gold">Writing Score: {result.overallScore || 0}/100</span>
              </div>

              <h3 className="mb-2 text-lg font-semibold">Changes</h3>
              <div className="space-y-2">
                {(result.changes || []).map((item, index) => (
                  <div key={`${item.original}-${index}`} className="kv-card-sm">
                    <p className="mb-1 text-sm">
                      <span style={{ textDecoration: 'line-through' }}>{item.original}</span> → <strong>{item.corrected}</strong>
                    </p>
                    <p className="mb-1 text-xs text-[var(--text-muted)]">{item.explanation}</p>
                    <span className="kv-badge kv-badge-blue">{mapTypeLabel(item.type)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="kv-card-elevated mt-4">{result.summary}</div>
          </>
        )}
      </section>
    </main>
  );
}
