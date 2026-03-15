'use client';

import { useEffect, useMemo, useState } from 'react';

type FlashcardPair = {
  question: string;
  answer: string;
};

type ImportResult = {
  id?: string;
  title: string;
  notes: string;
  transcript: string;
  flashcards: FlashcardPair[];
};

type HistoryItem = {
  id: string;
  title: string;
  youtubeUrl: string;
  createdAt?: string;
};

function normalizeFlashcards(raw: unknown): FlashcardPair[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const question = typeof row.question === 'string' ? row.question : '';
      const answer = typeof row.answer === 'string' ? row.answer : '';
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((entry): entry is FlashcardPair => Boolean(entry));
}

export default function YouTubeImportPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loadingStep, setLoadingStep] = useState<'idle' | 'fetching' | 'generating'>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'transcript'>('notes');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');
  const [savingDeck, setSavingDeck] = useState(false);

  const loadingText = useMemo(() => {
    if (loadingStep === 'fetching') return 'Fetching transcript...';
    if (loadingStep === 'generating') return 'Generating notes...';
    return '';
  }, [loadingStep]);

  async function loadHistory() {
    const response = await fetch('/api/youtube-import');
    if (!response.ok) return;

    const payload = (await response.json().catch(() => null)) as { imports?: Array<Record<string, unknown>> } | null;
    const rows = (payload?.imports ?? []).map((entry, index) => ({
      id: String(entry.id ?? index),
      title: typeof entry.title === 'string' ? entry.title : 'Untitled import',
      youtubeUrl: typeof entry.youtubeUrl === 'string' ? entry.youtubeUrl : '#',
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
    }));

    setHistory(rows);
  }

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, []);

  async function runImport() {
    setError('');
    setLoadingStep('fetching');
    setResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setLoadingStep('generating');

      const response = await fetch('/api/youtube-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl }),
      });

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok || !payload) {
        setError(typeof payload?.error === 'string' ? payload.error : 'Import failed');
        return;
      }

      const importResult: ImportResult = {
        id: typeof payload.id === 'string' ? payload.id : undefined,
        title: typeof payload.title === 'string' ? payload.title : 'YouTube Video',
        notes: typeof payload.notes === 'string' ? payload.notes : '',
        transcript: typeof payload.transcript === 'string' ? payload.transcript : '',
        flashcards: normalizeFlashcards(payload.flashcards),
      };

      setResult(importResult);
      setActiveTab('notes');
      await loadHistory();
    } catch {
      setError('Import failed');
    } finally {
      setLoadingStep('idle');
    }
  }

  async function saveAsDeck() {
    if (!result) return;

    setSavingDeck(true);
    setError('');

    try {
      const deckResponse = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          subject: 'YouTube Import',
          description: 'Imported from YouTube transcript',
        }),
      });

      const deckPayload = (await deckResponse.json().catch(() => null)) as { deck?: { id?: string }; error?: string } | null;
      const deckId = deckPayload?.deck?.id;

      if (!deckResponse.ok || !deckId) {
        setError(deckPayload?.error ?? 'Could not create deck');
        return;
      }

      for (const card of result.flashcards) {
        await fetch(`/api/decks/${deckId}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ front: card.question, back: card.answer }),
        });
      }
    } catch {
      setError('Could not save flashcards as deck');
    } finally {
      setSavingDeck(false);
    }
  }

  return (
    <main className="kv-page kv-page-youtube-import" style={{ padding: '32px 16px 56px' }}>
      <section className="kv-container kv-stack-lg" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header className="kv-hero kv-stack-sm">
          <h1 className="kv-title-xl" style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6 }}>
            YouTube → Notes + Flashcards
          </h1>
          <p className="kv-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Drop a video URL and instantly convert it into study material.
          </p>
        </header>

        <section className="kv-card kv-card-gold kv-stack-md" style={{ padding: 20 }}>
          <label className="kv-label" htmlFor="yt-url">YouTube URL</label>
          <div className="kv-row" style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div className="kv-input-wrap kv-input-icon" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <span style={{ fontSize: 22 }} aria-hidden="true">🎬</span>
              <input
                id="yt-url"
                className="kv-input kv-input-lg"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <button className="kv-btn-primary" onClick={runImport} disabled={!youtubeUrl || loadingStep !== 'idle'}>
              Import
            </button>
          </div>

          {loadingStep !== 'idle' ? <p className="kv-loading-text">{loadingText}</p> : null}
          {error ? <p className="kv-text-danger" style={{ color: '#ef4444' }}>{error}</p> : null}
        </section>

        {result ? (
          <section className="kv-card kv-stack-md" style={{ padding: 20 }}>
            <div className="kv-row-between" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h2 className="kv-title-md" style={{ fontSize: 22, fontWeight: 800 }}>{result.title}</h2>
              {result.id ? <span className="kv-badge kv-badge-blue">Import #{result.id.slice(0, 6)}</span> : null}
            </div>

            <div className="kv-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'notes', label: 'Notes' },
                { key: 'flashcards', label: 'Flashcards' },
                { key: 'transcript', label: 'Raw Transcript' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={activeTab === tab.key ? 'kv-tab kv-tab-active' : 'kv-tab'}
                  onClick={() => setActiveTab(tab.key as 'notes' | 'flashcards' | 'transcript')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'notes' ? (
              <article
                className="kv-markdown kv-notes-render"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10,
                  padding: 16,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {result.notes || 'No notes were generated.'}
              </article>
            ) : null}

            {activeTab === 'flashcards' ? (
              <div className="kv-stack-sm">
                {result.flashcards.length === 0 ? <p>No flashcards were generated.</p> : null}
                {result.flashcards.map((card, index) => (
                  <div key={`${card.question}-${index}`} className="kv-card-sm" style={{ padding: 12 }}>
                    <p className="kv-text-strong" style={{ fontWeight: 700, marginBottom: 6 }}>Q{index + 1}: {card.question}</p>
                    <p className="kv-text-muted">A: {card.answer}</p>
                  </div>
                ))}
                <button className="kv-btn-primary" onClick={saveAsDeck} disabled={savingDeck || result.flashcards.length === 0}>
                  {savingDeck ? 'Saving...' : 'Save as Flashcard Deck'}
                </button>
              </div>
            ) : null}

            {activeTab === 'transcript' ? (
              <div
                className="kv-transcript-scroll"
                style={{
                  maxHeight: 320,
                  overflow: 'auto',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10,
                  padding: 14,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {result.transcript || 'Transcript unavailable from API response.'}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="kv-stack-sm">
          <h3 className="kv-title-sm" style={{ fontSize: 18, fontWeight: 800 }}>Import history</h3>
          {history.length === 0 ? (
            <div className="kv-card-sm kv-empty">No imports yet.</div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="kv-card-sm kv-row-between" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: 12 }}>
                <div className="kv-stack-xs">
                  <div className="kv-text-strong" style={{ fontWeight: 700 }}>{entry.title}</div>
                  <a className="kv-link" href={entry.youtubeUrl} target="_blank" rel="noreferrer">
                    {entry.youtubeUrl}
                  </a>
                </div>
                <span className="kv-caption" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
