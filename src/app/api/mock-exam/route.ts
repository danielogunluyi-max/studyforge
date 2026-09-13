import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exams = await db.mockExam.findMany({
    where: { userId: session.user.id },
    include: {
      questions: { select: { id: true, points: true } },
      attempts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ exams });
}

type CreateDraftBody = {
  noteId?: string;
  subject?: string;
  curriculumCode?: string;
  timeLimitMinutes?: number;
  title?: string;
};

/** Fast shell create — Batch L: redirect to /mock-exam/:id?generating=1, then fill. */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateDraftBody;
    let noteId: string | null = null;
    let subject = (body.subject ?? "").trim() || "General";
    let title = (body.title ?? "").trim();

    if (body.noteId) {
      const note = await db.note.findUnique({ where: { id: body.noteId } });
      if (!note || note.userId !== session.user.id) {
        return NextResponse.json({ error: "Note not found." }, { status: 404 });
      }
      noteId = note.id;
      if (!title) title = `Mock Exam: ${note.title}`.slice(0, 160);
      if (!body.subject?.trim() && note.tags?.[0]) subject = note.tags[0];
    }

    if (!title) title = "Building your exam…";

    const timeLimit = Math.min(Math.max(Number(body.timeLimitMinutes ?? 45), 5), 180);
    const curriculumCode = (body.curriculumCode ?? "").trim().toUpperCase() || null;

    const exam = await db.mockExam.create({
      data: {
        userId: session.user.id,
        noteId,
        title: title.slice(0, 160),
        subject,
        curriculumCode,
        instructions: null,
        timeLimit,
      },
      include: { questions: true },
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    console.error("[mock-exam POST]", error);
    return NextResponse.json({ error: "Failed to create exam draft." }, { status: 500 });
  }
}
