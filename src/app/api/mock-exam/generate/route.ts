import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { buildMockExamQuestions } from "~/server/mock-exam-build";
import { assertGroqRateLimit } from "~/lib/groq-guard";

type GeneratePayload = {
  noteId?: string;
  sourceText?: string;
  subject?: string;
  curriculumCode?: string;
  numMultipleChoice?: number;
  numShortAnswer?: number;
  timeLimitMinutes?: number;
  /** When set, fill this draft instead of creating a new exam. */
  examId?: string;
};

/**
 * Legacy one-shot generate. Prefer Batch L:
 *   POST /api/mock-exam (draft) → /mock-exam/:id?generating=1 → POST /api/mock-exam/:id/generate
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = assertGroqRateLimit(session.user.id);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as GeneratePayload;
    const numMC = Math.min(Math.max(Number(body.numMultipleChoice ?? 10), 0), 20);
    const numSA = Math.min(Math.max(Number(body.numShortAnswer ?? 5), 0), 10);
    if (numMC + numSA < 1) {
      return NextResponse.json({ error: "Need at least one question." }, { status: 400 });
    }
    const timeLimit = Math.min(Math.max(Number(body.timeLimitMinutes ?? 45), 5), 180);
    const subject = (body.subject ?? "").trim() || "General";
    const curriculumCode = (body.curriculumCode ?? "").trim().toUpperCase() || null;

    let examId = (body.examId ?? "").trim();
    if (!examId) {
      let noteId: string | null = null;
      let title = "Building your exam…";
      if (body.noteId) {
        const note = await db.note.findUnique({ where: { id: body.noteId } });
        if (!note || note.userId !== session.user.id) {
          return NextResponse.json({ error: "Note not found." }, { status: 404 });
        }
        noteId = note.id;
        title = `Mock Exam: ${note.title}`.slice(0, 160);
      }
      const draft = await db.mockExam.create({
        data: {
          userId: session.user.id,
          noteId,
          title,
          subject,
          curriculumCode,
          instructions: null,
          timeLimit,
        },
      });
      examId = draft.id;
    }

    const result = await buildMockExamQuestions({
      userId: session.user.id,
      examId,
      noteId: body.noteId,
      sourceText: body.sourceText,
      subject,
      curriculumCode,
      numMultipleChoice: numMC,
      numShortAnswer: numSA,
      timeLimitMinutes: timeLimit,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ exam: result.exam }, { status: 201 });
  } catch (error) {
    console.error("[mock-exam/generate] Unhandled error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate exam: ${detail}` }, { status: 500 });
  }
}
