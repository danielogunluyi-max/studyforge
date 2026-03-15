import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '~/server/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch current user's top tags from notes
  const myNotes = await prisma.note.findMany({
    where: { userId },
    select: { tags: true },
    take: 50,
  });

  const myTagCounts: Record<string, number> = {};
  for (const note of myNotes) {
    for (const tag of note.tags) {
      myTagCounts[tag] = (myTagCounts[tag] ?? 0) + 1;
    }
  }
  const myTopTags = Object.keys(myTagCounts).sort((a, b) => (myTagCounts[b] ?? 0) - (myTagCounts[a] ?? 0)).slice(0, 5);

  // Find other users who share at least one tag, excluding current user
  const candidates = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: {
      id: true,
      name: true,
      notes: { select: { tags: true }, take: 50 },
      _count: { select: { notes: true, flashcardDecks: true } },
    },
    take: 100,
  });

  const matches = candidates
    .map((u) => {
      const theirTags = new Set(u.notes.flatMap((n) => n.tags));
      const sharedTags = myTopTags.filter((t) => theirTags.has(t));
      return {
        id: u.id,
        name: u.name ?? 'Student',
        notes: u._count.notes,
        decks: u._count.flashcardDecks,
        sharedTags,
        matchScore: sharedTags.length,
      };
    })
    .filter((m) => m.notes > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.notes - a.notes)
    .slice(0, 10);

  return NextResponse.json({ matches, myTopTags });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { targetUserId?: string };
  if (!body.targetUserId) {
    return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
  }

  // For now, we create a community post announcing the buddy request
  // (no dedicated buddy request model in schema)
  const target = await prisma.user.findUnique({
    where: { id: body.targetUserId },
    select: { name: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.communityPost.create({
    data: {
      userId: session.user.id,
      content: `👋 Hey ${target.name ?? 'Student'}! I'd love to study together. Looking for a study buddy!`,
    },
  });

  return NextResponse.json({ success: true, message: 'Study buddy request sent via community!' });
}
