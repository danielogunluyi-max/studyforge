"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Target,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Pencil,
  Eraser,
  Zap,
} from "lucide-react";
import { useToast } from "~/app/_components/toast";

type Question = {
  id: string;
  type: "multiple_choice" | "short_answer";
  prompt: string;
  options: string[];
  unit: string | null;
  points: number;
};

type ExamPayload = {
  id: string;
  title: string;
  subject: string;
  curriculumCode: string | null;
  instructions: string | null;
  timeLimit: number; // minutes
  createdAt: string;
  questions: Question[];
};

type PerQ = {
  questionId: string;
  type: string;
  unit: string | null;
  prompt: string;
  points: number;
  earned: number;
  isCorrect: boolean;
  yourIndex?: number | null;
  yourOption?: string | null;
  correctIndex?: number | null;
  correctOption?: string | null;
  yourText?: string | null;
  modelAnswer?: string | null;
  rubric?: string | null;
  feedback?: string | null;
};

type Breakdown = {
  perQuestion: PerQ[];
  unitFocus: Array<{ unit: string; earned: number; total: number; percent: number }>;
  strengths: string[];
  weaknesses: string[];
  gotRight: number;
  missed: number;
};

type ResultPayload = {
  attemptId: string;
  scorePercent: number;
  earnedPoints: number;
  totalPoints: number;
  timeTakenSec: number;
  breakdown: Breakdown;
};

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MockExamRunnerPage() {
  const params = useParams<{ id: string }>();
  const examId = params?.id ?? "";
  const router = useRouter();
  const { showToast } = useToast();

  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { mcIndex?: number; text?: string }>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [reviewIdx, setReviewIdx] = useState(0);
  const startTimeRef = useRef<number>(0);

  // ── scratchpad state (per-question, ephemeral) ──
  const [scratchActive, setScratchActive] = useState(false);
  const [scratchPaths, setScratchPaths] = useState<Array<Array<[number, number]>>>([]);
  const drawingRef = useRef(false);

  // ---- fetch exam ----
  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/mock-exam/${examId}/attempt`);
        const data = (await res.json().catch(() => ({}))) as { exam?: ExamPayload; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.exam) {
          setError(data.error ?? "Could not load exam.");
        } else {
          setExam(data.exam);
          setSecondsLeft((data.exam.timeLimit ?? 45) * 60);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  // ---- reset scratchpad when question changes ----
  useEffect(() => {
    setScratchPaths([]);
    setScratchActive(false);
  }, [currentIdx]);

  // ---- countdown ----
  useEffect(() => {
    if (!started || result) return;
    if (secondsLeft <= 0) {
      void handleSubmit(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, secondsLeft, result]);

  // ---- helpers ----
  const totalQuestions = exam?.questions.length ?? 0;
  const answeredCount = useMemo(() => {
    if (!exam) return 0;
    return exam.questions.reduce((acc, q) => {
      const a = answers[q.id];
      if (!a) return acc;
      if (q.type === "multiple_choice") return a.mcIndex !== undefined ? acc + 1 : acc;
      return a.text && a.text.trim().length > 0 ? acc + 1 : acc;
    }, 0);
  }, [exam, answers]);

  const startExam = () => {
    setStarted(true);
    startTimeRef.current = Date.now();
  };

  const setMc = (qid: string, idx: number) =>
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], mcIndex: idx } }));
  const setText = (qid: string, text: string) =>
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], text } }));

  const handleSubmit = async (timedOut = false) => {
    if (!exam || submitting) return;
    setSubmitting(true);
    const timeTakenSec = Math.max(
      1,
      Math.round((Date.now() - startTimeRef.current) / 1000),
    );
    try {
      const payload = {
        timeTakenSec,
        answers: exam.questions.map((q) => ({
          questionId: q.id,
          mcIndex: answers[q.id]?.mcIndex,
          text: answers[q.id]?.text ?? null,
        })),
      };
      const res = await fetch(`/api/mock-exam/${exam.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ResultPayload & { error?: string };
      if (!res.ok || !data.attemptId) {
        showToast(data.error ?? "Submission failed", "error");
        setSubmitting(false);
        return;
      }
      if (timedOut) showToast("Time's up — auto-submitted.", "info");
      setResult(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Network error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- error / loading states ----
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e1f] text-white">
        <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-[#0a0e1f] p-8 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
          <div className="mb-2 flex items-center gap-2 text-red-200">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="font-bold">Could not load exam</h1>
          </div>
          <p className="text-sm text-red-200/80">{error ?? "Unknown error"}</p>
          <button
            onClick={() => router.push("/my-notes")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Notes
          </button>
        </div>
      </div>
    );
  }

  // =================== RESULT VIEW ===================
  if (result) {
    const pct = result.scorePercent;
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";
    const gradeColor =
      pct >= 80 ? "text-emerald-300" : pct >= 60 ? "text-amber-300" : "text-red-300";

    const reviewQ = result.breakdown.perQuestion[reviewIdx];

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.push("/my-notes")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Notes
          </button>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
                  <Trophy className="h-4 w-4 text-amber-300" /> Result
                </div>
                <h1 className="text-2xl font-extrabold">{exam.title}</h1>
                <p className="text-sm text-white/55">
                  {result.earnedPoints} / {result.totalPoints} points · {formatTime(result.timeTakenSec)} used
                </p>
              </div>
              <div className="text-right">
                <div className={`text-6xl font-black tracking-tight ${gradeColor}`}>{Math.round(pct)}%</div>
                <div className={`text-2xl font-bold ${gradeColor}`}>{grade}</div>
              </div>
            </div>

            {/* score bar */}
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  pct >= 80
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-300"
                    : pct >= 60
                      ? "bg-gradient-to-r from-amber-400 to-amber-300"
                      : "bg-gradient-to-r from-red-400 to-red-300"
                }`}
              />
            </div>
          </motion.div>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-300/80">
                <CheckCircle2 className="h-4 w-4" /> What you got right
              </div>
              <div className="text-3xl font-extrabold text-emerald-200">{result.breakdown.gotRight}</div>
              <div className="text-xs text-emerald-200/70">questions correct</div>
            </div>
            <div className="rounded-2xl border border-red-400/20 bg-red-500/5 p-5">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-red-300/80">
                <XCircle className="h-4 w-4" /> What you missed
              </div>
              <div className="text-3xl font-extrabold text-red-200">{result.breakdown.missed}</div>
              <div className="text-xs text-red-200/70">questions to review</div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-300/80">
                <Target className="h-4 w-4" /> Time used
              </div>
              <div className="text-3xl font-extrabold text-amber-200">{formatTime(result.timeTakenSec)}</div>
              <div className="text-xs text-amber-200/70">of {exam.timeLimit}:00 allowed</div>
            </div>
          </div>

          {/* Unit focus */}
          {result.breakdown.unitFocus.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-300" />
                <h2 className="text-lg font-bold">Unit focus areas</h2>
              </div>
              <div className="space-y-3">
                {result.breakdown.unitFocus.map((u) => (
                  <div key={u.unit}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{u.unit}</span>
                      <span className="text-white/60">
                        {u.earned}/{u.total} · {u.percent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full ${
                          u.percent >= 80
                            ? "bg-emerald-400"
                            : u.percent >= 60
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                        style={{ width: `${Math.max(4, u.percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {result.breakdown.weaknesses.length > 0 && (
                <p className="mt-4 text-sm text-red-200/80">
                  <strong className="text-red-200">Focus on:</strong>{" "}
                  {result.breakdown.weaknesses.join(", ")}
                </p>
              )}
              {result.breakdown.strengths.length > 0 && (
                <p className="mt-1 text-sm text-emerald-200/80">
                  <strong className="text-emerald-200">Strong areas:</strong>{" "}
                  {result.breakdown.strengths.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Per-question review */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Question-by-question review</h2>
              <span className="text-xs text-white/50">
                {reviewIdx + 1} / {result.breakdown.perQuestion.length}
              </span>
            </div>

            {/* nav dots */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {result.breakdown.perQuestion.map((q, i) => (
                <button
                  key={q.questionId}
                  onClick={() => setReviewIdx(i)}
                  aria-label={`Review question ${i + 1}`}
                  className={`h-7 w-7 rounded-md text-xs font-semibold transition ${
                    i === reviewIdx
                      ? "bg-white text-black"
                      : q.isCorrect
                        ? "bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40"
                        : q.earned > 0
                          ? "bg-amber-500/30 text-amber-200 hover:bg-amber-500/40"
                          : "bg-red-500/30 text-red-200 hover:bg-red-500/40"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {reviewQ && (
              <div className="rounded-xl bg-black/30 p-5 ring-1 ring-white/10">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 uppercase tracking-wider text-white/60">
                    {reviewQ.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}
                  </span>
                  {reviewQ.unit && (
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-white/50">{reviewQ.unit}</span>
                  )}
                  <span
                    className={`ml-auto rounded-md px-2 py-0.5 font-semibold ${
                      reviewQ.isCorrect
                        ? "bg-emerald-500/20 text-emerald-200"
                        : reviewQ.earned > 0
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-red-500/20 text-red-200"
                    }`}
                  >
                    {reviewQ.earned} / {reviewQ.points} pts
                  </span>
                </div>
                <p className="mb-3 text-base font-medium">{reviewQ.prompt}</p>

                {reviewQ.type === "multiple_choice" ? (
                  <div className="space-y-2 text-sm">
                    <div
                      className={`rounded-lg border px-3 py-2 ${
                        reviewQ.isCorrect
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : "border-red-400/40 bg-red-500/10 text-red-100"
                      }`}
                    >
                      <span className="text-xs uppercase tracking-wider opacity-70">Your answer</span>
                      <div className="mt-1">{reviewQ.yourOption ?? <em className="opacity-60">No answer</em>}</div>
                    </div>
                    {!reviewQ.isCorrect && (
                      <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                        <span className="text-xs uppercase tracking-wider opacity-70">Correct answer</span>
                        <div className="mt-1">{reviewQ.correctOption}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <span className="text-xs uppercase tracking-wider text-white/50">Your answer</span>
                      <p className="mt-1 whitespace-pre-wrap text-white/85">
                        {reviewQ.yourText || <em className="text-white/40">Left blank</em>}
                      </p>
                    </div>
                    {reviewQ.feedback && (
                      <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                        <span className="text-xs uppercase tracking-wider text-amber-200/80">Nova's feedback</span>
                        <p className="mt-1 text-amber-100">{reviewQ.feedback}</p>
                      </div>
                    )}
                    {reviewQ.modelAnswer && (
                      <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3">
                        <span className="text-xs uppercase tracking-wider text-emerald-200/80">Model answer</span>
                        <p className="mt-1 whitespace-pre-wrap text-emerald-100">{reviewQ.modelAnswer}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setReviewIdx((i) => Math.max(0, i - 1))}
                    disabled={reviewIdx === 0}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <button
                    onClick={() =>
                      setReviewIdx((i) => Math.min(result.breakdown.perQuestion.length - 1, i + 1))
                    }
                    disabled={reviewIdx === result.breakdown.perQuestion.length - 1}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-30"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-3 text-sm text-white/80 hover:bg-white/10"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-semibold text-black hover:brightness-110"
            >
              <RotateCcw className="h-4 w-4" /> Retake exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =================== START SCREEN ===================
  if (!started) {
    const totalPts = exam.questions.reduce((s, q) => s + q.points, 0);
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-black p-6 text-white antialiased">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(700px 500px at 50% -10%, rgba(20,184,166,0.06), transparent 60%)," +
              "radial-gradient(700px 500px at 50% 110%, rgba(59,130,246,0.05), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-2xl pt-6">
          <button
            onClick={() => router.push("/mock-exam")}
            className="mb-6 inline-flex items-center gap-2 text-[12px] text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Mock Exam Lab
          </button>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
            style={{ willChange: "transform" }}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                boxShadow:
                  "inset 0 0 0 1px rgba(45,212,191,0.18), 0 0 40px -16px rgba(45,212,191,0.35)",
              }}
              animate={{ opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-400">
                <Trophy size={11} strokeWidth={1.7} className="text-amber-300/80" />
                Briefing
              </span>
              <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-white">
                {exam.title}
              </h1>
              <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                {exam.subject}
                {exam.curriculumCode ? ` · ${exam.curriculumCode}` : ""}
              </p>

              {exam.instructions && (
                <p className="mt-5 rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-[12.5px] leading-relaxed text-zinc-300">
                  {exam.instructions}
                </p>
              )}

              <div className="mt-6 grid grid-cols-3 gap-3">
                <BriefingStat label="Questions" value={totalQuestions.toString()} />
                <BriefingStat label="Minutes" value={exam.timeLimit.toString()} />
                <BriefingStat label="Points" value={totalPts.toString()} />
              </div>

              <ul className="mt-6 space-y-1.5 text-[12px] leading-relaxed text-zinc-400">
                <li>· Single-question view — laser focus.</li>
                <li>· Floating timer auto-submits at 0:00.</li>
                <li>· Toggle the scratchpad to sketch over any question.</li>
              </ul>

              <motion.button
                onClick={startExam}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 450, damping: 26 }}
                className="group relative mt-7 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-4 text-[14px] font-bold text-cyan-50"
                style={{
                  willChange: "transform",
                  background:
                    "linear-gradient(135deg, #061f26 0%, #0e3640 35%, #14b8a6 75%, #3b82f6 100%)",
                }}
              >
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(45,212,191,0.4) inset, 0 0 32px -6px rgba(45,212,191,0.55), 0 0 60px -10px rgba(59,130,246,0.5)",
                  }}
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl opacity-50"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
                  }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  <Zap size={16} strokeWidth={2} />
                  Engage Simulation
                </span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  // =================== EXAM RUNNER ===================
  const q = exam.questions[currentIdx]!;
  const isLast = currentIdx === totalQuestions - 1;
  const totalSeconds = (exam.timeLimit ?? 45) * 60;
  const remainPct = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  // Color shift: emerald (>50%) → amber (>20%) → rose
  const timerTone =
    remainPct > 0.5 ? "emerald" : remainPct > 0.2 ? "amber" : "rose";
  const timerColors = {
    emerald: { text: "rgb(52,211,153)", ring: "rgba(52,211,153,0.45)", glow: "rgba(52,211,153,0.35)" },
    amber: { text: "rgb(251,191,36)", ring: "rgba(251,191,36,0.5)", glow: "rgba(251,191,36,0.4)" },
    rose: { text: "rgb(251,113,133)", ring: "rgba(251,113,133,0.55)", glow: "rgba(251,113,133,0.5)" },
  }[timerTone];

  // Scratchpad pointer handlers
  const onScratchDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!scratchActive) return;
    drawingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    setScratchPaths((prev) => [
      ...prev,
      [[e.clientX - rect.left, e.clientY - rect.top]],
    ]);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onScratchMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!scratchActive || !drawingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setScratchPaths((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const last = prev[prev.length - 1] ?? [];
      next.push([...last, [x, y]]);
      return next;
    });
  };
  const onScratchUp = () => {
    drawingRef.current = false;
  };
  const clearScratch = () => setScratchPaths([]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
      {/* Faint ambient field */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 500px at 50% -10%, rgba(20,184,166,0.05), transparent 60%)," +
            "radial-gradient(700px 500px at 50% 110%, rgba(59,130,246,0.04), transparent 60%)",
        }}
      />

      {/* Floating digital countdown timer (top-right) */}
      <motion.div
        aria-live="polite"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed right-4 top-4 z-30 sm:right-6 sm:top-6"
        style={{ willChange: "transform" }}
      >
        <motion.div
          animate={{
            color: timerColors.text,
            boxShadow: `0 0 0 1px ${timerColors.ring} inset, 0 0 24px -6px ${timerColors.glow}`,
          }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-black/60 px-4 py-2.5 backdrop-blur-xl"
        >
          <Clock size={14} strokeWidth={1.7} />
          <span className="font-mono text-[18px] font-bold tabular-nums tracking-tight">
            {formatTime(secondsLeft)}
          </span>
        </motion.div>
      </motion.div>

      {/* Top exam meta strip */}
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-600">
              {exam.subject}
              {exam.curriculumCode ? ` · ${exam.curriculumCode}` : ""}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-bold text-white">{exam.title}</p>
          </div>
        </div>

        {/* progress hairline */}
        <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.04]">
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "linear-gradient(90deg, rgba(20,184,166,0.85), rgba(59,130,246,0.85))",
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
          <span>
            Question <span className="font-bold text-white">{currentIdx + 1}</span> / {totalQuestions}
          </span>
          <span>
            Answered <span className="font-bold text-white">{answeredCount}</span> / {totalQuestions}
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-white/5 p-8 backdrop-blur-xl"
            style={{ willChange: "transform" }}
          >
            {/* Header chips + scratchpad toggle */}
            <div className="relative z-10 mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {q.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}
              </span>
              {q.unit && (
                <span className="rounded-md bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">
                  {q.unit}
                </span>
              )}
              <span className="text-[10px] text-zinc-600">
                · {q.points} {q.points === 1 ? "pt" : "pts"}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                {scratchActive && scratchPaths.length > 0 && (
                  <button
                    type="button"
                    onClick={clearScratch}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <Eraser size={10} strokeWidth={1.7} />
                    Clear
                  </button>
                )}
                <motion.button
                  type="button"
                  onClick={() => setScratchActive((v) => !v)}
                  whileTap={{ scale: 0.94 }}
                  animate={{
                    backgroundColor: scratchActive
                      ? "rgba(34,211,238,0.12)"
                      : "rgba(255,255,255,0.03)",
                    borderColor: scratchActive
                      ? "rgba(34,211,238,0.4)"
                      : "rgba(255,255,255,0.1)",
                    color: scratchActive ? "rgb(165,243,252)" : "rgb(161,161,170)",
                  }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                  aria-pressed={scratchActive}
                  aria-label="Toggle floating scratchpad"
                >
                  <Pencil size={10} strokeWidth={1.7} />
                  Scratchpad
                </motion.button>
              </div>
            </div>

            {/* Question prompt */}
            <h2 className="relative z-10 mb-6 text-[17px] font-semibold leading-relaxed text-white">
              {q.prompt}
            </h2>

            {/* Question body (MC or SA) */}
            <div className="relative z-10">
              {q.type === "multiple_choice" ? (
                <div className="space-y-2.5">
                  {q.options.map((opt, i) => (
                    <McOption
                      key={i}
                      letter={String.fromCharCode(65 + i)}
                      text={opt}
                      selected={answers[q.id]?.mcIndex === i}
                      onSelect={() => setMc(q.id, i)}
                    />
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id]?.text ?? ""}
                  onChange={(e) => setText(q.id, e.target.value)}
                  rows={6}
                  placeholder="Type your answer here…"
                  className="w-full rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-[13.5px] leading-relaxed text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-cyan-300/40 focus:bg-black/40"
                  aria-label="Short answer response"
                />
              )}
            </div>

            {/* Scratchpad SVG overlay — sits on top of question content */}
            <ScratchpadOverlay
              active={scratchActive}
              paths={scratchPaths}
              onPointerDown={onScratchDown}
              onPointerMove={onScratchMove}
              onPointerUp={onScratchUp}
              onPointerLeave={onScratchUp}
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav controls */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[12.5px] font-semibold text-zinc-300 transition-colors hover:border-white/15 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={14} strokeWidth={1.7} />
            Prev
          </button>

          {!isLast ? (
            <button
              onClick={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-white/[0.08]"
            >
              Next
              <ChevronRight size={14} strokeWidth={1.7} />
            </button>
          ) : (
            <SubmitButton
              loading={submitting}
              onClick={() => void handleSubmit(false)}
              variant="primary"
            />
          )}
        </div>

        {/* Question dots */}
        <div className="mt-6 flex flex-wrap gap-1.5">
          {exam.questions.map((qq, i) => {
            const a = answers[qq.id];
            const answered =
              qq.type === "multiple_choice"
                ? a?.mcIndex !== undefined
                : !!(a?.text && a.text.trim().length > 0);
            return (
              <button
                key={qq.id}
                onClick={() => setCurrentIdx(i)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={i === currentIdx ? "true" : undefined}
                className={`h-7 w-7 rounded-md text-[11px] font-bold transition-colors ${
                  i === currentIdx
                    ? "bg-white text-black"
                    : answered
                      ? "bg-emerald-400/[0.18] text-emerald-200 hover:bg-emerald-400/[0.28]"
                      : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Submit early */}
        {!isLast && (
          <div className="mt-8 flex justify-center">
            <SubmitButton
              loading={submitting}
              onClick={() => void handleSubmit(false)}
              variant="ghost"
            />
          </div>
        )}
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  BriefingStat — start-screen number block                   */
/* ─────────────────────────────────────────────────────────── */

function BriefingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center backdrop-blur-xl">
      <div className="text-[24px] font-bold leading-none tabular-nums text-white">{value}</div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  McOption — translucent dynamic-border option card          */
/* ─────────────────────────────────────────────────────────── */

function McOption({
  letter,
  text,
  selected,
  onSelect,
}: {
  letter: string;
  text: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={false}
      animate={{
        backgroundColor: selected ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.025)",
        borderColor: selected ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.1)",
        boxShadow: selected
          ? "0 0 0 1px rgba(34,211,238,0.25) inset, 0 0 24px -8px rgba(34,211,238,0.45)"
          : "0 0 0 1px rgba(255,255,255,0) inset",
      }}
      whileHover={{
        backgroundColor: selected ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.045)",
        borderColor: selected ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.18)",
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
      className="group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
      style={{ willChange: "transform" }}
      aria-pressed={selected}
    >
      <motion.span
        animate={{
          backgroundColor: selected ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.04)",
          borderColor: selected ? "rgba(34,211,238,0.55)" : "rgba(255,255,255,0.18)",
          color: selected ? "rgb(165,243,252)" : "rgb(161,161,170)",
        }}
        transition={{ duration: 0.18 }}
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-[12px] font-bold"
      >
        {letter}
      </motion.span>
      <motion.span
        animate={{ color: selected ? "rgb(255,255,255)" : "rgb(212,212,216)" }}
        transition={{ duration: 0.18 }}
        className="text-[13.5px] leading-relaxed"
      >
        {text}
      </motion.span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  ScratchpadOverlay — SVG canvas across the question card    */
/* ─────────────────────────────────────────────────────────── */

function ScratchpadOverlay({
  active,
  paths,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
}: {
  active: boolean;
  paths: Array<Array<[number, number]>>;
  onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerLeave: (e: ReactPointerEvent<SVGSVGElement>) => void;
}) {
  return (
    <>
      {/* Hint banner when active and empty */}
      <AnimatePresence>
        {active && paths.length === 0 && (
          <motion.div
            key="scratch-hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-cyan-300/30 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md"
          >
            Sketch over the question · drag to draw
          </motion.div>
        )}
      </AnimatePresence>

      <svg
        aria-hidden={!active}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        className="absolute inset-0 z-20"
        style={{
          pointerEvents: active ? "auto" : "none",
          touchAction: "none",
          cursor: active ? "crosshair" : "default",
          willChange: "transform",
        }}
      >
        {paths.map((pts, i) => {
          if (pts.length < 1) return null;
          const d = pts
            .map((p, idx) => `${idx === 0 ? "M" : "L"}${p[0]} ${p[1]}`)
            .join(" ");
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(56,189,248,0.85)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: "drop-shadow(0 0 4px rgba(56,189,248,0.6))",
              }}
            />
          );
        })}
      </svg>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  SubmitButton — primary teal-blue ignition / ghost variants */
/* ─────────────────────────────────────────────────────────── */

function SubmitButton({
  onClick,
  loading,
  variant,
}: {
  onClick: () => void;
  loading: boolean;
  variant: "primary" | "ghost";
}) {
  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={11} className="animate-spin" strokeWidth={1.7} />
        ) : (
          <Send size={11} strokeWidth={1.7} />
        )}
        {loading ? "Grading…" : "Submit early"}
      </button>
    );
  }
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={!loading ? { scale: 1.02 } : undefined}
      whileTap={!loading ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
      className="relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-6 py-2.5 text-[12.5px] font-bold text-cyan-50 disabled:cursor-not-allowed"
      style={{
        willChange: "transform",
        background:
          "linear-gradient(135deg, #061f26 0%, #0e3640 35%, #14b8a6 75%, #3b82f6 100%)",
      }}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          boxShadow:
            "0 0 0 1px rgba(45,212,191,0.4) inset, 0 0 24px -8px rgba(45,212,191,0.55), 0 0 40px -10px rgba(59,130,246,0.5)",
        }}
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative z-10 inline-flex items-center gap-2">
        {loading ? (
          <Loader2 size={14} className="animate-spin" strokeWidth={2} />
        ) : (
          <Send size={14} strokeWidth={2} />
        )}
        {loading ? "Grading…" : "Submit Exam"}
      </span>
    </motion.button>
  );
}
