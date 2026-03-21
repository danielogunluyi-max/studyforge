import { NextResponse } from "next/server";

import { getAuthSession } from "~/server/auth/session";
import { db } from "~/server/db";

type CalendarEventDTO = {
  id: string;
  title: string;
  date: string;
  type: string;
  color: string;
  completed: boolean;
  description?: string;
};

type StudyPlanDay = {
  blocks?: Array<{ subject?: string; duration?: number }>;
};

type StudyPlanPayload = {
  days?: StudyPlanDay[];
};

const TYPE_COLORS: Record<string, string> = {
  exam: "var(--accent-red)",
  study: "var(--accent-blue)",
  deadline: "var(--accent-orange)",
  assignment: "var(--accent-purple)",
  reminder: "var(--accent-blue)",
  other: "var(--accent-green)",
};

function resolveEventColor(type: string, color?: string | null) {
  if (color && color.trim()) return color;
  return TYPE_COLORS[type] ?? TYPE_COLORS.deadline ?? "var(--accent-blue)";
}

function toMonthRange(year: number, month: number) {
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) ? Math.max(0, Math.min(11, month)) : new Date().getMonth();
  const start = new Date(safeYear, safeMonth, 1);
  const end = new Date(safeYear, safeMonth + 1, 0, 23, 59, 59, 999);
  return { start, end, safeYear, safeMonth };
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()), 10);

  const { start, end, safeYear, safeMonth } = toMonthRange(year, month);

  const [customEvents, exams, studyPlans] = await Promise.all([
    db.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { date: { gte: start, lte: end } },
          {
            AND: [
              { endDate: { not: null } },
              { endDate: { gte: start, lte: end } },
            ],
          },
        ],
      },
      orderBy: { date: "asc" },
    }),
    db.exam.findMany({
      where: {
        userId: session.user.id,
        examDate: { gte: start, lte: end },
      },
      orderBy: { examDate: "asc" },
    }),
    db.studyPlan.findMany({
      where: {
        userId: session.user.id,
        weekStart: {
          gte: new Date(safeYear, safeMonth - 1, 1),
          lte: end,
        },
      },
      orderBy: { weekStart: "asc" },
    }),
  ]);

  const normalizedCustom: CalendarEventDTO[] = customEvents.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date.toISOString(),
    type: event.type,
    color: resolveEventColor(event.type, event.color),
    completed: event.completed,
    description: event.description ?? undefined,
  }));

  const examEvents: CalendarEventDTO[] = exams.map((exam) => ({
    id: `exam-${exam.id}`,
    title: `📝 ${exam.subject} Exam`,
    date: exam.examDate.toISOString(),
    type: "exam",
    color: resolveEventColor("exam"),
    completed: false,
    description: exam.board ?? undefined,
  }));

  const studyEvents: CalendarEventDTO[] = [];

  for (const plan of studyPlans) {
    const data = plan.plan as StudyPlanPayload;
    const days = Array.isArray(data?.days) ? data.days : [];

    days.forEach((day, index) => {
      const dayDate = new Date(plan.weekStart);
      dayDate.setDate(dayDate.getDate() + index);

      if (dayDate < start || dayDate > end) return;

      const blocks = Array.isArray(day.blocks) ? day.blocks : [];
      const totalMins = blocks.reduce((sum, block) => sum + Math.max(0, Number(block.duration) || 0), 0);
      if (totalMins <= 0) return;

      const subjects = Array.from(
        new Set(
          blocks
            .map((block) => String(block.subject ?? "").trim())
            .filter(Boolean),
        ),
      );

      studyEvents.push({
        id: `study-${plan.id}-${index}`,
        title: `📅 Study: ${subjects.join(", ") || "Session"}`,
        date: dayDate.toISOString(),
        type: "study",
        color: resolveEventColor("study"),
        completed: false,
        description: `${Math.round((totalMins / 60) * 10) / 10}h planned`,
      });
    });
  }

  return NextResponse.json({ events: [...normalizedCustom, ...examEvents, ...studyEvents] });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    date?: string;
    type?: string;
    color?: string;
    description?: string;
    endDate?: string;
  };

  const title = String(body.title ?? "").trim();
  const date = String(body.date ?? "").trim();
  const type = String(body.type ?? "deadline").trim() || "deadline";
  const color = resolveEventColor(type, body.color);
  const description = String(body.description ?? "").trim() || null;
  const endDate = String(body.endDate ?? "").trim();

  if (!title || !date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const parsedEndDate = endDate ? new Date(endDate) : null;
  if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
    return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
  }

  const event = await db.calendarEvent.create({
    data: {
      userId: session.user.id,
      title,
      date: parsedDate,
      endDate: parsedEndDate,
      type,
      color,
      description,
    },
  });

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      date: event.date.toISOString(),
      type: event.type,
      color: event.color,
      completed: event.completed,
      description: event.description ?? undefined,
    },
  });
}
