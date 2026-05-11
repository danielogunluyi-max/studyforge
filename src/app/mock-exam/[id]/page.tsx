"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] p-6 text-white">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.push("/my-notes")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Notes
          </button>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-300/80">
              <Trophy className="h-4 w-4" /> Mock Exam
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{exam.title}</h1>
            <p className="mt-1 text-sm text-white/60">
              {exam.subject}
              {exam.curriculumCode ? ` · ${exam.curriculumCode}` : ""}
            </p>

            {exam.instructions && (
              <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                {exam.instructions}
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-2xl font-bold">{totalQuestions}</div>
                <div className="text-xs uppercase tracking-wider text-white/55">Questions</div>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-2xl font-bold">{exam.timeLimit}</div>
                <div className="text-xs uppercase tracking-wider text-white/55">Minutes</div>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-2xl font-bold">
                  {exam.questions.reduce((s, q) => s + q.points, 0)}
                </div>
                <div className="text-xs uppercase tracking-wider text-white/55">Points</div>
              </div>
            </div>

            <ul className="mt-6 space-y-1.5 text-sm text-white/70">
              <li>• Single-question view — focus on one at a time.</li>
              <li>• Sticky timer counts down; the exam auto-submits at 0:00.</li>
              <li>• Nova grades multiple choice instantly and short-answer with rubric-based feedback.</li>
            </ul>

            <button
              onClick={startExam}
              className="mt-7 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 py-4 text-base font-extrabold text-black shadow-[0_10px_30px_rgba(251,191,36,0.35)] transition hover:brightness-110 active:scale-[0.99]"
            >
              Start Exam
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // =================== EXAM RUNNER ===================
  const q = exam.questions[currentIdx]!;
  const isLast = currentIdx === totalQuestions - 1;
  const lowTime = secondsLeft <= 60;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] text-white">
      {/* sticky timer header */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0e1f]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-xs uppercase tracking-wider text-white/50">{exam.subject}</div>
            <div className="truncate text-sm font-semibold">{exam.title}</div>
          </div>
          <motion.div
            animate={lowTime ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 1, repeat: lowTime ? Infinity : 0 }}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-bold tabular-nums ring-1 ${
              lowTime
                ? "bg-red-500/15 text-red-200 ring-red-400/40 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                : "bg-white/5 text-amber-200 ring-white/10"
            }`}
            aria-live="polite"
          >
            <Clock className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </motion.div>
        </div>
        {/* progress bar */}
        <div className="mx-auto h-1 max-w-3xl bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all"
            style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="text-white/50">
            Question <span className="font-bold text-white">{currentIdx + 1}</span> of {totalQuestions}
          </span>
          <span className="text-white/50">
            Answered: <span className="font-bold text-white">{answeredCount}</span> / {totalQuestions}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-white/10 px-2 py-0.5 uppercase tracking-wider text-white/60">
                {q.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}
              </span>
              {q.unit && (
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-white/50">{q.unit}</span>
              )}
              <span className="ml-auto text-white/50">
                {q.points} {q.points === 1 ? "point" : "points"}
              </span>
            </div>

            <h2 className="mb-5 text-lg font-semibold leading-relaxed">{q.prompt}</h2>

            {q.type === "multiple_choice" ? (
              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  const selected = answers[q.id]?.mcIndex === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMc(q.id, i)}
                      className={`group flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-amber-300/70 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          selected
                            ? "border-amber-300 bg-amber-300 text-black"
                            : "border-white/20 text-white/60 group-hover:border-white/40"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={answers[q.id]?.text ?? ""}
                onChange={(e) => setText(q.id, e.target.value)}
                rows={6}
                placeholder="Type your answer here…"
                className="w-full rounded-xl border border-white/15 bg-black/30 p-4 text-sm leading-relaxed text-white placeholder-white/30 outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/30"
                aria-label="Short answer response"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* nav controls */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>

          {!isLast ? (
            <button
              onClick={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => void handleSubmit(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-2.5 text-sm font-bold text-black shadow-[0_10px_30px_rgba(251,191,36,0.35)] hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Grading…" : "Submit exam"}
            </button>
          )}
        </div>

        {/* question dots */}
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
                className={`h-7 w-7 rounded-md text-xs font-semibold transition ${
                  i === currentIdx
                    ? "bg-white text-black"
                    : answered
                      ? "bg-emerald-500/30 text-emerald-100 hover:bg-emerald-500/40"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* always-visible submit */}
        {!isLast && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => void handleSubmit(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 px-5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/15 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {submitting ? "Grading…" : "Submit early"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
