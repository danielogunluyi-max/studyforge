import { NextResponse } from "next/server";
import { getAuthSession } from "~/server/auth/session";
import { summarizeTranscriptChunked, splitTranscriptChunks } from "~/lib/chunk-summarize";
import { isRateLimited, BUSY_MESSAGE } from "~/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 300;

type NoteType = "summary" | "detailed" | "flashcards" | "quiz";

type RequestBody = {
  transcript?: string;
  subject?: string;
  noteType?: NoteType;
};

function normalizeTitle(rawTitle: string, subject: string) {
  const cleaned = rawTitle.replace(/^title\s*:\s*/i, "").trim();
  if (cleaned.length > 0) return cleaned.slice(0, 120);
  return `Lecture Notes: ${subject || "General Topic"}`;
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const transcript = String(body.transcript ?? "").trim();
    const subject = String(body.subject ?? "").trim() || "General";
    const noteType = body.noteType;

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    if (!noteType || !["summary", "detailed", "flashcards", "quiz"].includes(noteType)) {
      return NextResponse.json({ error: "Invalid note type" }, { status: 400 });
    }

    // Long recordings (e.g. 90 min) → chunked so the ending isn't dropped
    const chunks = splitTranscriptChunks(transcript);
    let raw: string;
    let chunkCount = chunks.length;
    let chunkHint: string | null = null;

    if (chunks.length === 1 && transcript.length < 12000) {
      const { runGroqPrompt } = await import("~/server/groq");
      raw = await runGroqPrompt({
        system: `You are a study assistant that converts lecture transcripts into structured study materials.
Be thorough but concise. Format clearly with headers and bullet points.
Return your output in this exact format:
Title: <short, specific title>

<notes content>`,
        user: `Convert this lecture transcript into ${noteType} notes for the subject: ${subject}
Transcript:
${transcript}`,
        temperature: 0.4,
        maxTokens: 2200,
      });
    } else {
      const summarized = await summarizeTranscriptChunked({
        title: `Lecture Notes: ${subject}`,
        subject,
        transcript,
      });
      raw = summarized.notes;
      chunkCount = summarized.chunkCount;
      chunkHint = summarized.truncatedHint;
      if (!/^title\s*:/i.test(raw.split("\n")[0] ?? "")) {
        raw = `Title: Lecture Notes: ${subject}\n\n${raw}`;
      }
    }

    if (!raw.trim()) {
      return NextResponse.json({ error: "Failed to generate notes" }, { status: 500 });
    }

    const lines = raw.split("\n");
    const titleLine = lines.find((line) => /^title\s*:/i.test(line)) ?? "";
    const title = normalizeTitle(titleLine, subject);
    const content = raw.replace(/^title\s*:.*$/im, "").trim();

    return NextResponse.json({
      title,
      content: content || raw,
      chunkCount,
      chunkHint,
    });
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    console.error("Audio-to-notes generation error:", error);
    const detail = error instanceof Error ? error.message : "Failed to generate notes from transcript";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
