"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function shortText(input: string, max: number) {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}...`;
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
  const [generateCount, setGenerateCount] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);

  const [editingCardId, setEditingCardId] = useState("");
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  const dueCount = useMemo(() => {
    if (!deck) return 0;
    const now = Date.now();
    return deck.cards.filter((card) => new Date(card.nextReview).getTime() <= now).length;
  }, [deck]);

  const fetchDeck = async () => {
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
  };

  useEffect(() => {
    if (!deckId) return;
    void fetchDeck();
  }, [deckId]);

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
        body: JSON.stringify({ topic: generateTopic.trim(), subject: deck.subject, count: generateCount }),
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
      setDeck((prev) => (prev ? { ...prev, cards: [...prev.cards, data.card as Flashcard] } : prev));
      setNewFront("");
      setNewBack("");
      setShowAddCard(false);
    }
  };

  if (isLoading) {
    return <main style={{ padding: 24, color: "var(--text-primary)" }}>Loading deck...</main>;
  }

  if (!deck) {
    return <main style={{ padding: 24, color: "var(--accent-red)" }}>{error || "Deck not found"}</main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <Link href="/flashcards" style={{ color: "var(--text-secondary)", fontSize: 13 }}>← Back to Decks</Link>
            {isEditingTitle ? (
              <input
                className="input"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={() => void saveTitle()}
                autoFocus
                style={{ marginTop: 6, width: 320 }}
              />
            ) : (
              <h1 className="text-title" style={{ marginTop: 8, cursor: "pointer" }} onClick={() => setIsEditingTitle(true)}>
                {deck.title}
              </h1>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <span className="badge badge-blue">{deck.subject}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{deck.cards.length} cards</span>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>• {dueCount} due</span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => router.push(`/flashcards/${deck.id}/study`)}>Study Now</button>
        </div>

        <div className="card" style={{ marginTop: 16, padding: 14 }}>
          <button className="btn btn-ghost" onClick={() => setShowGenerateSection((prev) => !prev)}>
            {showGenerateSection ? "Hide Generate More Cards" : "Generate More Cards"}
          </button>

          {showGenerateSection && (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <input className="input" placeholder="Topic for new cards" value={generateTopic} onChange={(event) => setGenerateTopic(event.target.value)} />
              <div>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>Count: {generateCount}</p>
                <input type="range" min={10} max={50} value={generateCount} onChange={(event) => setGenerateCount(Number(event.target.value))} style={{ width: "100%" }} />
              </div>
              <button className="btn btn-primary" onClick={() => void runGenerate()} disabled={isGenerating}>
                {isGenerating ? `Generating ${generateCount} cards...` : "Generate"}
              </button>
            </div>
          )}
        </div>

        {error && <p style={{ marginTop: 12, color: "var(--accent-red)" }}>{error}</p>}

        <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
          {deck.cards.map((card) => {
            const isEditing = editingCardId === card.id;
            return (
              <div key={card.id} style={{ padding: 12, borderBottom: "1px solid var(--border-default)", display: "grid", gridTemplateColumns: "1.2fr 1fr auto", gap: 10, alignItems: "center" }}>
                {isEditing ? (
                  <div style={{ gridColumn: "1 / span 3", display: "grid", gap: 8 }}>
                    <textarea className="input" rows={2} value={editFront} onChange={(event) => setEditFront(event.target.value)} />
                    <textarea className="input" rows={3} value={editBack} onChange={(event) => setEditBack(event.target.value)} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => void saveCardEdit()}>Save</button>
                      <button className="btn btn-ghost" onClick={() => setEditingCardId("")}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: 0, color: "var(--text-primary)", fontSize: 14 }}>{shortText(card.front, 60)}</p>
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>→ {shortText(card.back, 60)}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {card.interval}d • EF {card.easeFactor.toFixed(2)} • {new Date(card.nextReview).toLocaleDateString()}
                      </span>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditingCardId(card.id);
                          setEditFront(card.front);
                          setEditBack(card.back);
                        }}
                      >
                        ✏️
                      </button>
                      <button className="btn btn-ghost" onClick={() => void deleteCard(card.id)}>🗑️</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12 }}>
          {!showAddCard ? (
            <button className="btn btn-ghost" onClick={() => setShowAddCard(true)}>+ Add Card</button>
          ) : (
            <div className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
              <textarea className="input" rows={2} placeholder="Front" value={newFront} onChange={(event) => setNewFront(event.target.value)} />
              <textarea className="input" rows={3} placeholder="Back" value={newBack} onChange={(event) => setNewBack(event.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => void addCard()}>Save</button>
                <button className="btn btn-ghost" onClick={() => setShowAddCard(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
