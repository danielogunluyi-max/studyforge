import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type StudyPlanDay = {
  date: string;
  title: string;
  tasks: string[];
  completed?: boolean;
};

type PatchPayload = {
  studyPlan?: string;
  days?: StudyPlanDay[];
  generatePlan?: boolean;
  noteTitles?: string[];
};

function daysUntil(date: Date) {
  const diffMs = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function parsePlan(raw: string): StudyPlanDay[] {
  const parsed = extractJsonBlock<{ days?: StudyPlanDay[] }>(raw);
  const days = Array.isArray(parsed?.days) ? parsed.days : [];
  return days
    .map((day) => ({
      date: String(day.date ?? "").slice(0, 32),
      title: String(day.title ?? "Study session").slice(0, 160),
      tasks: Array.isArray(day.tasks)
        ? day.tasks.map((task) => String(task).slice(0, 240)).filter(Boolean).slice(0, 8)
        : [],
      completed: false,
    }))
    .filter((day) => day.date && day.title);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam || exam.userId !== session.user.id) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    await db.exam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Exams DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as PatchPayload;

    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam || exam.userId !== session.user.id) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (body.generatePlan) {
      const clientNoteTitles = Array.isArray(body.noteTitles)
        ? body.noteTitles.map((item) => String(item).trim()).filter(Boolean).slice(0, 40)
        : [];

      const notes = clientNoteTitles.length
        ? []
        : await db.note.findMany({
            where: { userId: session.user.id },
            select: { title: true },
            orderBy: { createdAt: "desc" },
            take: 20,
          });

      const remainingDays = daysUntil(exam.examDate);
      const noteTitles = clientNoteTitles.length
        ? clientNoteTitles
        : notes.map((note) => note.title).filter(Boolean);

      const prompt = `Create a strict day-by-day study plan as JSON for this exam.
Exam subject: ${exam.subject}
Exam date: ${exam.examDate.toISOString()}
Exam board: ${exam.board ?? "N/A"}
Difficulty: ${exam.difficulty ?? "Medium"}
Topics: ${exam.topics ?? "General revision"}
Days until exam: ${remainingDays}
User note titles: ${noteTitles.join(" | ") || "No notes available"}

Return strict JSON only:
{
  "days": [
    {
      "date": "March 6",
      "title": "Review core concepts",
      "tasks": ["Task 1", "Task 2"]
    }
  ]
}

Rules:
- Produce exactly one entry per remaining day until exam, maximum 45 days.
- Include focused, practical tasks.
- Include light review/rest pacing when needed.
- Dates should be human-readable.`;

      const rawPlan = await runGroqPrompt({
        system: "Return valid JSON only. No markdown.",
        user: prompt,
        temperature: 0.4,
        maxTokens: 2200,
      });

      const days = parsePlan(rawPlan);
      if (!days.length) {
        return NextResponse.json({ error: "Failed to generate study plan" }, { status: 502 });
      }

      const updated = await db.exam.update({
        where: { id },
        data: { studyPlan: JSON.stringify({ days }) },
      });

      return NextResponse.json({ exam: updated, days });
    }

    const normalizedDays = Array.isArray(body.days)
      ? body.days.map((day) => ({
          date: String(day.date ?? "").slice(0, 32),
          title: String(day.title ?? "Study session").slice(0, 160),
          tasks: Array.isArray(day.tasks)
            ? day.tasks.map((task) => String(task).slice(0, 240)).filter(Boolean).slice(0, 8)
            : [],
          completed: Boolean(day.completed),
        }))
      : null;

    const studyPlan = typeof body.studyPlan === "string"
      ? body.studyPlan
      : normalizedDays
        ? JSON.stringify({ days: normalizedDays })
        : exam.studyPlan;

    const updated = await db.exam.update({
      where: { id },
      data: { studyPlan },
    });

    return NextResponse.json({ exam: updated });
  } catch (error) {
    console.error("Exams PATCH error:", error);
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}
