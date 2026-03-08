import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";

type CreateCardBody = {
  front?: string;
  back?: string;
};

async function resolveDeck(deckId: string, userId: string) {
  return prisma.flashcardDeck.findFirst({
    where: {
      id: deckId,
      userId,
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deck = await resolveDeck(id, session.user.id);
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const cards = await prisma.flashcard.findMany({
      where: { deckId: deck.id },
      orderBy: { nextReview: "asc" },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Deck cards GET error:", error);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deck = await resolveDeck(id, session.user.id);
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateCardBody;
    const front = String(body.front ?? "").trim();
    const back = String(body.back ?? "").trim();

    if (!front || !back) {
      return NextResponse.json({ error: "Front and back are required" }, { status: 400 });
    }

    const card = await prisma.flashcard.create({
      data: {
        deckId: deck.id,
        front,
        back,
      },
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error("Deck cards POST error:", error);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
