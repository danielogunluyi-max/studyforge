"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTorontoDate } from "~/lib/toronto-time";

type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  lastReviewed: string | null;
  createdAt: string;
};

type Deck = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  cards: Flashcard[];
};

type CurriculumOption = {
  code: string;
  title: string;
};

type PendingGenPayload = {
  noteId?: string;
  topic?: string;
  subject?: string;
  count?: number;
  curriculumCode?: string;
};

const ONTARIO_COURSE = /^[A-Z]{3,4}\d[A-Z]$/i;
const genStorageKey = (id: string) => `kyvex-deck-gen:${id}`;

function shortText(input: string, max: number) {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}...`;
}

function subjectChipClass(subject: string) {
  return ONTARIO_COURSE.test(subject.trim()) ? "kv-chip kv-chip-course" : "kv-chip";
}

function readPendingGen(deckId: string): PendingGenPayload | null {
  try {
    const raw = sessionStorage.getItem(genStorageKey(deckId));
    if (!raw) return null;
    return JSON.parse(raw) as PendingGenPayload;
  } catch {
    return null;
  }
}

export default function DeckEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const deckId = String(params.id ?? "");

  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [showGenerateSection, setShowGenerateSection] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [generateCount, setGenerateCount] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);

  /** Create & Generate handoff: ?generating=1 */
  const [bootGenerating, setBootGenerating] = useState(false);
  const [bootGenError, setBootGenError] = useState("");
  const bootStartedRef = useRef(false);

  const [editingCardId, setEditingCardId] = useState("");
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [exportingAnki, setExportingAnki] = useState(false);

  const dueCount = useMemo(() => {
    if (!deck) return 0;
    const now = Date.now();
    return deck.cards.filter((card) => new Date(card.nextReview).getTime() <= now).length;
  }, [deck]);

  const fetchDeck = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/decks/${deckId}`);
      const data = (await response.json().catch(() => ({}))) as { deck?: Deck; error?: string };
      if (!response.ok || !data.deck) {
        setError(data.error ?? "Failed to load deck");
        return;
      }
      setDeck(data.deck);
      setTitleDraft(data.deck.title);
    } catch {
      setError("Failed to load deck");
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    if (!deckId) return;
    void fetchDeck();
  }, [deckId, fetchDeck]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/curriculum?grade=11&limit=100");
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { courses?: CurriculumOption[] };
      setCurriculumOptions(data.courses ?? []);
    })();
  }, []);

  const runBootGenerate = useCallback(async () => {
    if (!deckId) return;
    setBootGenerating(true);
    setBootGenError("");
    setIsGenerating(true);

    const payload = readPendingGen(deckId);
    if (!payload || (!payload.noteId && !payload.topic)) {
      setBootGenError(
        "Couldn’t find what to generate from. Try again, or use Generate More Cards below.",
      );
      setIsGenerating(false);
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: payload.noteId,
          topic: payload.topic,
          subject: payload.subject,
          count: payload.count ?? 20,
          curriculumCode: payload.curriculumCode,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setBootGenError(data.error ?? "Failed to build cards");
        return;
      }

      try {
        sessionStorage.removeItem(genStorageKey(deckId));
      } catch {
        // ignore
      }

      await fetchDeck();
      router.replace(`/flashcards/${deckId}`);
      setBootGenerating(false);
    } catch {
      setBootGenError("Failed to build cards");
    } finally {
      setIsGenerating(false);
    }
  }, [deckId, fetchDeck, router]);

  // Detect ?generating=1 after mount (hydration-safe) and fire once.
  useEffect(() => {
    if (!deckId || bootStartedRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("generating") !== "1") return;
    bootStartedRef.current = true;
    void runBootGenerate();
  }, [deckId, runBootGenerate]);

  const saveTitle = async () => {
    if (!deck || !titleDraft.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await fetch(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft.trim() }),
      });

      setDeck((prev) => (prev ? { ...prev, title: titleDraft.trim() } : prev));
    } catch {
      // Keep optimistic title if request fails.
    } finally {
      setIsEditingTitle(false);
    }
  };

  const runGenerate = async () => {
    if (!deck || !generateTopic.trim()) return;
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch(`/api/decks/${deck.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: generateTopic.trim(),
          subject: deck.subject,
          count: generateCount,
          curriculumCode: curriculumCode || undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to generate cards");
        return;
      }

      await fetchDeck();
      setGenerateTopic("");
    } catch {
      setError("Failed to generate cards");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!deck) return;
    await fetch(`/api/decks/${deck.id}/cards/${cardId}`, { method: "DELETE" });
    setDeck((prev) => (prev ? { ...prev, cards: prev.cards.filter((card) => card.id !== cardId) } : prev));
  };

  const saveCardEdit = async () => {
    if (!deck || !editingCardId) return;
    await fetch(`/api/decks/${deck.id}/cards/${editingCardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: editFront, back: editBack }),
    });

    setDeck((prev) =>
      prev
        ? {
            ...prev,
            cards: prev.cards.map((card) =>
              card.id === editingCardId ? { ...card, front: editFront, back: editBack } : card,
            ),
          }
        : prev,
    );

    setEditingCardId("");
  };

  const addCard = async () => {
    if (!deck || !newFront.trim() || !newBack.trim()) return;
    const response = await fetch(`/api/decks/${deck.id}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: newFront, back: newBack }),
    });

    const data = (await response.json().catch(() => ({}))) as { card?: Flashcard };
    if (data.card) {
      setDeck((prev) => (prev ? { ...prev, cards: [...prev.cards, data.card!] } : prev));
      setNewFront("");
      setNewBack("");
      setShowAddCard(false);
    }
  };

  const exportCsv = () => {
    if (!deck) return;
    const header = "front,back\n";
    const rows = deck.cards
      .map((c) => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.title}-flashcards.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAnki = async () => {
    if (!deck) return;
    setExportingAnki(true);
    try {
      const res = await fetch(`/api/anki-export?deckId=${deck.id}`);
      if (!res.ok) {
        setError("Failed to export Anki deck");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deck.title}-anki.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export Anki deck");
    } finally {
      setExportingAnki(false);
    }
  };

  if (isLoading && !deck) {
    return <main className="kv-page" style={{ padding: 24 }}>Loading deck...</main>;
  }

  if (!deck) {
    return (
      <main className="kv-page" style={{ padding: 24, color: "#E5484D" }}>
        {error || "Deck not found"}
      </main>
    );
  }

  const showBuilding = bootGenerating && !bootGenError && (isGenerating || deck.cards.length === 0);

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="kv-crumb">
          Kyvex /{" "}
          <Link href="/flashcards" style={{ color: "inherit" }}>
            Flashcards
          </Link>{" "}
          / <b>{deck.title}</b>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div style={{ minWidth: 0 }}>
            {isEditingTitle ? (
              <input
                className="kv-field"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={() => void saveTitle()}
                autoFocus
                style={{ marginTop: 4, maxWidth: 420 }}
              />
            ) : (
              <h1
                className="kv-title"
                style={{ cursor: "pointer" }}
                onClick={() => setIsEditingTitle(true)}
              >
                {deck.title}
              </h1>
            )}
            <div className="kv-row-sub" style={{ marginTop: 10 }}>
              <span className={subjectChipClass(deck.subject)}>{deck.subject}</span>
              <span className="kv-chip num">{deck.cards.length} cards</span>
              {dueCount > 0 ? (
                <span className="kv-chip kv-chip-stale num">{dueCount} due</span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            <button
              type="button"
              className="kv-btn"
              onClick={() => router.push(`/flashcards/${deck.id}/study`)}
            >
              Study Now
            </button>
            <button type="button" className="kv-btn-ghost" onClick={exportCsv}>
              Export CSV
            </button>
            <button
              type="button"
              className="kv-btn-ghost"
              onClick={() => void exportAnki()}
              disabled={exportingAnki}
            >
              {exportingAnki ? "Exporting..." : "Export Anki"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border-default)" }}>
          <button
            type="button"
            className="kv-btn-ghost"
            onClick={() => setShowGenerateSection((prev) => !prev)}
          >
            {showGenerateSection ? "Hide Generate More Cards" : "Generate More Cards"}
          </button>

          {showGenerateSection && (
            <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 480 }}>
              <input
                className="kv-field"
                placeholder="Topic for new cards"
                value={generateTopic}
                onChange={(event) => setGenerateTopic(event.target.value)}
              />
              <select
                className="kv-field"
                value={curriculumCode}
                onChange={(event) => setCurriculumCode(event.target.value)}
              >
                <option value="">Ontario course (optional)</option>
                {curriculumOptions.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
              <div>
                <p className="kv-meta">
                  Count: <span className="num">{generateCount}</span>
                </p>
                <input
                  type="range"
                  min={10}
                  max={50}
                  value={generateCount}
                  onChange={(event) => setGenerateCount(Number(event.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <button
                type="button"
                className="kv-btn"
                onClick={() => void runGenerate()}
                disabled={isGenerating}
              >
                {isGenerating ? `Generating ${generateCount} cards...` : "Generate"}
              </button>
            </div>
          )}
        </div>

        {(error || bootGenError) && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0, color: "#E5484D", fontSize: 14 }}>{bootGenError || error}</p>
            {bootGenError ? (
              <button
                type="button"
                className="kv-btn-ghost"
                style={{ marginTop: 10 }}
                onClick={() => {
                  bootStartedRef.current = true;
                  void runBootGenerate();
                }}
                disabled={isGenerating}
              >
                Try again
              </button>
            ) : null}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          {showBuilding ? (
            <div className="kv-row" style={{ justifyContent: "center", padding: "28px 12px" }}>
              <p className="kv-meta" style={{ margin: 0 }}>
                Building your cards…
              </p>
            </div>
          ) : (
            deck.cards.map((card) => {
              const isEditing = editingCardId === card.id;
              return (
                <div
                  key={card.id}
                  className="kv-row"
                  style={{ alignItems: isEditing ? "stretch" : "center" }}
                >
                  {isEditing ? (
                    <div style={{ width: "100%", display: "grid", gap: 8 }}>
                      <textarea
                        className="kv-field"
                        rows={2}
                        value={editFront}
                        onChange={(event) => setEditFront(event.target.value)}
                      />
                      <textarea
                        className="kv-field"
                        rows={3}
                        value={editBack}
                        onChange={(event) => setEditBack(event.target.value)}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="kv-btn" onClick={() => void saveCardEdit()}>
                          Save
                        </button>
                        <button
                          type="button"
                          className="kv-btn-ghost"
                          onClick={() => setEditingCardId("")}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--kv-text-primary)",
                          }}
                        >
                          {card.front}
                        </p>
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: 14,
                            color: "var(--kv-text-secondary)",
                          }}
                        >
                          → {shortText(card.back, 60)}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <span className="kv-meta num">
                          {card.interval}d · EF {card.easeFactor.toFixed(2)} ·{" "}
                          {formatTorontoDate(card.nextReview)}
                        </span>
                        <button
                          type="button"
                          className="kv-btn-ghost"
                          style={{ padding: "6px 10px" }}
                          onClick={() => {
                            setEditingCardId(card.id);
                            setEditFront(card.front);
                            setEditBack(card.back);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="kv-btn-ghost"
                          style={{ padding: "6px 10px" }}
                          onClick={() => void deleteCard(card.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          {!showAddCard ? (
            <button type="button" className="kv-btn-ghost" onClick={() => setShowAddCard(true)}>
              + Add Card
            </button>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
                maxWidth: 480,
                paddingTop: 12,
                borderTop: "1px solid var(--border-default)",
              }}
            >
              <textarea
                className="kv-field"
                rows={2}
                placeholder="Front"
                value={newFront}
                onChange={(event) => setNewFront(event.target.value)}
              />
              <textarea
                className="kv-field"
                rows={3}
                placeholder="Back"
                value={newBack}
                onChange={(event) => setNewBack(event.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="kv-btn" onClick={() => void addCard()}>
                  Save
                </button>
                <button type="button" className="kv-btn-ghost" onClick={() => setShowAddCard(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
