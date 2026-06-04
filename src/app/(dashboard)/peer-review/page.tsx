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

export default function PeerReviewPage() {
  const [tab, setTab] = useState<'get' | 'give'>('get');

  const [contentType, setContentType] = useState<'essay' | 'notes'>('essay');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mySubmissions, setMySubmissions] = useState<ReviewItem[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewItem[]>([]);
  const [expandedId, setExpandedId] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [savingReviewId, setSavingReviewId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadGetReviews();
    void loadGiveReviews();
  }, []);

  const karma = useMemo(() => mySubmissions.filter((item) => item.status === 'reviewed').length * 5, [mySubmissions]);

  async function loadGetReviews() {
    try {
      const res = await fetch('/api/peer-review');
      const data = (await res.json().catch(() => ({}))) as { reviews?: ReviewItem[] };
      setMySubmissions(data.reviews ?? []);
    } catch {
      setMySubmissions([]);
    }
  }

  async function loadGiveReviews() {
    try {
      const res = await fetch('/api/peer-review?type=review');
      const data = (await res.json().catch(() => ({}))) as { reviews?: ReviewItem[] };
      setPendingReviews(data.reviews ?? []);
    } catch {
      setPendingReviews([]);
    }
  }

  async function submitForReview() {
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
        setError(data.error ?? 'Failed to submit for review');
        return;
      }
      setSubject('');
      setContent('');
      await loadGetReviews();
    } catch {
      setError('Failed to submit for review');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReview(reviewId: string) {
    const rating = ratings[reviewId];
    const feedback = feedbacks[reviewId] ?? '';
    if (!rating) return;

    setSavingReviewId(reviewId);
    setError('');
    try {
      const res = await fetch('/api/peer-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, rating, feedback }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit review');
        return;
      }
      setPendingReviews((prev) => prev.filter((item) => item.id !== reviewId));
      await loadGetReviews();
    } catch {
      setError('Failed to submit review');
    } finally {
      setSavingReviewId('');
    }
  }

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">Peer Review Exchange</h1>
        <div className="kv-tabs mb-5">
          <button className={`kv-tab ${tab === 'get' ? 'active' : ''}`} onClick={() => setTab('get')} type="button">Get Reviews</button>
          <button className={`kv-tab ${tab === 'give' ? 'active' : ''}`} onClick={() => setTab('give')} type="button">Give Reviews</button>
        </div>

        {error && <div className="kv-card mb-4 border border-red-500/40 text-red-300">{error}</div>}

        {tab === 'get' && (
          <>
            <div className="kv-card mb-5">
              <h2 className="mb-3 text-lg font-semibold">Submit for Review</h2>
              <div className="mb-3 flex gap-2">
                <button className={`kv-tab ${contentType === 'essay' ? 'active' : ''}`} onClick={() => setContentType('essay')} type="button">Essay</button>
                <button className={`kv-tab ${contentType === 'notes' ? 'active' : ''}`} onClick={() => setContentType('notes')} type="button">Notes</button>
              </div>
              <input className="kv-input mb-3" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className="kv-textarea mb-3" style={{ minHeight: 220 }} value={content} onChange={(e) => setContent(e.target.value)} />
              <button className="kv-btn-primary" onClick={() => void submitForReview()} disabled={submitting || !content.trim()}>
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
              <p className="mt-2 text-xs text-[var(--text-muted)]">AI feedback is instant. Human feedback may take time.</p>
            </div>

            <div className="kv-card">
              <h2 className="mb-3 text-lg font-semibold">MY SUBMISSIONS</h2>
              {mySubmissions.length === 0 && <p className="text-sm text-[var(--text-muted)]">No submissions yet.</p>}
              <div className="space-y-3">
                {mySubmissions.map((item) => (
                  <div key={item.id} className="kv-card-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--text-primary)]">{item.subject}</p>
                      <span className="kv-badge kv-badge-blue">{item.contentType}</span>
                      <span className={item.status === 'reviewed' ? 'kv-badge kv-badge-green' : 'kv-badge kv-badge-gold'}>
                        {item.status === 'reviewed' ? 'Reviewed ✅' : 'Pending 🟡'}
                      </span>
                    </div>
                    <p className="mb-2 text-sm italic text-teal-300">AI: {item.aiFeedback}</p>
                    {item.status === 'reviewed' && (
                      <div className="kv-card">
                        <p className="text-sm">Rating: {'★'.repeat(item.rating ?? 0)}{'☆'.repeat(5 - (item.rating ?? 0))}</p>
                        <p className="text-sm">{item.feedback}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Reviewer: Anonymous student</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'give' && (
          <>
            <div className="kv-card-gold mb-5">
              <p className="mb-1 font-semibold">You earn karma by reviewing others</p>
              <span className="kv-badge kv-badge-gold">Karma: {karma}</span>
            </div>

            <div className="kv-card">
              <h2 className="mb-3 text-lg font-semibold">PENDING REVIEWS</h2>
              {pendingReviews.length === 0 && <p className="text-sm text-[var(--text-muted)]">No pending reviews right now.</p>}
              <div className="space-y-3">
                {pendingReviews.map((item) => {
                  const expanded = expandedId === item.id;
                  const excerpt = item.content.slice(0, 200);
                  const hidden = item.content.slice(200);
                  const selectedRating = ratings[item.id] ?? 0;

                  return (
                    <div key={item.id} className="kv-card-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--text-primary)]">{item.subject}</p>
                        <span className="kv-badge kv-badge-blue">{item.contentType}</span>
                      </div>

                      {!expanded ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                          {excerpt}
                          {hidden && <span style={{ filter: 'blur(2px)' }}>{hidden.slice(0, 70)}</span>}
                        </p>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{item.content}</p>
                      )}

                      {!expanded ? (
                        <button className="kv-btn-secondary mt-3" onClick={() => setExpandedId(item.id)} type="button">Review This</button>
                      ) : (
                        <div className="mt-3">
                          <div className="mb-2 flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={`${item.id}-star-${star}`}
                                type="button"
                                className="kv-tab"
                                onClick={() => setRatings((prev) => ({ ...prev, [item.id]: star }))}
                                style={{ color: star <= selectedRating ? '#f0b429' : undefined }}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <textarea
                            className="kv-textarea mb-2"
                            value={feedbacks[item.id] ?? ''}
                            onChange={(e) => setFeedbacks((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Write your feedback"
                          />
                          <button
                            className="kv-btn-primary"
                            disabled={!selectedRating || savingReviewId === item.id}
                            onClick={() => void submitReview(item.id)}
                          >
                            {savingReviewId === item.id ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
