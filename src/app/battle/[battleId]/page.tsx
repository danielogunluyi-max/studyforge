"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import { useToast } from "~/app/_components/toast";
import { SkeletonList } from "~/app/_components/skeleton";

type BattleQuestion = {
  id?: string;
  orderIndex?: number;
  question: string;
  options?: string[];
};

type BattleData = {
  id: string;
  code: string;
  status: string;
  mode?: string;
  subject?: string | null;
  hostScore: number;
  opponentScore: number;
  questionCount: number;
  questions: BattleQuestion[];
  battleQuestions?: BattleQuestion[];
  host?: { id: string; name: string | null };
  opponent?: { id: string; name: string | null } | null;
  participants: Array<{ userId: string; score: number; totalAnswered: number }>;
  result?: { winnerId: string | null } | null;
};

type StatusResponse = {
  battle?: BattleData;
  currentUserId?: string;
};

type SubmitResponse = {
  correct?: boolean;
  completed?: boolean;
  error?: string;
  streak?: number;
  streakMultiplier?: number;
  scoreIncrease?: number;
};

export default function BattleRoomPage() {
  const params = useParams<{ battleId: string }>();
  const router = useRouter();
  const battleId = params?.battleId;

  const [battle, setBattle] = useState<BattleData | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [timer, setTimer] = useState(15);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  const [doubleActive, setDoubleActive] = useState(false);
  const [frozenUsed, setFrozenUsed] = useState(false);
  const [skipUsed, setSkipUsed] = useState(false);
  const [swapUsed, setSwapUsed] = useState(false);
  const [hiddenOption, setHiddenOption] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: number; emoji: string; left: number }>>([]);
  const [scorePop, setScorePop] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<"correct" | "wrong" | "">("");
  const [levelFlash, setLevelFlash] = useState(false);
  const previousMultiplierRef = useRef(1);
  const { showToast } = useToast();

  const normalizedQuestions = useMemo(() => {
    if (!battle) return [] as BattleQuestion[];
    const fromRelation = Array.isArray(battle.battleQuestions) ? battle.battleQuestions : [];
    if (fromRelation.length) return fromRelation;
    return Array.isArray(battle.questions) ? battle.questions : [];
  }, [battle]);

  const myParticipant = useMemo(
    () => battle?.participants.find((participant) => participant.userId === currentUserId),
    [battle, currentUserId],
  );

  const opponentParticipant = useMemo(
    () => battle?.participants.find((participant) => participant.userId !== currentUserId),
    [battle, currentUserId],
  );

  useEffect(() => {
    if (!battleId) return;

    const fetchStatus = async () => {
      const response = await fetch(`/api/battle/${battleId}/status`);
      const data = (await response.json()) as StatusResponse;
      if (data.battle) {
        setBattle(data.battle);
        setCurrentUserId(data.currentUserId ?? "");
      }
      setIsLoading(false);
    };

    void fetchStatus();
    const poll = setInterval(() => void fetchStatus(), 2000);
    return () => clearInterval(poll);
  }, [battleId]);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    if (timer <= 0 || isSubmitting) return;

    const tick = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(tick);
  }, [battle, timer, isSubmitting]);

  useEffect(() => {
    if (battle?.status !== "active") return;
    if (timer > 0 || isSubmitting) return;
    void submitAnswer("");
  }, [timer, battle?.status, isSubmitting]);

  useEffect(() => {
    if (!battle) return;
    const answered = myParticipant?.totalAnswered ?? 0;
    if (answered > currentIndex) {
      setCurrentIndex(answered);
    }
  }, [myParticipant?.totalAnswered, battle]);

  useEffect(() => {
    setTimer(15);
    setQuestionStartedAt(Date.now());
    setSelectedAnswer("");
    setHiddenOption("");
    setDoubleActive(false);
    setAiThinking(false);
  }, [currentIndex]);

  useEffect(() => {
    if (streakMultiplier > previousMultiplierRef.current && streakMultiplier >= 2) {
      setLevelFlash(true);
      window.setTimeout(() => setLevelFlash(false), 260);
    }
    previousMultiplierRef.current = streakMultiplier;
  }, [streakMultiplier]);

  const currentQuestion = useMemo(() => {
    return normalizedQuestions[currentIndex] ?? null;
  }, [normalizedQuestions, currentIndex]);

  const sendReaction = (emoji: string) => {
    setReactions((prev) => [
      ...prev,
      { id: Date.now(), emoji, left: 20 + Math.floor(Math.random() * 60) },
    ]);
    setTimeout(() => {
      setReactions((prev) => prev.slice(-5));
    }, 1200);
  };

  const submitAnswer = async (forcedAnswer?: string) => {
    if (!battleId || !battle || battle.status !== "active" || isSubmitting) return;
    const answerToSend = forcedAnswer ?? selectedAnswer;
    if (forcedAnswer === undefined && !answerToSend) return;

    const elapsedSeconds = Math.max(0, Math.min(15, Math.round((Date.now() - questionStartedAt) / 1000)));
    const powerUp = forcedAnswer === "__skip__" ? "skip" : doubleActive ? "double" : null;

    setIsSubmitting(true);
    if (battle.mode === "ai") {
      setAiThinking(true);
    }

    const response = await fetch(`/api/battle/${battleId}/submit-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex: currentIndex, answer: answerToSend, elapsedSeconds, powerUp }),
    });

    const data = (await response.json()) as SubmitResponse;
    setIsSubmitting(false);
    setAiThinking(false);

    if (!response.ok) {
      const message = data.error ?? "Failed to submit answer";
      setResultMsg(message);
      showToast(message, "error");
      return;
    }

    setStreak(data.streak ?? 0);
    setStreakMultiplier(data.streakMultiplier ?? 1);
    setScorePop(data.scoreIncrease ?? 0);
    if ((data.scoreIncrease ?? 0) > 0) {
      window.setTimeout(() => setScorePop(0), 600);
    }
    setAnswerFeedback(data.correct ? "correct" : "wrong");
    window.setTimeout(() => setAnswerFeedback(""), 420);
    setResultMsg(data.correct ? `Correct! +${data.scoreIncrease ?? 0}` : "Incorrect");

    if (data.completed) {
      const statusResponse = await fetch(`/api/battle/${battleId}/status`);
      const statusData = (await statusResponse.json()) as StatusResponse;
      if (statusData.battle) setBattle(statusData.battle);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const usePowerup = (power: "double" | "freeze" | "skip" | "swap") => {
    if (!currentQuestion || isSubmitting) return;
    if (power === "double") {
      setDoubleActive(true);
      return;
    }

    if (power === "freeze" && !frozenUsed) {
      setTimer((prev) => Math.min(15, prev + 5));
      setFrozenUsed(true);
      return;
    }

    if (power === "swap" && !swapUsed) {
      const options = (currentQuestion.options ?? []).filter((option) => option !== selectedAnswer);
      if (options.length > 2) {
        setHiddenOption(options[0] ?? "");
      }
      setSwapUsed(true);
      return;
    }

    if (power === "skip" && !skipUsed) {
      setSkipUsed(true);
      void submitAnswer("__skip__");
    }
  };

  if (isLoading || !battle) {
    return (
      <main className="app-premium-dark min-h-screen bg-gray-950 p-6">
        <SkeletonList count={2} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      {levelFlash && <div className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-white/50" />}
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Battle Room: {battle.code}</h1>
              <p className="text-sm text-gray-600">{battle.mode ?? "pvp"} • {battle.subject ?? "Mixed"} • {battle.status}</p>
            </div>
            <div className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 ${timer <= 5 ? "animate-pulse border-red-300 bg-red-50 text-red-700" : ""}`}>
              Timer: {timer}s
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">You: {myParticipant?.score ?? 0}{scorePop > 0 && <span className="ml-2 inline-block animate-bounce font-bold text-green-600">+{scorePop}</span>}</div>
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Opponent: {opponentParticipant?.score ?? 0}</div>
            <div className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-800">Streak: {streak}x</div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Multiplier: {streakMultiplier}x</div>
          </div>

          <div className="mt-3 flex gap-2">
            {["🔥", "⚡", "😎", "🎯", "👏"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-100"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="pointer-events-none relative mt-2 h-6">
            {reactions.map((reaction) => (
              <span key={reaction.id} className="absolute animate-bounce text-lg" style={{ left: `${reaction.left}%` }}>
                {reaction.emoji}
              </span>
            ))}
          </div>
        </div>

        {battle.status === "waiting" ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">Waiting for opponent...</p>
            <p className="mt-2 text-sm text-gray-600">Share code: {battle.code}</p>
          </div>
        ) : battle.status === "completed" ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">Battle Complete</p>
            <p className="mt-2 text-sm text-gray-600">Final score: {battle.hostScore} - {battle.opponentScore}</p>
            <Button
              onClick={() => router.push("/battle")}
              className="mt-4"
              size="sm"
            >
              Back to Arena
            </Button>
          </div>
        ) : currentQuestion ? (
          <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${answerFeedback === "correct" ? "ring-2 ring-green-400" : answerFeedback === "wrong" ? "animate-[shake_0.3s_ease-in-out] ring-2 ring-red-400" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Question {currentIndex + 1} of {battle.questionCount}</p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">{currentQuestion.question}</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant={doubleActive ? "primary" : "secondary"} onClick={() => usePowerup("double")}>Double</Button>
              <Button size="sm" variant="secondary" disabled={frozenUsed} onClick={() => usePowerup("freeze")}>Freeze</Button>
              <Button size="sm" variant="secondary" disabled={swapUsed} onClick={() => usePowerup("swap")}>Swap</Button>
              <Button size="sm" variant="secondary" disabled={skipUsed} onClick={() => usePowerup("skip")}>Skip</Button>
            </div>

            <div className="mt-4 space-y-2">
              {(currentQuestion.options ?? []).map((option) => (
                hiddenOption === option ? null : (
                <Button
                  key={option}
                  onClick={() => setSelectedAnswer(option)}
                  variant="secondary"
                  fullWidth
                  size="sm"
                  className={`justify-start px-4 py-2 text-left text-sm ${
                    selectedAnswer === option
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option}
                </Button>
                )
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => void submitAnswer()}
                disabled={!selectedAnswer || isSubmitting}
                size="sm"
                loading={isSubmitting}
                fullWidth
              >
                Submit
              </Button>
              <Button
                onClick={() => usePowerup("skip")}
                variant="secondary"
                size="sm"
                disabled={skipUsed || isSubmitting}
                fullWidth
              >
                Skip via Powerup
              </Button>
            </div>

            {resultMsg && <p className={`mt-3 text-sm ${answerFeedback === "correct" ? "text-green-700" : answerFeedback === "wrong" ? "text-red-700" : "text-gray-700"}`}>{resultMsg}</p>}
            {aiThinking && <p className="mt-2 animate-pulse text-xs font-semibold text-blue-700">AI is thinking...</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No question available.
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </main>
  );
}
