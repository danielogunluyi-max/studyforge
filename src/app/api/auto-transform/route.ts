import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { auth } from "~/server/auth";

type TransformResult = {
  flashcards?: Array<{ question: string; answer: string }>;
  keyTerms?: Array<{ term: string; definition: string }>;
  detectedSubject?: string;
  suggestions?: Array<{ action: string; href: string; icon: string }>;
  connections?: string[];
  deckId?: string;
  deckName?: string;
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function tryParseJson(raw: string): TransformResult | null {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as TransformResult;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    sourceType?: string;
    sourceId?: string;
    sourceTitle?: string;
    subject?: string;
    content?: string;
  };

  const sourceType = body.sourceType ?? "note";
  const sourceId = body.sourceId ?? "";
  const sourceTitle = body.sourceTitle ?? "Untitled";

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  const entry = await prisma.autoTransformQueue.create({
    data: {
      userId: uid,
      sourceType,
      sourceId,
      sourceTitle,
      subject: body.subject ?? null,
      status: "processing",
    },
  });

  try {
    const results: TransformResult = {};

    if (sourceType === "note" && body.content) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `From these notes, generate:\n1. 5 flashcard Q&A pairs\n2. 3 key terms with definitions\n3. The subject/topic detected\n4. 2 suggested next actions\n\nNotes: ${body.content.slice(0, 3000)}\n\nRespond ONLY in JSON:\n{\n  "flashcards": [{"question":"...","answer":"..."}],\n  "keyTerms": [{"term":"...","definition":"..."}],\n  "detectedSubject": "...",\n  "suggestions": [\n    {"action":"Study these flashcards","href":"/flashcards","icon":"🃏"},\n    {"action":"Do Feynman technique","href":"/feynman","icon":"🔬"}\n  ],\n  "connections": ["related topic 1", "related topic 2"]\n}`,
          },
        ],
        max_tokens: 800,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = tryParseJson(raw);

      if (parsed) {
        results.flashcards = (parsed.flashcards ?? []).filter((f) => f.question && f.answer);
        results.keyTerms = parsed.keyTerms ?? [];
        results.detectedSubject = parsed.detectedSubject ?? body.subject;
        results.suggestions = parsed.suggestions ?? [];
        results.connections = parsed.connections ?? [];

        if ((results.flashcards?.length ?? 0) > 0) {
          const deck = await prisma.flashcardDeck.create({
            data: {
              userId: uid,
              title: `${sourceTitle} - Auto Flashcards`,
              subject: results.detectedSubject ?? body.subject ?? "General",
              cards: {
                create: (results.flashcards ?? []).map((f) => ({
                  front: f.question,
                  back: f.answer,
                })),
              },
            },
          });
          results.deckId = deck.id;
          results.deckName = deck.title;
        }
      }
    }

    await prisma.autoTransformQueue.update({
      where: { id: entry.id },
      data: { status: "done", results, processedAt: new Date() },
    });

    return NextResponse.json({ entry: { ...entry, status: "done", results } });
  } catch {
    await prisma.autoTransformQueue.update({
      where: { id: entry.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ entry, error: "Processing failed" });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId");

  if (sourceId) {
    const entry = await prisma.autoTransformQueue.findFirst({
      where: { userId: uid, sourceId },
    });
    return NextResponse.json({ entry });
  }

  const queue = await prisma.autoTransformQueue.findMany({
    where: { userId: uid, status: "done" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ queue });
}
