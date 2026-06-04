'use client';

import { useState } from 'react';

type CornellNoteRow = {
  cue: string;
  content: string;
};

type CornellResponse = {
  cues: string[];
  notes: CornellNoteRow[];
  summary: string;
};

export default function CornellPage() {
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CornellResponse | null>(null);

  async function formatNotes() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/cornell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, text }),
      });

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok || !payload) {
        setError(typeof payload?.error === 'string' ? payload.error : 'Formatting failed');
        return;
      }

      const cues = Array.isArray(payload.cues) ? payload.cues.filter((item): item is string => typeof item === 'string') : [];
      const notes = Array.isArray(payload.notes)
        ? payload.notes
            .map((entry) => {
              if (!entry || typeof entry !== 'object') return null;
              const row = entry as Record<string, unknown>;
              return {
                cue: typeof row.cue === 'string' ? row.cue : '',
                content: typeof row.content === 'string' ? row.content : '',
              };
            })
            .filter((row): row is CornellNoteRow => Boolean(row && row.cue && row.content))
        : [];

      setResult({
        cues,
        notes,
        summary: typeof payload.summary === 'string' ? payload.summary : '',
      });
    } catch {
      setError('Formatting failed');
    } finally {
      setLoading(false);
    }
  }

  function plainTextOutput() {
    if (!result) return '';
    const lines = [
      `COURSE: ${topic || 'Untitled Topic'}`,
      '',
      'CUE COLUMN | NOTES COLUMN',
      ...result.notes.map((row) => `${row.cue} | ${row.content}`),
      '',
      'SUMMARY',
      result.summary,
    ];
    return lines.join('\n');
  }

  async function copyAsText() {
    const textOutput = plainTextOutput();
    if (!textOutput) return;
    await navigator.clipboard.writeText(textOutput);
  }

  async function saveAsNote() {
    if (!result) return;

    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Cornell Notes: ${topic || 'Untitled Topic'}`,
        content: plainTextOutput(),
        format: 'cornell',
        tags: ['cornell', topic || 'notes'],
      }),
    });
  }

  return (
    <main className="kv-page kv-page-cornell" style={{ padding: '32px 16px 56px' }}>
      <section className="kv-container kv-stack-lg" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header className="kv-hero">
          <h1 className="kv-title-xl" style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em' }}>
            Cornell Notes Auto-Formatter
          </h1>
        </header>

        <section className="kv-card kv-stack-md" style={{ padding: 20 }}>
          <label className="kv-label" htmlFor="topic">Topic</label>
          <input
            id="topic"
            className="kv-input"
            placeholder="e.g. Cellular Respiration"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />

          <label className="kv-label" htmlFor="raw-notes">Raw notes</label>
          <textarea
            id="raw-notes"
            className="kv-textarea"
            rows={10}
            placeholder="Paste class notes here..."
            value={text}
            onChange={(event) => setText(event.target.value)}
          />

          <button className="kv-btn-primary" onClick={formatNotes} disabled={!text || loading}>
            {loading ? 'Formatting...' : 'Format as Cornell Notes'}
          </button>

          {error ? <p className="kv-text-danger" style={{ color: '#ef4444' }}>{error}</p> : null}
        </section>

        {result ? (
          <section className="kv-card kv-stack-md" style={{ padding: 18 }}>
            <div
              className="kv-cornell-board"
              style={{
                border: '1px solid rgba(240,180,41,0.2)',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--bg-card)',
              }}
            >
              <div className="kv-cornell-header" style={{ padding: '12px 14px', borderBottom: '1px solid rgba(240,180,41,0.2)', fontWeight: 800 }}>
                COURSE: {topic || 'Untitled Topic'}
              </div>

              <div
                className="kv-cornell-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '30% 70%',
                  minHeight: 260,
                }}
              >
                <div
                  className="kv-cornell-cues"
                  style={{
                    borderRight: '1px solid rgba(240,180,41,0.2)',
                    background: 'var(--bg-card)',
                    padding: 12,
                  }}
                >
                  <div className="kv-cornell-col-title" style={{ fontWeight: 800, marginBottom: 8 }}>CUE COLUMN</div>
                  <div className="kv-stack-sm">
                    {(result.notes.length ? result.notes : result.cues.map((cue) => ({ cue, content: '' }))).map((row, index) => (
                      <div key={`${row.cue}-${index}`} className="kv-cornell-cell" style={{ minHeight: 42, lineHeight: 1.45 }}>
                        {row.cue || '-'}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="kv-cornell-notes" style={{ background: 'var(--bg-card)', padding: 12 }}>
                  <div className="kv-cornell-col-title" style={{ fontWeight: 800, marginBottom: 8 }}>NOTES COLUMN</div>
                  <div className="kv-stack-sm">
                    {(result.notes.length ? result.notes : [{ cue: '', content: 'No detailed notes returned by API.' }]).map((row, index) => (
                      <div key={`${row.content}-${index}`} className="kv-cornell-cell" style={{ minHeight: 42, lineHeight: 1.45 }}>
                        {row.content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="kv-cornell-summary"
                style={{
                  borderTop: '1px solid rgba(240,180,41,0.2)',
                  background: 'var(--bg-card)',
                  padding: 12,
                }}
              >
                <div className="kv-cornell-col-title" style={{ fontWeight: 800, marginBottom: 8 }}>SUMMARY</div>
                <p style={{ lineHeight: 1.6 }}>{result.summary || 'No summary returned by API.'}</p>
              </div>
            </div>

            <div className="kv-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="kv-btn-secondary" onClick={copyAsText}>Copy as Text</button>
              <button className="kv-btn-secondary" onClick={saveAsNote}>Save as Note</button>
              <button className="kv-btn-secondary" onClick={() => window.print()}>Print</button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
