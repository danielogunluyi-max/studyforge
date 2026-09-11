import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "~/server/auth";
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, topic, targetWords } = (await req.json()) as {
    text?: string;
    topic?: string;
    targetWords?: number;
  };

  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const target = targetWords || 50;

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: `You are a knowledge compression expert. Compress the following study notes to EXACTLY ${target} words or fewer, preserving ALL key concepts and relationships. Then provide a "Compression Score" (how much was preserved 0-100%) and list any concepts that were cut.\n\nTopic: ${topic || "Study notes"}\nOriginal text: ${text}\n\nRespond in this exact JSON format:\n{\n  "compressed": "...",\n  "wordCount": number,\n  "compressionScore": number,\n  "cutConcepts": ["concept1", "concept2"]\n}`,
        },
      ],
      max_tokens: 500,
    });
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    throw error;
  }

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      compressed?: string;
      wordCount?: number;
      compressionScore?: number;
      cutConcepts?: string[];
    };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      compressed: raw,
      wordCount: 0,
      compressionScore: 0,
      cutConcepts: [],
    });
  }
}
