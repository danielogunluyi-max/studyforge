import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type FeynmanRequestBody = {
  concept?: string;
  explanation?: string;
  attemptNumber?: number;
};

type FeynmanFeedback = {
  score: number;
  gradeLabel: "Needs Work" | "Getting There" | "Good" | "Excellent";
  gradeSummary: string;
  correct: string[];
  missing: string[];
  wrong: string[];
  studyNext: string[];
  simplifiedExplanation: string;
  encouragement: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeGradeLabel(score: number, raw: unknown): FeynmanFeedback["gradeLabel"] {
  if (raw === "Needs Work" || raw === "Getting There" || raw === "Good" || raw === "Excellent") {
    return raw;
  }

  if (score >= 86) return "Excellent";
  if (score >= 66) return "Good";
  if (score >= 41) return "Getting There";
  return "Needs Work";
}

function normalizeFeedback(parsed: unknown): FeynmanFeedback | null {
  if (!parsed || typeof parsed !== "object") return null;

  const raw = parsed as Record<string, unknown>;
  const scoreValue = Number(raw.score);
  const score = Number.isFinite(scoreValue) ? Math.max(0, Math.min(100, Math.round(scoreValue))) : NaN;

  if (!Number.isFinite(score)) return null;

  return {
    score,
    gradeLabel: normalizeGradeLabel(score, raw.gradeLabel),
    gradeSummary:
      typeof raw.gradeSummary === "string" && raw.gradeSummary.trim()
        ? raw.gradeSummary.trim()
        : "You are making progress, and Nova found a few places to sharpen your understanding.",
    correct: normalizeStringArray(raw.correct),
    missing: normalizeStringArray(raw.missing),
    wrong: normalizeStringArray(raw.wrong),
    studyNext: normalizeStringArray(raw.studyNext),
    simplifiedExplanation:
      typeof raw.simplifiedExplanation === "string" && raw.simplifiedExplanation.trim()
        ? raw.simplifiedExplanation.trim()
        : "Try breaking the concept into simple steps and use a familiar real-world example.",
    encouragement:
      typeof raw.encouragement === "string" && raw.encouragement.trim()
        ? raw.encouragement.trim()
        : "Keep refining it in simple words. Clear explanations come from clear understanding.",
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as FeynmanRequestBody;
    const concept = body.concept?.trim() ?? "";
    const explanation = body.explanation?.trim() ?? "";
    const attemptNumber = Math.max(1, Math.floor(body.attemptNumber ?? 1));

    if (!concept || !explanation) {
      return NextResponse.json(
        { error: "Concept and explanation are required" },
        { status: 400 },
      );
    }

    const systemPrompt = `You are Nova, an expert AI tutor for Kyvex, a study platform for high school and university students.
Your job is to grade a student's Feynman Technique explanation.
The Feynman Technique means explaining a concept simply, as if teaching a 12-year-old, with no jargon.

You MUST respond with ONLY valid JSON and no markdown. Follow this exact structure:
{
  "score": <integer 0-100>,
  "gradeLabel": <"Needs Work" | "Getting There" | "Good" | "Excellent">,
  "gradeSummary": <one encouraging sentence summarizing the grade>,
  "correct": [<list of things the student explained correctly>],
  "missing": [<list of important concepts they forgot to mention>],
  "wrong": [<list of things they explained incorrectly or unclearly>],
  "studyNext": [<list of specific topics/concepts to review>],
  "simplifiedExplanation": <a perfect simple explanation of the concept for reference>,
  "encouragement": <one personalized motivational sentence for the student>
}

Scoring guide:
- 0-40: Needs Work (major gaps or misconceptions)
- 41-65: Getting There (understands basics, missing depth)
- 66-85: Good (solid understanding, minor gaps)
- 86-100: Excellent (clear, complete, simple explanation)

Be honest but encouraging. Grade strictly — a score of 90+ means the student truly understands and explained it simply and completely.`;

    const userPrompt = `Concept to explain: "${concept}"

Student's explanation (should be as if teaching a 12-year-old):
"${explanation}"

Grade this explanation and return your JSON assessment.`;

    const raw = await runGroqPrompt({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.3,
      maxTokens: 1000,
    });

    const result = normalizeFeedback(extractJsonBlock<FeynmanFeedback>(raw));

    if (!result) {
      throw new Error("Invalid model response");
    }

    const saved = await db.feynmanSession.create({
      data: {
        userId: session.user.id,
        concept,
        explanation,
        score: result.score,
        gradeLabel: result.gradeLabel,
        feedback: result,
        attemptNumber,
      },
      select: { id: true },
    });

    return NextResponse.json({ ...result, sessionId: saved.id });
  } catch (error) {
    console.error("Feynman grading error:", error);
    return NextResponse.json(
      { error: "Failed to grade explanation" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await db.feynmanSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ sessions });
}
