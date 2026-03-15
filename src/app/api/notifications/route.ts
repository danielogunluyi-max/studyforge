import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const overdue = await prisma.flashcard.findMany({
    where: {
      deck: { userId: session.user.id },
      nextReview: { lte: now },
    },
    include: { deck: { select: { title: true } } },
    take: 5,
  });

  const notifications = overdue.map((card) => ({
    title: `Time to review: ${card.deck.title}`,
    body: card.front.slice(0, 80),
    url: `/flashcards/${card.deckId}/study`,
  }));

  return NextResponse.json({ notifications });
}
