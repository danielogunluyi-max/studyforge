import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";

type UpdateDeckBody = {
  title?: string;
  subject?: string;
  description?: string | null;
};

async function findUserDeck(deckId: string, userId: string) {
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

    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        cards: {
          orderBy: { nextReview: "asc" },
        },
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ deck });
  } catch (error) {
    console.error("Deck detail GET error:", error);
    return NextResponse.json({ error: "Failed to fetch deck" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deck = await findUserDeck(id, session.user.id);
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateDeckBody;
    const nextTitle = typeof body.title === "string" ? body.title.trim() : undefined;
    const nextSubject = typeof body.subject === "string" ? body.subject.trim() : undefined;
    const nextDescription = typeof body.description === "string" ? body.description.trim() : body.description;

    const updated = await prisma.flashcardDeck.update({
      where: { id: deck.id },
      data: {
        ...(nextTitle !== undefined ? { title: nextTitle || deck.title } : {}),
        ...(nextSubject !== undefined ? { subject: nextSubject || deck.subject } : {}),
        ...(nextDescription !== undefined ? { description: nextDescription || null } : {}),
      },
    });

    return NextResponse.json({ deck: updated });
  } catch (error) {
    console.error("Deck PATCH error:", error);
    return NextResponse.json({ error: "Failed to update deck" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deck = await findUserDeck(id, session.user.id);
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    await prisma.flashcardDeck.delete({ where: { id: deck.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deck DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete deck" }, { status: 500 });
  }
}
