import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";

type CreateDeckBody = {
  title?: string;
  subject?: string;
  description?: string;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const decks = await prisma.flashcardDeck.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });

    const withDueCount = await Promise.all(
      decks.map(async (deck) => {
        const dueCount = await prisma.flashcard.count({
          where: {
            deckId: deck.id,
            nextReview: { lte: now },
          },
        });

        return {
          ...deck,
          dueCount,
        };
      }),
    );

    return NextResponse.json({ decks: withDueCount });
  } catch (error) {
    console.error("Deck GET error:", error);
    return NextResponse.json({ error: "Failed to fetch decks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateDeckBody;
    const title = String(body.title ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    const deck = await prisma.flashcardDeck.create({
      data: {
        userId: session.user.id,
        title,
        subject,
        description: description || null,
      },
    });

    return NextResponse.json({ deck }, { status: 201 });
  } catch (error) {
    console.error("Deck POST error:", error);
    return NextResponse.json({ error: "Failed to create deck" }, { status: 500 });
  }
}
