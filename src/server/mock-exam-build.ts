/**
 * Shared mock-exam question build — used by POST /api/mock-exam/[id]/generate
 * and the legacy POST /api/mock-exam/generate wrapper.
 */

import { db } from "~/server/db";
import { runGroqPrompt, extractJsonBlock, isRateLimited, BUSY_MESSAGE } from "~/server/groq";
import { curriculumContextToPrompt, getCurriculumContext } from "~/server/curriculum";

export type MockExamBuildInput = {
  userId: string;
  examId: string;
  noteId?: string | null;
  sourceText?: string | null;
  subject?: string | null;
  curriculumCode?: string | null;
  numMultipleChoice?: number;
  numShortAnswer?: number;
  timeLimitMinutes?: number;
};

type GeneratedQuestion = {
  type: "multiple_choice" | "short_answer";
  prompt: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  modelAnswer?: string;
  rubric?: string;
  unit?: string;
  points?: number;
};

type GeneratedExam = {
  title?: string;
  instructions?: string;
  questions?: GeneratedQuestion[];
};

function stripHtml(html: string, max = 8000): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…[truncated]" : text;
}

export type MockExamBuildResult =
  | { ok: true; exam: Awaited<ReturnType<typeof loadExam>> }
  | { ok: false; status: number; error: string };

async function loadExam(examId: string, userId: string) {
  return db.mockExam.findFirst({
    where: { id: examId, userId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
}

export async function buildMockExamQuestions(
  input: MockExamBuildInput,
): Promise<MockExamBuildResult> {
  if (!process.env.GROQ_API_KEY) {
    return { ok: false, status: 500, error: "GROQ_API_KEY is not configured." };
  }

  const exam = await loadExam(input.examId, input.userId);
  if (!exam) {
    return { ok: false, status: 404, error: "Exam not found." };
  }

  // Idempotent: already built
  if (exam.questions.length > 0) {
    return { ok: true, exam };
  }

  const numMC = Math.min(Math.max(Number(input.numMultipleChoice ?? 10), 0), 20);
  const numSA = Math.min(Math.max(Number(input.numShortAnswer ?? 5), 0), 10);
  if (numMC + numSA < 1) {
    return { ok: false, status: 400, error: "Need at least one question." };
  }
  const timeLimit = Math.min(
    Math.max(Number(input.timeLimitMinutes ?? exam.timeLimit ?? 45), 5),
    180,
  );

  let subject = (input.subject ?? exam.subject ?? "").trim();
  let sourceText = (input.sourceText ?? "").trim();
  let noteId = input.noteId ?? exam.noteId ?? null;
  let noteTitle = "";

  if (input.noteId || (!sourceText && exam.noteId)) {
    const id = input.noteId ?? exam.noteId;
    if (id) {
      const note = await db.note.findUnique({ where: { id } });
      if (note?.userId !== input.userId) {
        return { ok: false, status: 404, error: "Note not found." };
      }
      noteId = note.id;
      noteTitle = note.title;
      sourceText = stripHtml(note.content ?? "");
      if (!subject) subject = note.tags?.[0] ?? "General";
    }
  }

  if (!sourceText || sourceText.length < 80) {
    return {
      ok: false,
      status: 400,
      error: "Source content is too short to generate a meaningful exam.",
    };
  }
  if (!subject) subject = "General";

  const curriculumCode =
    (input.curriculumCode ?? exam.curriculumCode ?? "").trim().toUpperCase() || null;
  const curriculumContext = await getCurriculumContext(curriculumCode).catch(() => null);
  const curriculumPrompt = curriculumContextToPrompt(curriculumContext);

  const systemPrompt = [
    "You are Nova, Kyvex's exam generator for Ontario Grade 11–12 students.",
    "Build rigorous, fair, exam-style questions grounded ONLY in the provided source notes — no generic textbook filler unrelated to the source.",
    "Use Canadian spelling. Cover the material breadth-first across multiple units/topics found in the source.",
    "Multiple choice: 4 options each, exactly ONE correct. Distractors must be plausible (common misconceptions), not throw-aways.",
    "Every multiple-choice question MUST include a short explanation (1–2 sentences): why the correct option is right and what trap the distractors represent.",
    "Short answer: a clear scenario or concept-application question; provide a concise model answer (3–6 sentences) AND a 1–3 sentence rubric describing what a full-credit answer must include.",
    "Tag every question with a 'unit' label (a short topic name such as 'Stoichiometry' or 'Limits & Continuity').",
    "Output STRICT JSON only — no prose, no markdown fences. The JSON must exactly match the schema requested.",
  ].join(" ");

  const userPrompt = `Generate a mock exam from the source notes below.

Subject: ${subject}
${curriculumCode ? `Ontario course code: ${curriculumCode}` : ""}
${curriculumPrompt ? `\n${curriculumPrompt}\n` : ""}
Number of multiple-choice: ${numMC}
Number of short-answer: ${numSA}

Required JSON schema:
{
  "title": "string (concise exam title)",
  "instructions": "string (1–2 sentences with how to approach the exam)",
  "questions": [
    {
      "type": "multiple_choice",
      "prompt": "string",
      "options": ["string","string","string","string"],
      "correctIndex": 0,
      "explanation": "string (why correct + common trap)",
      "unit": "string",
      "points": 1
    },
    {
      "type": "short_answer",
      "prompt": "string",
      "modelAnswer": "string",
      "rubric": "string",
      "unit": "string",
      "points": 3
    }
  ]
}

Rules:
- Output exactly ${numMC} multiple_choice followed by exactly ${numSA} short_answer in the questions array (omit a type if its count is 0).
- multiple_choice points = 1, short_answer points = 3.
- Ground every question in a specific fact, definition, mechanism, or example from the SOURCE. Prefer concrete details over vague fillers.
${curriculumCode ? `- Align difficulty and wording with Ontario ${curriculumCode} expectations when the curriculum block above is present.` : ""}

SOURCE NOTES${noteTitle ? ` (from "${noteTitle}")` : ""}:
"""
${sourceText}
"""`;

  let raw: string;
  try {
    raw = await runGroqPrompt({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.35,
      maxTokens: 5000,
    });
  } catch (err) {
    if (isRateLimited(err)) {
      return { ok: false, status: 429, error: BUSY_MESSAGE };
    }
    console.error("[mock-exam/build] Groq failed:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, status: 502, error: `AI provider error: ${detail}` };
  }

  const parsed = extractJsonBlock<GeneratedExam>(raw);
  if (!parsed?.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    console.error("[mock-exam/build] Could not parse AI output. Raw:", raw.slice(0, 500));
    return {
      ok: false,
      status: 502,
      error: "AI returned an invalid exam structure. Please try again.",
    };
  }

  const cleaned = parsed.questions
    .map((q, idx) => {
      const promptText = String(q.prompt ?? "").trim();
      if (!promptText) return null;
      const unit = q.unit ? String(q.unit).slice(0, 80) : null;

      if (q.type === "multiple_choice") {
        const options = Array.isArray(q.options)
          ? q.options.map((o) => String(o ?? "").trim()).filter(Boolean)
          : [];
        if (options.length < 2) return null;
        const correctIndex =
          typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < options.length
            ? q.correctIndex
            : 0;
        return {
          type: "multiple_choice",
          question: promptText,
          options,
          answer: options[correctIndex] ?? "",
          explanation:
            String(q.explanation ?? "").trim().slice(0, 600) ||
            "Review the correct option against your notes.",
          correctIndex,
          modelAnswer: null as string | null,
          rubric: null as string | null,
          unit,
          points: 1,
          orderIndex: idx,
        };
      }

      if (q.type === "short_answer") {
        const modelAnswer = String(q.modelAnswer ?? "").trim();
        const rubric = String(q.rubric ?? "").trim();
        if (!modelAnswer) return null;
        return {
          type: "short_answer",
          question: promptText,
          options: [] as string[],
          answer: modelAnswer,
          explanation: rubric || "Short answer — see model answer.",
          correctIndex: null as number | null,
          modelAnswer,
          rubric: rubric || null,
          unit,
          points: typeof q.points === "number" ? Math.min(Math.max(q.points, 1), 5) : 3,
          orderIndex: idx,
        };
      }

      return null;
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  if (cleaned.length === 0) {
    return {
      ok: false,
      status: 502,
      error: "AI did not produce any usable questions. Please try again.",
    };
  }

  const title = String(parsed.title ?? "").trim() || `Mock Exam: ${noteTitle || subject}`;
  const instructions = String(parsed.instructions ?? "").trim() || null;

  await db.mockExam.update({
    where: { id: exam.id },
    data: {
      noteId,
      title: title.slice(0, 160),
      subject,
      curriculumCode,
      instructions,
      timeLimit,
      questions: { create: cleaned },
    },
  });

  const updated = await loadExam(exam.id, input.userId);
  if (!updated) {
    return { ok: false, status: 500, error: "Exam updated but could not be reloaded." };
  }
  return { ok: true, exam: updated };
}
