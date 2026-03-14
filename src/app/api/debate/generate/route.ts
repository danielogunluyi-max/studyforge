import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic } = (await req.json()) as { topic?: string };
  if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `You are an expert academic debate coach. For the topic "${topic}", generate a rigorous academic debate with strong arguments on both sides.\n\nRespond ONLY in this exact JSON format:\n{\n  "for": [\n    { "point": "...", "evidence": "...", "strength": 85 },\n    { "point": "...", "evidence": "...", "strength": 80 },\n    { "point": "...", "evidence": "...", "strength": 75 }\n  ],\n  "against": [\n    { "point": "...", "evidence": "...", "strength": 82 },\n    { "point": "...", "evidence": "...", "strength": 78 },\n    { "point": "...", "evidence": "...", "strength": 71 }\n  ],\n  "verdict": "A balanced one-sentence summary of the debate",\n  "keyTension": "The central tension between the two sides in one sentence"\n}`,
      },
    ],
    max_tokens: 1200,
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      for?: unknown[];
      against?: unknown[];
      verdict?: string;
      keyTension?: string;
    };

    await db.debateSession.create({
      data: {
        userId: session.user.id,
        topic,
        forArguments: parsed.for || [],
        againstArguments: parsed.against || [],
        verdict: parsed.verdict || "",
      },
    });

    return NextResponse.json({ ...parsed, topic });
  } catch {
    return NextResponse.json({ error: "Failed to parse debate" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await db.debateSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ sessions });
}
