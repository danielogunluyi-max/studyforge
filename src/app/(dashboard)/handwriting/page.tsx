'use client';

import { useMemo, useState } from 'react';

type HandwritingResult = {
  rawTranscription: string;
  cleanedNotes: string;
  subject: string;
  keyPoints: string[];
};

type Tab = 'clean' | 'raw' | 'points';

export default function HandwritingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState<HandwritingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('clean');
  const [error, setError] = useState('');

  const hasImage = useMemo(() => !!file && !!preview, [file, preview]);

  function onFileChange(nextFile: File | null) {
    if (!nextFile) return;
    setFile(nextFile);
    setResult(null);
    setError('');

    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ''));
    reader.readAsDataURL(nextFile);
  }

  async function extractNotes() {
    if (!file || !preview) return;
    setLoading(true);
    setError('');

    try {
      const base64 = preview.split(',')[1] || '';
      const mediaType = file.type || 'image/jpeg';

      const response = await fetch('/api/handwriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      const data = (await response.json().catch(() => null)) as HandwritingResult & { error?: string };
      if (!response.ok) {
        setError(data?.error ?? 'Failed to extract handwriting.');
        return;
      }

      setResult({
        rawTranscription: data.rawTranscription || '',
        cleanedNotes: data.cleanedNotes || '',
        subject: data.subject || '',
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
      });
      setTab('clean');
    } catch {
      setError('Network error while extracting notes.');
    } finally {
      setLoading(false);
    }
  }

  async function saveAsNote() {
    if (!result?.cleanedNotes) return;

    const title = result.subject ? `Handwriting Notes: ${result.subject}` : 'Handwriting Notes';
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: result.cleanedNotes, format: 'detailed', tags: ['handwriting', ...(result.subject ? [result.subject] : [])] }),
    });
  }

  return (
    <div className="kv-page" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1 className="kv-page-title">Handwritten Notes Scanner</h1>
      <p className="kv-page-subtitle">Upload handwritten pages and turn them into clean, structured study notes.</p>

      <div className="kv-card" style={{ marginBottom: 16 }}>
        <label
          htmlFor="handwriting-upload"
          style={{
            border: '1px dashed var(--border-default)',
            borderRadius: 12,
            minHeight: 180,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            textAlign: 'center',
            padding: 20,
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0] || null;
            onFileChange(dropped);
          }}
        >
          <div>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✍️</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Drag & drop an image, or click to upload</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Accepts image/*</div>
          </div>
        </label>
        <input
          id="handwriting-upload"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        />

        {hasImage ? (
          <div style={{ marginTop: 12 }}>
            <img src={preview} alt="Handwriting preview" style={{ maxHeight: 280, width: '100%', objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border-default)' }} />
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="kv-btn-primary" disabled={!hasImage || loading} onClick={() => void extractNotes()}>
            {loading ? 'Reading your handwriting...' : 'Extract & Clean Notes'}
          </button>
          {result ? (
            <button
              className="kv-btn-secondary"
              onClick={() => void navigator.clipboard.writeText(result.cleanedNotes || '')}
            >
              Copy
            </button>
          ) : null}
        </div>

        {error ? <div className="kv-alert-error" style={{ marginTop: 12 }}>{error}</div> : null}
      </div>

      {result ? (
        <div className="kv-card">
          <div className="kv-tabs">
            <button className={`kv-tab ${tab === 'clean' ? 'active' : ''}`} onClick={() => setTab('clean')}>Cleaned Notes</button>
            <button className={`kv-tab ${tab === 'raw' ? 'active' : ''}`} onClick={() => setTab('raw')}>Raw Transcription</button>
            <button className={`kv-tab ${tab === 'points' ? 'active' : ''}`} onClick={() => setTab('points')}>Key Points</button>
          </div>

          {tab === 'clean' ? (
            <div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.8, fontFamily: 'inherit' }}>{result.cleanedNotes}</pre>
              <div style={{ marginTop: 12 }}>
                <button className="kv-btn-primary" onClick={() => void saveAsNote()}>Save as Note</button>
              </div>
            </div>
          ) : null}

          {tab === 'raw' ? (
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.75, fontFamily: 'inherit' }}>{result.rawTranscription}</pre>
          ) : null}

          {tab === 'points' ? (
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
              {(result.keyPoints || []).map((point) => (
                <li key={point} style={{ color: 'var(--text-secondary)' }}>{point}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
