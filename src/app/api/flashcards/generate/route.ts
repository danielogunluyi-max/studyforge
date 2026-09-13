import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runGroqPrompt, extractJsonBlock, isRateLimited, BUSY_MESSAGE } from "~/server/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

type Flashcard = {
  front: string;
  back: string;
};

type GenerateRequest = {
  textContext: string;
  count?: number;
};

type GenerateResponse = {
  flashcards: Flashcard[];
  error?: string;
};

const SYSTEM_PROMPT = `You are an expert educational content creator. Your task is to analyze the provided text and generate high-quality flashcards for studying.

Rules:
1. Extract key concepts, definitions, relationships, and important facts from the text.
2. Each flashcard teaches exactly ONE atomic fact — never pack multiple facts into one card.
3. Front: clear, specific, and testable (a precise question or term). Avoid vague prompts like "Explain X".
4. Back: accurate, concise (ideally ≤25 words), and directly answers the front — no multi-point dumps.
5. Prefer concrete names, numbers, formulas, and cause→effect from the source. Do not invent facts.
6. Return ONLY a valid JSON array of flashcard objects. No markdown formatting, no explanations, no extra text.

Output format:
[
  {
    "front": "Specific question or term",
    "back": "Atomic answer"
  }
]`;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = assertGroqRateLimit(session.user.id);
    if (limited) return limited;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as GenerateRequest;
    const { textContext, count = 10 } = body;

    if (!textContext || typeof textContext !== "string") {
      return NextResponse.json(
        { error: "textContext is required and must be a string." },
        { status: 400 },
      );
    }

    if (textContext.length < 50) {
      return NextResponse.json(
        { error: "textContext is too short to generate meaningful flashcards." },
        { status: 400 },
      );
    }

    const userPrompt = `Generate ${count} flashcards from the following text. Return ONLY a JSON array:\n\n${textContext}`;

    const response = await runGroqPrompt({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.3,
      maxTokens: 2000,
    });

    const flashcards = extractJsonBlock<Flashcard[]>(response);

    if (!flashcards || !Array.isArray(flashcards)) {
      console.error("[flashcards/generate] Failed to parse JSON from response:", response);
      return NextResponse.json(
        { error: "Failed to generate valid flashcards. Please try again." },
        { status: 500 },
      );
    }

    const validFlashcards = flashcards.filter(
      (card) => card && typeof card.front === "string" && typeof card.back === "string",
    );

    if (validFlashcards.length === 0) {
      return NextResponse.json(
        { error: "No valid flashcards were generated. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ flashcards: validFlashcards } as GenerateResponse);
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    console.error("[flashcards/generate] Error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating flashcards." },
      { status: 500 },
    );
  }
}
