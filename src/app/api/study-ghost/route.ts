import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma } from "@/lib/prisma";
import { runGroqPrompt } from "~/server/groq";

export async function POST() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const [notes, cards, exams, focus] = await Promise.all([
    prisma.note.count({ where: { userId } }),
    prisma.flashcard.count({ where: { deck: { userId } } }),
    prisma.exam.findMany({ where: { userId }, select: { score: true, subject: true } }),
    prisma.focusSession.count({ where: { userId } }),
  ]);

  const avgScore = exams.length ? exams.reduce((a, e) => a + (e.score || 0), 0) / exams.length : 0;
  const subjects = [...new Set(exams.map((e) => e.subject).filter(Boolean))];

  const prevSnapshot = await prisma.studyGhost.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const narrative = await runGroqPrompt({
    user: `You are writing a letter from a student's past self to their current self, showing how much they've grown.

Current stats:
- Notes created: ${notes}
- Flashcards: ${cards}
- Exams logged: ${exams.length}
- Average exam score: ${avgScore.toFixed(1)}%
- Focus sessions: ${focus}
- Subjects: ${subjects.join(", ") || "various"}

${prevSnapshot ? `Previous snapshot (${new Date(prevSnapshot.createdAt).toLocaleDateString()}):
- Notes: ${prevSnapshot.totalNotes}
- Cards: ${prevSnapshot.totalCards}
- Avg score: ${prevSnapshot.avgExamScore.toFixed(1)}%` : "This is the first snapshot."}

Write a short, emotional, motivating letter (150 words) from their past self showing their growth. Make it personal and specific to the numbers. Start with "Hey, it's past-you from [date]..."`,
    maxTokens: 300,
  });

  const ghost = await prisma.studyGhost.create({
    data: {
      userId,
      totalNotes: notes,
      totalCards: cards,
      totalExams: exams.length,
      avgExamScore: avgScore,
      totalSessions: focus,
      topSubjects: subjects.slice(0, 5),
      masteryScores: {},
      narrative,
    },
  });

  return NextResponse.json({
    ghost,
    prevSnapshot,
    growth: {
      notes: notes - (prevSnapshot?.totalNotes || 0),
      cards: cards - (prevSnapshot?.totalCards || 0),
      scoreChange: avgScore - (prevSnapshot?.avgExamScore || 0),
    },
  });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const ghosts = await prisma.studyGhost.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ghosts });
}
