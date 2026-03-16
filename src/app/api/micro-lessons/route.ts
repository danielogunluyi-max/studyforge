import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    topic?: string;
    subject?: string;
    sourceText?: string;
  };

  const topic = body.topic?.trim() ?? '';
  const subject = body.subject?.trim() ?? '';
  const sourceText = body.sourceText ?? '';

  if (!topic || !subject) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `Break this topic into exactly 6 micro-lessons, each completable in 5 minutes.
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
      },
    ],
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { lessons?: unknown[] };
    const lessonsPayload = parsed.lessons ?? [];
    const lesson = await prisma.microLesson.create({
      data: {
        userId: session.user.id,
        topic,
        subject,
        lessons: lessonsPayload as never,
        totalLessons: parsed.lessons?.length || 6,
      },
    });

    return NextResponse.json({ lesson, lessons: parsed.lessons ?? [] });
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lessons = await prisma.microLesson.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ lessons });
}
