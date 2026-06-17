import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

async function getYouTubeTranscript(url: string): Promise<string> {
  const match = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url);
  const videoId = match?.[1];
  if (!videoId) throw new Error("Invalid YouTube URL");

  const res = await fetch(
    `https://api.kome.ai/api/tools/youtube-transcripts?video_id=${videoId}&format=true`,
    { headers: { "Content-Type": "application/json" } },
  );
  if (!res.ok) throw new Error("Could not fetch transcript");
  const data = (await res.json()) as { transcript?: string };
  return data.transcript || "";
}

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { youtubeUrl } = (await req.json()) as { youtubeUrl?: string };
  if (!youtubeUrl) return NextResponse.json({ error: "URL required" }, { status: 400 });

  let transcript = "";
  let title = "YouTube Video";

  try {
    transcript = await getYouTubeTranscript(youtubeUrl);
  } catch {
    return NextResponse.json({ error: "Could not fetch transcript. Make sure the video has captions." }, { status: 400 });
  }

  const parsed = await groqJSON<{
    title?: string;
    notes?: string;
    flashcards?: Array<{ question?: string; answer?: string }>;
  }>({
    user: `You are a study assistant. Based on this YouTube video transcript, generate:
1. Comprehensive study notes with headers and bullet points
2. 8 flashcard question/answer pairs

Transcript: ${transcript.slice(0, 8000)}

Respond ONLY in this JSON:
{
  "title": "Video title/topic",
  "notes": "Full markdown notes here...",
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}`,
    maxTokens: 2000,
  });

  if (!parsed) return NextResponse.json({ error: "Processing failed" }, { status: 500 });

  title = parsed.title || title;

  const saved = await prisma.youTubeImport.create({
    data: {
      userId,
      youtubeUrl,
      title,
      transcript: transcript.slice(0, 10000),
      notes: parsed.notes || "",
      flashcards: parsed.flashcards || [],
    },
  });

  return NextResponse.json({ ...parsed, id: saved.id });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const imports = await prisma.youTubeImport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, youtubeUrl: true, createdAt: true },
  });
  return NextResponse.json({ imports });
}
