import { NextResponse } from "next/server";
import { runGroqPrompt, extractJsonBlock } from "~/server/groq";

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
2. Each flashcard must have exactly two fields: "front" (the concept, question, or term) and "back" (the concise explanation or definition).
3. The "front" should be clear, specific, and testable (e.g., a question, term, or concept name).
4. The "back" should be accurate, concise, and directly answer the front without unnecessary fluff.
5. Return ONLY a valid JSON array of flashcard objects. No markdown formatting, no explanations, no extra text.
6. Ensure the JSON is properly formatted and can be parsed directly.

Output format:
[
  {
    "front": "Question or term",
    "back": "Answer or definition"
  }
]`;

export async function POST(request: Request) {
  try {
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

    // Validate flashcard structure
    const validFlashcards = flashcards.filter(
      (card) => card && typeof card.front === "string" && typeof card.back === "string"
    );

    if (validFlashcards.length === 0) {
      return NextResponse.json(
        { error: "No valid flashcards were generated. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ flashcards: validFlashcards } as GenerateResponse);
  } catch (error) {
    console.error("[flashcards/generate] Error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating flashcards." },
      { status: 500 },
    );
  }
}
