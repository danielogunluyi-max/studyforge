"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, X, RotateCw, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackNovaEvent } from "@/lib/novaClient";

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

/* ─── Mastery computation ──────────────────────────────────── */

function computeMastery(card: Flashcard | null | undefined): number {
  if (!card) return 0;
  const ease = card.easeFactor ?? 2.5;
  const reps = card.repetitions ?? 0;
  const interval = card.interval ?? 1;

  const easeScore = Math.min(40, Math.max(0, ((ease - 1.3) / 1.7) * 40));
  const repScore = Math.min(40, reps * 8);
  const intervalScore = Math.min(20, interval);

  return Math.round(Math.min(100, Math.max(0, easeScore + repScore + intervalScore)));
}

/* ─── Mastery Ring (purple SVG with glow) ──────────────────── */

function MasteryRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;

  return (
    <div
      className="relative will-change-transform"
      style={{ width: size, height: size, filter: "drop-shadow(0 0 10px rgba(168, 85, 247, 0.45))" }}
      aria-label={`Mastery ${percent}%`}
      role="img"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="mastery-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d8b4fe" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#mastery-purple)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.2, 0.8, 0.4, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold tabular-nums text-purple-200">{percent}%</span>
      </div>
    </div>
  );
}

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
  const [exitDirection, setExitDirection] = useState<"left" | "right">("right");
  const cardSurfaceRef = useRef<HTMLDivElement | null>(null);

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
    setExitDirection("left");
    void rateCard(0);
  };

  const handleMastered = () => {
    setExitDirection("right");
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

  const masteryPercent = computeMastery(currentCard);

  const handleCardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const surface = cardSurfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    surface.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    surface.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-6 pb-24 text-zinc-100 md:px-6">
      {/* Ambient atmospheric glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-purple-500/12 blur-[140px]" />
        <div className="absolute top-1/2 right-0 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-amber-500/8 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(`/flashcards/${deckId}`)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 backdrop-blur-xl transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-zinc-100 active:scale-95 will-change-transform"
            aria-label="End study session"
          >
            <X size={14} aria-hidden="true" />
            End Session
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-xl" aria-live="polite">
              <span className="text-xs font-bold text-emerald-300 tabular-nums">{correct}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" aria-hidden="true" />
              <span className="text-xs font-bold text-red-300 tabular-nums">{wrong}</span>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 backdrop-blur-xl" aria-label={`Current streak: ${streak} days`}>
                <Flame size={14} className="text-amber-400" aria-hidden="true" />
                <span className="text-xs font-bold tabular-nums text-amber-300">{streak}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium">Card {currentIndex + 1} of {queue.length}</span>
          <span className="font-semibold tabular-nums text-purple-300">{progressPercent}%</span>
        </div>
        <div className="mb-10 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 will-change-transform"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Study progress"
          />
        </div>

        {/* 3D Card stage */}
        <div
          className="relative mx-auto"
          style={{ perspective: "1500px", minHeight: 400 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {currentCard && (
              <motion.div
                key={currentCard.id}
                initial={{ x: -300, opacity: 0, scale: 0.94 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={
                  exitDirection === "right"
                    ? { x: 500, opacity: 0, rotate: 6 }
                    : { x: -500, opacity: 0, rotate: -6 }
                }
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="will-change-transform"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  ref={cardSurfaceRef}
                  onMouseMove={handleCardMouseMove}
                  style={{
                    perspective: "1500px",
                    minHeight: 400,
                    "--mx": "50%",
                    "--my": "50%",
                  }}
                >
                  <motion.button
                    type="button"
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="relative block w-full rounded-3xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 will-change-transform"
                    style={{
                      minHeight: 400,
                      transformStyle: "preserve-3d",
                    }}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    aria-label={isFlipped ? "Hide answer" : "Reveal answer"}
                    aria-pressed={isFlipped}
                  >
                    {/* ─── FRONT FACE ─── */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.35),0_30px_60px_-20px_rgba(0,0,0,0.55)]"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                    >
                      {/* Mouse-follow spotlight */}
                      <div
                        className="pointer-events-none absolute inset-0 rounded-3xl"
                        style={{
                          background:
                            "radial-gradient(480px circle at var(--mx) var(--my), rgba(168,85,247,0.18), transparent 60%)",
                        }}
                        aria-hidden="true"
                      />

                      {/* Mastery ring (top-right) */}
                      <div className="absolute right-5 top-5 z-10">
                        <MasteryRing percent={masteryPercent} />
                      </div>

                      {/* Question label */}
                      <span className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                        <Sparkles size={10} className="text-purple-300" aria-hidden="true" />
                        Question
                      </span>

                      <p className="relative text-center text-2xl font-bold leading-snug text-zinc-100 sm:text-3xl">
                        {currentCard.front}
                      </p>

                      <p className="absolute bottom-5 text-xs font-medium text-zinc-500">
                        Card {currentIndex + 1} of {queue.length} · Click or press Space to flip
                      </p>
                    </div>

                    {/* ─── BACK FACE ─── */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-purple-400/20 bg-white/5 p-8 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.35),0_30px_60px_-20px_rgba(168,85,247,0.4)]"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      {/* Mouse-follow spotlight (mirrored to match flipped face) */}
                      <div
                        className="pointer-events-none absolute inset-0 rounded-3xl"
                        style={{
                          background:
                            "radial-gradient(480px circle at calc(100% - var(--mx)) var(--my), rgba(168,85,247,0.22), transparent 60%)",
                        }}
                        aria-hidden="true"
                      />

                      <div className="absolute right-5 top-5 z-10">
                        <MasteryRing percent={masteryPercent} />
                      </div>

                      <span className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-purple-200">
                        <Sparkles size={10} aria-hidden="true" />
                        Answer
                      </span>

                      <p className="relative text-center text-2xl font-bold leading-snug text-zinc-100 sm:text-3xl">
                        {currentCard.back}
                      </p>

                      <p className="absolute bottom-5 text-xs font-medium text-zinc-500">
                        Card {currentIndex + 1} of {queue.length} · Click to flip back
                      </p>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons (revealed when flipped) */}
        <motion.div
          className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 will-change-transform"
          initial={false}
          animate={{ opacity: isFlipped ? 1 : 0, y: isFlipped ? 0 : 12 }}
          style={{ pointerEvents: isFlipped ? "auto" : "none" }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          aria-hidden={!isFlipped}
        >
          {/* Still Learning — Red glow */}
          <motion.button
            type="button"
            onClick={handleStillLearning}
            disabled={!isFlipped}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="group relative overflow-hidden rounded-2xl border border-red-400/30 bg-white/5 px-4 py-5 text-base font-bold text-red-200 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_2px_rgba(0,0,0,0.3)] transition-colors duration-200 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-100 hover:shadow-[0_0_36px_-6px_rgba(239,68,68,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50 will-change-transform"
            aria-label="Still learning — review sooner"
          >
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/0 via-red-500/0 to-orange-500/0 opacity-0 transition-opacity duration-300 group-hover:from-red-500/20 group-hover:via-red-500/10 group-hover:to-orange-500/10 group-hover:opacity-100" aria-hidden="true" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <AlertCircle size={18} aria-hidden="true" />
              Still Learning
            </span>
          </motion.button>

          {/* Mastered — Green glow */}
          <motion.button
            type="button"
            onClick={handleMastered}
            disabled={!isFlipped}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="group relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-white/5 px-4 py-5 text-base font-bold text-emerald-200 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_2px_rgba(0,0,0,0.3)] transition-colors duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-100 hover:shadow-[0_0_36px_-6px_rgba(34,197,94,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50 will-change-transform"
            aria-label="Mastered — done for today"
          >
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-teal-500/0 opacity-0 transition-opacity duration-300 group-hover:from-emerald-500/20 group-hover:via-emerald-500/10 group-hover:to-teal-500/10 group-hover:opacity-100" aria-hidden="true" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <CheckCircle2 size={18} aria-hidden="true" />
              Mastered
            </span>
          </motion.button>
        </motion.div>

        <p className="mt-5 text-center text-xs font-medium text-zinc-500">
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
