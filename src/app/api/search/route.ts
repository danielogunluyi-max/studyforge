import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [notes, decks, flashcards, exams] = await Promise.all([
    db.note.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, title: true, content: true, createdAt: true },
    }),
    db.flashcardDeck.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, title: true, description: true, createdAt: true },
    }),
    db.flashcard.findMany({
      where: {
        OR: [
          { front: { contains: q, mode: "insensitive" } },
          { back: { contains: q, mode: "insensitive" } },
        ],
        deck: { userId: session.user.id },
      },
      take: 5,
      select: { id: true, front: true, back: true, createdAt: true, deckId: true },
    }),
    db.exam.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { subject: { contains: q, mode: "insensitive" } },
          { topics: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, subject: true, examDate: true, topics: true },
    }),
  ]);

  return NextResponse.json({
    results: {
      notes: notes.map((n) => ({ ...n, type: "note", excerpt: n.content.slice(0, 120) })),
      decks: decks.map((d) => ({ ...d, type: "deck" })),
      flashcards: flashcards.map((f) => ({ ...f, type: "flashcard" })),
      exams: exams.map((e) => ({ ...e, type: "exam" })),
    },
  });
}
