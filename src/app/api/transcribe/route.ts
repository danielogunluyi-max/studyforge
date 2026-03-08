import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

type WhisperSegment = {
  start: number;
  end: number;
  text: string;
};

type WhisperVerboseResponse = {
  text?: string;
  duration?: number;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
};

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    if (audio.size <= 0) {
      return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 25MB." }, { status: 400 });
    }

    if (!audio.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an audio file." }, { status: 400 });
    }

    const transcription = (await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      response_format: "verbose_json",
      language: "en",
    })) as unknown as WhisperVerboseResponse;

    const transcript = String(transcription.text ?? "").trim();

    const segments: WhisperSegment[] = (transcription.segments ?? [])
      .map((segment) => ({
        start: Number(segment.start ?? 0),
        end: Number(segment.end ?? 0),
        text: String(segment.text ?? "").trim(),
      }))
      .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.text.length > 0);

    const duration =
      typeof transcription.duration === "number" && Number.isFinite(transcription.duration)
        ? transcription.duration
        : segments.length > 0
          ? segments[segments.length - 1]?.end ?? 0
          : 0;

    return NextResponse.json({
      transcript,
      segments,
      duration,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio. Please try again." },
      { status: 500 },
    );
  }
}
