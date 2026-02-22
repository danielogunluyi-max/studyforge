import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const battles = await db.battle.findMany({
      where: {
        OR: [{ hostId: session.user.id }, { opponentId: session.user.id }],
      },
      include: {
        host: { select: { id: true, name: true } },
        opponent: { select: { id: true, name: true } },
        result: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const stats = {
      total: battles.filter((battle) => battle.status === "completed").length,
      wins: battles.filter((battle) => battle.result?.winnerId === session.user.id).length,
      losses: battles.filter(
        (battle) => battle.result && battle.result.winnerId && battle.result.winnerId !== session.user.id,
      ).length,
    };

    return NextResponse.json({ battles, stats });
  } catch (error) {
    console.error("Battle list error:", error);
    return NextResponse.json({ error: "Failed to fetch battles" }, { status: 500 });
  }
}
