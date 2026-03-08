import { redirect } from "next/navigation";

import { FocusStartButton } from "~/app/_components/focus-start-button";
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
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
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
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "24px 16px 96px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 className="text-title">Focus Mode 🎯</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
          Track your deep work sessions and build focus habits
        </p>

        <section
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          <div className="card" style={{ padding: "16px" }}>
            <p className="text-label" style={{ color: "var(--text-muted)" }}>This Week</p>
            <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
              {formatMinutes(totalMinutesThisWeek)}
            </p>
          </div>
          <div className="card" style={{ padding: "16px" }}>
            <p className="text-label" style={{ color: "var(--text-muted)" }}>Avg Session</p>
            <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
              {averageSessionLength} min
            </p>
          </div>
          <div className="card" style={{ padding: "16px" }}>
            <p className="text-label" style={{ color: "var(--text-muted)" }}>Completion Rate</p>
            <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
              {completionRate}%
            </p>
          </div>
          <div className="card" style={{ padding: "16px" }}>
            <p className="text-label" style={{ color: "var(--text-muted)" }}>Longest Session</p>
            <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
              {longestSession} min
            </p>
          </div>
          <div className="card" style={{ padding: "16px" }}>
            <p className="text-label" style={{ color: "var(--text-muted)" }}>Total Distractions</p>
            <p
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: totalDistractions < 5 ? "var(--accent-green)" : "var(--text-primary)",
                marginTop: "6px",
              }}
            >
              {totalDistractions}
            </p>
          </div>
          <div className="card" style={{ padding: "16px" }}>
            <p className="text-label" style={{ color: "var(--text-muted)" }}>Current Streak</p>
            <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
              {streak} day{streak === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        <section className="card" style={{ marginTop: "18px", padding: "18px" }}>
          <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>Weekly Focus Minutes</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px", marginTop: "16px" }}>
            {weekDays.map((day) => (
              <div
                key={day.label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    background: day.isToday ? "var(--accent-blue)" : "var(--bg-elevated)",
                    borderRadius: "4px 4px 0 0",
                    height: `${(day.minutes / maxDayMinutes) * 70}px`,
                    minHeight: day.minutes > 0 ? "4px" : "0",
                    transition: "height 0.5s ease",
                  }}
                  title={`${day.minutes} min`}
                />
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ marginTop: "18px", padding: "18px", overflowX: "auto" }}>
          <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>Session History</p>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
            <thead>
              <tr>
                {["Date", "Goal", "Duration", "Actual", "Distractions", "Status"].map((header) => (
                  <th
                    key={header}
                    style={{
                      textAlign: "left",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      padding: "10px",
                      borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historySessions.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--border-default)", color: "var(--text-secondary)", fontSize: "13px" }}>
                    {item.startedAt.toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "13px" }}>
                    {item.goal || "Focus Session"}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--border-default)", color: "var(--text-secondary)", fontSize: "13px" }}>
                    {item.durationMins} min
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--border-default)", color: "var(--text-secondary)", fontSize: "13px" }}>
                    {item.actualMins ?? "-"}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--border-default)", color: "var(--text-secondary)", fontSize: "13px" }}>
                    {item.distractions}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--border-default)" }}>
                    {item.completed ? (
                      <span className="badge badge-green">Complete</span>
                    ) : item.abandoned ? (
                      <span className="badge badge-red">Abandoned</span>
                    ) : (
                      <span className="badge">In Progress</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <FocusStartButton />
      </div>
    </main>
  );
}
