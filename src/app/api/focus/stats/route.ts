import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeek(start: Date) {
  const next = new Date(start);
  next.setDate(next.getDate() + 7);
  return next;
}

function minutesForSession(session: { actualMins: number | null; durationMins: number }) {
  return session.actualMins ?? session.durationMins;
}

function computeStreak(completedDates: Date[]) {
  const completedSet = new Set(completedDates.map((date) => startOfDay(date).toISOString().slice(0, 10)));
  const today = startOfDay(new Date());

  let streak = 0;
  let cursor = today;

  while (completedSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    const prev = new Date(cursor);
    prev.setDate(prev.getDate() - 1);
    cursor = prev;
  }

  return streak;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(weekStart);

    const weeklySessions = await db.focusSession.findMany({
      where: {
        userId: session.user.id,
        startedAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      select: {
        completed: true,
        distractions: true,
        actualMins: true,
        durationMins: true,
        startedAt: true,
      },
      orderBy: { startedAt: "asc" },
    });

    const completedSessions = await db.focusSession.findMany({
      where: {
        userId: session.user.id,
        completed: true,
      },
      select: {
        startedAt: true,
      },
      orderBy: { startedAt: "desc" },
    });

    const totalSessionsThisWeek = weeklySessions.length;
    const totalMinutesThisWeek = weeklySessions.reduce((sum, item) => sum + minutesForSession(item), 0);
    const averageSessionLength =
      totalSessionsThisWeek > 0 ? Math.round(totalMinutesThisWeek / totalSessionsThisWeek) : 0;
    const longestSession = weeklySessions.reduce((max, item) => Math.max(max, minutesForSession(item)), 0);
    const totalDistractions = weeklySessions.reduce((sum, item) => sum + item.distractions, 0);
    const completedCount = weeklySessions.filter((item) => item.completed).length;
    const completionRate =
      totalSessionsThisWeek > 0 ? Math.round((completedCount / totalSessionsThisWeek) * 100) : 0;

    const streak = computeStreak(completedSessions.map((item) => item.startedAt));

    const minuteTotalsByDay = new Map<number, number>();
    for (let i = 0; i < 7; i += 1) {
      minuteTotalsByDay.set(i, 0);
    }

    weeklySessions.forEach((item) => {
      const day = item.startedAt.getDay();
      const current = minuteTotalsByDay.get(day) ?? 0;
      minuteTotalsByDay.set(day, current + minutesForSession(item));
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let bestDay = "Mon";
    let bestMinutes = -1;

    for (const [dayIdx, mins] of minuteTotalsByDay.entries()) {
      if (mins > bestMinutes) {
        bestMinutes = mins;
        bestDay = dayNames[dayIdx] ?? "Mon";
      }
    }

    return NextResponse.json({
      stats: {
        totalSessionsThisWeek,
        totalMinutesThisWeek,
        averageSessionLength,
        longestSession,
        totalDistractions,
        completionRate,
        streak,
        bestDay,
      },
    });
  } catch (error) {
    console.error("Focus stats GET error:", error);
    return NextResponse.json({ error: "Failed to fetch focus stats" }, { status: 500 });
  }
}
