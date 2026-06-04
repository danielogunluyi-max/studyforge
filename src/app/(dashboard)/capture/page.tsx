'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Capture = {
  id: string;
  content: string;
  tags: string[];
  processed: boolean;
  convertedTo: string | null;
  createdAt: string;
};

type Filter = 'all' | 'unprocessed' | 'processed';

function timeAgo(dateValue: string) {
  const date = new Date(dateValue).getTime();
  const seconds = Math.max(1, Math.floor((Date.now() - date) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CapturePage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch('/api/capture');
      const data = (await res.json()) as { captures?: Capture[] };
      if (res.ok) setCaptures(data.captures || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCapture() {
    if (!content.trim()) return;
    const res = await fetch('/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim(), tags }),
    });
    const data = (await res.json()) as { capture?: Capture };
    if (res.ok && data.capture) {
      setCaptures((prev) => [data.capture!, ...prev]);
      setContent('');
      setTags([]);
      setTagInput('');
    }
  }

  async function deleteCapture(id: string) {
    const snapshot = captures;
    setCaptures((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/capture/${id}`, { method: 'DELETE' });
      if (!res.ok) setCaptures(snapshot);
    } catch {
      setCaptures(snapshot);
    }
  }

  async function processCapture(item: Capture, convertedTo: 'note' | 'flashcard') {
    const snapshot = captures;
    setCaptures((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, processed: true, convertedTo } : c)),
    );

    try {
      const res = await fetch(`/api/capture/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processed: true, convertedTo }),
      });
      if (!res.ok) {
        setCaptures(snapshot);
        return;
      }

      window.localStorage.setItem('kyvex.capture.handoff', JSON.stringify({ content: item.content, tags: item.tags, convertedTo }));
      if (convertedTo === 'note') {
        router.push('/generator');
      } else {
        router.push('/flashcards');
      }
    } catch {
      setCaptures(snapshot);
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'processed') return captures.filter((c) => c.processed);
    if (filter === 'unprocessed') return captures.filter((c) => !c.processed);
    return captures;
  }, [captures, filter]);

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Quick Capture</h1>
      <p className="kv-page-subtitle">Brain dump instantly, process later.</p>

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <textarea
          className="kv-textarea"
          style={{ minHeight: 220, marginBottom: 12 }}
          placeholder="Capture anything - ideas, questions, things to look up, random thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div style={{ marginBottom: 12 }}>
          <label className="kv-label" htmlFor="capture-tag">Add tags (Enter)</label>
          <input
            id="capture-tag"
            className="kv-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const next = tagInput.trim().replace(/^#/, '');
                if (next && !tags.includes(next)) {
                  setTags((prev) => [...prev, next]);
                }
                setTagInput('');
              }
            }}
            placeholder="tag"
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <button
                key={tag}
                className="kv-badge kv-badge-blue"
                style={{ cursor: 'pointer' }}
                onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
              >
                #{tag} ×
              </button>
            ))}
          </div>
        </div>

        <button className="kv-btn-primary" disabled={!content.trim()} onClick={() => void createCapture()}>
          Capture
        </button>
      </section>

      <section className="kv-card" style={{ marginBottom: 12 }}>
        <div className="kv-tabs">
          <button className={`kv-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`kv-tab ${filter === 'unprocessed' ? 'active' : ''}`} onClick={() => setFilter('unprocessed')}>Unprocessed</button>
          <button className={`kv-tab ${filter === 'processed' ? 'active' : ''}`} onClick={() => setFilter('processed')}>Processed</button>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        {loading && (
          <div className="kv-card-elevated" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="kv-spinner" />
            <span>Loading captures...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="kv-empty kv-card-sm">
            <p className="kv-empty-title">No captures yet</p>
            <p className="kv-empty-text">Use the text area above to dump ideas quickly.</p>
          </div>
        )}

        {filtered.map((item) => (
          <article
            key={item.id}
            className="kv-card-sm"
            style={{
              opacity: item.processed ? 0.55 : 1,
              textDecoration: item.processed ? 'line-through' : 'none',
            }}
          >
            <p style={{ margin: 0, lineHeight: 1.6 }}>{item.content}</p>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.tags.map((tag) => (
                <span key={`${item.id}-${tag}`} className="kv-badge kv-badge-blue">#{tag}</span>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(item.createdAt)}</p>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="kv-btn-secondary" onClick={() => void processCapture(item, 'note')}>→ Note</button>
              <button className="kv-btn-secondary" onClick={() => void processCapture(item, 'flashcard')}>→ Flashcard</button>
              <button className="kv-btn-danger" onClick={() => void deleteCapture(item.id)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
