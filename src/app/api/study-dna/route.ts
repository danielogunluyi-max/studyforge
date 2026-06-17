import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma, type Prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const dna = await prisma.studyDNA.findUnique({ where: { userId } });
  return NextResponse.json({ dna });
}

export async function POST() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const [notes, decks, feynman, exams, focus, wellness] = await Promise.all([
    prisma.note.findMany({ where: { userId }, select: { subject: true, createdAt: true }, take: 100 }),
    prisma.flashcardDeck.findMany({ where: { userId }, select: { subject: true }, take: 50 }),
    prisma.feynmanSession.findMany({ where: { userId }, select: { score: true, concept: true }, take: 50 }),
    prisma.exam.findMany({ where: { userId }, select: { subject: true, score: true }, take: 50 }),
    prisma.focusSession.findMany({ where: { userId }, select: { duration: true, createdAt: true }, take: 100 }),
    prisma.wellnessEntry.findMany({ where: { userId }, select: { mood: true, energy: true, createdAt: true }, take: 30 }),
  ]);

  void decks;
  void wellness;

  const dataStr = JSON.stringify({
    notes: notes.length,
    feynmanAvg: feynman.reduce((a, f) => a + (f.score || 0), 0) / (feynman.length || 1),
    exams: exams.length,
    focusSessions: focus.length,
    subjects: [...new Set(notes.map((n) => n.subject).filter(Boolean))],
  });

  const parsed = await groqJSON<{
    visualScore?: number;
    auditoryScore?: number;
    readWriteScore?: number;
    kinestheticScore?: number;
    bestTimeOfDay?: string;
    avgSessionMinutes?: number;
    learningVelocity?: number;
    profile?: Record<string, unknown>;
  }>({
    user: `Analyze this student's learning data and generate their Study DNA profile.

Data: ${dataStr}

Respond ONLY in JSON:
{
  "visualScore": 72,
  "auditoryScore": 45,
  "readWriteScore": 88,
  "kinestheticScore": 60,
  "bestTimeOfDay": "evening",
  "avgSessionMinutes": 35,
  "learningVelocity": 1.2,
  "profile": {
    "type": "Read/Write Learner",
    "strengths": ["Note-taking", "Written explanations", "Structured review"],
    "weaknesses": ["Visual diagrams", "Audio content"],
    "recommendation": "You learn best through writing and reading. Use Cornell notes and written Feynman technique.",
    "superpower": "You can process and retain written information 20% faster than average.",
    "kryptonite": "You struggle with purely visual or diagram-based content."
  }
}`,
    maxTokens: 600,
  });

  if (!parsed) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  const data = {
    visualScore: parsed.visualScore ?? 0,
    auditoryScore: parsed.auditoryScore ?? 0,
    readWriteScore: parsed.readWriteScore ?? 0,
    kinestheticScore: parsed.kinestheticScore ?? 0,
    bestTimeOfDay: parsed.bestTimeOfDay ?? "morning",
    avgSessionMinutes: parsed.avgSessionMinutes ?? 0,
    learningVelocity: parsed.learningVelocity ?? 1,
    profile: (parsed.profile ?? {}) as Prisma.InputJsonValue,
  };

  const dna = await prisma.studyDNA.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return NextResponse.json({ dna });
}
