"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { trackNovaEvent } from "@/lib/novaClient";

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
    <div className="card p-3.5">
      <p className="m-0 text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-[28px] font-extrabold" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
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

    trackNovaEvent("FLASHCARD_STUDIED");

    setHistory((prev) => [...prev, { card: currentCard, rating }]);
    setIsFlipped(false);

    const isLast = currentIndex >= queue.length - 1;
    if (isLast) {
      setIsComplete(true);
      trackNovaEvent("DECK_COMPLETED");
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
    return <main className="p-6 text-[var(--text-primary)]">Loading session...</main>;
  }

  if (error) {
    return <main className="p-6 text-[var(--accent-red)]">{error}</main>;
  }

  if (!isComplete && queue.length === 0) {
    return (
      <main className="min-h-screen bg-[var(--bg-base)] px-4 py-6 pb-24 text-[var(--text-primary)] md:px-6">
        <div className="card mx-auto max-w-[760px] p-6 text-center md:py-16">
          <div className="mb-4 text-7xl">🎉</div>
          <h2 className="text-title m-0">Nothing due! Come back tomorrow.</h2>
          {nextDueDate && (
            <p className="mt-2.5 text-[var(--text-secondary)]">
              Next due: {nextDueDate.toLocaleDateString()} {nextDueDate.toLocaleTimeString()}
            </p>
          )}
          <button className="btn btn-primary mt-5" onClick={() => router.push("/flashcards")}>Back to Decks</button>
        </div>
      </main>
    );
  }

  if (isComplete) {
    return (
      <main className="min-h-screen bg-[var(--bg-base)] px-4 py-6 pb-24 text-[var(--text-primary)] md:px-6">
        <div className="card mx-auto max-w-[840px] p-6 text-center md:py-16">
          <div className="mb-4 text-7xl">🎉</div>
          <h2 className="text-title">Session Complete!</h2>
          <div className="my-8 grid grid-cols-3 gap-4">
            <StatCard label="Reviewed" value={totalReviewed} />
            <StatCard label="Correct" value={correct} color="var(--accent-green)" />
            <StatCard label="Again" value={wrong} color="var(--accent-red)" />
          </div>
          <p className="text-[var(--text-secondary)]">
            Accuracy: {totalReviewed > 0 ? Math.round((correct / totalReviewed) * 100) : 0}%
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button className="btn btn-primary" onClick={() => router.push("/flashcards")}>Back to Decks</button>
            <button className="btn btn-ghost" onClick={restartWithWrong} disabled={wrong === 0}>Study Wrong Cards Again</button>
          </div>
        </div>
      </main>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / queue.length) * 100);

  return (
    <main className="min-h-screen bg-[var(--bg-base)] px-4 py-6 pb-24 text-[var(--text-primary)] md:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="m-0 text-[var(--text-secondary)]">Card {currentIndex + 1} of {queue.length}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Session Stats: ✓ {correct} ✗ {wrong}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => router.push(`/flashcards/${deckId}`)}>✕ End</button>
        </div>

        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div className="h-full bg-[var(--accent-blue)] transition-[width] duration-[250ms] ease-[ease]" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="card-container mx-auto max-w-[600px]" style={{ perspective: 1000 }}>
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="w-full border-none bg-transparent p-0"
            style={{ minHeight: 280, cursor: "pointer" }}
          >
            <div className={`card-inner relative w-full ${isFlipped ? "flipped" : ""}`} style={{ minHeight: 280 }}>
              <div className="card-front absolute inset-0 flex items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-6" style={{ backfaceVisibility: "hidden" }}>
                <div>
                  <p className="m-0 text-center text-xl font-semibold">{currentCard?.front}</p>
                  <p className="mt-4 text-center text-xs text-[var(--text-muted)]">Click to reveal answer</p>
                </div>
              </div>

              <div className="card-back absolute inset-0 flex items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-6" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <div>
                  <p className="mb-2.5 text-xs text-[var(--text-muted)]">Front:</p>
                  <p className="m-0 text-center text-xl font-semibold">{currentCard?.back}</p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {isFlipped && (
          <>
            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {ratings.map((rating) => (
                <button
                  key={rating.value}
                  type="button"
                  onClick={() => void rateCard(rating.value)}
                  className="grid cursor-pointer justify-items-center gap-1 rounded-lg px-2.5 py-3 text-sm font-semibold"
                  style={{
                    border: `1px solid ${rating.color}`,
                    background: `color-mix(in srgb, ${rating.color} 15%, transparent)`,
                    color: rating.color,
                  }}
                >
                  <span className="text-lg">{rating.emoji}</span>
                  <span>{rating.label}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{rating.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-center text-xs text-[var(--text-muted)]">
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
