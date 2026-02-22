import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runGroqPrompt } from "~/server/groq";

type LearningStyle = "visual" | "auditory" | "reading" | "kinesthetic";

const STYLE_INSTRUCTIONS: Record<LearningStyle, string> = {
  visual:
    "Organize information spatially. Use labeled sections, quick mental-image cues, and simple text diagrams where useful.",
  auditory:
    "Use conversational explanation, rhythm, and teach-out-loud style language. Make it sound like a tutor explaining.",
  reading:
    "Use traditional detailed notes with clear headings, bullet points, and precise definitions.",
  kinesthetic:
    "Use action-oriented explanations, physical analogies, hands-on scenarios, and practical application steps.",
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { content?: string; learningStyle?: LearningStyle };
    const content = (body.content ?? "").trim();
    const learningStyle = (body.learningStyle ?? "reading") as LearningStyle;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const instruction = STYLE_INSTRUCTIONS[learningStyle] ?? STYLE_INSTRUCTIONS.reading;

    const transformed = await runGroqPrompt({
      system: "You adapt study material for a specific learning style while preserving factual accuracy.",
      user: `Learning style: ${learningStyle}\nInstruction: ${instruction}\n\nReformat this study content:\n${content}`,
      temperature: 0.6,
      maxTokens: 1900,
    });

    return NextResponse.json({ transformedContent: transformed.trim() });
  } catch (error) {
    console.error("Transform content error:", error);
    return NextResponse.json({ error: "Failed to transform content" }, { status: 500 });
  }
}
