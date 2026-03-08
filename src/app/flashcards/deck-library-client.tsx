"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

      if (useAiGenerate) {
        const genBody = selectedNoteId
          ? { noteId: selectedNoteId, subject, count, curriculumCode: curriculumCode || undefined }
          : { topic, subject, count, curriculumCode: curriculumCode || undefined };

        const genRes = await fetch(`/api/decks/${createData.deck.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(genBody),
        });

        const genData = (await genRes.json().catch(() => ({}))) as { error?: string };
        if (!genRes.ok) {
          setError(genData.error ?? "Deck created but AI generation failed");
        }
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
      router.push(`/flashcards/${createData.deck.id}`);
    } catch {
      setError("Failed to create deck");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "28px 16px 100px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 className="text-title">Flashcard Decks 🗂️</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
              Spaced repetition - study smarter, not longer
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Deck
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          <div className="card" style={{ padding: 16 }}>
            <p className="text-label">Total Decks</p>
            <p style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{totalDecks}</p>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <p className="text-label">Cards Due Today</p>
            <p style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{totalDue}</p>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <p className="text-label">Studied Today</p>
            <p style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{studiedToday}</p>
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🗂️</div>
            <p style={{ fontSize: 22, fontWeight: 700 }}>No decks yet</p>
            <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
              Create your first deck or generate cards from your notes
            </p>
            <button className="btn btn-primary" style={{ marginTop: "24px" }} onClick={() => setShowCreateModal(true)}>
              Create First Deck
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {decks.map((deck) => {
              const mastery = deck.totalCards > 0 ? Math.round(((deck.totalCards - deck.dueCards) / deck.totalCards) * 100) : 0;
              return (
                <div key={deck.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{deck.title}</p>
                    <span className="badge badge-blue">{deck.subject}</span>
                  </div>

                  <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13 }}>{deck.totalCards} cards</p>

                  <span
                    className="badge"
                    style={{
                      marginTop: 8,
                      display: "inline-flex",
                      background: deck.dueCards > 0 ? "rgba(239, 68, 68, 0.16)" : "rgba(34, 197, 94, 0.16)",
                      color: deck.dueCards > 0 ? "var(--accent-red)" : "var(--accent-green)",
                    }}
                  >
                    {deck.dueCards > 0 ? `🔥 ${deck.dueCards} due` : "✓ Up to date"}
                  </span>

                  <div style={{ marginTop: 10, height: 8, borderRadius: 99, background: "var(--bg-elevated)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${mastery}%`, background: "var(--accent-blue)" }} />
                  </div>

                  {deck.description && (
                    <p
                      style={{
                        marginTop: 10,
                        color: "var(--text-muted)",
                        fontSize: 13,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {deck.description}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button className="btn btn-primary" onClick={() => router.push(`/flashcards/${deck.id}/study`)}>Study</button>
                    <button className="btn btn-ghost" onClick={() => router.push(`/flashcards/${deck.id}`)}>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 560, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Create Deck</h2>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input className="input" placeholder="Deck title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <input className="input" placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
              <textarea className="input" placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />

              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={useAiGenerate} onChange={(event) => setUseAiGenerate(event.target.checked)} />
                Generate with AI
              </label>

              {useAiGenerate && (
                <div className="card" style={{ padding: 12, border: "1px solid var(--border-default)" }}>
                  <input className="input" placeholder="What topic should the cards cover?" value={topic} onChange={(event) => setTopic(event.target.value)} />

                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>Card count: {count}</p>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={1}
                      value={count}
                      onChange={(event) => setCount(Number(event.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: "0 0 6px", color: "var(--text-secondary)", fontSize: 12 }}>Generate from one of my notes (optional)</p>
                    <select className="input" value={selectedNoteId} onChange={(event) => setSelectedNoteId(event.target.value)}>
                      <option value="">No note selected</option>
                      {notes.map((note) => (
                        <option key={note.id} value={note.id}>{note.title}</option>
                      ))}
                    </select>
                  </div>

                  <select className="input" value={curriculumCode} onChange={(event) => setCurriculumCode(event.target.value)} style={{ marginTop: 8 }}>
                    <option value="">Ontario course (optional)</option>
                    {curriculumOptions.map((course) => (
                      <option key={course.code} value={course.code}>{course.code} - {course.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p style={{ margin: 0, color: "var(--accent-red)", fontSize: 13 }}>{error}</p>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void submitCreate()} disabled={isSubmitting}>
                {isSubmitting ? "Working..." : useAiGenerate ? "Create & Generate Cards" : "Create Deck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
