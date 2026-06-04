'use client';

import { useEffect, useMemo, useState } from 'react';

type Note = {
  id: string;
  title: string;
  content: string;
};

type Adaptive = {
  noteId: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  currentLevel: number;
  updatedAt?: string;
};

type LevelKey = 1 | 2 | 3 | 4;

const LEVEL_META: Array<{ level: LevelKey; tab: string; label: string; desc: string; badge: string }> = [
  { level: 1, tab: '🌱 Simplified', label: 'Simplified', desc: "Perfect if you're brand new to this", badge: 'kv-badge kv-badge-green' },
  { level: 2, tab: '📚 Standard', label: 'Standard', desc: 'For typical students', badge: 'kv-badge kv-badge-blue' },
  { level: 3, tab: '🔬 Advanced', label: 'Advanced', desc: 'Assumes solid background', badge: 'kv-badge kv-badge-gold' },
  { level: 4, tab: '🎓 Expert', label: 'Expert', desc: 'Academic/university level', badge: 'kv-badge kv-badge-red' },
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function AdaptiveNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [adaptive, setAdaptive] = useState<Adaptive | null>(null);
  const [history, setHistory] = useState<Adaptive[]>([]);
  const [activeLevel, setActiveLevel] = useState<LevelKey>(1);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadNotes();
  }, []);

  const activeText = useMemo(() => {
    if (!adaptive) return '';
    if (activeLevel === 1) return adaptive.level1;
    if (activeLevel === 2) return adaptive.level2;
    if (activeLevel === 3) return adaptive.level3;
    return adaptive.level4;
  }, [adaptive, activeLevel]);

  async function loadNotes() {
    setLoadingNotes(true);
    setError('');
    try {
      const res = await fetch('/api/notes');
      const data = (await res.json().catch(() => ({}))) as { notes?: Note[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to load notes');
        return;
      }
      const list = data.notes ?? [];
      setNotes(list);
      if (list[0] && !selectedNoteId) {
        setSelectedNoteId(list[0].id);
      }
    } catch {
      setError('Failed to load notes');
    } finally {
      setLoadingNotes(false);
    }
  }

  async function generateAdaptive() {
    if (!selectedNoteId) return;
    const selected = notes.find((note) => note.id === selectedNoteId);
    if (!selected?.content.trim()) return;

    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/adaptive-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: selected.id, content: selected.content, topic: selected.title }),
      });
      const data = (await res.json().catch(() => ({}))) as { adaptive?: Adaptive; error?: string };
      if (!res.ok || !data.adaptive) {
        setError(data.error ?? 'Failed to generate adaptive versions');
        return;
      }
      setAdaptive(data.adaptive);
      setActiveLevel((data.adaptive.currentLevel as LevelKey) || 1);
      setHistory((prev) => [data.adaptive!, ...prev.filter((item) => item.noteId !== data.adaptive!.noteId)]);
    } catch {
      setError('Failed to generate adaptive versions');
    } finally {
      setGenerating(false);
    }
  }

  async function savePreference() {
    if (!adaptive) return;
    setSavingPref(true);
    setError('');
    try {
      const res = await fetch('/api/adaptive-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: adaptive.noteId, level: activeLevel }),
      });
      const data = (await res.json().catch(() => ({}))) as { adaptive?: Adaptive; error?: string };
      if (!res.ok || !data.adaptive) {
        setError(data.error ?? 'Failed to save preference');
        return;
      }
      setAdaptive(data.adaptive);
      setHistory((prev) => [data.adaptive!, ...prev.filter((item) => item.noteId !== data.adaptive!.noteId)]);
    } catch {
      setError('Failed to save preference');
    } finally {
      setSavingPref(false);
    }
  }

  return (
    <main className="kv-page">
      <section className="kv-section">
        <div className="mb-6">
          <h1 className="kv-title">Adaptive Notes 🎯</h1>
          <p className="kv-subtitle">Same content. 4 difficulty levels. Always at your level.</p>
        </div>

        <div className="kv-card mb-5">
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Select Note</label>
          <select
            className="kv-input mb-3"
            value={selectedNoteId}
            onChange={(event) => setSelectedNoteId(event.target.value)}
            disabled={loadingNotes || generating}
          >
            {notes.length === 0 && <option value="">No notes found</option>}
            {notes.map((note) => (
              <option key={note.id} value={note.id}>{note.title}</option>
            ))}
          </select>
          <button className="kv-btn-primary" onClick={() => void generateAdaptive()} disabled={!selectedNoteId || generating}>
            {generating ? 'Creating 4 difficulty levels...' : 'Generate Adaptive Versions'}
          </button>
        </div>

        {error && <div className="kv-card mb-5 border border-red-500/30 text-red-300">{error}</div>}

        {adaptive && (
          <>
            <div className="kv-tabs mb-4">
              {LEVEL_META.map((item) => (
                <button
                  key={item.level}
                  className={`kv-tab ${activeLevel === item.level ? 'active' : ''}`}
                  onClick={() => setActiveLevel(item.level)}
                  type="button"
                >
                  {item.tab}
                </button>
              ))}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {LEVEL_META.map((item) => (
                <span key={`pill-${item.level}`} className={`${item.badge} text-xs`}>
                  {item.tab} - {item.desc}
                </span>
              ))}
            </div>

            <div className="kv-card-elevated mb-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={LEVEL_META.find((item) => item.level === activeLevel)?.badge ?? 'kv-badge'}>
                  {LEVEL_META.find((item) => item.level === activeLevel)?.label}
                </span>
                <span className="kv-badge kv-badge-teal">{wordCount(activeText)} words</span>
              </div>

              <div className="kv-card mb-4" style={{ lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-wrap' }}>
                {activeText}
              </div>

              <button className="kv-btn-secondary" onClick={() => void savePreference()} disabled={savingPref}>
                {savingPref ? 'Saving...' : 'This is the right level for me'}
              </button>
            </div>
          </>
        )}

        <div className="kv-card">
          <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Past Adaptive Notes</h2>
          {history.length === 0 && <p className="text-sm text-[var(--text-muted)]">No adaptive notes yet.</p>}
          <div className="space-y-3">
            {history.map((entry) => {
              const note = notes.find((item) => item.id === entry.noteId);
              return (
                <div key={`${entry.noteId}-${entry.updatedAt ?? 'now'}`} className="kv-card-sm">
                  <p className="font-semibold text-[var(--text-primary)]">{note?.title ?? 'Untitled note'}</p>
                  <p className="text-sm text-[var(--text-muted)]">Current level: {entry.currentLevel}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
