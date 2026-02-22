import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type BattleQuestionItem = {
  question: string;
  options: string[];
  correctAnswer: string;
};

function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += chars[Math.floor(Math.random() * chars.length)] ?? "A";
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      noteId?: string;
      title?: string;
      questionCount?: number;
      sourceText?: string;
    };

    const questionCount = Math.max(5, Math.min(20, Number(body.questionCount ?? 10)));

    let sourceText = (body.sourceText ?? "").trim();
    if (!sourceText && body.noteId) {
      const note = await db.note.findUnique({ where: { id: body.noteId } });
      if (!note || note.userId !== session.user.id) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      sourceText = note.content;
    }

    if (!sourceText) {
      return NextResponse.json({ error: "Source text or noteId is required" }, { status: 400 });
    }

    const generated = await runGroqPrompt({
      system: "Return strict JSON only.",
      user: `Create ${questionCount} quiz battle questions with 4 options each based on this study content:\n\n${sourceText}\n\nReturn JSON as {"questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":"exact option text"}]}`,
      temperature: 0.4,
      maxTokens: 2200,
    });

    const parsed = extractJsonBlock<{ questions?: BattleQuestionItem[] }>(generated);
    const questions = (parsed?.questions ?? [])
      .slice(0, questionCount)
      .map((item) => ({
        question: String(item.question ?? "").trim(),
        options: Array.isArray(item.options)
          ? item.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4)
          : [],
        correctAnswer: String(item.correctAnswer ?? "").trim(),
      }))
      .filter((item) => item.question && item.options.length >= 2);

    if (!questions.length) {
      return NextResponse.json({ error: "Failed to generate battle questions" }, { status: 502 });
    }

    let code = generateCode();
    for (let tries = 0; tries < 5; tries += 1) {
      const exists = await db.battle.findUnique({ where: { code } });
      if (!exists) break;
      code = generateCode();
    }

    const battle = await db.battle.create({
      data: {
        hostId: session.user.id,
        noteId: body.noteId ?? null,
        title: body.title?.trim() || "Study Battle",
        status: "waiting",
        questionCount: questions.length,
        questions,
        code,
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

    return NextResponse.json({ battle });
  } catch (error) {
    console.error("Battle create error:", error);
    return NextResponse.json({ error: "Failed to create battle" }, { status: 500 });
  }
}
