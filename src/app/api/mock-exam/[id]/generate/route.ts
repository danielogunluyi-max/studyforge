import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { buildMockExamQuestions } from "~/server/mock-exam-build";
import { assertGroqRateLimit } from "~/lib/groq-guard";

type GenerateBody = {
  noteId?: string;
  sourceText?: string;
  subject?: string;
  curriculumCode?: string;
  numMultipleChoice?: number;
  numShortAnswer?: number;
  timeLimitMinutes?: number;
};

/** Fill a draft exam created by POST /api/mock-exam (Batch L). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = assertGroqRateLimit(session.user.id);
    if (limited) return limited;

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as GenerateBody;

    const result = await buildMockExamQuestions({
      userId: session.user.id,
      examId: id,
      noteId: body.noteId,
      sourceText: body.sourceText,
      subject: body.subject,
      curriculumCode: body.curriculumCode,
      numMultipleChoice: body.numMultipleChoice,
      numShortAnswer: body.numShortAnswer,
      timeLimitMinutes: body.timeLimitMinutes,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ exam: result.exam }, { status: 201 });
  } catch (error) {
    console.error("[mock-exam/:id/generate]", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate exam: ${detail}` }, { status: 500 });
  }
}
