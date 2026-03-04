import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";
import { bumpQuizStats, ensureGroupMember, isOwner } from "~/server/study-groups";

type QuizQuestion = { question: string; options: string[]; correctAnswer: string };

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;

    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const round = await db.groupQuizRound.findFirst({
      where: { groupId: id, status: "active" },
      include: {
        submissions: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { score: "desc" },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ round });
  } catch (error) {
    console.error("Group quiz status error:", error);
    return NextResponse.json({ error: "Failed to fetch quiz status" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;

    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as {
      action?: "start" | "answer" | "finish";
      title?: string;
      questionCount?: number;
      answerIndex?: number;
      selected?: string;
    };

    if (body.action === "start") {
      if (!isOwner(membership.role) && membership.role !== "moderator") {
        return NextResponse.json({ error: "Only owner or moderator can start quiz" }, { status: 403 });
      }

      const existing = await db.groupQuizRound.findFirst({ where: { groupId: id, status: "active" } });
      if (existing) return NextResponse.json({ error: "Quiz already active" }, { status: 409 });

      const topic = membership.group.topic || membership.group.name;
      const questionCount = Math.max(3, Math.min(10, Number(body.questionCount ?? 5)));
      const generated = await runGroqPrompt({
        system: "Return strict JSON only.",
        user: `Generate ${questionCount} multiple choice quiz questions about ${topic}. Return JSON {\"questions\":[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctAnswer\":\"exact option\"}]}`,
        temperature: 0.4,
        maxTokens: 1800,
      });
      const parsed = extractJsonBlock<{ questions?: QuizQuestion[] }>(generated);
      const questions = (parsed?.questions ?? []).slice(0, questionCount).filter((q) => q.question && Array.isArray(q.options) && q.options.length >= 2);
      if (!questions.length) return NextResponse.json({ error: "Could not generate quiz" }, { status: 502 });

      const round = await db.groupQuizRound.create({
        data: {
          groupId: id,
          startedById: session.user.id,
          title: body.title?.trim() || `${topic} Group Quiz`,
          status: "active",
          questions,
        },
      });

      return NextResponse.json({ round });
    }

    const activeRound = await db.groupQuizRound.findFirst({ where: { groupId: id, status: "active" } });
    if (!activeRound) return NextResponse.json({ error: "No active quiz" }, { status: 404 });

    if (body.action === "finish") {
      if (!isOwner(membership.role) && membership.role !== "moderator") {
        return NextResponse.json({ error: "Only owner or moderator can finish quiz" }, { status: 403 });
      }
      await db.groupQuizRound.update({ where: { id: activeRound.id }, data: { status: "completed", completedAt: new Date() } });
      return NextResponse.json({ ok: true });
    }

    const answerIndex = Number(body.answerIndex ?? -1);
    const selected = String(body.selected ?? "").trim();
    if (answerIndex < 0 || !selected) return NextResponse.json({ error: "answerIndex and selected required" }, { status: 400 });

    const questions = (activeRound.questions as QuizQuestion[]) ?? [];
    const question = questions[answerIndex];
    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const existingSubmission = await db.groupQuizSubmission.findUnique({
      where: { roundId_userId: { roundId: activeRound.id, userId: session.user.id } },
    });

    const existingAnswers = (existingSubmission?.answers as Array<{ answerIndex: number; selected: string; correct: boolean }> | null) ?? [];
    const deduped = [...existingAnswers.filter((item) => item.answerIndex !== answerIndex), { answerIndex, selected, correct: question.correctAnswer.toLowerCase() === selected.toLowerCase() }];
    const score = deduped.reduce((sum, item) => sum + (item.correct ? 100 : 0), 0);

    const updated = await db.groupQuizSubmission.upsert({
      where: { roundId_userId: { roundId: activeRound.id, userId: session.user.id } },
      create: {
        roundId: activeRound.id,
        userId: session.user.id,
        answers: deduped,
        score,
        completedAt: deduped.length >= questions.length ? new Date() : null,
      },
      update: {
        answers: deduped,
        score,
        completedAt: deduped.length >= questions.length ? new Date() : null,
      },
    });

    if (updated.completedAt) {
      await bumpQuizStats(id, session.user.id);
    }

    const leaderboard = await db.groupQuizSubmission.findMany({
      where: { roundId: activeRound.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { score: "desc" },
    });

    return NextResponse.json({ submission: updated, leaderboard });
  } catch (error) {
    console.error("Group quiz post error:", error);
    return NextResponse.json({ error: "Failed to process quiz" }, { status: 500 });
  }
}
