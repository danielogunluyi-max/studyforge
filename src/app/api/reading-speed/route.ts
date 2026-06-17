import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

const prisma = db as any;

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    topic?: string;
    action?: string;
    wpm?: number;
    comprehension?: number;
    questions?: unknown;
    answers?: unknown;
  };

  const text = body.text ?? "";
  const topic = body.topic?.trim() || "General";

  if (body.action === "generate-questions") {
    const raw = await runGroqPrompt({
      user: `Generate 5 comprehension questions for this text. Mix recall and inference questions.
Text: ${text.slice(0, 3000)}
Respond ONLY as JSON array:
[{"question":"...","answer":"...","type":"recall|inference"}]`,
      maxTokens: 600,
    });

    const questions = extractJsonBlock(raw) ?? [];
    return NextResponse.json({ questions });
  }

  if (body.action === "save-result") {
    const session2 = await prisma.readingSession.create({
      data: {
        userId,
        text: text.slice(0, 10000),
        topic,
        wpm: Number(body.wpm ?? 0),
        comprehension: Number(body.comprehension ?? 0),
        targetWpm: 250,
        questions: (body.questions ?? []) as never,
        answers: (body.answers ?? []) as never,
      },
    });

    return NextResponse.json({ session: session2 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const sessions = await prisma.readingSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, topic: true, wpm: true, comprehension: true, createdAt: true },
  });

  return NextResponse.json({ sessions });
}
