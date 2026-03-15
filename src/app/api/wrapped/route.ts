import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { year?: number; month?: number };
  const year = body.year ?? new Date().getFullYear();
  const month = body.month;

  const startDate = new Date(year, (month || 1) - 1, 1);
  const endDate = month ? new Date(year, month, 0, 23, 59, 59, 999) : new Date(year, 11, 31, 23, 59, 59, 999);

  const [notes, cards, exams, feynman, focus, community, wellness, podcasts, flashcardDecks] = await Promise.all([
    prisma.note.findMany({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } }, select: { subject: true } }),
    prisma.flashcard.count({ where: { deck: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } } } }),
    prisma.exam.findMany({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } }, select: { subject: true, score: true } }),
    prisma.feynmanSession.count({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } } }),
    prisma.focusSession.findMany({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } }, select: { duration: true } }),
    prisma.communityPost.count({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } } }),
    prisma.wellnessEntry.findMany({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } }, select: { mood: true } }),
    prisma.podcast.count({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } } }),
    prisma.flashcardDeck.count({ where: { userId: session.user.id, createdAt: { gte: startDate, lte: endDate } } }),
  ]);

  const totalHours = focus.reduce((a, f) => a + (f.duration || 0), 0) / 3600;
  const avgScore = exams.length ? exams.reduce((a, e) => a + (e.score || 0), 0) / exams.length : 0;

  const subjectCounts: Record<string, number> = {};
  notes.forEach((n) => {
    if (n.subject) subjectCounts[n.subject] = (subjectCounts[n.subject] || 0) + 1;
  });
  const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";

  const featureCounts = {
    "Note Generator": notes.length,
    Flashcards: cards,
    "Feynman Technique": feynman,
    Podcasts: podcasts,
    Community: community,
  };
  const topFeature = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Notes";

  const avgMood = wellness.length ? wellness.reduce((a, w) => a + w.mood, 0) / wellness.length : 3;

  const data = {
    totalHours: Math.round(totalHours * 10) / 10,
    totalNotes: notes.length,
    totalCards: cards,
    totalDecks: flashcardDecks,
    totalExams: exams.length,
    avgScore: Math.round(avgScore),
    feynmanSessions: feynman,
    focusSessions: focus.length,
    communityPosts: community,
    podcasts,
    topSubject,
    topFeature,
    avgMood: Math.round(avgMood * 10) / 10,
    subjectBreakdown: subjectCounts,
  };

  const wrapped = await prisma.wrappedStat.upsert({
    where: { userId_year_month: { userId: session.user.id, year, month: month ?? null } },
    update: { ...data, data },
    create: {
      userId: session.user.id,
      year,
      month: month ?? null,
      totalHours: data.totalHours,
      totalNotes: data.totalNotes,
      totalCards: data.totalCards,
      topSubject: data.topSubject,
      longestStreak: 0,
      totalExams: data.totalExams,
      avgScore: data.avgScore,
      topFeature: data.topFeature,
      data,
    },
  });

  return NextResponse.json({ wrapped, data });
}
