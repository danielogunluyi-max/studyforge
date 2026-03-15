import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, concept } = (await req.json()) as { text?: string; concept?: string };

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `Explain this concept as if you're talking to a curious 10-year-old. Use simple words, fun analogies, and a real-world example they'd relate to. Keep it under 150 words. Be warm and enthusiastic.

Concept: ${concept || "this topic"}
Content: ${text || ""}

Give ONLY the explanation, no preamble.`,
      },
    ],
    max_tokens: 300,
  });

  return NextResponse.json({
    explanation: completion.choices[0]?.message?.content || "",
  });
}
