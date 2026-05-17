import { NextResponse } from "next/server";
import { fetchTranscript } from "youtube-transcript-plus";
import { auth } from "~/server/auth";
import { runGroqPrompt } from "~/server/groq";

export const runtime = "nodejs";

type ImportRequest = {
  url?: string;
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
    const url = (body.url ?? "").trim();
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

    // Cap transcript length to keep prompt within model limits (~ 12k chars ≈ 3k tokens)
    const MAX_CHARS = 12000;
    const transcriptForPrompt =
      fullTranscript.length > MAX_CHARS
        ? `${fullTranscript.slice(0, MAX_CHARS)}\n\n[Transcript truncated for length — focus on what's above.]`
        : fullTranscript;

    const subject = body.subject?.trim() || "General";
    const curriculumCode = body.curriculumCode?.trim() || "";

    const title = meta?.title ?? "YouTube Lecture";
    const author = meta?.author ?? "Unknown";

    let aiNotes: string;
    try {
      aiNotes = await runGroqPrompt({
        system:
          "You are Nova, Kyvex's AI study-notes generator for Ontario Grade 11–12 students. Convert lecture transcripts into high-quality, exam-ready study notes aligned with the Ontario curriculum. Use Canadian spelling. Output clean markdown only — no preamble.",
        user: [
          `Source: YouTube lecture titled "${title}" by ${author}.`,
          subject !== "General" ? `Subject: ${subject}.` : "",
          curriculumCode ? `Ontario course code (if relevant): ${curriculumCode}.` : "",
          "",
          "Task: Summarise the transcript below into high-quality study notes using the Ontario curriculum standard.",
          "Format requirements:",
          "- Start with an H1 title (the lecture title).",
          "- A 2–3 sentence overview paragraph.",
          "- An H2 'Key Concepts' section with bolded terms and concise definitions as a bullet list.",
          "- An H2 'Detailed Notes' section with H3 sub-headings for each major topic, using bullet points and short paragraphs.",
          "- Include any formulas, equations, or processes in code blocks or as bold inline.",
          "- An H2 'Examples' section with 1–3 worked examples or applications mentioned in the lecture.",
          "- An H2 'Exam-Ready Recap' section with 5–8 single-sentence bullet takeaways the student should memorise.",
          "- An H2 'Self-Check Questions' section with 3 short questions a student could answer to test understanding.",
          "Do NOT invent facts that aren't in the transcript. If something is unclear, write '(unclear in lecture)' rather than guessing.",
          "",
          "Transcript:",
          transcriptForPrompt,
        ]
          .filter(Boolean)
          .join("\n"),
        temperature: 0.4,
        maxTokens: 2200,
      });
    } catch (groqErr) {
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

    return NextResponse.json({
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      author,
      transcriptLength: fullTranscript.length,
      transcriptPreview: fullTranscript.slice(0, 500),
      transcript: transcriptForPrompt,
      notes: trimmedNotes,
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
