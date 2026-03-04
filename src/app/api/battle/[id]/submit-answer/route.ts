import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type AnswerRecord = {
  questionIndex: number;
  answer: string;
  correct: boolean;
  submittedAt: string;
  elapsedSeconds?: number;
  scoreAwarded: number;
  usedPowerUp?: string;
  streakAfter?: number;
};

type StoredQuestion = {
  question: string;
  options?: string[];
  correctAnswer: string;
};

type SubmitPayload = {
  questionIndex?: number;
  answer?: string;
  elapsedSeconds?: number;
  powerUp?: "double" | "skip" | "freeze" | "swap" | null;
};

function calcStreakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

function toSet(values: string[] | null | undefined): Set<string> {
  return new Set(Array.isArray(values) ? values : []);
}

async function applyBattleProgressRewards(params: {
  battleId: string;
  hostId: string;
  opponentId: string | null;
  winnerId: string | null;
  hostScore: number;
  opponentScore: number;
  hostPerfect: boolean;
  opponentPerfect: boolean;
  hostHasSpeedDemon: boolean;
  opponentHasSpeedDemon: boolean;
  mode: string;
}) {
  const userIds = [params.hostId, params.opponentId].filter(Boolean) as string[];

  for (const userId of userIds) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        battleXp: true,
        battleWinStreak: true,
        battleAchievements: true,
        soloSessionsCompleted: true,
      },
    });

    if (!user) continue;

    const won = params.winnerId === userId;
    const lost = params.winnerId && params.winnerId !== userId;
    const draw = params.winnerId === null;

    const xpBase = won ? 100 : lost ? 25 : 40;
    const isPerfect = userId === params.hostId ? params.hostPerfect : params.opponentPerfect;
    const speedDemon = userId === params.hostId ? params.hostHasSpeedDemon : params.opponentHasSpeedDemon;

    const xp = xpBase + (isPerfect ? 50 : 0);
    const nextStreak = won ? user.battleWinStreak + 1 : draw ? user.battleWinStreak : 0;

    const achievements = toSet(user.battleAchievements);
    if (won) achievements.add("first-win");
    if (nextStreak >= 5) achievements.add("5-win-streak");
    if (isPerfect) achievements.add("perfect-score");
    if (speedDemon) achievements.add("speed-demon");

    await db.user.update({
      where: { id: userId },
      data: {
        battleXp: user.battleXp + xp,
        battleWinStreak: nextStreak,
        battleAchievements: Array.from(achievements),
      },
    });
  }
}

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
    const body = (await request.json()) as SubmitPayload;

    const questionIndex = Number(body.questionIndex ?? -1);
    const answer = String(body.answer ?? "").trim();
    const elapsedSeconds = Math.max(0, Math.min(15, Number(body.elapsedSeconds ?? 15)));
    const powerUp = body.powerUp ?? null;

    if (questionIndex < 0) {
      return NextResponse.json({ error: "questionIndex is required" }, { status: 400 });
    }

    const battle = await db.battle.findUnique({ where: { id } });
    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    if (battle.hostId !== session.user.id && battle.opponentId !== session.user.id) {
      return NextResponse.json({ error: "Not a participant in this battle" }, { status: 403 });
    }

    if (battle.status !== "active") {
      return NextResponse.json({ error: "Battle is not active" }, { status: 409 });
    }

    const questions = (battle.questions as StoredQuestion[]) ?? [];
    const question = questions[questionIndex];

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

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

    const skipUsed = powerUp === "skip";
    const isCorrect = skipUsed ? false : question.correctAnswer.toLowerCase() === answer.toLowerCase();

    const previousStreak = (() => {
      let streak = 0;
      for (let i = existingAnswers.length - 1; i >= 0; i -= 1) {
        if (existingAnswers[i]?.correct) streak += 1;
        else break;
      }
      return streak;
    })();

    const nextStreak = isCorrect ? previousStreak + 1 : 0;
    const multiplier = calcStreakMultiplier(nextStreak);

    const basePoints = isCorrect ? 100 : 0;
    const speedBonus = isCorrect ? Math.max(0, Math.round((15 - elapsedSeconds) * 5)) : 0;
    const powerUpMultiplier = powerUp === "double" ? 2 : 1;
    const scoreIncrease = Math.round((basePoints + speedBonus) * multiplier * powerUpMultiplier);

    const answers: AnswerRecord[] = [
      ...existingAnswers,
      {
        questionIndex,
        answer,
        correct: isCorrect,
        submittedAt: new Date().toISOString(),
        elapsedSeconds,
        scoreAwarded: scoreIncrease,
        usedPowerUp: powerUp ?? undefined,
        streakAfter: nextStreak,
      },
    ];

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

    const hostScore = hostParticipant?.score ?? 0;
    const opponentScore = opponentParticipant?.score ?? 0;

    const allDone =
      hostParticipant?.totalAnswered === battle.questionCount &&
      (!battle.opponentId || opponentParticipant?.totalAnswered === battle.questionCount);

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

      const hostAnswers = (hostParticipant?.answers as AnswerRecord[] | null) ?? [];
      const oppAnswers = (opponentParticipant?.answers as AnswerRecord[] | null) ?? [];

      await applyBattleProgressRewards({
        battleId: battle.id,
        hostId: battle.hostId,
        opponentId: battle.opponentId,
        winnerId,
        hostScore,
        opponentScore,
        hostPerfect: hostParticipant?.correctCount === battle.questionCount,
        opponentPerfect: opponentParticipant?.correctCount === battle.questionCount,
        hostHasSpeedDemon: hostAnswers.some((item) => item.correct && (item.elapsedSeconds ?? 99) < 3),
        opponentHasSpeedDemon: oppAnswers.some((item) => item.correct && (item.elapsedSeconds ?? 99) < 3),
        mode: battle.mode,
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
        },
      });
    }

    return NextResponse.json({
      correct: isCorrect,
      score: updatedParticipant.score,
      totalAnswered: updatedParticipant.totalAnswered,
      scoreIncrease,
      streak: nextStreak,
      streakMultiplier: multiplier,
      completed: allDone,
    });
  } catch (error) {
    console.error("Battle submit error:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
