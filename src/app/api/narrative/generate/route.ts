import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = assertGroqRateLimit(session.user.id);
  if (limited) return limited;

  const { sourceText, topic, noteId } = (await req.json()) as {
    sourceText?: string;
    topic?: string;
    noteId?: string | null;
  };

  if (!sourceText || !topic) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let completion;
  try {
    completion = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: `Convert these study notes into a vivid, memorable narrative story that makes the content easy to remember. Use characters, cause-and-effect, drama, and concrete imagery. The story should encode ALL the key facts from the notes in a way that's genuinely entertaining and memorable. End with a 3-bullet "Memory Anchors" summary.\n\nTopic: ${topic}\nNotes: ${sourceText}\n\nWrite the narrative now:`,
      },
    ],
    max_tokens: 1000,
  });
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    throw error;
  }

  const narrative = completion.choices[0]?.message?.content || "";

  const saved = await db.narrativeMemory.create({
    data: {
      userId: session.user.id,
      noteId: noteId || null,
      sourceText,
      narrative,
      topic,
    },
  });

  return NextResponse.json({ narrative, id: saved.id });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.narrativeMemory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ items });
}
