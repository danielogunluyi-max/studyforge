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

export function InboxQuizlet() {
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
    <div style={{ padding: '18px 0 24px' }}>
      <p className="kv-meta">Quizlet</p>
      <p className="kv-sub" style={{ marginTop: 8 }}>Paste an export. Import a deck.</p>

      <section style={{ marginTop: 18 }}>
        <p className="kv-meta">How to export from Quizlet</p>
        <ol style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.8, color: 'var(--kv-text-secondary)' }}>
          <li>Go to your Quizlet set</li>
          <li>Click &quot;...&quot; then choose Export</li>
          <li>Copy all the text</li>
          <li>Paste below</li>
        </ol>
      </section>

      <section style={{ marginTop: 22, display: 'grid', gap: 12 }}>
        <div>
          <label className="kv-meta" htmlFor="quizlet-text" style={{ display: 'block', marginBottom: 8 }}>Paste Quizlet export</label>
          <textarea
            id="quizlet-text"
            className="kv-field"
            rows={12}
            placeholder={'term\tdefinition'}
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label className="kv-meta" htmlFor="deck-name" style={{ display: 'block', marginBottom: 8 }}>Deck name</label>
            <input
              id="deck-name"
              className="kv-field"
              value={deckName}
              onChange={(event) => setDeckName(event.target.value)}
              placeholder="My imported deck"
            />
          </div>
          <div>
            <label className="kv-meta" htmlFor="subject" style={{ display: 'block', marginBottom: 8 }}>Subject</label>
            <input
              id="subject"
              className="kv-field"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Biology"
            />
          </div>
        </div>

        <button type="button" className="kv-btn" onClick={importCards} disabled={!pastedText || loading}>
          {loading ? 'Importing...' : 'Import Cards'}
        </button>

        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--kv-text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="kv-chip kv-chip-stale">Error</span>
            {error}
          </p>
        ) : null}
      </section>

      {importedCount !== null ? (
        <section style={{ marginTop: 22 }}>
          <p style={{ margin: 0, color: 'var(--kv-accent-text)' }}>
            Imported <span className="num">{importedCount}</span> cards successfully.
          </p>

          <p className="kv-meta" style={{ marginTop: 16 }}>Preview (first 5)</p>
          {preview.length === 0 ? (
            <p className="kv-sub" style={{ marginTop: 12 }}>Preview unavailable for this format, but cards were imported.</p>
          ) : (
            preview.map((card, index) => (
              <div key={`${card.question}-${index}`} className="kv-row">
                <div>
                  <div className="kv-row-title">{card.question}</div>
                  <p className="kv-sub" style={{ marginTop: 6 }}>{card.answer}</p>
                </div>
              </div>
            ))
          )}

          <a href="/flashcards" className="kv-btn-ghost" style={{ marginTop: 16, display: 'inline-flex' }}>
            Go to my flashcards →
          </a>
        </section>
      ) : null}
    </div>
  );
}
