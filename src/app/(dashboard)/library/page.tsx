'use client';

import { useEffect, useMemo, useState } from 'react';
import Skeleton from '@/app/_components/skeleton';

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
      const cards = Array.isArray(deck.cards) ? deck.cards : [];

      return {
        id: String(entry.id ?? index),
        title: typeof entry.title === 'string' ? entry.title : 'Untitled deck',
        subject: typeof entry.subject === 'string' ? entry.subject : 'General',
        preset: typeof entry.preset === 'string' ? entry.preset : 'HIGHSCHOOL',
        description: typeof entry.description === 'string' ? entry.description : '',
        downloads: typeof entry.downloads === 'number' ? entry.downloads : 0,
        creatorName: typeof user.name === 'string' && user.name ? user.name : 'Anonymous',
        cardCount: cards.length,
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
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="kv-crumb">Kyvex / <b>Study Library</b></div>
            <h1 className="kv-title" style={{ marginTop: 14 }}>Study Library</h1>
            <p className="kv-sub" style={{ marginTop: 10 }}>
              Explore and download study sets shared by other students
            </p>
          </div>
          <button type="button" className="kv-btn" onClick={() => setShowShareModal(true)}>Share a Deck</button>
        </div>

        <div style={{ marginTop: 28 }}>
          <input
            className="kv-field"
            placeholder="Search decks..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="kv-tabs" style={{ marginTop: 16, flexWrap: 'wrap' }}>
            {SUBJECTS.map((entry) => (
              <button
                key={entry}
                type="button"
                className={subject === entry ? 'kv-tab on' : 'kv-tab'}
                onClick={() => setSubject(entry)}
              >
                {entry}
              </button>
            ))}
          </div>

          <p className="kv-meta" style={{ marginTop: 18 }}>Preset</p>
          <div className="kv-tabs" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {PRESETS.map((entry) => (
              <button
                key={entry}
                type="button"
                className={preset === entry ? 'kv-tab on' : 'kv-tab'}
                onClick={() => setPreset(entry)}
              >
                {entry === 'HIGHSCHOOL' ? 'High School' : entry === 'COLLEGE' ? 'College' : entry === 'UNIVERSITY' ? 'University' : 'All'}
              </button>
            ))}
          </div>

          {message ? <p className="kv-meta" style={{ marginTop: 12 }}>{message}</p> : null}
        </div>

        {loading ? (
          <div style={{ marginTop: 24 }}>
            <Skeleton variant="card" count={6} />
          </div>
        ) : decks.length === 0 ? (
          <p className="kv-sub" style={{ marginTop: 28 }}>No decks yet. Be the first to share a study deck.</p>
        ) : (
          <div style={{ marginTop: 8 }}>
            {decks.map((deck) => (
              <div key={deck.id} className="kv-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kv-row-title">{deck.title}</div>
                  <div className="kv-row-sub">
                    {/^[A-Z]{3,4}\d[A-Z]$/i.test(deck.subject.trim()) ? (
                      <span className="kv-chip kv-chip-course">{deck.subject}</span>
                    ) : (
                      <span className="kv-chip">{deck.subject}</span>
                    )}
                    <span className="kv-chip">{deck.preset}</span>
                    <span className="kv-chip num">{deck.cardCount} cards</span>
                  </div>
                  <p className="kv-meta" style={{ marginTop: 6 }}>
                    by {deck.creatorName} · {deck.downloads} downloads
                  </p>
                </div>
                <button type="button" className="kv-btn-ghost" onClick={() => downloadDeck(deck.id)}>
                  Download to my library
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showShareModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '24px 16px',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.72)',
          }}
          onClick={(event) => { if (event.target === event.currentTarget) setShowShareModal(false); }}
        >
          <div style={{ width: '100%', maxWidth: 440, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="kv-title" style={{ fontSize: 18, margin: 0 }}>Share a Deck</h2>
              <button type="button" className="kv-btn-ghost" onClick={() => setShowShareModal(false)}>Close</button>
            </div>
            <div style={{ padding: '16px 18px', display: 'grid', gap: 12 }}>
            <label className="kv-meta" htmlFor="shareDeck">Select deck</label>
            <select
              id="shareDeck"
              className="kv-field"
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

            <label className="kv-meta" htmlFor="shareTitle">Title</label>
            <input id="shareTitle" className="kv-field" value={shareTitle} onChange={(event) => setShareTitle(event.target.value)} />

            <label className="kv-meta" htmlFor="shareSubject">Subject</label>
            <input id="shareSubject" className="kv-field" value={shareSubject} onChange={(event) => setShareSubject(event.target.value)} />

            <label className="kv-meta" htmlFor="shareDescription">Description</label>
            <textarea
              id="shareDescription"
              className="kv-field"
              rows={4}
              value={shareDescription}
              onChange={(event) => setShareDescription(event.target.value)}
            />

            <label className="kv-meta" htmlFor="sharePreset">Preset</label>
            <select id="sharePreset" className="kv-field" value={sharePreset} onChange={(event) => setSharePreset(event.target.value)}>
              <option value="HIGHSCHOOL">High School</option>
              <option value="COLLEGE">College</option>
              <option value="UNIVERSITY">University</option>
            </select>

            <button type="button" className="kv-btn" onClick={shareDeck} disabled={sharing || !selectedDeck}>
              {sharing ? 'Sharing...' : 'Share'}
            </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
