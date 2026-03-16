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
    transcript?: string;
    title?: string;
    subject?: string;
    duration?: number;
  };

  const transcript = body.transcript ?? '';
  const title = body.title?.trim() || 'Lecture';
  const subject = body.subject?.trim() || 'General';
  const duration = Number(body.duration ?? 0);

  if (!transcript.trim()) {
    return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `Convert this live lecture transcript into structured study notes and flashcards.

Title: ${title}
Subject: ${subject}
Transcript: ${transcript.slice(0, 6000)}

Respond ONLY in JSON:
{
  "notes": "Full structured notes with headers and bullets",
  "flashcards": [
    {"question": "...", "answer": "..."}
  ],
  "keyTerms": ["term1", "term2"],
  "summary": "2-3 sentence summary"
}`,
      },
    ],
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as {
      notes?: string;
      flashcards?: unknown[];
      keyTerms?: string[];
      summary?: string;
    };

    const lecture = await prisma.lectureSession.create({
      data: {
        userId: session.user.id,
        title,
        transcript: transcript.slice(0, 20000),
        notes: parsed.notes || '',
        flashcards: (parsed.flashcards ?? []) as never,
        duration,
        subject,
      },
    });

    return NextResponse.json({ lecture, ...parsed });
  } catch {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lectures = await prisma.lectureSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, title: true, subject: true, duration: true, createdAt: true },
  });

  return NextResponse.json({ lectures });
}
