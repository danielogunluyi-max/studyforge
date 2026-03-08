import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { sm2 } from "@/lib/sm2";

type UpdateCardBody = {
  front?: string;
  back?: string;
  rating?: 0 | 1 | 2 | 3;
};

async function resolveCard(deckId: string, cardId: string, userId: string) {
  return prisma.flashcard.findFirst({
    where: {
      id: cardId,
      deckId,
      deck: {
        userId,
      },
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, cardId } = await context.params;
    const card = await resolveCard(id, cardId, session.user.id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateCardBody;

    if (typeof body.rating === "number") {
      if (![0, 1, 2, 3].includes(body.rating)) {
        return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
      }

      const next = sm2(
        {
          easeFactor: card.easeFactor,
          interval: card.interval,
          repetitions: card.repetitions,
          nextReview: card.nextReview,
          lastReviewed: card.lastReviewed,
        },
        body.rating,
      );

      const updated = await prisma.flashcard.update({
        where: { id: card.id },
        data: {
          easeFactor: next.easeFactor,
          interval: next.interval,
          repetitions: next.repetitions,
          nextReview: next.nextReview,
          lastReviewed: next.lastReviewed,
        },
      });

      return NextResponse.json({ card: updated });
    }

    const nextFront = typeof body.front === "string" ? body.front.trim() : undefined;
    const nextBack = typeof body.back === "string" ? body.back.trim() : undefined;

    if (nextFront === undefined && nextBack === undefined) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const updated = await prisma.flashcard.update({
      where: { id: card.id },
      data: {
        ...(nextFront !== undefined ? { front: nextFront || card.front } : {}),
        ...(nextBack !== undefined ? { back: nextBack || card.back } : {}),
      },
    });

    return NextResponse.json({ card: updated });
  } catch (error) {
    console.error("Card PATCH error:", error);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, cardId } = await context.params;
    const card = await resolveCard(id, cardId, session.user.id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await prisma.flashcard.delete({ where: { id: card.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Card DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
