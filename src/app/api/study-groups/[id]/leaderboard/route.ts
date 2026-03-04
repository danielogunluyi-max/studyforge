import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { ensureGroupMember, getWeekKey } from "~/server/study-groups";

type GroupByRow = {
  userId: string;
  _sum: {
    allTimeScore: number | null;
    notesSaved: number | null;
    quizzesCompleted: number | null;
    messagesSent: number | null;
  };
};

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

    const weekKey = getWeekKey();

    const weekly = await db.groupMemberStats.findMany({
      where: { groupId: id, weekKey },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { weeklyScore: "desc" },
    });

    const allTime = await db.groupMemberStats.groupBy({
      by: ["userId"],
      where: { groupId: id },
      _sum: { allTimeScore: true, notesSaved: true, quizzesCompleted: true, messagesSent: true },
      orderBy: { _sum: { allTimeScore: "desc" } },
    });

    const users = await db.user.findMany({
      where: { id: { in: allTime.map((row) => row.userId) } },
      select: { id: true, name: true, email: true },
    });

    const allTimeRows = (allTime as GroupByRow[]).map((row) => ({
      userId: row.userId,
      user: users.find((user) => user.id === row.userId) ?? null,
      allTimeScore: row._sum.allTimeScore ?? 0,
      notesSaved: row._sum.notesSaved ?? 0,
      quizzesCompleted: row._sum.quizzesCompleted ?? 0,
      messagesSent: row._sum.messagesSent ?? 0,
    }));

    return NextResponse.json({
      weekKey,
      weekly,
      allTime: allTimeRows,
      topWeeklyUserId: weekly[0]?.userId ?? null,
    });
  } catch (error) {
    console.error("Group leaderboard error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
