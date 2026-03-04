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

    const profile = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        battleXp: true,
        battleWinStreak: true,
        soloSessionsCompleted: true,
        battleAchievements: true,
      },
    });

    const xp = profile?.battleXp ?? 0;
    const level = xp >= 3000 ? "Master" : xp >= 1500 ? "Expert" : xp >= 500 ? "Scholar" : "Beginner";
    const nextLevelXp = xp >= 3000 ? 3000 : xp >= 1500 ? 3000 : xp >= 500 ? 1500 : 500;
    const prevLevelXp = xp >= 3000 ? 3000 : xp >= 1500 ? 1500 : xp >= 500 ? 500 : 0;
    const levelProgress = nextLevelXp === prevLevelXp ? 100 : Math.round(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100);

    return NextResponse.json({
      battles,
      stats,
      profile: {
        xp,
        level,
        levelProgress: Math.max(0, Math.min(100, levelProgress)),
        battleWinStreak: profile?.battleWinStreak ?? 0,
        soloSessionsCompleted: profile?.soloSessionsCompleted ?? 0,
        achievements: profile?.battleAchievements ?? [],
      },
    });
  } catch (error) {
    console.error("Battle list error:", error);
    return NextResponse.json({ error: "Failed to fetch battles" }, { status: 500 });
  }
}
