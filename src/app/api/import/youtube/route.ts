import { NextResponse } from "next/server";
import { fetchTranscript } from "youtube-transcript-plus";
import { summarizeTranscriptChunked } from "~/lib/chunk-summarize";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { isRateLimited, BUSY_MESSAGE } from "~/server/groq";

export const runtime = "nodejs";
/** Chunked long lectures need headroom (1hr → several Groq passes). */
export const maxDuration = 300;

type ImportRequest = {
  url?: string;
  youtubeUrl?: string;
  subject?: string;
  curriculumCode?: string;
};

const YT_ID_PATTERNS: RegExp[] = [
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
];

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  for (const re of YT_ID_PATTERNS) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function fetchVideoMeta(videoId: string): Promise<{ title: string; author: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { title: data.title ?? "YouTube Video", author: data.author_name ?? "Unknown" };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const imports = await db.youTubeImport.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        youtubeUrl: true,
        createdAt: true,
        notes: true,
      },
    });

    return NextResponse.json({ imports });
  } catch (error) {
    console.error("[import/youtube] GET failed:", error);
    return NextResponse.json({ error: "Failed to load imports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured on the server (missing GROQ_API_KEY)." },
        { status: 500 },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ImportRequest;
    const url = (body.url ?? body.youtubeUrl ?? "").trim();
    if (!url) {
      return NextResponse.json({ error: "Please paste a YouTube link." }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "That doesn't look like a valid YouTube link. Try the full youtube.com/watch?v=… URL." },
        { status: 400 },
      );
    }

    // Fetch transcript + metadata in parallel
    const [transcriptResult, meta] = await Promise.all([
      fetchTranscript(videoId, { lang: "en" }).catch(async (err) => {
        // Retry without lang preference (some videos only have auto-generated non-English)
        try {
          return await fetchTranscript(videoId);
        } catch {
          throw err;
        }
      }),
      fetchVideoMeta(videoId),
    ]);

    if (!transcriptResult || !Array.isArray(transcriptResult) || transcriptResult.length === 0) {
      return NextResponse.json(
        {
          error:
            "No captions found for this video. It may be private, age-restricted, or have captions disabled.",
        },
        { status: 422 },
      );
    }

    const fullTranscript = transcriptResult
      .map((seg: { text: string }) => seg.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (fullTranscript.length < 80) {
      return NextResponse.json(
        { error: "Transcript was too short to summarise reliably." },
        { status: 422 },
      );
    }

    // Cap stored raw transcript preview size; notes cover the full lecture via chunking.
    const MAX_STORE_CHARS = 200_000;
    const transcriptForStore =
      fullTranscript.length > MAX_STORE_CHARS
        ? `${fullTranscript.slice(0, MAX_STORE_CHARS)}\n\n[Raw transcript truncated for storage — notes used full chunked pass.]`
        : fullTranscript;

    const subject = body.subject?.trim() || "General";
    const curriculumCode = body.curriculumCode?.trim() || "";

    const title = meta?.title ?? "YouTube Lecture";
    const author = meta?.author ?? "Unknown";

    let aiNotes: string;
    let chunkCount = 1;
    let chunkHint: string | null = null;
    try {
      const summarized = await summarizeTranscriptChunked({
        title,
        author,
        subject,
        curriculumCode: curriculumCode || undefined,
        transcript: fullTranscript,
      });
      aiNotes = summarized.notes;
      chunkCount = summarized.chunkCount;
      chunkHint = summarized.truncatedHint;
    } catch (groqErr) {
      if (isRateLimited(groqErr)) {
        return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
      }
      console.error("[import/youtube] Groq failed:", groqErr);
      const detail = groqErr instanceof Error ? groqErr.message : "Unknown AI error";
      return NextResponse.json(
        { error: `AI provider error: ${detail}` },
        { status: 502 },
      );
    }

    const trimmedNotes = (aiNotes ?? "").trim();
    if (!trimmedNotes) {
      return NextResponse.json({ error: "AI returned empty notes." }, { status: 502 });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const tags = ["Inbox", "YouTube"];
    if (subject && subject !== "General") tags.push(subject);
    if (curriculumCode) tags.push(curriculumCode.toUpperCase());

    let noteId: string | null = null;
    let importId: string | null = null;

    try {
      const note = await db.note.create({
        data: {
          userId: session.user.id,
          title: title.slice(0, 200),
          content: trimmedNotes,
          format: "summary",
          subject: subject !== "General" ? subject : curriculumCode || null,
          tags,
        },
      });
      noteId = note.id;
    } catch (persistErr) {
      console.error("[import/youtube] note persist failed:", persistErr);
    }

    try {
      const saved = await db.youTubeImport.create({
        data: {
          userId: session.user.id,
          youtubeUrl: videoUrl,
          title: title.slice(0, 200),
          transcript: transcriptForStore,
          notes: trimmedNotes,
          flashcards: [],
        },
      });
      importId = saved.id;
    } catch (persistErr) {
      console.error("[import/youtube] import persist failed:", persistErr);
    }

    return NextResponse.json({
      videoId,
      videoUrl,
      title,
      author,
      transcriptLength: fullTranscript.length,
      transcriptPreview: fullTranscript.slice(0, 500),
      transcript: transcriptForStore,
      notes: trimmedNotes,
      noteId,
      importId,
      chunkCount,
      chunkHint,
    });
  } catch (error) {
    console.error("[import/youtube] Unhandled error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    // Common transcript library errors: TranscriptDisabledError, VideoUnavailableError, etc.
    const friendly =
      /transcript|caption/i.test(detail)
        ? "We couldn't fetch a transcript for that video. It may have captions disabled, be private, or be region-locked."
        : `Failed to import video: ${detail}`;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
