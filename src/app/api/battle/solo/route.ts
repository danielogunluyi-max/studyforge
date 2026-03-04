import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type SoloQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
};

type StartPayload = {
  action?: "start" | "complete";
  subject?: string;
  difficulty?: string;
  questionCount?: number;
  mode?: "solo" | "ai";
  aiDifficulty?: "Easy" | "Medium" | "Hard";
  answers?: Array<{ index: number; answer: string; elapsedSeconds?: number }>;
  questions?: SoloQuestion[];
  totalTimeSeconds?: number;
};

function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += chars[Math.floor(Math.random() * chars.length)] ?? "A";
  }
  return out;
}

function calcAiAccuracy(aiDifficulty: string): number {
  if (aiDifficulty === "Hard") return 0.8;
  if (aiDifficulty === "Easy") return 0.35;
  return 0.5;
}

async function updateSoloRewards(userId: string, perfect: boolean, aiDifficulty: string | null, beatAi: boolean) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      battleXp: true,
      battleAchievements: true,
      soloSessionsCompleted: true,
    },
  });

  if (!user) return;

  const achievements = new Set(Array.isArray(user.battleAchievements) ? user.battleAchievements : []);
  const nextSolo = user.soloSessionsCompleted + 1;

  if (nextSolo >= 10) achievements.add("scholar");
  if (perfect) achievements.add("perfect-score");
  if (beatAi && aiDifficulty === "Hard") achievements.add("ai-slayer");

  await db.user.update({
    where: { id: userId },
    data: {
      battleXp: user.battleXp + 30 + (perfect ? 50 : 0),
      soloSessionsCompleted: nextSolo,
      battleAchievements: Array.from(achievements),
      lastActive: new Date(),
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as StartPayload;
    const action = body.action ?? "start";

    if (action === "start") {
      const subject = String(body.subject ?? "General").trim() || "General";
      const difficulty = String(body.difficulty ?? "Medium").trim() || "Medium";
      const questionCount = Math.max(3, Math.min(25, Number(body.questionCount ?? 10)));
      const mode = body.mode ?? "solo";

      const output = await runGroqPrompt({
        system: "Return strict JSON only.",
        user: `Generate ${questionCount} ${difficulty} ${subject} quiz questions for study battle practice.
Return JSON only:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":"exact option","explanation":"short"}]}`,
        temperature: 0.4,
        maxTokens: 2200,
      });

      const parsed = extractJsonBlock<{ questions?: SoloQuestion[] }>(output);
      const questions = (parsed?.questions ?? [])
        .slice(0, questionCount)
        .map((item) => ({
          question: String(item.question ?? "").trim(),
          options: Array.isArray(item.options) ? item.options.map((x) => String(x).trim()).filter(Boolean).slice(0, 4) : [],
          correctAnswer: String(item.correctAnswer ?? "").trim(),
          explanation: String(item.explanation ?? "").trim(),
        }))
        .filter((item) => item.question && item.options.length >= 2 && item.correctAnswer);

      let code = generateCode();
      for (let tries = 0; tries < 5; tries += 1) {
        const existing = await db.battle.findUnique({ where: { code } });
        if (!existing) break;
        code = generateCode();
      }

      const sessionBattle = await db.battle.create({
        data: {
          code,
          hostId: session.user.id,
          title: mode === "ai" ? `AI Battle (${difficulty})` : "Solo Practice",
          mode,
          subject,
          metadata: { difficulty },
          status: "active",
          questionCount: questions.length,
          questions,
          startedAt: new Date(),
          battleQuestions: {
            create: questions.map((question, index) => ({
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              points: 10,
              orderIndex: index,
            })),
          },
          participants: {
            create: {
              userId: session.user.id,
              answers: [],
              score: 0,
              correctCount: 0,
              totalAnswered: 0,
            },
          },
        },
        select: {
          id: true,
          code: true,
          status: true,
          questionCount: true,
        },
      });

      return NextResponse.json({ session: sessionBattle, questions });
    }

    const answers = Array.isArray(body.answers) ? body.answers : [];
    const questions = Array.isArray(body.questions) ? body.questions : [];
    const mode = body.mode ?? "solo";
    const aiDifficulty = body.aiDifficulty ?? "Medium";

    const normalized = questions.map((question, index) => {
      const answer = answers.find((item) => item.index === index)?.answer ?? "";
      const elapsedSeconds = Number(answers.find((item) => item.index === index)?.elapsedSeconds ?? 15);
      const correct = question.correctAnswer.toLowerCase() === answer.toLowerCase();
      return {
        ...question,
        answer,
        elapsedSeconds,
        correct,
      };
    });

    const userScore = normalized.reduce((sum, item) => {
      if (!item.correct) return sum;
      return sum + 100 + Math.max(0, Math.round((15 - Math.min(15, item.elapsedSeconds)) * 4));
    }, 0);

    const correctCount = normalized.filter((item) => item.correct).length;
    const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

    let opponentScore = 0;
    let beatAi = false;

    if (mode === "ai") {
      const aiAccuracy = calcAiAccuracy(aiDifficulty);
      const aiCorrect = Math.round(questions.length * aiAccuracy);
      opponentScore = aiCorrect * 110;
      beatAi = userScore > opponentScore;
    }

    let code = generateCode();
    for (let tries = 0; tries < 5; tries += 1) {
      const existing = await db.battle.findUnique({ where: { code } });
      if (!existing) break;
      code = generateCode();
    }

    await db.battle.create({
      data: {
        code,
        hostId: session.user.id,
        title: mode === "ai" ? `AI Battle (${aiDifficulty})` : "Solo Practice",
        mode,
        subject: String(body.subject ?? "General"),
        status: "completed",
        questionCount: questions.length,
        questions,
        hostScore: userScore,
        opponentScore,
        startedAt: new Date(Date.now() - Math.max(1, Number(body.totalTimeSeconds ?? 0)) * 1000),
        completedAt: new Date(),
        participants: {
          create: {
            userId: session.user.id,
            answers: normalized,
            score: userScore,
            correctCount,
            totalAnswered: questions.length,
          },
        },
        result: {
          create: {
            winnerId: mode === "ai" ? (beatAi ? session.user.id : null) : session.user.id,
            scores: {
              userScore,
              opponentScore,
              accuracy,
            },
            duration: Math.max(1, Number(body.totalTimeSeconds ?? 1)),
          },
        },
      },
    });

    await updateSoloRewards(session.user.id, accuracy === 100, mode === "ai" ? aiDifficulty : null, beatAi);

    return NextResponse.json({
      userScore,
      opponentScore,
      accuracy,
      correctCount,
      wrongQuestions: normalized.filter((item) => !item.correct).map((item, index) => ({
        index,
        question: item.question,
        yourAnswer: item.answer,
        correctAnswer: item.correctAnswer,
      })),
    });
  } catch (error) {
    console.error("Solo battle error:", error);
    return NextResponse.json({ error: "Failed to process solo session" }, { status: 500 });
  }
}
