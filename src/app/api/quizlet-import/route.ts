import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma } from "@/lib/prisma";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { pastedText, deckName, subject } = (await req.json()) as {
    pastedText?: string;
    deckName?: string;
    subject?: string;
  };

  const lines = (pastedText ?? "").split("\n").filter((l: string) => l.trim());
  const cards: { front: string; back: string }[] = [];

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 2) {
      cards.push({ front: parts[0]!.trim(), back: parts[1]!.trim() });
    }
  }

  if (cards.length === 0) {
    const raw = await runGroqPrompt({
      user: `Parse these flashcards into question/answer pairs. They may be in any format.
Text: ${(pastedText ?? "").slice(0, 3000)}
Respond ONLY as JSON array: [{"question":"...","answer":"..."}]`,
      maxTokens: 1000,
    });

    const parsed = extractJsonBlock<Array<{ question?: string; answer?: string; front?: string; back?: string }>>(raw);
    if (parsed && Array.isArray(parsed)) {
      for (const item of parsed) {
        const front = item.front ?? item.question;
        const back = item.back ?? item.answer;
        if (front && back) cards.push({ front, back });
      }
    }
  }

  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards found. Try copying from Quizlet export." }, { status: 400 });
  }

  const deck = await prisma.flashcardDeck.create({
    data: {
      userId,
      title: deckName || "Imported from Quizlet",
      description: "Imported via Quizlet importer",
      subject: subject || "General",
      cards: {
        create: cards.map((c) => ({
          front: c.front,
          back: c.back,
        })),
      },
    },
    include: { cards: true },
  });

  return NextResponse.json({ deck, count: cards.length });
}
