import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    activeMinutes?: number;
    totalMinutes?: number;
    distractions?: number;
  };

  const activeMinutes = Number(body.activeMinutes ?? 0);
  const totalMinutes = Number(body.totalMinutes ?? 0);
  const distractions = Number(body.distractions ?? 0);

  if (activeMinutes < 0 || totalMinutes <= 0 || distractions < 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const deepWorkRatio = activeMinutes / totalMinutes;
  const distractionPenalty = Math.min(distractions * 5, 40);
  const score = Math.max(0, Math.round(deepWorkRatio * 100 - distractionPenalty));

  const focusScore = await prisma.focusScore.create({
    data: {
      userId: session.user.id,
      score,
      activeMinutes,
      totalMinutes,
      distractions,
      deepWorkRatio,
    },
  });

  return NextResponse.json({ focusScore, score });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scores = await prisma.focusScore.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const avg = scores.length ? scores.reduce((a: number, s: any) => a + s.score, 0) / scores.length : 0;
  return NextResponse.json({ scores, avgScore: Math.round(avg) });
}
