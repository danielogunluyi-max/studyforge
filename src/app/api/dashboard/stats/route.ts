import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  // ── User stats ───────────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      studyStreak: true,
      lastActive: true,
      battleXp: true,
      soloSessionsCompleted: true,
    },
  });

  // ── Recent notes (last 5) ────────────────────────────────────
  const recentNotes = await db.note.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      format: true,
      createdAt: true,
    },
  });

  // ── Note count ───────────────────────────────────────────────
  const notesCount = await db.note.count({ where: { userId } });

  // ── Exams ────────────────────────────────────────────────────
  const exams = await db.exam.findMany({
    where: { userId },
    orderBy: { examDate: "asc" },
    select: {
      id: true,
      subject: true,
      examDate: true,
      board: true,
      difficulty: true,
      topics: true,
      studyPlan: true,
    },
  });

  const upcomingExams = exams.filter((e) => new Date(e.examDate) > now);
  const pastExams = exams.filter((e) => new Date(e.examDate) <= now);

  // ── Readiness score ──────────────────────────────────────────
  const allDays = upcomingExams.flatMap((exam) => {
    if (!exam.studyPlan) return [];
    try {
      const parsed = JSON.parse(exam.studyPlan) as { days?: Array<{ completed?: boolean }> };
      return Array.isArray(parsed.days) ? parsed.days : [];
    } catch {
      return [];
    }
  });
  const completedDays = allDays.filter((d) => d.completed).length;
  const readiness = allDays.length ? Math.round((completedDays / allDays.length) * 100) : 100;

  // ── Recommendations engine ───────────────────────────────────
  const recommendations: Array<{
    type: string;
    message: string;
    action: { label: string; href: string };
    urgency: "high" | "medium" | "low";
  }> = [];

  // Urgent exam?
  const urgentExam = upcomingExams[0];
  if (urgentExam) {
    const daysUntil = Math.ceil(
      (new Date(urgentExam.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil <= 7) {
      recommendations.push({
        type: "exam",
        message: `Your ${urgentExam.subject} exam is in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`,
        action: { label: "Study Now", href: "/exams" },
        urgency: daysUntil <= 3 ? "high" : "medium",
      });
    }
  }

  // No notes in 3+ days?
  const lastNote = recentNotes[0];
  if (lastNote) {
    const daysSinceNote = Math.floor(
      (Date.now() - new Date(lastNote.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceNote >= 3) {
      recommendations.push({
        type: "review",
        message: `You haven't reviewed notes in ${daysSinceNote} days. Time for a recap.`,
        action: { label: "Review Notes", href: "/notes" },
        urgency: "medium",
      });
    }
  } else {
    recommendations.push({
      type: "review",
      message: "You haven't created any notes yet. Start building your knowledge base.",
      action: { label: "Create Note", href: "/generator" },
      urgency: "medium",
    });
  }

  // Streak at risk?
  const streak = user?.studyStreak ?? 0;
  if (streak === 0) {
    recommendations.push({
      type: "streak",
      message: "Start building your study streak today — even 10 minutes counts.",
      action: { label: "Start Studying", href: "/generator" },
      urgency: "low",
    });
  } else if (streak < 3) {
    recommendations.push({
      type: "streak",
      message: `${streak} day streak — keep the momentum going!`,
      action: { label: "Keep Going", href: "/generator" },
      urgency: "low",
    });
  }

  // Readiness low?
  if (readiness < 50 && upcomingExams.length > 0) {
    recommendations.push({
      type: "readiness",
      message: `Study plan completion is at ${readiness}%. Catch up before your exams.`,
      action: { label: "View Plan", href: "/exams" },
      urgency: "high",
    });
  }

  return NextResponse.json({
    user: {
      name: user?.name ?? null,
      studyStreak: streak,
      lastActive: user?.lastActive?.toISOString() ?? null,
      battleXp: user?.battleXp ?? 0,
      soloSessions: user?.soloSessionsCompleted ?? 0,
    },
    notes: {
      recent: recentNotes.map((n) => ({
        id: n.id,
        title: n.title,
        format: n.format,
        createdAt: n.createdAt.toISOString(),
      })),
      total: notesCount,
    },
    exams: {
      upcoming: upcomingExams.map((e) => ({
        id: e.id,
        subject: e.subject,
        examDate: e.examDate.toISOString(),
        board: e.board,
        daysUntil: Math.ceil(
          (new Date(e.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      })),
      total: exams.length,
      thisMonth: upcomingExams.filter((e) => {
        const d = new Date(e.examDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    },
    readiness,
    recommendations: recommendations.slice(0, 4),
  });
}
