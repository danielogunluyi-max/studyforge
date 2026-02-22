import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

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

    const battle = await db.battle.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true, email: true } },
        opponent: { select: { id: true, name: true, email: true } },
        participants: {
          select: {
            userId: true,
            score: true,
            correctCount: true,
            totalAnswered: true,
          },
        },
        result: true,
      },
    });

    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    if (battle.hostId !== session.user.id && battle.opponentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ battle });
  } catch (error) {
    console.error("Battle status error:", error);
    return NextResponse.json({ error: "Failed to get battle status" }, { status: 500 });
  }
}
