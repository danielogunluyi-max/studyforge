import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { runGroqPrompt } from "~/server/groq";

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { sourceText, topic, noteId } = (await req.json()) as {
    sourceText?: string;
    topic?: string;
    noteId?: string | null;
  };

  if (!sourceText || !topic) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const narrative = await runGroqPrompt({
    user: `Convert these study notes into a vivid, memorable narrative story that makes the content easy to remember. Use characters, cause-and-effect, drama, and concrete imagery. The story should encode ALL the key facts from the notes in a way that's genuinely entertaining and memorable. End with a 3-bullet "Memory Anchors" summary.\n\nTopic: ${topic}\nNotes: ${sourceText}\n\nWrite the narrative now:`,
    maxTokens: 1000,
  });

  const saved = await db.narrativeMemory.create({
    data: {
      userId,
      noteId: noteId || null,
      sourceText,
      narrative,
      topic,
    },
  });

  return NextResponse.json({ narrative, id: saved.id });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const items = await db.narrativeMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ items });
}
