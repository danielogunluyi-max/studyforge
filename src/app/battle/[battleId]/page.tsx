"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";

type BattleQuestion = {
  question: string;
  options?: string[];
  correctAnswer: string;
};

type BattleData = {
  id: string;
  code: string;
  status: string;
  hostScore: number;
  opponentScore: number;
  questionCount: number;
  questions: BattleQuestion[];
  participants: Array<{ userId: string; score: number; totalAnswered: number }>;
  result?: { winnerId: string | null } | null;
};

export default function BattleRoomPage() {
  const params = useParams<{ battleId: string }>();
  const router = useRouter();
  const battleId = params?.battleId;

  const [battle, setBattle] = useState<BattleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [timer, setTimer] = useState(20);

  useEffect(() => {
    if (!battleId) return;

    const fetchStatus = async () => {
      const response = await fetch(`/api/battle/${battleId}/status`);
      const data = (await response.json()) as { battle?: BattleData };
      if (data.battle) {
        setBattle(data.battle);
      }
      setIsLoading(false);
    };

    void fetchStatus();
    const poll = setInterval(() => void fetchStatus(), 2000);
    return () => clearInterval(poll);
  }, [battleId]);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    if (timer <= 0) return;

    const tick = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(tick);
  }, [battle, timer]);

  useEffect(() => {
    setTimer(20);
  }, [currentIndex]);

  const currentQuestion = useMemo(() => {
    if (!battle) return null;
    return (battle.questions ?? [])[currentIndex] ?? null;
  }, [battle, currentIndex]);

  const submitAnswer = async () => {
    if (!battleId || !selectedAnswer) return;

    const response = await fetch(`/api/battle/${battleId}/submit-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex: currentIndex, answer: selectedAnswer }),
    });

    const data = (await response.json()) as { correct?: boolean; completed?: boolean; error?: string };

    if (!response.ok) {
      setResultMsg(data.error ?? "Failed to submit answer");
      return;
    }

    setResultMsg(data.correct ? "Correct!" : "Incorrect");
    setSelectedAnswer("");

    if (data.completed) {
      const statusResponse = await fetch(`/api/battle/${battleId}/status`);
      const statusData = (await statusResponse.json()) as { battle?: BattleData };
      if (statusData.battle) setBattle(statusData.battle);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  if (isLoading || !battle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-600">Loading battle room...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Battle Room: {battle.code}</h1>
              <p className="text-sm text-gray-600">Status: {battle.status}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Timer: {timer}s
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">Host score: {battle.hostScore}</div>
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Opponent score: {battle.opponentScore}</div>
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
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Question {currentIndex + 1} of {battle.questionCount}</p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">{currentQuestion.question}</h2>

            <div className="mt-4 space-y-2">
              {(currentQuestion.options ?? []).map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedAnswer(option)}
                  className={`w-full rounded-lg border px-4 py-2 text-left text-sm transition ${
                    selectedAnswer === option
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => void submitAnswer()}
                disabled={!selectedAnswer}
                size="sm"
              >
                Submit
              </Button>
              <Button
                onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, battle.questionCount - 1))}
                variant="secondary"
                size="sm"
              >
                Skip
              </Button>
            </div>

            {resultMsg && <p className="mt-3 text-sm text-gray-700">{resultMsg}</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No question available.
          </div>
        )}
      </div>
    </main>
  );
}
