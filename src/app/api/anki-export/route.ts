import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deckId = searchParams.get("deckId");

  if (!deckId) return NextResponse.json({ error: "deckId required" }, { status: 400 });

  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId: session.user.id },
    include: { cards: true },
  });

  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  // Anki TSV format: front\tback\ttags
  const rows = deck.cards.map((card) => `${card.front.replace(/\t/g, " ")}\t${card.back.replace(/\t/g, " ")}\t${deck.subject || ""}`);
  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${deck.title}-anki.txt"`,
    },
  });
}
