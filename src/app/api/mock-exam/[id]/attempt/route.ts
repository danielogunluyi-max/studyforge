import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { runGroqPrompt, extractJsonBlock } from "~/server/groq";

type SubmittedAnswer = {
  questionId: string;
  mcIndex?: number | null;
  text?: string | null;
};

type SubmitPayload = {
  answers?: SubmittedAnswer[];
  timeTakenSec?: number;
};

type ShortAnswerGrade = {
  questionId: string;
  earned: number;
  feedback: string;
};

// ---------- GET: taker-safe exam payload ----------
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const exam = await db.mockExam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] },
    },
  });
  if (!exam || exam.userId !== session.user.id) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const safe = {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    curriculumCode: exam.curriculumCode,
    instructions: exam.instructions,
    timeLimit: exam.timeLimit,
    createdAt: exam.createdAt,
    questions: exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.question,
      options: q.type === "multiple_choice" ? (q.options as unknown as string[]) ?? [] : [],
      unit: q.unit,
      points: q.points,
    })),
  };

  return NextResponse.json({ exam: safe });
}

// ---------- POST: grade & save attempt ----------
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as SubmitPayload;
    const submitted = Array.isArray(body.answers) ? body.answers : [];
    const timeTakenSec = typeof body.timeTakenSec === "number" ? Math.max(0, Math.round(body.timeTakenSec)) : 0;

    const exam = await db.mockExam.findUnique({
      where: { id },
      include: { questions: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] } },
    });
    if (!exam || exam.userId !== session.user.id) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const answerMap = new Map<string, SubmittedAnswer>();
    submitted.forEach((a) => {
      if (a?.questionId) answerMap.set(a.questionId, a);
    });

    type PerQ = {
      questionId: string;
      type: string;
      unit: string | null;
      prompt: string;
      points: number;
      earned: number;
      isCorrect: boolean;
      // MC-specific
      yourIndex?: number | null;
      yourOption?: string | null;
      correctIndex?: number | null;
      correctOption?: string | null;
      // SA-specific
      yourText?: string | null;
      modelAnswer?: string | null;
      rubric?: string | null;
      feedback?: string | null;
    };

    const perQuestion: PerQ[] = [];
    const shortAnswerToGrade: Array<{
      questionId: string;
      prompt: string;
      modelAnswer: string;
      rubric: string;
      points: number;
      yourText: string;
    }> = [];

    // 1) Grade MCs synchronously, queue SAs for AI grading
    for (const q of exam.questions) {
      const submission = answerMap.get(q.id);
      const options = (q.options as unknown as string[]) ?? [];

      if (q.type === "multiple_choice") {
        const yourIndex =
          typeof submission?.mcIndex === "number" && submission.mcIndex >= 0 && submission.mcIndex < options.length
            ? submission.mcIndex
            : null;
        const correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : null;
        const isCorrect = yourIndex !== null && correctIndex !== null && yourIndex === correctIndex;
        perQuestion.push({
          questionId: q.id,
          type: "multiple_choice",
          unit: q.unit ?? null,
          prompt: q.question,
          points: q.points,
          earned: isCorrect ? q.points : 0,
          isCorrect,
          yourIndex,
          yourOption: yourIndex !== null ? options[yourIndex] ?? null : null,
          correctIndex,
          correctOption: correctIndex !== null ? options[correctIndex] ?? null : null,
        });
      } else {
        const yourText = String(submission?.text ?? "").trim();
        const placeholder: PerQ = {
          questionId: q.id,
          type: "short_answer",
          unit: q.unit ?? null,
          prompt: q.question,
          points: q.points,
          earned: 0,
          isCorrect: false,
          yourText,
          modelAnswer: q.modelAnswer ?? null,
          rubric: q.rubric ?? null,
          feedback: null,
        };
        perQuestion.push(placeholder);
        if (yourText) {
          shortAnswerToGrade.push({
            questionId: q.id,
            prompt: q.question,
            modelAnswer: q.modelAnswer ?? "",
            rubric: q.rubric ?? "",
            points: q.points,
            yourText,
          });
        } else {
          placeholder.feedback = "Left blank — no marks awarded.";
        }
      }
    }

    // 2) AI-grade short-answers in one batch call (best-effort)
    if (shortAnswerToGrade.length > 0 && process.env.GROQ_API_KEY) {
      try {
        const gradingPrompt = `You are grading short-answer questions for an Ontario Grade 11–12 mock exam.
For EACH question, score the student's answer from 0 to the maximum points based on the rubric and model answer.
Be fair but rigorous. Award partial credit. Provide ONE-sentence specific feedback.

Output STRICT JSON only with this shape:
{
  "grades": [
    { "questionId": "...", "earned": 0, "feedback": "string" }
  ]
}

Questions:
${JSON.stringify(
  shortAnswerToGrade.map((q) => ({
    questionId: q.questionId,
    maxPoints: q.points,
    prompt: q.prompt,
    modelAnswer: q.modelAnswer,
    rubric: q.rubric,
    studentAnswer: q.yourText,
  })),
  null,
  2,
)}`;

        const raw = await runGroqPrompt({
          system:
            "You are a fair, rigorous Ontario high-school exam grader. Output ONLY valid JSON matching the requested schema. No markdown, no commentary.",
          user: gradingPrompt,
          temperature: 0.2,
          maxTokens: 1800,
        });
        const parsed = extractJsonBlock<{ grades?: ShortAnswerGrade[] }>(raw);
        const grades = parsed?.grades ?? [];
        const gradeMap = new Map(grades.map((g) => [g.questionId, g]));
        for (const pq of perQuestion) {
          if (pq.type !== "short_answer") continue;
          const g = gradeMap.get(pq.questionId);
          if (g) {
            const earned = Math.max(0, Math.min(pq.points, Math.round(g.earned)));
            pq.earned = earned;
            pq.isCorrect = earned >= pq.points; // full credit
            pq.feedback = g.feedback?.slice(0, 400) ?? null;
          } else if (pq.yourText) {
            pq.feedback = "AI grader could not score this — please review against the model answer.";
          }
        }
      } catch (gradeErr) {
        console.error("[mock-exam/attempt] AI grading failed:", gradeErr);
        for (const pq of perQuestion) {
          if (pq.type === "short_answer" && pq.yourText && !pq.feedback) {
            pq.feedback = "AI grader unavailable — compare your answer to the model answer.";
          }
        }
      }
    }

    // 3) Aggregate
    const earnedPoints = perQuestion.reduce((s, q) => s + q.earned, 0);
    const totalPoints = perQuestion.reduce((s, q) => s + q.points, 0);
    const scorePercent = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Unit focus areas: percent earned per unit
    const unitMap = new Map<string, { earned: number; total: number }>();
    for (const pq of perQuestion) {
      const u = pq.unit ?? "General";
      const prev = unitMap.get(u) ?? { earned: 0, total: 0 };
      prev.earned += pq.earned;
      prev.total += pq.points;
      unitMap.set(u, prev);
    }
    const unitFocus = [...unitMap.entries()]
      .map(([unit, { earned, total }]) => ({
        unit,
        earned,
        total,
        percent: total > 0 ? Math.round((earned / total) * 100) : 0,
      }))
      .sort((a, b) => a.percent - b.percent);

    const strengths = unitFocus.filter((u) => u.percent >= 80).map((u) => u.unit);
    const weaknesses = unitFocus.filter((u) => u.percent < 60).map((u) => u.unit);

    const breakdown = {
      perQuestion,
      unitFocus,
      strengths,
      weaknesses,
      gotRight: perQuestion.filter((q) => q.isCorrect).length,
      missed: perQuestion.filter((q) => !q.isCorrect).length,
    };

    const attempt = await db.mockExamAttempt.create({
      data: {
        examId: id,
        userId: session.user.id,
        answers: submitted as unknown as object,
        score: scorePercent,
        earnedPoints,
        totalPoints,
        breakdown: breakdown as unknown as object,
        timeTaken: timeTakenSec,
      },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      scorePercent,
      earnedPoints,
      totalPoints,
      timeTakenSec,
      breakdown,
    });
  } catch (error) {
    console.error("[mock-exam/attempt POST] Unhandled error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Submission failed: ${detail}` }, { status: 500 });
  }
}
