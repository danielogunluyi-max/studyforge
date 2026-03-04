import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { ensureGroupMember } from "~/server/study-groups";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;

    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cards = await db.groupFlashcard.findMany({
      where: { groupId: id },
      include: { creator: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const total = cards.length;
    const knownCounts = cards.reduce((sum, card) => sum + (card.knownBy.includes(session.user.id) ? 1 : 0), 0);
    const progress = total ? Math.round((knownCounts / total) * 100) : 0;

    return NextResponse.json({ cards, progress });
  } catch (error) {
    console.error("Group flashcards get error:", error);
    return NextResponse.json({ error: "Failed to fetch flashcards" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;

    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { action?: "add" | "mark"; cardId?: string; front?: string; back?: string; status?: "known" | "learning" };

    if (body.action === "mark") {
      const cardId = (body.cardId ?? "").trim();
      if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
      const card = await db.groupFlashcard.findUnique({ where: { id: cardId } });
      if (!card || card.groupId !== id) return NextResponse.json({ error: "Card not found" }, { status: 404 });

      const knownBy = new Set(card.knownBy);
      const learningBy = new Set(card.learningBy);
      if (body.status === "known") {
        knownBy.add(session.user.id);
        learningBy.delete(session.user.id);
      } else {
        learningBy.add(session.user.id);
        knownBy.delete(session.user.id);
      }

      const updated = await db.groupFlashcard.update({
        where: { id: cardId },
        data: { knownBy: Array.from(knownBy), learningBy: Array.from(learningBy) },
      });

      return NextResponse.json({ card: updated });
    }

    const front = (body.front ?? "").trim();
    const back = (body.back ?? "").trim();
    if (!front || !back) return NextResponse.json({ error: "front and back required" }, { status: 400 });

    const card = await db.groupFlashcard.create({
      data: { groupId: id, creatorId: session.user.id, front, back },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Group flashcards post error:", error);
    return NextResponse.json({ error: "Failed to update flashcards" }, { status: 500 });
  }
}
