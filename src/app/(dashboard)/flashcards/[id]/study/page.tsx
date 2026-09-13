"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { trackNovaEvent } from "@/lib/novaClient";
import { orderDueWeaknessFirst, sm2 } from "~/lib/sm2";
import {
  clearStudyResume,
  readStudyResume,
  writeStudyResume,
} from "~/lib/study-resume";
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
  lastReviewed?: string | null;
};

type RatingValue = 0 | 1 | 2 | 3;

type SessionCard = {
  card: Flashcard;
  rating?: RatingValue;
};

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
  const [weaknessFirst, setWeaknessFirst] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [sessionSize, setSessionSize] = useState(0);
  const ratingLock = useRef(false);

  const currentCard = queue[currentIndex] ?? null;
  const totalReviewed = history.length;
  // SM-2 alignment: Again(0)=miss, Hard(1)=shaky but progress kept, Good(2)/Easy(3)=solid.
  const again = history.filter((item) => (item.rating ?? 0) === 0).length;
  const hard = history.filter((item) => (item.rating ?? 0) === 1).length;
  const solid = history.filter((item) => (item.rating ?? 0) >= 2).length;
  const shakyOrSolid = hard + solid;
  /** Cards to restudy: Again only (Hard keeps SM-2 progress — not a full fail). */
  const restudyCount = again;
  /** Honest progress: graded / original session size (survives mid-session resume). */
  const sessionProgress = sessionSize > 0 ? history.length / sessionSize : 0;

  const nextDueDate = useMemo(() => {
    const now = Date.now();
    const future = allCards
      .map((card) => new Date(card.nextReview).getTime())
      .filter((timestamp) => timestamp > now)
      .sort((a, b) => a - b)[0];
    return future ? new Date(future) : null;
  }, [allCards]);

  const persistResume = (
    nextQueue: Flashcard[],
    nextIndex: number,
    nextHistory: SessionCard[],
    nextWeaknessFirst: boolean,
  ) => {
    if (!deckId || nextQueue.length === 0) return;
    if (nextIndex >= nextQueue.length) {
      clearStudyResume(deckId);
      return;
    }
    writeStudyResume({
      deckId,
      queueIds: nextQueue.map((c) => c.id),
      currentIndex: nextIndex,
      history: nextHistory
        .filter((h) => h.rating !== undefined)
        .map((h) => ({ cardId: h.card.id, rating: h.rating as RatingValue })),
      weaknessFirst: nextWeaknessFirst,
      savedAt: Date.now(),
    });
  };

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
      const saved = readStudyResume(deckId);
      const byId = new Map(cards.map((c) => [c.id, c]));

      if (saved && saved.queueIds.length > 0) {
        const stillDue = new Set(due.map((c) => c.id));
        const restoredHistory: SessionCard[] = [];
        for (const h of saved.history) {
          const card = byId.get(h.cardId);
          if (!card) continue;
          restoredHistory.push({ card, rating: h.rating });
        }

        const remaining: Flashcard[] = [];
        for (const id of saved.queueIds.slice(saved.currentIndex)) {
          const card = byId.get(id);
          if (card && stillDue.has(card.id)) remaining.push(card);
        }

        if (remaining.length > 0 || restoredHistory.length > 0) {
          const size = restoredHistory.length + remaining.length;
          if (remaining.length === 0) {
            clearStudyResume(deckId);
            setQueue([]);
            setHistory(restoredHistory);
            setSessionSize(size);
            setIsComplete(true);
            setWeaknessFirst(Boolean(saved.weaknessFirst));
            setResumed(true);
            return;
          }

          setQueue(remaining);
          setCurrentIndex(0);
          setHistory(restoredHistory);
          setSessionSize(size);
          setWeaknessFirst(Boolean(saved.weaknessFirst));
          setResumed(true);
          setIsFlipped(false);
          setIsComplete(false);
          persistResume(remaining, 0, restoredHistory, Boolean(saved.weaknessFirst));
          return;
        }
        clearStudyResume(deckId);
      }

      const ordered = orderDueWeaknessFirst(due);
      const useWeakness = ordered.length > 1;
      setQueue(ordered);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHistory([]);
      setSessionSize(ordered.length);
      setWeaknessFirst(useWeakness);
      setResumed(false);
      setIsComplete(ordered.length === 0);
      if (ordered.length > 0) {
        persistResume(ordered, 0, [], useWeakness);
      } else {
        clearStudyResume(deckId);
      }
    } catch {
      setError("Failed to load study cards");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!deckId) return;
    void fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const rateCard = async (rating: RatingValue) => {
    if (!currentCard || ratingLock.current) return;
    ratingLock.current = true;

    try {
      const response = await fetch(`/api/decks/${deckId}/cards/${currentCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        card?: Flashcard;
      };

      const patched: Flashcard = data.card
        ? {
            ...currentCard,
            ...data.card,
            nextReview:
              typeof data.card.nextReview === "string"
                ? data.card.nextReview
                : new Date(data.card.nextReview as unknown as string).toISOString(),
          }
        : (() => {
            const next = sm2(
              {
                easeFactor: currentCard.easeFactor ?? 2.5,
                interval: currentCard.interval ?? 1,
                repetitions: currentCard.repetitions ?? 0,
              },
              rating,
            );
            return {
              ...currentCard,
              easeFactor: next.easeFactor,
              interval: next.interval,
              repetitions: next.repetitions,
              nextReview: next.nextReview!.toISOString(),
              lastReviewed: new Date().toISOString(),
            };
          })();

      setAllCards((prev) => prev.map((c) => (c.id === patched.id ? { ...c, ...patched } : c)));

      trackNovaEvent("FLASHCARD_STUDIED");

      const nextHistory = [...history, { card: currentCard, rating }];
      setHistory(nextHistory);
      setIsFlipped(false);

      const isLast = currentIndex >= queue.length - 1;
      if (isLast) {
        setIsComplete(true);
        clearStudyResume(deckId);
        trackNovaEvent("DECK_COMPLETED");
        return;
      }

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      persistResume(queue, nextIndex, nextHistory, weaknessFirst);
    } finally {
      ratingLock.current = false;
    }
  };

  const restartWithAgain = () => {
    const againCards = history.filter((item) => (item.rating ?? 0) === 0).map((item) => item.card);
    if (againCards.length === 0) return;
    const ordered = orderDueWeaknessFirst(againCards);
    setQueue(ordered);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHistory([]);
    setSessionSize(ordered.length);
    setIsComplete(false);
    setWeaknessFirst(ordered.length > 1);
    setResumed(false);
    persistResume(ordered, 0, [], ordered.length > 1);
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

      // 1 Again · 2 Hard · 3 Good · 4 Easy (matches buttons)
      if (event.key === "1" || event.key === "ArrowLeft") {
        event.preventDefault();
        void rateCard(0);
        return;
      }
      if (event.key === "2") {
        event.preventDefault();
        void rateCard(1);
        return;
      }
      if (event.key === "3") {
        event.preventDefault();
        void rateCard(2);
        return;
      }
      if (event.key === "4" || event.key === "ArrowRight") {
        event.preventDefault();
        void rateCard(3);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, isFlipped, currentCard, currentIndex, queue, history, weaknessFirst]);

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
            <b className="num">{solid}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Hard (shaky)</span>
            <b className="num">{hard}</b>
          </div>
        </div>
        <p className="kv-meta" style={{ marginTop: 12, textAlign: "center" }}>
          Again (missed): <span className="num">{again}</span>
          {" · "}
          Shaky + solid (progress kept): <span className="num">{shakyOrSolid}</span>
        </p>

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
            onClick={restartWithAgain}
            disabled={restudyCount === 0}
            className="kv-btn-ghost"
          >
            Study Again cards
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="kv-page" style={{ padding: "24px 16px 120px" }}>
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
            {solid} good · {hard} hard · {again} again
          </span>
        </div>

        {weaknessFirst ? (
          <p className="kv-meta" style={{ marginTop: 12 }}>
            {resumed ? "Resumed · " : ""}starting with your weak spots
          </p>
        ) : resumed ? (
          <p className="kv-meta" style={{ marginTop: 12 }}>
            Resumed where you left off
          </p>
        ) : null}

        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span className="kv-meta num">
              {history.length} / {sessionSize} reviewed
            </span>
            <span className="kv-meta num">
              {Math.min(history.length + 1, sessionSize)} of {sessionSize}
            </span>
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
              marginTop: 28,
              padding: "40px 20px",
              minHeight: 220,
              textAlign: "center",
              background: "transparent",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {!isFlipped ? (
              <>
                <p className="kv-meta" style={{ marginBottom: 16 }}>Question</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: 1.45, color: "var(--kv-text-primary)" }}>
                  {currentCard.front}
                </p>
                <p className="kv-meta" style={{ marginTop: 24 }}>Tap or press Space to flip</p>
              </>
            ) : (
              <>
                <p className="kv-meta" style={{ marginBottom: 16 }}>Answer</p>
                <p style={{ margin: 0, fontSize: 20, lineHeight: 1.45, color: "var(--kv-text-secondary)" }}>
                  {currentCard.back}
                </p>
                <p className="kv-meta" style={{ marginTop: 24 }}>Tap to flip back</p>
              </>
            )}
          </button>
        )}

        {/* Thumb-reach grade row — sticky bottom on narrow viewports */}
        <div
          className="study-grade-bar"
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            opacity: isFlipped ? 1 : 0.35,
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
              style={{ flexDirection: "column", padding: "14px 6px", gap: 4, minHeight: 56 }}
              aria-label={`${btn.label} — ${previewInterval(currentCard!, btn.rating)}`}
            >
              <span>{btn.label}</span>
              <span className="kv-meta num">{currentCard ? previewInterval(currentCard, btn.rating) : ""}</span>
            </button>
          ))}
        </div>

        <p className="kv-meta study-kbd-hint" style={{ marginTop: 16, textAlign: "center" }}>
          Space / Enter flip · 1 Again · 2 Hard · 3 Good · 4 Easy · ← Again · → Easy
        </p>
      </div>
    </main>
  );
}
