"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useToast } from "~/app/_components/toast";
import { examFrameMeta, MockExamFrame } from "../_frame";

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

  useEffect(() => {
    if (!started || result || !exam) return;
    const q = exam.questions[currentIdx];
    if (!q || q.type !== "multiple_choice") return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const map: Record<string, number> = {
        "1": 0, "2": 1, "3": 2, "4": 3,
        a: 0, b: 1, c: 2, d: 3,
        A: 0, B: 1, C: 2, D: 3,
      };
      const idx = map[event.key];
      if (idx == null || idx >= q.options.length) return;
      event.preventDefault();
      setMc(q.id, idx);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, result, exam, currentIdx]);

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
      <MockExamFrame meta="Kyvex / Mock exam">
        <div className="px-6 py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "var(--kv-accent)" }} />
        </div>
      </MockExamFrame>
    );
  }

  if (error || !exam) {
    return (
      <MockExamFrame meta="Kyvex / Mock exam">
        <div className="px-6 py-6">
          <h1 className="kv-title" style={{ fontSize: 22 }}>Could not load exam</h1>
          <p className="kv-sub mt-2">{error ?? "Unknown error"}</p>
          <Link href="/mock-exam" className="kv-btn-ghost mt-4">
            Back
          </Link>
        </div>
      </MockExamFrame>
    );
  }

  // =================== RESULT VIEW ===================
  if (result) {
    const pct = result.scorePercent;
    const reviewQ = result.breakdown.perQuestion[reviewIdx];

    return (
      <MockExamFrame
        meta={examFrameMeta(exam.questions.length, exam.timeLimit)}
        staticTimer={formatTime(result.timeTakenSec)}
      >
        <div className="px-6 py-6 md:px-7">
          <div className="kv-meta">Result</div>
          <h1 className="kv-title mt-2" style={{ fontSize: 28 }}>{exam.title}</h1>
          <p className="kv-sub mt-1">
            {result.earnedPoints} / {result.totalPoints} points · {formatTime(result.timeTakenSec)} used
          </p>
          <p className="kv-meta" style={{ marginTop: 18 }}>Score</p>
          <div className="num" style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--kv-text-primary)" }}>
            {Math.round(pct)}%
          </div>
          <div className="kv-bar mt-4"><div style={{ width: `${pct}%` }} /></div>

          <div className="kv-stats mt-6">
            <div className="kv-stat">
              <span className="kv-meta">What you got right</span>
              <b className="num">{result.breakdown.gotRight}</b>
              <div className="kv-meta mt-1">questions correct</div>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">What you missed</span>
              <b className="num">{result.breakdown.missed}</b>
              <div className="kv-meta mt-1">questions to review</div>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Time used</span>
              <b className="num">{formatTime(result.timeTakenSec)}</b>
              <div className="kv-meta mt-1">of {exam.timeLimit}:00 allowed</div>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Points</span>
              <b className="num">{result.earnedPoints} / {result.totalPoints}</b>
            </div>
          </div>

          {result.breakdown.unitFocus.length > 0 && (
            <div className="mt-6">
              <h2 className="kv-meta">Unit focus areas</h2>
              <div className="mt-3 space-y-3">
                {result.breakdown.unitFocus.map((u) => (
                  <div key={u.unit}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="kv-row-title">{u.unit}</span>
                      <span className="kv-row-side num">
                        {u.earned}/{u.total} · {u.percent}%
                      </span>
                    </div>
                    <div className="kv-bar"><div style={{ width: `${u.percent}%` }} /></div>
                  </div>
                ))}
              </div>
              {result.breakdown.weaknesses.length > 0 && (
                <p className="kv-sub mt-4">
                  <strong>Focus on:</strong> {result.breakdown.weaknesses.join(", ")}
                </p>
              )}
              {result.breakdown.strengths.length > 0 && (
                <p className="kv-sub mt-1">
                  <strong>Strong areas:</strong> {result.breakdown.strengths.join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            <h2 className="kv-meta">Question-by-question review</h2>
            {result.breakdown.perQuestion.map((q, i) => (
              <button
                key={q.questionId}
                type="button"
                onClick={() => setReviewIdx(i)}
                className="kv-row"
                style={{ width: "100%", background: "transparent", cursor: "pointer", textAlign: "left" }}
              >
                <div>
                  <div className="kv-row-title">Question {i + 1}</div>
                  <div className="kv-row-sub">
                    {exam.curriculumCode ? (
                      <span className="kv-chip kv-chip-course">{exam.curriculumCode}</span>
                    ) : q.unit ? (
                      <span className="kv-chip kv-chip-course">{q.unit}</span>
                    ) : null}
                    <span className="kv-chip">{q.type === "multiple_choice" ? "MC" : "SA"}</span>
                  </div>
                </div>
                {q.isCorrect ? (
                  <span className="dot" aria-label="Correct" />
                ) : (
                  <span className="kv-chip kv-chip-stale">Incorrect</span>
                )}
              </button>
            ))}

            {reviewQ && (
              <div className="mt-6">
                <p className="kv-meta num">
                  Question {reviewIdx + 1} / {result.breakdown.perQuestion.length}
                </p>
                <p className="q">{reviewQ.prompt}</p>

                {reviewQ.type === "multiple_choice" ? (
                  <div className="opts">
                    <div className={reviewQ.isCorrect ? "kv-opt sel" : "kv-opt"}>
                      <span className="box" aria-hidden />
                      <div>
                        <span className="kv-meta">Your answer</span>
                        <div>{reviewQ.yourOption ?? <em>No answer</em>}</div>
                      </div>
                    </div>
                    {!reviewQ.isCorrect && (
                      <div className="kv-opt sel">
                        <span className="box" aria-hidden />
                        <div>
                          <span className="kv-meta">Correct answer</span>
                          <div>{reviewQ.correctOption}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="opts">
                    <div className="kv-opt">
                      <span className="box" aria-hidden />
                      <div>
                        <span className="kv-meta">Your answer</span>
                        <p className="mt-1 whitespace-pre-wrap">{reviewQ.yourText || <em>Left blank</em>}</p>
                      </div>
                    </div>
                    {reviewQ.feedback ? (
                      <div className="kv-opt">
                        <span className="box" aria-hidden />
                        <div>
                          <span className="kv-meta">Nova&apos;s feedback</span>
                          <p className="mt-1">{reviewQ.feedback}</p>
                        </div>
                      </div>
                    ) : null}
                    {reviewQ.modelAnswer ? (
                      <div className="kv-opt sel">
                        <span className="box" aria-hidden />
                        <div>
                          <span className="kv-meta">Model answer</span>
                          <p className="mt-1 whitespace-pre-wrap">{reviewQ.modelAnswer}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: "var(--border-default)" }}>
          <Link href="/mock-exam" className="kv-btn-ghost">
            Back
          </Link>
          <button type="button" onClick={() => window.location.reload()} className="kv-btn">
            Retake exam
          </button>
        </div>
      </MockExamFrame>
    );
  }

  // =================== START SCREEN ===================
  if (!started) {
    const totalPts = exam.questions.reduce((s, q) => s + q.points, 0);
    return (
      <MockExamFrame
        meta={examFrameMeta(totalQuestions, exam.timeLimit)}
        staticTimer={formatTime(exam.timeLimit * 60)}
      >
        <div className="px-6 py-6 md:px-7">
          <div className="kv-meta">Briefing</div>
          <h1 className="kv-title mt-2" style={{ fontSize: 28 }}>{exam.title}</h1>
          <p className="kv-meta mt-2">
            {exam.subject}
            {exam.curriculumCode ? ` · ${exam.curriculumCode}` : ""}
          </p>
          {exam.instructions ? <p className="kv-sub mt-4">{exam.instructions}</p> : null}

          <div className="kv-stats mt-6">
            <div className="kv-stat">
              <span className="kv-meta">Questions</span>
              <b className="num">{totalQuestions}</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Minutes</span>
              <b className="num">{exam.timeLimit}</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Points</span>
              <b className="num">{totalPts}</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Auto-submit</span>
              <b className="num">0:00</b>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: "var(--border-default)" }}>
          <Link href="/mock-exam" className="kv-btn-ghost">
            Back
          </Link>
          <button type="button" onClick={startExam} className="kv-btn">
            Engage Simulation
          </button>
        </div>
      </MockExamFrame>
    );
  }

  // =================== EXAM RUNNER ===================
  const q = exam.questions[currentIdx]!;
  const isLast = currentIdx === totalQuestions - 1;
  const progressPct = totalQuestions > 0 ? ((currentIdx + 1) / totalQuestions) * 100 : 0;

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
    <MockExamFrame
      meta={examFrameMeta(totalQuestions, exam.timeLimit)}
      staticTimer={formatTime(exam.timeLimit * 60)}
      liveTimer={formatTime(secondsLeft)}
    >
      <div className="relative px-6 py-6 md:px-7">
        <div className="kv-meta">Question {currentIdx + 1} / {totalQuestions}</div>
        <div className="kv-bar mt-3"><div style={{ width: `${progressPct}%` }} /></div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="kv-chip">{q.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}</span>
          {q.unit ? <span className="kv-chip">{q.unit}</span> : null}
          <span className="kv-row-side">{q.points} {q.points === 1 ? "pt" : "pts"}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {scratchActive && scratchPaths.length > 0 ? (
              <button type="button" onClick={clearScratch} className="kv-btn-ghost" style={{ padding: "6px 10px" }}>
                Clear
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setScratchActive((v) => !v)}
              className={scratchActive ? "kv-opt sel" : "kv-btn-ghost"}
              style={{ padding: "6px 10px" }}
              aria-pressed={scratchActive}
              aria-label="Toggle floating scratchpad"
            >
              Scratchpad
            </button>
          </div>
        </div>

        <p className="q">{q.prompt}</p>

        {q.type === "multiple_choice" ? (
          <div className="opts">
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
            className="kv-field mt-4"
            aria-label="Short answer response"
          />
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {exam.questions.map((qq, i) => {
            const a = answers[qq.id];
            const answered =
              qq.type === "multiple_choice"
                ? a?.mcIndex !== undefined
                : !!(a?.text && a.text.trim().length > 0);
            return (
              <button
                key={qq.id}
                type="button"
                onClick={() => setCurrentIdx(i)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={i === currentIdx ? "true" : undefined}
                className={i === currentIdx || answered ? "kv-opt sel" : "kv-opt"}
                style={{ padding: "6px 10px", width: "auto" }}
              >
                <span className="box" aria-hidden />
                {i + 1}
              </button>
            );
          })}
        </div>

        <ScratchpadOverlay
          active={scratchActive}
          paths={scratchPaths}
          onPointerDown={onScratchDown}
          onPointerMove={onScratchMove}
          onPointerUp={onScratchUp}
          onPointerLeave={onScratchUp}
        />
      </div>

      <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: "var(--border-default)" }}>
        <span className="kv-meta">Answered {answeredCount} / {totalQuestions}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="kv-btn-ghost"
          >
            Prev
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
              className="kv-btn-ghost"
            >
              Next
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSubmit(false)}
            disabled={submitting}
            className="kv-btn"
          >
            {submitting ? "Grading…" : "Submit Exam"}
          </button>
        </div>
      </div>
    </MockExamFrame>
  );
}

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
    <button
      type="button"
      onClick={onSelect}
      className={selected ? "kv-opt sel" : "kv-opt"}
      aria-pressed={selected}
    >
      <span className="box" aria-hidden />
      <span className="kv-meta">{letter}</span>
      <span>{text}</span>
    </button>
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
      {active && paths.length === 0 ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 kv-meta">
          Sketch over the question · drag to draw
        </div>
      ) : null}

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
              stroke="var(--kv-accent)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    </>
  );
}
