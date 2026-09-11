"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, X, PencilLine, Play } from "lucide-react";
import { formatTorontoDate } from "~/lib/toronto-time";

type DeckSummary = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  totalCards: number;
  dueCards: number;
};

type NoteOption = {
  id: string;
  title: string;
};

type CurriculumOption = {
  code: string;
  title: string;
};

type Props = {
  initialDecks: DeckSummary[];
  studiedToday: number;
  notes: NoteOption[];
  initialGenerateFrom: string;
  studyStreak?: number;
};

type CreateDeckResponse = {
  deck?: {
    id: string;
    title: string;
    subject: string;
    description: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  error?: string;
};

const ONTARIO_COURSE = /^[A-Z]{3,4}\d[A-Z]$/i;

function subjectChipClass(subject: string) {
  return ONTARIO_COURSE.test(subject.trim()) ? "kv-chip kv-chip-course" : "kv-chip";
}

export function DeckLibraryClient({ initialDecks, studiedToday, notes, initialGenerateFrom }: Props) {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckSummary[]>(initialDecks);
  const [showCreateModal, setShowCreateModal] = useState(Boolean(initialGenerateFrom));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [useAiGenerate, setUseAiGenerate] = useState(Boolean(initialGenerateFrom));
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(20);
  const [selectedNoteId, setSelectedNoteId] = useState(initialGenerateFrom || "");
  const [error, setError] = useState("");

  const totalDecks = decks.length;
  const totalDue = useMemo(() => decks.reduce((sum, deck) => sum + deck.dueCards, 0), [decks]);

  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/curriculum?grade=11&limit=100");
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { courses?: CurriculumOption[] };
      setCurriculumOptions(data.courses ?? []);
    })();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showCreateModal) setShowCreateModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showCreateModal]);

  const submitCreate = async () => {
    if (!title.trim() || !subject.trim()) {
      setError("Title and subject are required");
      return;
    }
    if (useAiGenerate && !selectedNoteId && !topic.trim()) {
      setError("Provide a topic or select a note to generate cards");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const createRes = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, description }),
      });
      const createData = (await createRes.json().catch(() => ({}))) as CreateDeckResponse;

      if (!createRes.ok || !createData.deck) {
        setError(createData.error ?? "Failed to create deck");
        return;
      }

      const nowIso = new Date().toISOString();
      const createdDeck: DeckSummary = {
        id: createData.deck.id,
        title: createData.deck.title,
        subject: createData.deck.subject,
        description: createData.deck.description ?? null,
        createdAt: createData.deck.createdAt ?? nowIso,
        updatedAt: createData.deck.updatedAt ?? nowIso,
        totalCards: 0,
        dueCards: 0,
      };

      setDecks((prev) => [createdDeck, ...prev]);

      // Redirect immediately — generate runs on the deck page when ?generating=1.
      if (useAiGenerate) {
        try {
          sessionStorage.setItem(
            `kyvex-deck-gen:${createData.deck.id}`,
            JSON.stringify({
              noteId: selectedNoteId || undefined,
              topic: topic.trim() || undefined,
              subject,
              count,
              curriculumCode: curriculumCode || undefined,
            }),
          );
        } catch {
          // Private mode / quota — deck page will surface a retryable error.
        }
        router.push(`/flashcards/${createData.deck.id}?generating=1`);
      } else {
        router.push(`/flashcards/${createData.deck.id}`);
      }
    } catch {
      setError("Failed to create deck");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div className="kv-crumb">Kyvex / <b>Flashcards</b></div>
            <h1 className="kv-title" style={{ marginTop: 14 }}>Flashcard Decks</h1>
            <p className="kv-sub" style={{ marginTop: 10 }}>Spaced repetition · study smarter, not longer</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="kv-btn"
            aria-label="Create a new flashcard deck"
          >
            <Plus size={16} aria-hidden="true" />
            New Deck
          </button>
        </div>

        <div className="kv-stats" style={{ marginTop: 28, gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kv-stat">
            <span className="kv-meta">Total Decks</span>
            <b className="num">{totalDecks}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Cards Due Today</span>
            <b className="num">{totalDue}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Studied Today</span>
            <b className="num">{studiedToday}</b>
          </div>
        </div>

        {decks.length === 0 ? (
          <div style={{ marginTop: 32, paddingTop: 32, borderTop: "1px solid var(--border-default)", textAlign: "center" }}>
            <h2 className="kv-title" style={{ fontSize: 22 }}>No decks yet</h2>
            <p className="kv-sub" style={{ margin: "10px auto 0" }}>Create your first deck or generate cards from your notes.</p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="kv-btn"
              style={{ marginTop: 20 }}
            >
              <Plus size={16} aria-hidden="true" />
              Create First Deck
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {decks.map((deck) => (
              <div key={deck.id} className="kv-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kv-row-title">{deck.title}</div>
                  <div className="kv-row-sub">
                    <span className="kv-chip num">{deck.totalCards} cards</span>
                    {deck.dueCards > 0 ? (
                      <span className="kv-chip kv-chip-stale num">{deck.dueCards} due</span>
                    ) : null}
                    <span className={subjectChipClass(deck.subject)}>{deck.subject}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span className="kv-row-side">Last updated {formatTorontoDate(deck.updatedAt)}</span>
                  <button
                    type="button"
                    onClick={() => router.push(`/flashcards/${deck.id}/study`)}
                    className="kv-btn-ghost"
                    aria-label={`Study deck ${deck.title}`}
                  >
                    <Play size={12} aria-hidden="true" />
                    Study
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/flashcards/${deck.id}`)}
                    className="kv-btn-ghost"
                    aria-label={`Edit deck ${deck.title}`}
                  >
                    <PencilLine size={12} aria-hidden="true" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 16px",
            overflowY: "auto",
            background: "rgba(0,0,0,0.72)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-deck-title"
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "calc(100vh - 48px)",
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border-default)",
              background: "var(--bg-base)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border-default)" }}>
              <h2 id="create-deck-title" className="kv-title" style={{ fontSize: 18 }}>Create Deck</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="kv-btn-ghost"
                style={{ padding: "6px 8px" }}
                aria-label="Close create deck modal"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "16px 18px", display: "grid", gap: 12, overflowY: "auto", minHeight: 0, flex: 1 }}>
              <div>
                <label htmlFor="deck-title" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Title</label>
                <input
                  id="deck-title"
                  className="kv-field"
                  placeholder="Deck title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="deck-subject" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Subject</label>
                <input
                  id="deck-subject"
                  className="kv-field"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="deck-desc" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Description (optional)</label>
                <textarea
                  id="deck-desc"
                  className="kv-field"
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "var(--kv-text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={useAiGenerate}
                  onChange={(e) => setUseAiGenerate(e.target.checked)}
                />
                <Sparkles size={14} aria-hidden="true" />
                Generate with AI
              </label>

              {useAiGenerate && (
                <div style={{ display: "grid", gap: 12, paddingTop: 4, borderTop: "1px solid var(--border-default)" }}>
                  <div>
                    <label htmlFor="deck-topic" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Topic</label>
                    <input
                      id="deck-topic"
                      className="kv-field"
                      placeholder="What topic should the cards cover?"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="deck-count" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Card count: <span className="num">{count}</span></label>
                    <input
                      id="deck-count"
                      type="range"
                      min={10}
                      max={50}
                      step={1}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      style={{ width: "100%" }}
                      aria-label="Number of cards to generate"
                    />
                  </div>
                  <div>
                    <label htmlFor="deck-note" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>From a note (optional)</label>
                    <select
                      id="deck-note"
                      className="kv-field"
                      value={selectedNoteId}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                    >
                      <option value="">No note selected</option>
                      {notes.map((note) => (
                        <option key={note.id} value={note.id}>{note.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="deck-curriculum" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Ontario course (optional)</label>
                    <select
                      id="deck-curriculum"
                      className="kv-field"
                      value={curriculumCode}
                      onChange={(e) => setCurriculumCode(e.target.value)}
                    >
                      <option value="">No course</option>
                      {curriculumOptions.map((course) => (
                        <option key={course.code} value={course.code}>{course.code} – {course.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {error && (
                <p style={{ margin: 0, padding: "10px 12px", border: "1px solid rgba(229,72,77,.4)", color: "#E5484D", fontSize: 14 }} role="alert">
                  {error}
                </p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px", borderTop: "1px solid var(--border-default)", flex: "none" }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="kv-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={isSubmitting}
                className="kv-btn"
              >
                {isSubmitting ? "Working..." : useAiGenerate ? "Create & Generate" : "Create Deck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

