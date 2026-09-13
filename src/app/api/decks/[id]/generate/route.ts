import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { curriculumContextToPrompt, getCurriculumContext } from "~/server/curriculum";
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

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

  const codeBlock = (/```json\s*([\s\S]*?)```/i.exec(text))?.[1] ?? (/```\s*([\s\S]*?)```/i.exec(text))?.[1];
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
    const limited = assertGroqRateLimit(session.user.id);
    if (limited) return limited;

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

    const qualityRules = `Rules for EVERY card:
- One atomic fact only. Never combine two facts in one card.
- Front: a specific, testable question (who/what/when/why/how, or a precise term). Avoid vague fronts like "Explain X" or "Tell me about Y".
- Back: a short answer (ideally ≤25 words) that fully answers the front — no lists of unrelated points.
- Prefer concrete numbers, names, formulas, definitions, and cause→effect from the source.
- Do not invent facts not supported by the source.
- No duplicate or near-duplicate cards.`;

    const prompt = body.noteId
      ? `Generate exactly ${count} high-quality study flashcards for ${subject || "this course"} from the note below.\n${curriculumPrompt}\n\n${qualityRules}\n\nSOURCE:\n${sourceText}\n\nReturn ONLY a JSON array, no markdown, no explanation:\n[{"front":"specific question","back":"atomic answer"}, ...]`
      : `Generate exactly ${count} high-quality study flashcards about "${topic}" for ${subject || "this course"}.\n${curriculumPrompt}\n\n${qualityRules}\n\nReturn ONLY a JSON array, no markdown, no explanation:\n[{"front":"specific question","back":"atomic answer"}, ...]`;

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      temperature: 0.35,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content:
            "You create atomic spaced-repetition flashcards. Each card teaches exactly one fact. Prefer specificity over coverage.",
        },
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
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    console.error("Deck generate POST error:", error);
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }
}
