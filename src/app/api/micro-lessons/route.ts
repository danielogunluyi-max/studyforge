import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { groqJSON } from "~/server/groq";

const prisma = db as any;

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as {
    topic?: string;
    subject?: string;
    sourceText?: string;
  };

  const topic = body.topic?.trim() ?? "";
  const subject = body.subject?.trim() ?? "";
  const sourceText = body.sourceText ?? "";

  if (!topic || !subject) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = await groqJSON<{ lessons?: unknown[] }>({
    user: `Break this topic into exactly 6 micro-lessons, each completable in 5 minutes.
Each lesson should build on the previous one.

Topic: ${topic}
Subject: ${subject}
Source: ${(sourceText || topic).slice(0, 3000)}

Respond ONLY in JSON:
{
  "lessons": [
    {
      "number": 1,
      "title": "...",
      "duration": "5 min",
      "content": "The actual lesson content (150-200 words)",
      "keyPoint": "Single most important takeaway",
      "quickCheck": "One question to verify understanding",
      "quickAnswer": "Answer to quick check"
    }
  ]
}`,
    maxTokens: 2000,
  });

  if (!parsed) return NextResponse.json({ error: "Generation failed" }, { status: 500 });

  const lessonsPayload = parsed.lessons ?? [];
  const lesson = await prisma.microLesson.create({
    data: {
      userId,
      topic,
      subject,
      lessons: lessonsPayload as never,
      totalLessons: parsed.lessons?.length || 6,
    },
  });

  return NextResponse.json({ lesson, lessons: parsed.lessons ?? [] });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const lessons = await prisma.microLesson.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ lessons });
}
