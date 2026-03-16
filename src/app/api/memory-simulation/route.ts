import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { deckId?: string };
  const deckId = body.deckId ?? '';

  if (!deckId) {
    return NextResponse.json({ error: 'deckId required' }, { status: 400 });
  }

  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId: session.user.id },
    include: {
      cards: { select: { id: true, front: true, interval: true, nextReview: true, easeFactor: true } },
    },
  });

  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  if (deck.cards.length === 0) {
    return NextResponse.json({ error: 'Deck has no cards' }, { status: 400 });
  }

  const intervals = [1, 7, 30, 90, 365];

  const simulation = deck.cards.map((card: any) => ({
    id: card.id,
    question: card.front.slice(0, 60),
    retention: intervals.map((days) => {
      const stability = Math.max(1, (card.interval || 1) * (card.easeFactor || 2.5));
      const retention = Math.exp(-days / stability);
      return { days, retention: Math.round(Math.max(0, Math.min(100, retention * 100))) };
    }),
  }));

  const avgRetention = intervals.map((days) => ({
    days,
    avg: Math.round(
      simulation.reduce((a: number, c: any) => {
        const r = c.retention.find((x: any) => x.days === days)?.retention || 0;
        return a + r;
      }, 0) / simulation.length,
    ),
  }));

  const saved = await prisma.memorySimulation.create({
    data: {
      userId: session.user.id,
      deckId,
      simulation: { cards: simulation, avg: avgRetention } as never,
    },
  });

  return NextResponse.json({ simulation, avgRetention, id: saved.id });
}
