import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { getAuthSession } from '~/server/auth/session';

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    noteId?: string;
    content?: string;
    topic?: string;
  };

  const noteId = body.noteId ?? '';
  const content = body.content ?? '';
  const topic = body.topic?.trim() || 'General';

  if (!noteId || !content.trim()) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `Rewrite these notes at 4 difficulty levels for adaptive learning.

Topic: ${topic}
Original notes: ${content.slice(0, 3000)}

Level 1 (Simplified): Use simple language, analogies, examples. For someone brand new.
Level 2 (Standard): Clear explanation with some terminology. For a typical student.
Level 3 (Advanced): Full technical depth. Assume strong background.
Level 4 (Expert): Dense, precise, assumes expert knowledge. Academic level.

Respond ONLY in JSON:
{
  "level1": "simplified version...",
  "level2": "standard version...",
  "level3": "advanced version...",
  "level4": "expert version..."
}`,
      },
    ],
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as {
      level1?: string;
      level2?: string;
      level3?: string;
      level4?: string;
    };

    const adaptive = await prisma.adaptiveNote.upsert({
      where: { noteId },
      update: {
        level1: parsed.level1 ?? content,
        level2: parsed.level2 ?? content,
        level3: parsed.level3 ?? content,
        level4: parsed.level4 ?? content,
      },
      create: {
        userId: session.user.id,
        noteId,
        level1: parsed.level1 ?? content,
        level2: parsed.level2 ?? content,
        level3: parsed.level3 ?? content,
        level4: parsed.level4 ?? content,
      },
    });

    return NextResponse.json({ adaptive });
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { noteId?: string; level?: number };
  const noteId = body.noteId ?? '';
  const level = Number(body.level ?? 1);

  if (!noteId || level < 1 || level > 4) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const adaptive = await prisma.adaptiveNote.update({
    where: { noteId },
    data: { currentLevel: level },
  });

  return NextResponse.json({ adaptive });
}
