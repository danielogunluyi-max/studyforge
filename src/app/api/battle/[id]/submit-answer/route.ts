import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type AnswerRecord = {
  questionIndex: number;
  answer: string;
  correct: boolean;
  submittedAt: string;
};

type StoredQuestion = {
  question: string;
  options?: string[];
  correctAnswer: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { questionIndex?: number; answer?: string };

    const questionIndex = Number(body.questionIndex ?? -1);
    const answer = String(body.answer ?? "").trim();

    if (questionIndex < 0 || !answer) {
      return NextResponse.json({ error: "questionIndex and answer are required" }, { status: 400 });
    }

    const battle = await db.battle.findUnique({ where: { id } });
    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    if (battle.status !== "active" && battle.status !== "waiting") {
      return NextResponse.json({ error: "Battle is not active" }, { status: 409 });
    }

    if (battle.hostId !== session.user.id && battle.opponentId !== session.user.id) {
      return NextResponse.json({ error: "Not a participant in this battle" }, { status: 403 });
    }

    const questions = (battle.questions as StoredQuestion[]) ?? [];
    const question = questions[questionIndex];

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isCorrect = question.correctAnswer.toLowerCase() === answer.toLowerCase();

    const participant = await db.battleParticipant.findUnique({
      where: {
        battleId_userId: {
          battleId: battle.id,
          userId: session.user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant record missing" }, { status: 404 });
    }

    const existingAnswers = (participant.answers as AnswerRecord[] | null) ?? [];
    const alreadyAnswered = existingAnswers.some((entry) => entry.questionIndex === questionIndex);

    if (alreadyAnswered) {
      return NextResponse.json({ error: "Question already answered" }, { status: 409 });
    }

    const answers: AnswerRecord[] = [
      ...existingAnswers,
      {
        questionIndex,
        answer,
        correct: isCorrect,
        submittedAt: new Date().toISOString(),
      },
    ];

    const scoreIncrease = isCorrect ? 10 : 0;

    const updatedParticipant = await db.battleParticipant.update({
      where: {
        battleId_userId: {
          battleId: battle.id,
          userId: session.user.id,
        },
      },
      data: {
        answers,
        score: participant.score + scoreIncrease,
        correctCount: participant.correctCount + (isCorrect ? 1 : 0),
        totalAnswered: participant.totalAnswered + 1,
      },
    });

    const hostParticipant = await db.battleParticipant.findUnique({
      where: { battleId_userId: { battleId: battle.id, userId: battle.hostId } },
    });

    const opponentParticipant = battle.opponentId
      ? await db.battleParticipant.findUnique({
          where: { battleId_userId: { battleId: battle.id, userId: battle.opponentId } },
        })
      : null;

    const allDone =
      hostParticipant?.totalAnswered === battle.questionCount &&
      (!battle.opponentId || opponentParticipant?.totalAnswered === battle.questionCount);

    const hostScore = hostParticipant?.score ?? 0;
    const opponentScore = opponentParticipant?.score ?? 0;

    if (allDone) {
      const winnerId =
        hostScore === opponentScore ? null : hostScore > opponentScore ? battle.hostId : battle.opponentId;

      await db.battle.update({
        where: { id: battle.id },
        data: {
          status: "completed",
          hostScore,
          opponentScore,
          completedAt: new Date(),
        },
      });

      const durationSeconds = battle.startedAt
        ? Math.max(1, Math.floor((Date.now() - battle.startedAt.getTime()) / 1000))
        : 1;

      await db.battleResult.upsert({
        where: { battleId: battle.id },
        create: {
          battleId: battle.id,
          winnerId,
          scores: {
            hostScore,
            opponentScore,
          },
          duration: durationSeconds,
        },
        update: {
          winnerId,
          scores: {
            hostScore,
            opponentScore,
          },
          duration: durationSeconds,
        },
      });
    } else {
      await db.battle.update({
        where: { id: battle.id },
        data: {
          hostScore,
          opponentScore,
          ...(battle.hostId === session.user.id
            ? { hostAnsweredAt: new Date() }
            : { opponentAnsweredAt: new Date() }),
          status: battle.opponentId ? "active" : "waiting",
        },
      });
    }

    return NextResponse.json({
      correct: isCorrect,
      score: updatedParticipant.score,
      totalAnswered: updatedParticipant.totalAnswered,
      completed: allDone,
    });
  } catch (error) {
    console.error("Battle submit error:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
