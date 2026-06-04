'use client';

import { useEffect, useMemo, useState } from 'react';

type Note = {
  id: string;
  title: string;
  content: string;
};

type Evolution = {
  id: string;
  version: number;
  snapshot: string;
  wordCount: number;
  createdAt: string;
};

function wordsDiff(current: string, previous: string): number {
  const currentWords = current.trim().split(/\s+/).filter(Boolean).length;
  const prevWords = previous.trim().split(/\s+/).filter(Boolean).length;
  return currentWords - prevWords;
}

export default function NoteEvolutionPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteId, setNoteId] = useState('');
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadNotes();
  }, []);

  useEffect(() => {
    if (noteId) {
      void loadEvolutions(noteId);
    }
  }, [noteId]);

  const first = evolutions[0] ?? null;
  const latest = evolutions[evolutions.length - 1] ?? null;
  const growth = useMemo(() => {
    if (!first || !latest) return 0;
    return latest.wordCount - first.wordCount;
  }, [first, latest]);

  const leftVersion = evolutions.find((item) => item.id === leftId) ?? null;
  const rightVersion = evolutions.find((item) => item.id === rightId) ?? null;

  async function loadNotes() {
    try {
      const res = await fetch('/api/notes');
      const data = (await res.json().catch(() => ({}))) as { notes?: Note[] };
      const list = data.notes ?? [];
      setNotes(list);
      if (list[0]) setNoteId(list[0].id);
    } catch {
      setNotes([]);
    }
  }

  async function loadEvolutions(nextNoteId: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/note-evolution?noteId=${encodeURIComponent(nextNoteId)}`);
      const data = (await res.json().catch(() => ({}))) as { evolutions?: Evolution[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to load note evolution');
        return;
      }
      const list = data.evolutions ?? [];
      setEvolutions(list);
      setExpandedIds([]);
      setLeftId(list[0]?.id ?? '');
      setRightId(list[list.length - 1]?.id ?? '');
    } catch {
      setError('Failed to load note evolution');
    } finally {
      setLoading(false);
    }
  }

  function renderDiffText(newer: string, older: string): string {
    if (!older) return newer;
    const olderWords = new Set(older.split(/\s+/).filter(Boolean));
    return newer
      .split(/\s+/)
      .map((word) => (olderWords.has(word) ? word : `[+${word}]`))
      .join(' ');
  }

  function renderRemovedText(older: string, newer: string): string {
    if (!older) return '';
    const newerWords = new Set(newer.split(/\s+/).filter(Boolean));
    return older
      .split(/\s+/)
      .filter((word) => !newerWords.has(word))
      .join(' ');
  }

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">Note Evolution 📈</h1>
        <p className="kv-subtitle">See how your understanding has grown over time</p>

        <div className="kv-card mt-5">
          <label className="mb-2 block text-sm font-semibold">Select Note</label>
          <select className="kv-input" value={noteId} onChange={(e) => setNoteId(e.target.value)}>
            {notes.map((note) => (
              <option key={note.id} value={note.id}>{note.title}</option>
            ))}
          </select>
        </div>

        {loading && <div className="kv-card mt-4">Loading evolution...</div>}
        {error && <div className="kv-card mt-4 border border-red-500/40 text-red-300">{error}</div>}

        {evolutions.length > 0 && (
          <>
            <div className="kv-card mt-5">
              <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
              <div className="space-y-3">
                {evolutions.map((entry, index) => {
                  const previous = evolutions[index - 1];
                  const delta = previous ? wordsDiff(entry.snapshot, previous.snapshot) : 0;
                  const expanded = expandedIds.includes(entry.id);

                  return (
                    <div key={entry.id} className="kv-card-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="kv-badge kv-badge-blue">Version {entry.version}</span>
                        <span className="kv-badge kv-badge-gold">{new Date(entry.createdAt).toLocaleDateString()}</span>
                        <span className="kv-badge kv-badge-teal">{entry.wordCount} words</span>
                      </div>
                      <p className="mb-1 text-sm text-[var(--text-secondary)]">{entry.snapshot.slice(0, 100)}...</p>
                      {index > 0 && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {delta >= 0 ? `Words added: +${delta}` : `Words removed: ${delta}`}
                        </p>
                      )}
                      <button
                        className="kv-btn-secondary mt-2"
                        onClick={() => setExpandedIds((prev) => prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id])}
                        type="button"
                      >
                        {expanded ? 'Hide full version' : 'Expand full version'}
                      </button>
                      {expanded && <p className="mt-2 whitespace-pre-wrap text-sm">{entry.snapshot}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="kv-card mt-5">
              <h2 className="mb-3 text-lg font-semibold">Stats</h2>
              <p className="text-sm">Total versions: <strong>{evolutions.length}</strong></p>
              <p className="text-sm">
                {new Date(first?.createdAt ?? Date.now()).toLocaleDateString()} to {new Date(latest?.createdAt ?? Date.now()).toLocaleDateString()}
              </p>
              <div className="my-3 flex items-end gap-2" style={{ minHeight: 120 }}>
                {evolutions.map((entry) => (
                  <div
                    key={`bar-${entry.id}`}
                    className="flex-1 rounded-t bg-[var(--accent-gold)]"
                    style={{ height: `${Math.max(10, Math.round((entry.wordCount / Math.max(1, latest?.wordCount ?? 1)) * 100))}%` }}
                  />
                ))}
              </div>
              <p className="text-sm">Your understanding has grown {growth} words richer</p>
            </div>

            <div className="kv-card mt-5">
              <h2 className="mb-3 text-lg font-semibold">Diff View</h2>
              <div className="mb-3 grid gap-2 md:grid-cols-2">
                <select className="kv-input" value={leftId} onChange={(e) => setLeftId(e.target.value)}>
                  {evolutions.map((entry) => (
                    <option key={`left-${entry.id}`} value={entry.id}>Version {entry.version}</option>
                  ))}
                </select>
                <select className="kv-input" value={rightId} onChange={(e) => setRightId(e.target.value)}>
                  {evolutions.map((entry) => (
                    <option key={`right-${entry.id}`} value={entry.id}>Version {entry.version}</option>
                  ))}
                </select>
              </div>

              {leftVersion && rightVersion && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="kv-card" style={{ whiteSpace: 'pre-wrap' }}>
                    <p className="mb-2 text-xs uppercase text-[var(--text-muted)]">New content highlighted gold</p>
                    <p>{renderDiffText(rightVersion.snapshot, leftVersion.snapshot)}</p>
                  </div>
                  <div className="kv-card" style={{ whiteSpace: 'pre-wrap', borderColor: 'rgba(239,68,68,0.5)' }}>
                    <p className="mb-2 text-xs uppercase text-[var(--text-muted)]">Removed content highlighted red</p>
                    <p style={{ color: '#f87171' }}>{renderRemovedText(leftVersion.snapshot, rightVersion.snapshot) || 'No removed text.'}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
