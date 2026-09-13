'use client';

import { useEffect, useMemo, useState } from 'react';

type ReviewItem = {
  id: string;
  contentType: string;
  subject: string;
  content: string;
  aiFeedback: string;
  feedback: string | null;
  rating: number | null;
  status: 'pending' | 'reviewed';
  createdAt: string;
};

export default function AiFeedbackPage() {
  const [contentType, setContentType] = useState<'essay' | 'notes'>('essay');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<ReviewItem[]>([]);
  const [expandedId, setExpandedId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadReviews();
  }, []);

  async function loadReviews() {
    try {
      const res = await fetch('/api/peer-review');
      const data = (await res.json().catch(() => ({}))) as { reviews?: ReviewItem[] };
      setMySubmissions(data.reviews ?? []);
    } catch {
      setMySubmissions([]);
    }
  }

  async function submitForFeedback() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/peer-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, contentType, content }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to get AI feedback');
        return;
      }
      setSubject('');
      setContent('');
      await loadReviews();
    } catch {
      setError('Failed to get AI feedback');
    } finally {
      setSubmitting(false);
    }
  }

  const count = useMemo(() => mySubmissions.length, [mySubmissions]);

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="kv-crumb">Kyvex / <b>AI Feedback</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>AI Feedback</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>
          Instant critique from Nova — not a human peer queue. Peer review stays off until a real human queue exists.
        </p>

        {error ? (
          <p className="kv-meta" style={{ marginTop: 16, color: 'var(--kv-text-primary)' }} role="alert">
            {error}
          </p>
        ) : null}

        <section
          className="card"
          style={{
            marginTop: 28,
            padding: 18,
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--kv-radius)',
            background: 'var(--bg-card)',
            boxShadow: 'none',
          }}
        >
          <p className="kv-meta">Submit for AI feedback</p>
          <div className="kv-tabs" style={{ marginTop: 12 }}>
            <button
              type="button"
              className={contentType === 'essay' ? 'kv-tab on' : 'kv-tab'}
              onClick={() => setContentType('essay')}
            >
              Essay
            </button>
            <button
              type="button"
              className={contentType === 'notes' ? 'kv-tab on' : 'kv-tab'}
              onClick={() => setContentType('notes')}
            >
              Notes
            </button>
          </div>
          <input
            className="kv-field"
            style={{ marginTop: 12 }}
            placeholder="Subject (e.g. ENG4U)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="kv-field"
            style={{ marginTop: 12, minHeight: 220, resize: 'vertical' }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your essay or notes…"
          />
          <button
            type="button"
            className="kv-btn"
            style={{ marginTop: 12, minHeight: 44 }}
            onClick={() => void submitForFeedback()}
            disabled={submitting || !content.trim()}
          >
            {submitting ? 'Reading…' : 'Get AI Feedback'}
          </button>
        </section>

        <section style={{ marginTop: 28 }}>
          <p className="kv-meta">Your submissions · {count}</p>
          {mySubmissions.length === 0 ? (
            <p className="kv-sub" style={{ marginTop: 8 }}>No submissions yet.</p>
          ) : (
            mySubmissions.map((item) => {
              const open = expandedId === item.id;
              return (
                <div key={item.id} className="kv-row">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? '' : item.id)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      padding: 0,
                    }}
                  >
                    <div className="kv-row-title">{item.subject || 'Untitled'}</div>
                    <div className="kv-row-sub">
                      <span className="kv-chip">{item.contentType}</span>
                      <span className="kv-chip">AI feedback</span>
                    </div>
                    {open ? (
                      <p className="kv-sub" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
                        {item.aiFeedback}
                      </p>
                    ) : (
                      <p className="kv-sub" style={{ marginTop: 8 }}>
                        {item.aiFeedback.slice(0, 120)}
                        {item.aiFeedback.length > 120 ? '…' : ''}
                      </p>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
