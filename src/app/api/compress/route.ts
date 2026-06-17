import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { text, topic, targetWords } = (await req.json()) as {
    text?: string;
    topic?: string;
    targetWords?: number;
  };

  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const target = targetWords || 50;

  const parsed = await groqJSON<{
    compressed?: string;
    wordCount?: number;
    compressionScore?: number;
    cutConcepts?: string[];
  }>({
    user: `You are a knowledge compression expert. Compress the following study notes to EXACTLY ${target} words or fewer, preserving ALL key concepts and relationships. Then provide a "Compression Score" (how much was preserved 0-100%) and list any concepts that were cut.\n\nTopic: ${topic || "Study notes"}\nOriginal text: ${text}\n\nRespond in this exact JSON format:\n{\n  "compressed": "...",\n  "wordCount": number,\n  "compressionScore": number,\n  "cutConcepts": ["concept1", "concept2"]\n}`,
    maxTokens: 500,
  });

  return NextResponse.json(parsed ?? {
    compressed: "",
    wordCount: 0,
    compressionScore: 0,
    cutConcepts: [],
  });
}
