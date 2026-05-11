"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Flame, X, RotateCw, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
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

// Lightweight DOM-based confetti
function fireConfetti() {
  if (typeof window === "undefined") return;
  const colors = ["#f0b429", "#22c55e", "#3b82f6", "#ec4899", "#a855f7", "#ef4444"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);

  const COUNT = 90;
  for (let i = 0; i < COUNT; i += 1) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = 50 + (Math.random() - 0.5) * 30;
    const angle = (Math.random() - 0.5) * 1.4;
    const distance = 250 + Math.random() * 350;
    const duration = 1800 + Math.random() * 1200;
    const rotate = Math.random() * 720 - 360;

    piece.style.cssText = `
      position:absolute;
      top:50%;
      left:${left}%;
      width:${size}px;
      height:${size * 0.4}px;
      background:${color};
      border-radius:2px;
      transform:translate(-50%,-50%);
      opacity:1;
      will-change:transform,opacity;
      animation:kv-confetti-${i} ${duration}ms cubic-bezier(0.2,0.8,0.4,1) forwards;
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes kv-confetti-${i} {
        0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
        100% { transform: translate(calc(-50% + ${angle * distance}px), ${distance}px) rotate(${rotate}deg); opacity: 0; }
      }
    `;
    container.appendChild(styleEl);
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3500);
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
  const [streak, setStreak] = useState(0);

  const currentCard = queue[currentIndex] ?? null;
  const totalReviewed = history.length;
  const correct = history.filter((item) => (item.rating ?? 0) >= 2).length;
  const wrong = history.filter((item) => (item.rating ?? 0) < 2).length;
  const totalForProgress = queue.length;
  const progressPercent = totalForProgress > 0 ? Math.round((currentIndex / totalForProgress) * 100) : 0;

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

  // Fetch user's daily study streak
  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/user/preferences");
        if (!r.ok) return;
        const d = (await r.json().catch(() => ({}))) as { studyStreak?: number };
        setStreak(d.studyStreak ?? 0);
      } catch {
        // streak is optional
      }
    })();
  }, []);

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
      // Confetti when 100% complete
      setTimeout(fireConfetti, 250);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleStillLearning = () => {
    void rateCard(0);
  };

  const handleMastered = () => {
    void rateCard(3);
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
      if (event.key === "1" || event.key === "ArrowLeft") handleStillLearning();
      if (event.key === "2" || event.key === "ArrowRight") handleMastered();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, isFlipped, currentCard, currentIndex, queue]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-base text-zinc-400">Loading session…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-400" aria-hidden="true" />
          <p className="text-base text-red-300">{error}</p>
        </div>
      </main>
    );
  }

  if (!isComplete && queue.length === 0) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-zinc-900/50 px-6 py-16 text-center backdrop-blur-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 size={32} className="text-emerald-400" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-white">Nothing due! Come back tomorrow.</h2>
          {nextDueDate && (
            <p className="mt-2 text-base text-zinc-400">
              Next due: {nextDueDate.toLocaleDateString()} {nextDueDate.toLocaleTimeString()}
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/flashcards")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100 active:scale-95"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Decks
          </button>
        </div>
      </main>
    );
  }

  if (isComplete) {
    const accuracy = totalReviewed > 0 ? Math.round((correct / totalReviewed) * 100) : 0;
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/20 bg-zinc-900/50 px-6 py-12 text-center backdrop-blur-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10">
            <CheckCircle2 size={40} className="text-amber-400" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Deck Complete!</h2>
          <p className="mt-2 text-base text-zinc-400">Great session. Here&apos;s how you did:</p>

          <div className="my-8 grid grid-cols-3 gap-3 sm:gap-4">
            <SummaryStat label="Reviewed" value={totalReviewed} accent="text-white" />
            <SummaryStat label="Mastered" value={correct} accent="text-emerald-400" />
            <SummaryStat label="Still Learning" value={wrong} accent="text-red-400" />
          </div>

          <p className="text-base text-zinc-300">
            Accuracy: <span className="font-bold text-amber-400">{accuracy}%</span>
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/flashcards")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100 active:scale-95"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Decks
            </button>
            <button
              type="button"
              onClick={restartWithWrong}
              disabled={wrong === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCw size={16} aria-hidden="true" />
              Study Wrong Cards Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-24 text-white md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(`/flashcards/${deckId}`)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="End study session"
          >
            <X size={14} aria-hidden="true" />
            End
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-zinc-400 sm:block" aria-live="polite">
              <span className="font-semibold text-emerald-400">{correct}</span>
              <span className="mx-1">·</span>
              <span className="font-semibold text-red-400">{wrong}</span>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5" aria-label={`Current streak: ${streak} days`}>
                <Flame size={14} className="text-amber-400" aria-hidden="true" />
                <span className="text-xs font-bold text-amber-300">{streak}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sleek progress bar */}
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <span>Card {currentIndex + 1} of {queue.length}</span>
          <span className="font-semibold text-amber-300">{progressPercent}%</span>
        </div>
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Study progress"
          />
        </div>

        {/* 3D flippable card */}
        <div className="mx-auto" style={{ perspective: "1200px" }}>
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="kv-flip-card relative block w-full rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            style={{ minHeight: 360 }}
            aria-label={isFlipped ? "Hide answer" : "Reveal answer"}
            aria-pressed={isFlipped}
          >
            <div
              className="kv-flip-inner relative h-full w-full"
              style={{
                minHeight: 360,
                transformStyle: "preserve-3d",
                transition: "transform 600ms cubic-bezier(0.2, 0.8, 0.4, 1)",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 shadow-2xl"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <span className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Question</span>
                <p className="text-center text-2xl font-bold leading-snug text-white sm:text-3xl">
                  {currentCard?.front}
                </p>
                <p className="absolute bottom-4 text-xs text-zinc-500">Click or press Space to flip</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 shadow-2xl"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <span className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Answer</span>
                <p className="text-center text-2xl font-bold leading-snug text-white sm:text-3xl">
                  {currentCard?.back}
                </p>
                <p className="absolute bottom-4 text-xs text-zinc-500">Click to flip back</p>
              </div>
            </div>
          </button>
        </div>

        {/* Glowing action buttons */}
        <div
          className={`mt-8 grid grid-cols-2 gap-3 transition-all duration-300 sm:gap-4 ${
            isFlipped ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
          }`}
          aria-hidden={!isFlipped}
        >
          <button
            type="button"
            onClick={handleStillLearning}
            disabled={!isFlipped}
            className="group relative overflow-hidden rounded-xl border border-red-500/40 bg-gradient-to-br from-red-500/20 to-orange-500/10 px-4 py-4 text-base font-bold text-red-300 transition-all hover:border-red-500/60 hover:from-red-500/30 hover:to-orange-500/20 hover:text-red-200 hover:shadow-[0_0_30px_rgba(239,68,68,0.35)] active:scale-95 disabled:cursor-not-allowed"
            aria-label="Still learning - review sooner"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <AlertCircle size={18} aria-hidden="true" />
              Still Learning
            </span>
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-400/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleMastered}
            disabled={!isFlipped}
            className="group relative overflow-hidden rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 px-4 py-4 text-base font-bold text-emerald-300 transition-all hover:border-emerald-500/60 hover:from-emerald-500/30 hover:to-teal-500/20 hover:text-emerald-200 hover:shadow-[0_0_30px_rgba(34,197,94,0.35)] active:scale-95 disabled:cursor-not-allowed"
            aria-label="Mastered - done for today"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <CheckCircle2 size={18} aria-hidden="true" />
              Mastered
            </span>
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Space / Enter to flip · ← Still Learning · → Mastered
        </p>
      </div>
    </main>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
