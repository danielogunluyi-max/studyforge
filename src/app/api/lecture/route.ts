import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { groqJSON } from "~/server/groq";

const prisma = db as any;

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as {
    transcript?: string;
    title?: string;
    subject?: string;
    duration?: number;
  };

  const transcript = body.transcript ?? "";
  const title = body.title?.trim() || "Lecture";
  const subject = body.subject?.trim() || "General";
  const duration = Number(body.duration ?? 0);

  if (!transcript.trim()) {
    return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
  }

  const parsed = await groqJSON<{
    notes?: string;
    flashcards?: unknown[];
    keyTerms?: string[];
    summary?: string;
  }>({
    user: `Convert this live lecture transcript into structured study notes and flashcards.

Title: ${title}
Subject: ${subject}
Transcript: ${transcript.slice(0, 6000)}

Respond ONLY in JSON:
{
  "notes": "Full structured notes with headers and bullets",
  "flashcards": [
    {"question": "...", "answer": "..."}
  ],
  "keyTerms": ["term1", "term2"],
  "summary": "2-3 sentence summary"
}`,
    maxTokens: 2000,
  });

  if (!parsed) return NextResponse.json({ error: "Processing failed" }, { status: 500 });

  const lecture = await prisma.lectureSession.create({
    data: {
      userId,
      title,
      transcript: transcript.slice(0, 20000),
      notes: parsed.notes || "",
      flashcards: (parsed.flashcards ?? []) as never,
      duration,
      subject,
    },
  });

  return NextResponse.json({ lecture, ...parsed });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const lectures = await prisma.lectureSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, subject: true, duration: true, createdAt: true },
  });

  return NextResponse.json({ lectures });
}
