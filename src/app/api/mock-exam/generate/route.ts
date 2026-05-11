import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { runGroqPrompt, extractJsonBlock } from "~/server/groq";

type GeneratePayload = {
  noteId?: string;
  sourceText?: string;
  subject?: string;
  curriculumCode?: string;
  numMultipleChoice?: number;
  numShortAnswer?: number;
  timeLimitMinutes?: number;
};

type GeneratedQuestion = {
  type: "multiple_choice" | "short_answer";
  prompt: string;
  options?: string[];
  correctIndex?: number;
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

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as GeneratePayload;
    const numMC = Math.min(Math.max(Number(body.numMultipleChoice ?? 10), 1), 20);
    const numSA = Math.min(Math.max(Number(body.numShortAnswer ?? 5), 0), 10);
    const timeLimit = Math.min(Math.max(Number(body.timeLimitMinutes ?? 45), 5), 180);

    let subject = (body.subject ?? "").trim();
    let sourceText = (body.sourceText ?? "").trim();
    let noteId: string | null = null;
    let noteTitle = "";

    if (body.noteId) {
      const note = await db.note.findUnique({ where: { id: body.noteId } });
      if (!note || note.userId !== session.user.id) {
        return NextResponse.json({ error: "Note not found." }, { status: 404 });
      }
      noteId = note.id;
      noteTitle = note.title;
      sourceText = stripHtml(note.content ?? "");
      if (!subject) {
        subject = note.tags?.[0] ?? "General";
      }
    }

    if (!sourceText || sourceText.length < 80) {
      return NextResponse.json(
        { error: "Source content is too short to generate a meaningful exam." },
        { status: 400 },
      );
    }
    if (!subject) subject = "General";

    const curriculumCode = (body.curriculumCode ?? "").trim().toUpperCase() || null;

    const systemPrompt = [
      "You are Nova, Kyvex's exam generator for Ontario Grade 11–12 students.",
      "Build rigorous, fair, exam-style questions that match the Ontario curriculum standard (university and university/college streams).",
      "Use Canadian spelling. Cover the material breadth-first across multiple units/topics found in the source.",
      "Multiple choice: 4 options each, exactly ONE correct. Distractors must be plausible (common misconceptions), not throw-aways.",
      "Short answer: a clear scenario or concept-application question; provide a concise model answer (3–6 sentences) AND a 1–3 sentence rubric describing what a full-credit answer must include.",
      "Tag every question with a 'unit' label (a short topic name such as 'Stoichiometry' or 'Limits & Continuity').",
      "Output STRICT JSON only — no prose, no markdown fences. The JSON must exactly match the schema requested.",
    ].join(" ");

    const userPrompt = `Generate a mock exam from the source notes below.

Subject: ${subject}
${curriculumCode ? `Ontario course code: ${curriculumCode}` : ""}
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
- Output exactly ${numMC} multiple_choice followed by exactly ${numSA} short_answer in the questions array.
- multiple_choice points = 1, short_answer points = 3.
- Do NOT include explanations beyond what the schema asks for.

SOURCE NOTES${noteTitle ? ` (from "${noteTitle}")` : ""}:
"""
${sourceText}
"""`;

    let raw: string;
    try {
      raw = await runGroqPrompt({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.4,
        maxTokens: 4500,
      });
    } catch (err) {
      console.error("[mock-exam/generate] Groq failed:", err);
      const detail = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `AI provider error: ${detail}` }, { status: 502 });
    }

    const parsed = extractJsonBlock<GeneratedExam>(raw);
    if (!parsed?.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      console.error("[mock-exam/generate] Could not parse AI output. Raw:", raw.slice(0, 500));
      return NextResponse.json(
        { error: "AI returned an invalid exam structure. Please try again." },
        { status: 502 },
      );
    }

    // Validate + clean questions (note: schema field is `question`, not `prompt`)
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
            explanation: "",
            correctIndex,
            modelAnswer: null,
            rubric: null,
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
            options: [],
            answer: modelAnswer,
            explanation: rubric || "Short answer — see model answer.",
            correctIndex: null,
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
      return NextResponse.json(
        { error: "AI did not produce any usable questions. Please try again." },
        { status: 502 },
      );
    }

    const title = String(parsed.title ?? "").trim() || `Mock Exam: ${noteTitle || subject}`;
    const instructions = String(parsed.instructions ?? "").trim() || null;

    const exam = await db.mockExam.create({
      data: {
        userId: session.user.id,
        noteId,
        title: title.slice(0, 160),
        subject,
        curriculumCode,
        instructions,
        timeLimit,
        questions: { create: cleaned },
      },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    console.error("[mock-exam/generate] Unhandled error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate exam: ${detail}` }, { status: 500 });
  }
}
