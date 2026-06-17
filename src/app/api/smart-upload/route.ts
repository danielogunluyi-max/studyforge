import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { groq, groqJSON } from "~/server/groq";

type SmartUploadBody = {
  fileBase64?: string;
  mediaType?: string;
  fileName?: string;
  subject?: string;
};

function decodeBase64Utf8(value: string): string {
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as SmartUploadBody;
  const fileBase64 = body.fileBase64 ?? "";
  const mediaType = body.mediaType ?? "";
  const fileName = body.fileName?.trim() || "Upload";
  const subject = body.subject?.trim() || "General";

  if (!fileBase64 || !mediaType) {
    return NextResponse.json({ error: "fileBase64 and mediaType are required" }, { status: 400 });
  }

  let extractedText = "";

  if (mediaType.startsWith("image/") || mediaType === "application/pdf") {
    const visionRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${fileBase64}` },
            },
            {
              type: "text",
              text: "Extract ALL text content from this document accurately. Return only the extracted text, no commentary.",
            },
          ],
        } as any,
      ],
      max_tokens: 3000,
    });

    extractedText = visionRes.choices[0]?.message?.content ?? "";
  } else if (mediaType.startsWith("text/")) {
    extractedText = decodeBase64Utf8(fileBase64);
  }

  const sourceText = extractedText.trim() || decodeBase64Utf8(fileBase64).trim();
  if (!sourceText) {
    return NextResponse.json({ error: "Could not extract readable text from file" }, { status: 400 });
  }

  const parsed = await groqJSON<{
    title?: string;
    notes?: string;
    flashcards?: Array<{ question?: string; answer?: string }>;
    quiz?: Array<{ question?: string; options?: string[]; answer?: string; explanation?: string }>;
    summary?: string;
    keyTerms?: string[];
  }>({
    user: `You are a study assistant. From this content, generate study notes, flashcards, and quiz questions simultaneously.

File: ${fileName}
Subject: ${subject}
Content: ${sourceText.slice(0, 5000)}

Respond ONLY in JSON:
{
  "title": "detected title",
  "notes": "comprehensive formatted study notes with headers and bullets",
  "flashcards": [
    {"question": "...", "answer": "..."}
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A) ...",
      "explanation": "..."
    }
  ],
  "summary": "3-sentence summary",
  "keyTerms": ["term1", "term2"]
}`,
    maxTokens: 3000,
  });

  if (!parsed) return NextResponse.json({ error: "Processing failed" }, { status: 500 });

  const note = await db.note.create({
    data: {
      userId,
      title: parsed.title || fileName,
      content: parsed.notes || sourceText,
      format: "detailed",
      tags: Array.isArray(parsed.keyTerms) ? parsed.keyTerms.slice(0, 12) : [],
    },
  });

  const validFlashcards = (parsed.flashcards ?? []).filter((item) => item.question && item.answer);

  const deck = await db.flashcardDeck.create({
    data: {
      userId,
      title: `${parsed.title || fileName} - Flashcards`,
      subject,
      description: parsed.summary || null,
      cards: {
        create: validFlashcards.map((item) => ({
          front: item.question!,
          back: item.answer!,
        })),
      },
    },
    include: { cards: true },
  });

  return NextResponse.json({
    ...parsed,
    noteId: note.id,
    deckId: deck.id,
    counts: {
      flashcards: validFlashcards.length,
      quizQuestions: parsed.quiz?.length || 0,
    },
  });
}
