import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { noteId?: string; content?: string };
  const noteId = body.noteId ?? '';
  const content = body.content ?? '';

  if (!noteId || !content.trim()) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const lastVersion = await prisma.noteEvolution.findFirst({
    where: { noteId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const evolution = await prisma.noteEvolution.create({
    data: {
      noteId,
      userId: session.user.id,
      snapshot: content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      version: (lastVersion?.version || 0) + 1,
    },
  });

  return NextResponse.json({ evolution });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get('noteId');

  if (!noteId) {
    return NextResponse.json({ error: 'noteId required' }, { status: 400 });
  }

  const evolutions = await prisma.noteEvolution.findMany({
    where: { noteId, userId: session.user.id },
    orderBy: { version: 'asc' },
  });

  return NextResponse.json({ evolutions });
}
