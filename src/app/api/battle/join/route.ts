import { NextResponse } from "next/server";
import { getAuthSession } from "~/server/auth/session";
import { db } from "~/server/db";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string; subject?: string; questionCount?: number };
    const code = (body.code ?? "").trim().toUpperCase();

    if (!code && body.subject) {
      const subject = body.subject.trim();

      const waitingBattle = await db.battle.findFirst({
        where: {
          status: "waiting",
          subject,
          mode: "pvp",
          opponentId: null,
          hostId: { not: session.user.id },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!waitingBattle) {
        return NextResponse.json({ error: "No open room right now. Try again in a few seconds." }, { status: 404 });
      }

      const updatedRoomBattle = await db.battle.update({
        where: { id: waitingBattle.id },
        data: {
          opponentId: session.user.id,
          status: "active",
          startedAt: waitingBattle.startedAt ?? new Date(),
          participants: {
            upsert: {
              where: {
                battleId_userId: {
                  battleId: waitingBattle.id,
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

      return NextResponse.json({ battle: updatedRoomBattle });
    }

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
