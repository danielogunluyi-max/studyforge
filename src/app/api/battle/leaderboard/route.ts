import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

function levelFromXp(xp: number): "Beginner" | "Scholar" | "Expert" | "Master" {
  if (xp >= 3000) return "Master";
  if (xp >= 1500) return "Expert";
  if (xp >= 500) return "Scholar";
  return "Beginner";
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = (searchParams.get("subject") ?? "").trim();
    const period = (searchParams.get("period") ?? "all").trim();

    const now = new Date();
    const fromDate =
      period === "week"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : period === "month"
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : null;

    const participantRows = await db.battleParticipant.findMany({
      where: {
        battle: {
          status: "completed",
          ...(fromDate ? { completedAt: { gte: fromDate } } : {}),
          ...(subject && subject !== "All" ? { subject } : {}),
        },
      },
      select: {
        userId: true,
        score: true,
      },
    });

    const scopedScores = participantRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.userId] = (acc[row.userId] ?? 0) + row.score;
      return acc;
    }, {});

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        battleXp: true,
        battleAchievements: true,
      },
      take: 150,
    });

    const sortedUsers = [...users].sort((a, b) => {
      const aScore = period === "all" && (!subject || subject === "All") ? a.battleXp : scopedScores[a.id] ?? 0;
      const bScore = period === "all" && (!subject || subject === "All") ? b.battleXp : scopedScores[b.id] ?? 0;
      return bScore - aScore;
    });

    const rows = sortedUsers.map((user, index) => {
      const xpValue = period === "all" && (!subject || subject === "All") ? user.battleXp : scopedScores[user.id] ?? 0;
      return {
      rank: index + 1,
      userId: user.id,
      name: user.name || "Anonymous",
      xp: xpValue,
      level: levelFromXp(xpValue),
      achievements: user.battleAchievements,
      };
    }).filter((row) => row.xp > 0);

    const currentUser = rows.find((row) => row.userId === session.user.id) ?? null;

    return NextResponse.json({
      subject: subject || "All",
      period,
      leaderboard: rows,
      currentUser,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
