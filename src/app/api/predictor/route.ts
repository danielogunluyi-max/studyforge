import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const predictions = await db.examPrediction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ predictions });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, examDate } = (await req.json()) as { subject?: string; examDate?: string };
  if (!subject || !examDate) return NextResponse.json({ error: "Missing subject or examDate" }, { status: 400 });

  const [notes, decks, exams, feynman] = await Promise.all([
    db.note.count({
      where: {
        userId: session.user.id,
        OR: [
          { title: { contains: subject, mode: "insensitive" } },
          { content: { contains: subject, mode: "insensitive" } },
        ],
      },
    }),
    db.flashcardDeck.count({
      where: { userId: session.user.id, subject: { contains: subject, mode: "insensitive" } },
    }),
    db.exam.findMany({
      where: { userId: session.user.id, subject: { contains: subject, mode: "insensitive" } },
      select: { scorePercent: true },
      take: 10,
    }),
    db.feynmanSession.findMany({
      where: { userId: session.user.id, concept: { contains: subject, mode: "insensitive" } },
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

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `You are an academic performance predictor. Based on this student's data, predict their exam score.\n\nSubject: ${subject}\nDays until exam: ${daysUntil}\nNotes created: ${notes}\nFlashcard decks: ${decks}\nAverage past exam score: ${avgExamScore ? avgExamScore.toFixed(1) + "%" : "No data"}\nAverage Feynman technique score: ${avgFeynman ? avgFeynman.toFixed(1) + "/100" : "No data"}\n\nRespond ONLY in this JSON format:\n{\n  "predictedScore": 78,\n  "confidence": 0.72,\n  "grade": "B+",\n  "factors": [\n    { "factor": "Study materials", "impact": "positive", "detail": "..." },\n    { "factor": "Time remaining", "impact": "neutral", "detail": "..." },\n    { "factor": "Past performance", "impact": "positive", "detail": "..." }\n  ],\n  "recommendation": "One specific actionable tip to improve the prediction"\n}`,
      },
    ],
    max_tokens: 500,
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      predictedScore?: number;
      confidence?: number;
      factors?: unknown[];
    };

    await db.examPrediction.create({
      data: {
        userId: session.user.id,
        examType: "predictor",
        uploadedContent: `Auto predictor context for ${subject}`,
        predictions: parsed,
        subject,
        examDate: new Date(examDate),
        predictedScore: parsed.predictedScore || 0,
        confidence: parsed.confidence || 0,
        factors: parsed.factors || [],
      },
    });

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
  }
}
