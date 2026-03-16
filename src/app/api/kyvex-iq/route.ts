import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

function getRank(score: number): string {
  if (score >= 950) return 'Legendary Scholar 👑';
  if (score >= 850) return 'Elite Student 💎';
  if (score >= 750) return 'Advanced Learner 🔥';
  if (score >= 600) return 'Dedicated Student ⚡';
  if (score >= 400) return 'Rising Scholar 📈';
  if (score >= 200) return 'Getting Started 🌱';
  return 'Beginner 🎯';
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [notes, cards, exams, feynman, focus, habits, wellness, contracts] = await Promise.all([
    prisma.note.count({ where: { userId: session.user.id } }),
    prisma.flashcard.count({ where: { deck: { userId: session.user.id } } }),
    prisma.exam.findMany({ where: { userId: session.user.id }, select: { scorePercent: true } }),
    prisma.feynmanSession.findMany({ where: { userId: session.user.id }, select: { score: true } }),
    prisma.focusSession.findMany({ where: { userId: session.user.id }, select: { durationMins: true, startedAt: true } }),
    prisma.habit.findMany({ where: { userId: session.user.id }, select: { streak: true } }),
    prisma.wellnessEntry.count({ where: { userId: session.user.id } }),
    prisma.studyContract.findMany({ where: { userId: session.user.id }, select: { currentStreak: true } }),
  ]);

  const avgExam = exams.length ? exams.reduce((a: number, e: any) => a + (e.scorePercent || 0), 0) / exams.length : 0;
  const avgFeynman = feynman.length ? feynman.reduce((a: number, f: any) => a + (f.score || 0), 0) / feynman.length : 0;
  const masteryScore = Math.round(((avgExam * 0.6 + avgFeynman * 0.4) / 100) * 250);

  const maxHabitStreak = habits.length ? Math.max(...habits.map((h: any) => h.streak)) : 0;
  const contractStreak = contracts.length ? Math.max(...contracts.map((c: any) => c.currentStreak)) : 0;
  const consistencyScore = Math.min(250, Math.round(maxHabitStreak * 5 + contractStreak * 8 + wellness * 2));

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const recentFocus = focus.filter((f: any) => new Date(f.startedAt) > sevenDaysAgo);
  const weeklyHours = recentFocus.reduce((a: number, f: any) => a + (f.durationMins || 0), 0) / 60;
  const velocityScore = Math.min(250, Math.round(notes * 3 + cards * 0.5 + weeklyHours * 10));

  const depthScore = Math.min(250, Math.round(feynman.length * 5 + exams.length * 3 + notes * 2));

  const total = masteryScore + consistencyScore + velocityScore + depthScore;
  const rank = getRank(total);

  const iq = await prisma.kyvexIQ.upsert({
    where: { userId: session.user.id },
    update: {
      score: total,
      masteryScore,
      consistencyScore,
      velocityScore,
      depthScore,
      rank,
      breakdown: { notes, cards, exams: exams.length, feynman: feynman.length } as never,
    },
    create: {
      userId: session.user.id,
      score: total,
      masteryScore,
      consistencyScore,
      velocityScore,
      depthScore,
      rank,
      breakdown: { notes, cards, exams: exams.length, feynman: feynman.length } as never,
    },
  });

  return NextResponse.json({
    iq,
    breakdown: { masteryScore, consistencyScore, velocityScore, depthScore, total, rank },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const iq = await prisma.kyvexIQ.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ iq });
}
