"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  nextReview: string;
};

type RatingValue = 0 | 1 | 2 | 3;

type SessionCard = {
  card: Flashcard;
  rating?: RatingValue;
};

const ratings = [
  { label: "Again", value: 0 as const, color: "var(--accent-red)", hint: "Complete blackout", emoji: "😵" },
  { label: "Hard", value: 1 as const, color: "var(--accent-orange)", hint: "Significant difficulty", emoji: "😓" },
  { label: "Good", value: 2 as const, color: "var(--accent-blue)", hint: "Correct with effort", emoji: "👍" },
  { label: "Easy", value: 3 as const, color: "var(--accent-green)", hint: "Perfect recall", emoji: "⚡" },
];

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j] as T;
    copy[j] = tmp as T;
  }
  return copy;
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800, color: color ?? "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

export default function StudyDeckPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const deckId = String(params.id ?? "");

  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<SessionCard[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentCard = queue[currentIndex] ?? null;
  const totalReviewed = history.length;
  const correct = history.filter((item) => (item.rating ?? 0) >= 2).length;
  const wrong = history.filter((item) => (item.rating ?? 0) < 2).length;

  const nextDueDate = useMemo(() => {
    const now = Date.now();
    const future = allCards
      .map((card) => new Date(card.nextReview).getTime())
      .filter((timestamp) => timestamp > now)
      .sort((a, b) => a - b)[0];

    return future ? new Date(future) : null;
  }, [allCards]);

  const fetchCards = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/decks/${deckId}/cards`);
      const data = (await response.json().catch(() => ({}))) as { cards?: Flashcard[]; error?: string };
      if (!response.ok || !data.cards) {
        setError(data.error ?? "Failed to load study cards");
        return;
      }

      const cards = data.cards;
      setAllCards(cards);

      const due = cards.filter((card) => new Date(card.nextReview).getTime() <= Date.now());
      const shuffled = shuffle(due);
      setQueue(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHistory([]);
      setIsComplete(shuffled.length === 0);
    } catch {
      setError("Failed to load study cards");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!deckId) return;
    void fetchCards();
  }, [deckId]);

  const rateCard = async (rating: RatingValue) => {
    if (!currentCard) return;

    await fetch(`/api/decks/${deckId}/cards/${currentCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });

    setHistory((prev) => [...prev, { card: currentCard, rating }]);
    setIsFlipped(false);

    const isLast = currentIndex >= queue.length - 1;
    if (isLast) {
      setIsComplete(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const restartWithWrong = () => {
    const wrongCards = history
      .filter((item) => (item.rating ?? 0) < 2)
      .map((item) => item.card);

    if (wrongCards.length === 0) return;

    const reshuffled = shuffle(wrongCards);
    setQueue(reshuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHistory([]);
    setIsComplete(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isComplete) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setIsFlipped((prev) => !prev);
        return;
      }

      if (!isFlipped) return;

      if (event.key === "1") void rateCard(0);
      if (event.key === "2") void rateCard(1);
      if (event.key === "3") void rateCard(2);
      if (event.key === "4") void rateCard(3);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isComplete, isFlipped, currentCard, currentIndex, queue]);

  if (isLoading) {
    return <main style={{ padding: 24, color: "var(--text-primary)" }}>Loading session...</main>;
  }

  if (error) {
    return <main style={{ padding: 24, color: "var(--accent-red)" }}>{error}</main>;
  }

  if (!isComplete && queue.length === 0) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "24px 16px 100px" }}>
        <div className="card" style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <h2 className="text-title" style={{ margin: 0 }}>Nothing due! Come back tomorrow.</h2>
          {nextDueDate && (
            <p style={{ color: "var(--text-secondary)", marginTop: 10 }}>
              Next due: {nextDueDate.toLocaleDateString()} {nextDueDate.toLocaleTimeString()}
            </p>
          )}
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => router.push("/flashcards")}>Back to Decks</button>
        </div>
      </main>
    );
  }

  if (isComplete) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "24px 16px 100px" }}>
        <div className="card" style={{ maxWidth: 840, margin: "0 auto", textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "72px", marginBottom: "16px" }}>🎉</div>
          <h2 className="text-title">Session Complete!</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", margin: "32px 0" }}>
            <StatCard label="Reviewed" value={totalReviewed} />
            <StatCard label="Correct" value={correct} color="var(--accent-green)" />
            <StatCard label="Again" value={wrong} color="var(--accent-red)" />
          </div>
          <p style={{ color: "var(--text-secondary)" }}>
            Accuracy: {totalReviewed > 0 ? Math.round((correct / totalReviewed) * 100) : 0}%
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
            <button className="btn btn-primary" onClick={() => router.push("/flashcards")}>Back to Decks</button>
            <button className="btn btn-ghost" onClick={restartWithWrong} disabled={wrong === 0}>Study Wrong Cards Again</button>
          </div>
        </div>
      </main>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / queue.length) * 100);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>Card {currentIndex + 1} of {queue.length}</p>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 12 }}>Session Stats: ✓ {correct} ✗ {wrong}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => router.push(`/flashcards/${deckId}`)}>✕ End</button>
        </div>

        <div style={{ width: "100%", height: 10, borderRadius: 999, background: "var(--bg-elevated)", overflow: "hidden", marginBottom: 18 }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", background: "var(--accent-blue)", transition: "width 0.25s ease" }} />
        </div>

        <div className="card-container" style={{ perspective: 1000, maxWidth: 600, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            style={{
              width: "100%",
              minHeight: 280,
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <div className={`card-inner ${isFlipped ? "flipped" : ""}`} style={{ position: "relative", width: "100%", minHeight: 280 }}>
              <div className="card-front" style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                background: "var(--bg-card)",
                border: "1px solid var(--border-strong)",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}>
                <div>
                  <p style={{ margin: 0, textAlign: "center", fontSize: 20, fontWeight: 600 }}>{currentCard?.front}</p>
                  <p style={{ margin: "16px 0 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Click to reveal answer</p>
                </div>
              </div>

              <div className="card-back" style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-strong)",
                borderRadius: 16,
                padding: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <div>
                  <p style={{ margin: "0 0 10px", color: "var(--text-muted)", fontSize: 12 }}>Front:</p>
                  <p style={{ margin: 0, textAlign: "center", fontSize: 20, fontWeight: 600 }}>{currentCard?.back}</p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {isFlipped && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 16 }}>
              {ratings.map((rating) => (
                <button
                  key={rating.value}
                  type="button"
                  onClick={() => void rateCard(rating.value)}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${rating.color}`,
                    background: `color-mix(in srgb, ${rating.color} 15%, transparent)`,
                    color: rating.color,
                    padding: "12px 10px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "grid",
                    gap: 4,
                    justifyItems: "center",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{rating.emoji}</span>
                  <span>{rating.label}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{rating.hint}</span>
                </button>
              ))}
            </div>
            <p style={{ marginTop: 10, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              1-4 to rate • Space to flip
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .card-inner {
          transform-style: preserve-3d;
          transition: transform 0.5s ease;
        }

        .card-inner.flipped {
          transform: rotateY(180deg);
        }
      `}</style>
    </main>
  );
}
