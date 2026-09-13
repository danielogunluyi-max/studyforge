import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const limited = assertGroqRateLimit(session.user.id);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    topic?: string;
    action?: string;
    wpm?: number;
    comprehension?: number;
    questions?: unknown;
    answers?: unknown;
  };

  const text = body.text ?? '';
  const topic = body.topic?.trim() || 'General';

  if (body.action === 'generate-questions') {
    let completion;
    try {
      completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: `Generate 5 comprehension questions for this text. Mix recall and inference questions.
Text: ${text.slice(0, 3000)}
Respond ONLY as JSON array:
[{"question":"...","answer":"...","type":"recall|inference"}]`,
        },
      ],
      max_tokens: 600,
    });
    } catch (error) {
      if (isRateLimited(error)) {
        return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
      }
      throw error;
    }

    const raw = completion.choices[0]?.message?.content || '[]';
    try {
      const questions = JSON.parse(raw.replace(/```json|```/g, '').trim());
      return NextResponse.json({ questions });
    } catch {
      return NextResponse.json({ questions: [] });
    }
  }

  if (body.action === 'save-result') {
    const session2 = await prisma.readingSession.create({
      data: {
        userId: session.user.id,
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

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.readingSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, topic: true, wpm: true, comprehension: true, createdAt: true },
  });

  return NextResponse.json({ sessions });
}
