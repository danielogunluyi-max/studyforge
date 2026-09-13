/**
 * Load mock-exam attempt context for Nova (miss loop).
 */
import { prisma } from "@/lib/prisma";

export type MockAttemptContext = {
  examId: string;
  attemptId: string;
  title: string;
  subject: string;
  curriculumCode: string | null;
  noteId: string | null;
  scorePercent: number;
  missed: Array<{
    questionNumber: number;
    prompt: string;
    type: string;
    unit: string | null;
    yourAnswer: string;
    correctAnswer: string;
    explanation: string | null;
    feedback: string | null;
  }>;
};

type BreakdownQ = {
  prompt?: string;
  type?: string;
  unit?: string | null;
  isCorrect?: boolean;
  yourOption?: string | null;
  yourText?: string | null;
  correctOption?: string | null;
  modelAnswer?: string | null;
  explanation?: string | null;
  feedback?: string | null;
};

export async function loadMockAttemptContext(
  userId: string,
  mockExamId: string,
): Promise<MockAttemptContext | null> {
  const exam = await prisma.mockExam.findFirst({
    where: { id: mockExamId, userId },
    select: {
      id: true,
      title: true,
      subject: true,
      curriculumCode: true,
      noteId: true,
    },
  });
  if (!exam) return null;

  const attempt = await prisma.mockExamAttempt.findFirst({
    where: { examId: exam.id, userId },
    orderBy: { createdAt: "desc" },
  });
  if (!attempt) return null;

  const breakdown = (attempt.breakdown ?? {}) as { perQuestion?: BreakdownQ[] };
  const perQuestion = Array.isArray(breakdown.perQuestion) ? breakdown.perQuestion : [];

  const missed = perQuestion
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q && q.isCorrect === false)
    .map(({ q, i }) => ({
      questionNumber: i + 1,
      prompt: String(q.prompt ?? "").slice(0, 500),
      type: String(q.type ?? ""),
      unit: q.unit ?? null,
      yourAnswer: String(q.yourOption ?? q.yourText ?? "(blank)").slice(0, 400),
      correctAnswer: String(q.correctOption ?? q.modelAnswer ?? "").slice(0, 600),
      explanation: q.explanation ? String(q.explanation).slice(0, 400) : null,
      feedback: q.feedback ? String(q.feedback).slice(0, 400) : null,
    }));

  return {
    examId: exam.id,
    attemptId: attempt.id,
    title: exam.title,
    subject: exam.subject,
    curriculumCode: exam.curriculumCode,
    noteId: exam.noteId,
    scorePercent: attempt.score,
    missed,
  };
}

export function mockAttemptContextToPrompt(ctx: MockAttemptContext): string {
  const lines: string[] = [];
  lines.push("=== MOCK EXAM ATTEMPT (student just finished — use for miss review) ===");
  lines.push(
    `Exam: "${ctx.title}" (${ctx.subject}${ctx.curriculumCode ? `, ${ctx.curriculumCode}` : ""}) · score ${Math.round(ctx.scorePercent)}% · examId=${ctx.examId} · attemptId=${ctx.attemptId}`,
  );
  if (ctx.missed.length === 0) {
    lines.push("No misses on this attempt.");
  } else {
    lines.push(`Misses (${ctx.missed.length}) — when the student asks "why did I miss QN", use this list:`);
    for (const m of ctx.missed) {
      lines.push(
        `  Q${m.questionNumber} [${m.type}${m.unit ? ` · ${m.unit}` : ""}]: ${m.prompt}`,
      );
      lines.push(`    Their answer: ${m.yourAnswer}`);
      lines.push(`    Correct: ${m.correctAnswer}`);
      if (m.explanation) lines.push(`    Explanation: ${m.explanation}`);
      if (m.feedback) lines.push(`    Grader feedback: ${m.feedback}`);
    }
  }
  lines.push("=== END MOCK EXAM ATTEMPT ===");
  return lines.join("\n");
}
