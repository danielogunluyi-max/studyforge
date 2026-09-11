"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { trackNovaEvent } from "@/lib/novaClient";
import { sm2 } from "~/lib/sm2";
import { formatTorontoDate, formatTorontoDateTime } from "~/lib/toronto-time";

type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  nextReview: string;
  easeFactor?: number;
  repetitions?: number;
  interval?: number;
};

type RatingValue = 0 | 1 | 2 | 3;

type SessionCard = {
  card: Flashcard;
  rating?: RatingValue;
};

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

function formatIntervalDays(days: number): string {
  if (days <= 0) return "<1d";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

function previewInterval(card: Flashcard, rating: RatingValue): string {
  const result = sm2(
    {
      easeFactor: card.easeFactor ?? 2.5,
      interval: card.interval ?? 1,
      repetitions: card.repetitions ?? 0,
    },
    rating,
  );
  return formatIntervalDays(result.interval);
}

const RATING_BUTTONS: { label: string; rating: RatingValue; key: string }[] = [
  { label: "Again", rating: 0, key: "1" },
  { label: "Hard", rating: 1, key: "2" },
  { label: "Good", rating: 2, key: "3" },
  { label: "Easy", rating: 3, key: "4" },
];

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
  const sessionProgress = queue.length > 0 ? Math.max(history.length, currentIndex) / queue.length : 0;

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
    const wrongCards = history.filter((item) => (item.rating ?? 0) < 2).map((item) => item.card);
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

      if (event.key === "1" || event.key === "ArrowLeft") {
        event.preventDefault();
        void rateCard(0);
        return;
      }
      if (event.key === "2") {
        event.preventDefault();
        void rateCard(3);
        return;
      }
      if (event.key === "3") {
        event.preventDefault();
        void rateCard(1);
        return;
      }
      if (event.key === "4") {
        event.preventDefault();
        void rateCard(2);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        void rateCard(3);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, isFlipped, currentCard, currentIndex, queue]);

  if (isLoading) {
    return (
      <main className="kv-page" style={{ padding: 24 }}>
        <p className="kv-sub">Loading session…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="kv-page" style={{ padding: 24 }}>
        <p style={{ color: "#E5484D" }}>{error}</p>
      </main>
    );
  }

  if (!isComplete && queue.length === 0) {
    return (
      <main className="kv-page" style={{ padding: "48px 16px 100px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h2 className="kv-title" style={{ fontSize: 24 }}>Nothing due! Come back tomorrow.</h2>
        {nextDueDate && (
          <p className="kv-sub" style={{ marginTop: 12 }}>
            Next due: {formatTorontoDateTime(nextDueDate)}
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push("/flashcards")}
          className="kv-btn"
          style={{ marginTop: 24 }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Decks
        </button>
      </main>
    );
  }

  if (isComplete) {
    return (
      <main className="kv-page" style={{ padding: "48px 16px 100px", maxWidth: 520, margin: "0 auto" }}>
        <h2 className="kv-title" style={{ fontSize: 28, textAlign: "center" }}>Deck Complete</h2>
        <p className="kv-sub" style={{ marginTop: 10, textAlign: "center" }}>Session summary</p>

        <div className="kv-stats" style={{ marginTop: 28, gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kv-stat">
            <span className="kv-meta">Reviewed</span>
            <b className="num">{totalReviewed}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Good / Easy</span>
            <b className="num">{correct}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Again / Hard</span>
            <b className="num">{wrong}</b>
          </div>
        </div>

        {nextDueDate && (
          <p className="kv-meta" style={{ marginTop: 20, textAlign: "center" }}>
            Next due: {formatTorontoDate(nextDueDate)}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 28 }}>
          <button type="button" onClick={() => router.push("/flashcards")} className="kv-btn">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Decks
          </button>
          <button
            type="button"
            onClick={restartWithWrong}
            disabled={wrong === 0}
            className="kv-btn-ghost"
          >
            Study Again / Hard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push(`/flashcards/${deckId}`)}
            className="kv-btn-ghost"
            style={{ padding: "8px 12px" }}
            aria-label="End study session"
          >
            End Session
          </button>
          <span className="kv-meta num">
            {correct} good · {wrong} again
          </span>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span className="kv-meta num">{history.length} / {queue.length} due</span>
            <span className="kv-meta num">{currentIndex + 1} of {queue.length}</span>
          </div>
          <div
            className="kv-bar"
            role="progressbar"
            aria-valuenow={Math.round(sessionProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Study progress"
          >
            <div style={{ width: `${Math.round(sessionProgress * 100)}%` }} />
          </div>
        </div>

        {currentCard && (
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            aria-label={isFlipped ? "Hide answer" : "Reveal answer"}
            aria-pressed={isFlipped}
            style={{
              display: "block",
              width: "100%",
              marginTop: 32,
              padding: "48px 24px",
              minHeight: 240,
              textAlign: "center",
              background: "transparent",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
            }}
          >
            {!isFlipped ? (
              <>
                <p className="kv-meta" style={{ marginBottom: 16 }}>Question</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: 1.45, color: "var(--kv-text-primary)" }}>
                  {currentCard.front}
                </p>
                <p className="kv-meta" style={{ marginTop: 24 }}>Click or press Space to flip</p>
              </>
            ) : (
              <>
                <p className="kv-meta" style={{ marginBottom: 16 }}>Answer</p>
                <p style={{ margin: 0, fontSize: 20, lineHeight: 1.45, color: "var(--kv-text-secondary)" }}>
                  {currentCard.back}
                </p>
                <p className="kv-meta" style={{ marginTop: 24 }}>Click to flip back</p>
              </>
            )}
          </button>
        )}

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            opacity: isFlipped ? 1 : 0,
            pointerEvents: isFlipped ? "auto" : "none",
          }}
          aria-hidden={!isFlipped}
        >
          {RATING_BUTTONS.map((btn) => (
            <button
              key={btn.rating}
              type="button"
              onClick={() => void rateCard(btn.rating)}
              disabled={!isFlipped}
              className="kv-btn-ghost"
              style={{ flexDirection: "column", padding: "12px 8px", gap: 4 }}
              aria-label={`${btn.label} — ${previewInterval(currentCard!, btn.rating)}`}
            >
              <span>{btn.label}</span>
              <span className="kv-meta num">{currentCard ? previewInterval(currentCard, btn.rating) : ""}</span>
            </button>
          ))}
        </div>

        <p className="kv-meta" style={{ marginTop: 16, textAlign: "center" }}>
          Space / Enter flip · 1 Again · 2 Easy · 3 Hard · 4 Good · ← Again · → Easy
        </p>
      </div>
    </main>
  );
}
