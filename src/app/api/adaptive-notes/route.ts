import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { groqJSON } from "~/server/groq";

const prisma = db as any;

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as {
    noteId?: string;
    content?: string;
    topic?: string;
  };

  const noteId = body.noteId ?? "";
  const content = body.content ?? "";
  const topic = body.topic?.trim() || "General";

  if (!noteId || !content.trim()) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = await groqJSON<{
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
  }>({
    user: `Rewrite these notes at 4 difficulty levels for adaptive learning.

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
    maxTokens: 2000,
  });

  if (!parsed) return NextResponse.json({ error: "Generation failed" }, { status: 500 });

  const adaptive = await prisma.adaptiveNote.upsert({
    where: { noteId },
    update: {
      level1: parsed.level1 ?? content,
      level2: parsed.level2 ?? content,
      level3: parsed.level3 ?? content,
      level4: parsed.level4 ?? content,
    },
    create: {
      userId,
      noteId,
      level1: parsed.level1 ?? content,
      level2: parsed.level2 ?? content,
      level3: parsed.level3 ?? content,
      level4: parsed.level4 ?? content,
    },
  });

  return NextResponse.json({ adaptive });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { noteId?: string; level?: number };
  const noteId = body.noteId ?? "";
  const level = Number(body.level ?? 1);

  if (!noteId || level < 1 || level > 4) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const adaptive = await prisma.adaptiveNote.update({
    where: { noteId },
    data: { currentLevel: level },
  });

  return NextResponse.json({ adaptive });
}
