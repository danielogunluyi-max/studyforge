'use client';

import { useMemo, useState } from 'react';

type ImportedCard = {
  question: string;
  answer: string;
};

function parsePreview(text: string): ImportedCard[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question, answer] = line.split('\t');
      return {
        question: (question ?? '').trim(),
        answer: (answer ?? '').trim(),
      };
    })
    .filter((card) => card.question && card.answer)
    .slice(0, 5);
}

export default function QuizletImportPage() {
  const [pastedText, setPastedText] = useState('');
  const [deckName, setDeckName] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  const preview = useMemo(() => parsePreview(pastedText), [pastedText]);

  async function importCards() {
    setLoading(true);
    setError('');
    setImportedCount(null);

    try {
      const response = await fetch('/api/quizlet-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastedText, deckName, subject }),
      });

      const payload = (await response.json().catch(() => null)) as { count?: number; error?: string } | null;
      if (!response.ok || !payload) {
        setError(payload?.error ?? 'Import failed');
        return;
      }

      setImportedCount(typeof payload.count === 'number' ? payload.count : 0);
    } catch {
      setError('Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="kv-page kv-page-quizlet-import" style={{ padding: '32px 16px 56px' }}>
      <section className="kv-container kv-stack-lg" style={{ maxWidth: 980, margin: '0 auto' }}>
        <header className="kv-hero">
          <h1 className="kv-title-xl" style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em' }}>Quizlet Importer</h1>
        </header>

        <section className="kv-card kv-card-gold kv-stack-sm" style={{ padding: 18 }}>
          <h2 className="kv-title-sm" style={{ fontWeight: 800 }}>How to export from Quizlet</h2>
          <ol className="kv-ol kv-list" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Go to your Quizlet set</li>
            <li>Click "..." then choose Export</li>
            <li>Copy all the text</li>
            <li>Paste below</li>
          </ol>
        </section>

        <section className="kv-card kv-stack-md" style={{ padding: 18 }}>
          <label className="kv-label" htmlFor="quizlet-text">Paste Quizlet export</label>
          <textarea
            id="quizlet-text"
            className="kv-textarea kv-textarea-xl"
            rows={12}
            placeholder={'term\tdefinition'}
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
          />

          <div className="kv-grid-2" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="kv-stack-xs">
              <label className="kv-label" htmlFor="deck-name">Deck name</label>
              <input
                id="deck-name"
                className="kv-input"
                value={deckName}
                onChange={(event) => setDeckName(event.target.value)}
                placeholder="My imported deck"
              />
            </div>
            <div className="kv-stack-xs">
              <label className="kv-label" htmlFor="subject">Subject</label>
              <input
                id="subject"
                className="kv-input"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Biology"
              />
            </div>
          </div>

          <button className="kv-btn-primary" onClick={importCards} disabled={!pastedText || loading}>
            {loading ? 'Importing...' : 'Import Cards'}
          </button>

          {error ? <p className="kv-text-danger" style={{ color: '#ef4444' }}>{error}</p> : null}
        </section>

        {importedCount !== null ? (
          <section className="kv-card kv-stack-md" style={{ padding: 18 }}>
            <h3 className="kv-title-sm" style={{ color: '#10b981' }}>✅ Imported {importedCount} cards successfully!</h3>

            <div className="kv-stack-sm">
              <h4 className="kv-subtitle">Preview (first 5)</h4>
              {preview.length === 0 ? (
                <div className="kv-card-sm kv-empty">Preview unavailable for this format, but cards were imported.</div>
              ) : (
                preview.map((card, index) => (
                  <div key={`${card.question}-${index}`} className="kv-card-sm" style={{ padding: 10 }}>
                    <div className="kv-text-strong" style={{ fontWeight: 700 }}>Q: {card.question}</div>
                    <div className="kv-text-muted">A: {card.answer}</div>
                  </div>
                ))
              )}
            </div>

            <a href="/flashcards" className="kv-link kv-link-cta" style={{ fontWeight: 800 }}>
              Go to my flashcards →
            </a>
          </section>
        ) : null}
      </section>
    </main>
  );
}
