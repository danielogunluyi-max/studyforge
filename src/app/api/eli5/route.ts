import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { runGroqPrompt } from "~/server/groq";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { text, concept } = (await req.json()) as { text?: string; concept?: string };

  const explanation = await runGroqPrompt({
    user: `Explain this concept as if you're talking to a curious 10-year-old. Use simple words, fun analogies, and a real-world example they'd relate to. Keep it under 150 words. Be warm and enthusiastic.

Concept: ${concept || "this topic"}
Content: ${text || ""}

Give ONLY the explanation, no preamble.`,
    maxTokens: 300,
  });

  return NextResponse.json({ explanation });
}
