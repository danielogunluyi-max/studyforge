import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { DeckLibraryClient } from "./deck-library-client";

type DeckSummary = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  totalCards: number;
  dueCards: number;
};

type NoteOption = {
  id: string;
  title: string;
};

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ generateFrom?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [rawDecks, studiedToday, noteOptions] = await Promise.all([
    prisma.flashcardDeck.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { cards: true } } },
    }),
    prisma.flashcard.count({
      where: {
        deck: { userId: session.user.id },
        lastReviewed: { gte: todayStart },
      },
    }),
    prisma.note.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
  ]);

  const dueCounts = await Promise.all(
    rawDecks.map((deck) =>
      prisma.flashcard.count({
        where: {
          deckId: deck.id,
          nextReview: { lte: now },
        },
      }),
    ),
  );

  const decks: DeckSummary[] = rawDecks.map((deck, index) => ({
    id: deck.id,
    title: deck.title,
    subject: deck.subject,
    description: deck.description,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
    totalCards: deck._count.cards,
    dueCards: dueCounts[index] ?? 0,
  }));

  const notes: NoteOption[] = noteOptions.map((note) => ({ id: note.id, title: note.title }));
  const params = (await searchParams) ?? {};

  return (
    <div className="kv-page kv-animate-in">
      <DeckLibraryClient
        initialDecks={decks}
        studiedToday={studiedToday}
        notes={notes}
        initialGenerateFrom={params.generateFrom ?? ""}
      />
    </div>
  );
}
