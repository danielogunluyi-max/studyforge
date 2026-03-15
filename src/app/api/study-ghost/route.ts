import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notes, cards, exams, focus] = await Promise.all([
    prisma.note.count({ where: { userId: session.user.id } }),
    prisma.flashcard.count({ where: { deck: { userId: session.user.id } } }),
    prisma.exam.findMany({ where: { userId: session.user.id }, select: { score: true, subject: true } }),
    prisma.focusSession.count({ where: { userId: session.user.id } }),
  ]);

  const avgScore = exams.length ? exams.reduce((a, e) => a + (e.score || 0), 0) / exams.length : 0;
  const subjects = [...new Set(exams.map((e) => e.subject).filter(Boolean))];

  const prevSnapshot = await prisma.studyGhost.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `You are writing a letter from a student's past self to their current self, showing how much they've grown.

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
      },
    ],
    max_tokens: 300,
  });

  const narrative = completion.choices[0]?.message?.content || "";

  const ghost = await prisma.studyGhost.create({
    data: {
      userId: session.user.id,
      totalNotes: notes,
      totalCards: cards,
      totalExams: exams.length,
      avgExamScore: avgScore,
      totalSessions: focus,
      topSubjects: subjects.slice(0, 5) as string[],
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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ghosts = await prisma.studyGhost.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ghosts });
}
