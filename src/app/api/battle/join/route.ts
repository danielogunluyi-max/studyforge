import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const code = (body.code ?? "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Battle code is required" }, { status: 400 });
    }

    const battle = await db.battle.findUnique({ where: { code } });
    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    if (battle.hostId === session.user.id) {
      return NextResponse.json({ battleId: battle.id, status: battle.status });
    }

    if (battle.opponentId && battle.opponentId !== session.user.id) {
      return NextResponse.json({ error: "Battle already has an opponent" }, { status: 409 });
    }

    const updated = await db.battle.update({
      where: { id: battle.id },
      data: {
        opponentId: session.user.id,
        status: "active",
        startedAt: battle.startedAt ?? new Date(),
        participants: {
          upsert: {
            where: {
              battleId_userId: {
                battleId: battle.id,
                userId: session.user.id,
              },
            },
            update: {},
            create: {
              userId: session.user.id,
              answers: [],
              score: 0,
              correctCount: 0,
              totalAnswered: 0,
            },
          },
        },
      },
      select: {
        id: true,
        code: true,
        status: true,
        questionCount: true,
      },
    });

    return NextResponse.json({ battle: updated });
  } catch (error) {
    console.error("Battle join error:", error);
    return NextResponse.json({ error: "Failed to join battle" }, { status: 500 });
  }
}
