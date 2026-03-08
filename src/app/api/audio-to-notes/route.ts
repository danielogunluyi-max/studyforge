import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

type NoteType = "summary" | "detailed" | "flashcards" | "quiz";

type RequestBody = {
  transcript?: string;
  subject?: string;
  noteType?: NoteType;
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function normalizeTitle(rawTitle: string, subject: string) {
  const cleaned = rawTitle.replace(/^title\s*:\s*/i, "").trim();
  if (cleaned.length > 0) return cleaned.slice(0, 120);
  return `Lecture Notes: ${subject || "General Topic"}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const transcript = String(body.transcript ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const noteType = body.noteType;

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!noteType || !["summary", "detailed", "flashcards", "quiz"].includes(noteType)) {
      return NextResponse.json({ error: "Invalid note type" }, { status: 400 });
    }

    const systemPrompt = `You are a study assistant that converts lecture transcripts into structured study materials.
The student recorded or uploaded a lecture and needs it converted into useful notes.
Be thorough but concise. Format clearly with headers and bullet points where appropriate.
Focus on key concepts, definitions, and important points from the lecture.

Return your output in this exact format:
Title: <short, specific title>

<notes content>`;

    const userPrompt = `Convert this lecture transcript into ${noteType} notes for the subject: ${subject}
Transcript:
${transcript}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 2200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ error: "Failed to generate notes" }, { status: 500 });
    }

    const lines = raw.split("\n");
    const titleLine = lines.find((line) => /^title\s*:/i.test(line)) ?? "";
    const title = normalizeTitle(titleLine, subject);
    const content = raw
      .replace(/^title\s*:.*$/im, "")
      .trim();

    return NextResponse.json({
      title,
      content: content || raw,
    });
  } catch (error) {
    console.error("Audio-to-notes generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate notes from transcript" },
      { status: 500 },
    );
  }
}
