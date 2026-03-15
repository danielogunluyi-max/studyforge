import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '~/server/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          notes: true,
          flashcardDecks: true,
        },
      },
    },
    take: 50,
  });

  const ranked = users
    .map((u) => ({
      id: u.id,
      name: u.name ?? 'Student',
      score: u._count.notes + u._count.flashcardDecks,
      notes: u._count.notes,
      decks: u._count.flashcardDecks,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return NextResponse.json({ leaderboard: ranked });
}
