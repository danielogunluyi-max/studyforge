import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { type Prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const predictions = await db.examPrediction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ predictions });
}

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { subject, examDate } = (await req.json()) as { subject?: string; examDate?: string };
  if (!subject || !examDate) return NextResponse.json({ error: "Missing subject or examDate" }, { status: 400 });

  const [notes, decks, exams, feynman] = await Promise.all([
    db.note.count({
      where: {
        userId,
        OR: [
          { title: { contains: subject, mode: "insensitive" } },
          { content: { contains: subject, mode: "insensitive" } },
        ],
      },
    }),
    db.flashcardDeck.count({
      where: { userId, subject: { contains: subject, mode: "insensitive" } },
    }),
    db.exam.findMany({
      where: { userId, subject: { contains: subject, mode: "insensitive" } },
      select: { scorePercent: true },
      take: 10,
    }),
    db.feynmanSession.findMany({
      where: { userId, concept: { contains: subject, mode: "insensitive" } },
      select: { score: true },
      take: 5,
    }),
  ]);

  const avgExamScore = exams.length
    ? exams.reduce((a, e) => a + (e.scorePercent || 0), 0) / exams.length
    : null;
  const avgFeynman = feynman.length
    ? feynman.reduce((a, f) => a + (f.score || 0), 0) / feynman.length
    : null;
  const daysUntil = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);

  const parsed = await groqJSON<{
    predictedScore?: number;
    confidence?: number;
    factors?: unknown[];
  }>({
    user: `You are an academic performance predictor. Based on this student's data, predict their exam score.\n\nSubject: ${subject}\nDays until exam: ${daysUntil}\nNotes created: ${notes}\nFlashcard decks: ${decks}\nAverage past exam score: ${avgExamScore ? avgExamScore.toFixed(1) + "%" : "No data"}\nAverage Feynman technique score: ${avgFeynman ? avgFeynman.toFixed(1) + "/100" : "No data"}\n\nRespond ONLY in this JSON format:\n{\n  "predictedScore": 78,\n  "confidence": 0.72,\n  "grade": "B+",\n  "factors": [\n    { "factor": "Study materials", "impact": "positive", "detail": "..." },\n    { "factor": "Time remaining", "impact": "neutral", "detail": "..." },\n    { "factor": "Past performance", "impact": "positive", "detail": "..." }\n  ],\n  "recommendation": "One specific actionable tip to improve the prediction"\n}`,
    maxTokens: 500,
  });

  if (!parsed) return NextResponse.json({ error: "Prediction failed" }, { status: 500 });

  await db.examPrediction.create({
    data: {
      userId,
      examType: "predictor",
      uploadedContent: `Auto predictor context for ${subject}`,
      predictions: parsed as Prisma.InputJsonValue,
      subject,
      examDate: new Date(examDate),
      predictedScore: parsed.predictedScore || 0,
      confidence: parsed.confidence || 0,
      factors: (parsed.factors ?? []) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(parsed);
}
