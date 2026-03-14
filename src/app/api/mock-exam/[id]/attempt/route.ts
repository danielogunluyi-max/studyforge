import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const exam = await db.mockExam.findUnique({
    where: { id },
    include: { questions: true },
  });

  return NextResponse.json({ exam });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const { answers, timeTaken } = (await req.json()) as {
    answers?: Record<string, string>;
    timeTaken?: number;
  };

  const exam = await db.mockExam.findUnique({
    where: { id },
    include: { questions: true },
  });

  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const answerMap = answers || {};
  let correct = 0;
  const total = exam.questions.length;

  exam.questions.forEach((q) => {
    if (answerMap[q.id] === q.answer) correct += 1;
  });

  const score = total > 0 ? (correct / total) * 100 : 0;

  const attempt = await db.mockExamAttempt.create({
    data: {
      examId: id,
      userId: session.user.id,
      answers: answerMap,
      score,
      timeTaken: typeof timeTaken === "number" ? timeTaken : 0,
    },
  });

  return NextResponse.json({ attempt, score, correct, total });
}
