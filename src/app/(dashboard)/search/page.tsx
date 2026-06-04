'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type SearchNote = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  type: 'note';
  excerpt: string;
};

type SearchDeck = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  type: 'deck';
};

type SearchExam = {
  id: string;
  subject: string;
  examDate: string;
  topics: string | null;
  type: 'exam';
};

type SearchResponse = {
  results:
    | []
    | {
        notes: SearchNote[];
        decks: SearchDeck[];
        exams: SearchExam[];
      };
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<SearchNote[]>([]);
  const [decks, setDecks] = useState<SearchDeck[]>([]);
  const [exams, setExams] = useState<SearchExam[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setNotes([]);
      setDecks([]);
      setExams([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as SearchResponse;

        if (Array.isArray(data.results)) {
          setNotes([]);
          setDecks([]);
          setExams([]);
        } else {
          setNotes(data.results.notes ?? []);
          setDecks(data.results.decks ?? []);
          setExams(data.results.exams ?? []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setNotes([]);
          setDecks([]);
          setExams([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void runSearch();
    return () => controller.abort();
  }, [debouncedQuery]);

  const hasQuery = debouncedQuery.length >= 2;
  const totalResults = useMemo(() => notes.length + decks.length + exams.length, [notes.length, decks.length, exams.length]);

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Global Smart Search</h1>
      <p className="kv-page-subtitle">
        Search your notes, flashcard decks, and exams from one place.
      </p>

      <div className="kv-card" style={{ marginBottom: 16 }}>
        <label className="kv-label" htmlFor="smart-search-input">
          Search
        </label>
        <input
          id="smart-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: photosynthesis, calculus, optics..."
          className="kv-input"
          style={{ fontSize: 18, padding: '14px 16px' }}
        />
      </div>

      {loading && (
        <div className="kv-card-elevated" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="kv-spinner" />
          <p className="kv-page-subtitle" style={{ margin: 0 }}>
            Searching for matches...
          </p>
        </div>
      )}

      {!loading && !hasQuery && (
        <div className="kv-empty kv-card-elevated">
          <p className="kv-empty-title">Start with a search term</p>
          <p className="kv-empty-text">Type at least 2 characters to search your library.</p>
        </div>
      )}

      {!loading && hasQuery && totalResults === 0 && (
        <div className="kv-empty kv-card-elevated">
          <p className="kv-empty-title">No matches found</p>
          <p className="kv-empty-text">Try a broader keyword or shorter phrase.</p>
        </div>
      )}

      {!loading && hasQuery && totalResults > 0 && (
        <section className="kv-grid-3" style={{ alignItems: 'start' }}>
          <div className="kv-card-elevated">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="kv-section-title" style={{ marginBottom: 0 }}>Notes</h2>
              <span className="kv-badge kv-badge-blue">{notes.length}</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {notes.map((note) => (
                <Link key={note.id} href="/my-notes" className="kv-card-sm" style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Note</strong>
                    <span className="kv-badge kv-badge-blue">{note.type}</span>
                  </div>
                  <p style={{ margin: '8px 0 4px', color: 'var(--text-primary)', fontWeight: 700 }}>{note.title}</p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>{note.excerpt}</p>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>{formatDate(note.createdAt)}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="kv-card-elevated">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="kv-section-title" style={{ marginBottom: 0 }}>Flashcard Decks</h2>
              <span className="kv-badge kv-badge-gold">{decks.length}</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {decks.map((deck) => (
                <Link key={deck.id} href={`/flashcards/${deck.id}`} className="kv-card-sm" style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Deck</strong>
                    <span className="kv-badge kv-badge-gold">{deck.type}</span>
                  </div>
                  <p style={{ margin: '8px 0 4px', color: 'var(--text-primary)', fontWeight: 700 }}>{deck.title}</p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>
                    {deck.description || 'No description'}
                  </p>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>{formatDate(deck.createdAt)}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="kv-card-elevated">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="kv-section-title" style={{ marginBottom: 0 }}>Exams</h2>
              <span className="kv-badge kv-badge-teal">{exams.length}</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {exams.map((exam) => (
                <Link key={exam.id} href="/results" className="kv-card-sm" style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Exam</strong>
                    <span className="kv-badge kv-badge-teal">{exam.type}</span>
                  </div>
                  <p style={{ margin: '8px 0 4px', color: 'var(--text-primary)', fontWeight: 700 }}>{exam.subject}</p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>{exam.topics || 'No topics'}</p>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>{formatDate(exam.examDate)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
