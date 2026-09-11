import { redirect } from "next/navigation";

import { FocusStartButton } from "~/app/_components/focus-start-button";
import { getAuthSession } from "~/server/auth/session";
import { db } from "~/server/db";
import { loginUrlFor } from "~/lib/auth-redirect";
import { formatTorontoDate } from "~/lib/toronto-time";

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

function toMinutes(actualMins: number | null, durationMins: number) {
  return actualMins ?? durationMins;
}

function formatMinutes(totalMins: number) {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours} hrs ${mins} min`;
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

export default async function FocusPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect(loginUrlFor("/focus"));
  }

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(weekStart);

  const [weeklySessions, historySessions, completedSessions] = await Promise.all([
    db.focusSession.findMany({
      where: {
        userId: session.user.id,
        startedAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: { startedAt: "asc" },
      select: {
        id: true,
        goal: true,
        durationMins: true,
        actualMins: true,
        completed: true,
        abandoned: true,
        distractions: true,
        startedAt: true,
      },
    }),
    db.focusSession.findMany({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        goal: true,
        durationMins: true,
        actualMins: true,
        distractions: true,
        completed: true,
        abandoned: true,
        startedAt: true,
      },
    }),
    db.focusSession.findMany({
      where: { userId: session.user.id, completed: true },
      select: { startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const totalSessionsThisWeek = weeklySessions.length;
  const totalMinutesThisWeek = weeklySessions.reduce((sum, item) => sum + toMinutes(item.actualMins, item.durationMins), 0);
  const averageSessionLength =
    totalSessionsThisWeek > 0 ? Math.round(totalMinutesThisWeek / totalSessionsThisWeek) : 0;
  const longestSession = weeklySessions.reduce(
    (max, item) => Math.max(max, toMinutes(item.actualMins, item.durationMins)),
    0,
  );
  const totalDistractions = weeklySessions.reduce((sum, item) => sum + item.distractions, 0);
  const completionRate =
    totalSessionsThisWeek > 0
      ? Math.round((weeklySessions.filter((item) => item.completed).length / totalSessionsThisWeek) * 100)
      : 0;
  const streak = computeStreak(completedSessions.map((item) => item.startedAt));

  const monday = new Date(weekStart);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    const dayMinutes = weeklySessions
      .filter((item) => {
        const day = item.startedAt.getDay();
        const normalizedIdx = day === 0 ? 6 : day - 1;
        return normalizedIdx === idx;
      })
      .reduce((sum, item) => sum + toMinutes(item.actualMins, item.durationMins), 0);

    return {
      label,
      minutes: dayMinutes,
      isToday: startOfDay(new Date()).toISOString() === startOfDay(dayDate).toISOString(),
    };
  });

  const maxDayMinutes = Math.max(1, ...weekDays.map((day) => day.minutes));

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="kv-crumb">Kyvex / <b>Focus Mode</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Focus Mode</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>
          Track your deep work sessions and build focus habits
        </p>

        <div className="kv-stats" style={{ marginTop: 28, gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kv-stat">
            <span className="kv-meta">This week</span>
            <b className="num" style={{ fontSize: 22 }}>{formatMinutes(totalMinutesThisWeek)}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Avg session</span>
            <b className="num">{averageSessionLength} min</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Completion</span>
            <b className="num">{completionRate}%</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Longest</span>
            <b className="num">{longestSession} min</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Distractions</span>
            <b className="num">{totalDistractions}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Streak</span>
            <b className="num">{streak} day{streak === 1 ? "" : "s"}</b>
          </div>
        </div>

        <p className="kv-meta" style={{ marginTop: 32 }}>Weekly focus minutes</p>
        <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
          {weekDays.map((day) => (
            <div
              key={day.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: "100%",
                  background: day.isToday ? "var(--kv-accent)" : "var(--bg-active)",
                  height: `${(day.minutes / maxDayMinutes) * 70}px`,
                  minHeight: day.minutes > 0 ? 4 : 0,
                }}
                title={`${day.minutes} min`}
              />
              <span className="kv-meta">{day.label}</span>
            </div>
          ))}
        </div>

        <p className="kv-meta" style={{ marginTop: 32 }}>Session history</p>
        {historySessions.map((item) => (
          <div key={item.id} className="kv-row">
            <div>
              <div className="kv-row-title">{item.goal || "Focus Session"}</div>
              <div className="kv-row-sub">
                <span className="kv-chip">{item.completed ? "Complete" : item.abandoned ? "Abandoned" : "In progress"}</span>
                <span className="kv-chip num">{item.distractions} distractions</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="kv-meta num">{item.actualMins ?? item.durationMins} min</span>
              <div className="kv-row-side" style={{ marginTop: 6 }}>{formatTorontoDate(item.startedAt)}</div>
            </div>
          </div>
        ))}

        <FocusStartButton />
      </div>
    </main>
  );
}
