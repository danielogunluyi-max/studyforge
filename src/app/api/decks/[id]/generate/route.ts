import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { curriculumContextToPrompt, getCurriculumContext } from "~/server/curriculum";

type GenerateBody = {
  topic?: string;
  subject?: string;
  count?: number;
  noteId?: string;
  curriculumCode?: string;
};

type GeneratedCard = {
  front: string;
  back: string;
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function extractJsonArray(raw: string): GeneratedCard[] {
  const text = raw.trim();

  const parseArray = (value: string): GeneratedCard[] => {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        const row = item as { front?: unknown; back?: unknown };
        return {
          front: String(row.front ?? "").trim(),
          back: String(row.back ?? "").trim(),
        };
      })
      .filter((item) => item.front.length > 0 && item.back.length > 0);
  };

  try {
    return parseArray(text);
  } catch {
    // continue
  }

  const codeBlock = text.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? text.match(/```\s*([\s\S]*?)```/i)?.[1];
  if (codeBlock) {
    try {
      return parseArray(codeBlock);
    } catch {
      // continue
    }
  }

  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const sliced = text.slice(firstBracket, lastBracket + 1);
    try {
      return parseArray(sliced);
    } catch {
      return [];
    }
  }

  return [];
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as GenerateBody;
    const subject = String(body.subject ?? deck.subject ?? "").trim();
    const count = Math.max(10, Math.min(50, Number(body.count ?? 20)));
    const topic = String(body.topic ?? "").trim();
    const curriculumContext = await getCurriculumContext(body.curriculumCode);
    const curriculumPrompt = curriculumContextToPrompt(curriculumContext);

    let sourceText = "";

    if (body.noteId) {
      const note = await prisma.note.findFirst({
        where: {
          id: body.noteId,
          userId: session.user.id,
        },
        select: {
          title: true,
          content: true,
        },
      });

      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      sourceText = `Note title: ${note.title}\n\n${note.content}`;
    } else {
      if (!topic) {
        return NextResponse.json({ error: "Topic is required" }, { status: 400 });
      }
      sourceText = topic;
    }

    const prompt = body.noteId
      ? `Generate ${count} flashcards for ${subject} from the following note content:\n${curriculumPrompt}\n\n${sourceText}\n\nReturn ONLY a JSON array, no markdown, no explanation:\n[{"front": "question", "back": "answer"}, ...]`
      : `Generate ${count} flashcards about ${topic} for ${subject}.\n${curriculumPrompt}\nReturn ONLY a JSON array, no markdown, no explanation:\n[{"front": "question", "back": "answer"}, ...]`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 3200,
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsedCards = extractJsonArray(raw).slice(0, count);

    if (!parsedCards.length) {
      return NextResponse.json({ error: "AI returned no valid cards" }, { status: 502 });
    }

    await prisma.flashcard.createMany({
      data: parsedCards.map((card) => ({
        deckId: deck.id,
        front: card.front,
        back: card.back,
      })),
    });

    const cards = await prisma.flashcard.findMany({
      where: { deckId: deck.id },
      orderBy: { createdAt: "desc" },
      take: parsedCards.length,
    });

    return NextResponse.json({ cards, count: cards.length });
  } catch (error) {
    console.error("Deck generate POST error:", error);
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }
}
