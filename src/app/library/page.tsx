'use client';

import { useEffect, useMemo, useState } from 'react';

type SharedDeck = {
  id: string;
  title: string;
  subject: string;
  preset: string;
  description?: string;
  downloads: number;
  creatorName: string;
  cardCount: number;
};

type UserDeck = {
  id: string;
  title: string;
  subject: string;
};

const SUBJECTS = ['All', 'Math', 'Science', 'English', 'History', 'Biology', 'Chemistry', 'Physics', 'Computer Science'];
const PRESETS = ['All', 'HIGHSCHOOL', 'COLLEGE', 'UNIVERSITY'];

export default function LibraryPage() {
  const [decks, setDecks] = useState<SharedDeck[]>([]);
  const [myDecks, setMyDecks] = useState<UserDeck[]>([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [preset, setPreset] = useState('All');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const [shareDeckId, setShareDeckId] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareSubject, setShareSubject] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [sharePreset, setSharePreset] = useState('HIGHSCHOOL');
  const [sharing, setSharing] = useState(false);

  async function loadDecks() {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (subject !== 'All') params.set('subject', subject);
    if (preset !== 'All') params.set('preset', preset);

    const response = await fetch(`/api/shared-decks${params.toString() ? `?${params.toString()}` : ''}`);
    const payload = (await response.json().catch(() => null)) as { decks?: Array<Record<string, unknown>> } | null;

    const rows: SharedDeck[] = (payload?.decks ?? []).map((entry, index) => {
      const user = (entry.user as Record<string, unknown> | undefined) ?? {};
      const deck = (entry.deck as Record<string, unknown> | undefined) ?? {};
      const flashcards = Array.isArray(deck.flashcards) ? deck.flashcards : [];

      return {
        id: String(entry.id ?? index),
        title: typeof entry.title === 'string' ? entry.title : 'Untitled deck',
        subject: typeof entry.subject === 'string' ? entry.subject : 'General',
        preset: typeof entry.preset === 'string' ? entry.preset : 'HIGHSCHOOL',
        description: typeof entry.description === 'string' ? entry.description : '',
        downloads: typeof entry.downloads === 'number' ? entry.downloads : 0,
        creatorName: typeof user.name === 'string' && user.name ? user.name : 'Anonymous',
        cardCount: flashcards.length,
      };
    });

    setDecks(rows);
  }

  async function loadMyDecks() {
    const response = await fetch('/api/decks');
    if (!response.ok) return;

    const payload = (await response.json().catch(() => null)) as { decks?: Array<Record<string, unknown>> } | null;
    const rows: UserDeck[] = (payload?.decks ?? []).map((entry, index) => ({
      id: String(entry.id ?? index),
      title: typeof entry.title === 'string' ? entry.title : 'Untitled deck',
      subject: typeof entry.subject === 'string' ? entry.subject : 'General',
    }));

    setMyDecks(rows);
    if (rows.length > 0 && !shareDeckId) {
      setShareDeckId(rows[0]?.id ?? '');
      setShareTitle(rows[0]?.title ?? '');
      setShareSubject(rows[0]?.subject ?? '');
    }
  }

  useEffect(() => {
    Promise.all([loadDecks(), loadMyDecks()])
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDecks().catch(() => undefined);
    }, 200);

    return () => clearTimeout(timer);
  }, [search, subject, preset]);

  const selectedDeck = useMemo(() => myDecks.find((entry) => entry.id === shareDeckId) ?? null, [myDecks, shareDeckId]);

  async function downloadDeck(id: string) {
    setMessage('');
    const response = await fetch(`/api/shared-decks/${id}/download`, { method: 'POST' });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? 'Could not download deck');
      return;
    }

    setMessage('Added to your flashcards!');
    await loadDecks();
  }

  async function shareDeck() {
    if (!shareDeckId) return;

    setSharing(true);
    setMessage('');

    try {
      const response = await fetch('/api/shared-decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: shareDeckId,
          title: shareTitle,
          subject: shareSubject,
          description: shareDescription,
          preset: sharePreset,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? 'Could not share deck');
        return;
      }

      setShowShareModal(false);
      setMessage('Deck shared successfully!');
      await loadDecks();
    } catch {
      setMessage('Could not share deck');
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className="kv-page kv-page-library" style={{ padding: '30px 16px 56px' }}>
      <section className="kv-container kv-stack-lg" style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header className="kv-row-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div className="kv-stack-xs">
            <h1 className="kv-title-xl" style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em' }}>Study Library 📚</h1>
            <p className="kv-subtitle" style={{ color: 'var(--text-secondary)' }}>
              Explore and download study sets shared by other students
            </p>
          </div>
          <button className="kv-btn-primary" onClick={() => setShowShareModal(true)}>Share a Deck</button>
        </header>

        <section className="kv-card kv-stack-md" style={{ padding: 16 }}>
          <input
            className="kv-input"
            placeholder="Search decks..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="kv-tabs kv-subject-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUBJECTS.map((entry) => (
              <button
                key={entry}
                className={subject === entry ? 'kv-tab kv-tab-active' : 'kv-tab'}
                onClick={() => setSubject(entry)}
              >
                {entry}
              </button>
            ))}
          </div>

          <div className="kv-row kv-preset-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="kv-label">Preset:</span>
            {PRESETS.map((entry) => (
              <button
                key={entry}
                className={preset === entry ? 'kv-tab kv-tab-active' : 'kv-tab'}
                onClick={() => setPreset(entry)}
              >
                {entry === 'HIGHSCHOOL' ? 'High School' : entry === 'COLLEGE' ? 'College' : entry === 'UNIVERSITY' ? 'University' : 'All'}
              </button>
            ))}
          </div>

          {message ? <p className="kv-text-accent" style={{ color: 'var(--accent-blue)' }}>{message}</p> : null}
        </section>

        {loading ? (
          <section className="kv-card">Loading library...</section>
        ) : decks.length === 0 ? (
          <section className="kv-card kv-empty" style={{ padding: 20 }}>No decks yet. Be the first to share!</section>
        ) : (
          <section className="kv-grid-3" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {decks.map((deck) => (
              <article key={deck.id} className="kv-card kv-stack-sm" style={{ padding: 16 }}>
                <h3 className="kv-title-sm" style={{ fontWeight: 800, fontSize: 18 }}>{deck.title}</h3>

                <div className="kv-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="kv-badge-gold">{deck.subject}</span>
                  <span className="kv-badge-blue">{deck.preset}</span>
                </div>

                <p className="kv-caption" style={{ color: 'var(--text-muted)' }}>{deck.cardCount} cards</p>
                <p className="kv-caption" style={{ color: 'var(--text-muted)' }}>by {deck.creatorName}</p>
                <p className="kv-caption" style={{ color: 'var(--text-muted)' }}>⬇️ {deck.downloads}</p>

                <button className="kv-btn-primary" onClick={() => downloadDeck(deck.id)}>
                  Download to my library
                </button>
              </article>
            ))}
          </section>
        )}
      </section>

      {showShareModal ? (
        <div
          className="kv-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 30,
          }}
        >
          <div className="kv-card kv-modal kv-stack-sm" style={{ width: 'min(560px, 100%)', padding: 16 }}>
            <div className="kv-row-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="kv-title-md" style={{ fontSize: 20, fontWeight: 800 }}>Share a Deck</h2>
              <button className="kv-btn-ghost" onClick={() => setShowShareModal(false)}>✕</button>
            </div>

            <label className="kv-label" htmlFor="shareDeck">Select deck</label>
            <select
              id="shareDeck"
              className="kv-input"
              value={shareDeckId}
              onChange={(event) => {
                const nextId = event.target.value;
                setShareDeckId(nextId);
                const nextDeck = myDecks.find((entry) => entry.id === nextId);
                if (nextDeck) {
                  setShareTitle(nextDeck.title);
                  setShareSubject(nextDeck.subject);
                }
              }}
            >
              {myDecks.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.title}</option>
              ))}
            </select>

            <label className="kv-label" htmlFor="shareTitle">Title</label>
            <input id="shareTitle" className="kv-input" value={shareTitle} onChange={(event) => setShareTitle(event.target.value)} />

            <label className="kv-label" htmlFor="shareSubject">Subject</label>
            <input id="shareSubject" className="kv-input" value={shareSubject} onChange={(event) => setShareSubject(event.target.value)} />

            <label className="kv-label" htmlFor="shareDescription">Description</label>
            <textarea
              id="shareDescription"
              className="kv-textarea"
              rows={4}
              value={shareDescription}
              onChange={(event) => setShareDescription(event.target.value)}
            />

            <label className="kv-label" htmlFor="sharePreset">Preset</label>
            <select id="sharePreset" className="kv-input" value={sharePreset} onChange={(event) => setSharePreset(event.target.value)}>
              <option value="HIGHSCHOOL">High School</option>
              <option value="COLLEGE">College</option>
              <option value="UNIVERSITY">University</option>
            </select>

            <button className="kv-btn-primary" onClick={shareDeck} disabled={sharing || !selectedDeck}>
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
