import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type PodcastRequestBody = {
  text?: string;
  title?: string;
};

type ScriptSpeaker = "Nova" | "Alex";

type ScriptLine = {
  speaker: ScriptSpeaker;
  line: string;
};

type PodcastGenerationResult = {
  topic: string;
  podcastTitle: string;
  script: ScriptLine[];
  keyTakeaways: string[];
};

function normalizeSpeaker(value: unknown): ScriptSpeaker | null {
  if (value === "Nova" || value === "Alex") return value;
  return null;
}

function normalizeScript(value: unknown): ScriptLine[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const speaker = normalizeSpeaker(row.speaker);
      const line = typeof row.line === "string" ? row.line.trim() : "";
      if (!speaker || !line) return null;
      return { speaker, line };
    })
    .filter((entry): entry is ScriptLine => Boolean(entry))
    .slice(0, 28);
}

function normalizeTakeaways(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);
}

function normalizePodcastResult(parsed: unknown): PodcastGenerationResult | null {
  if (!parsed || typeof parsed !== "object") return null;

  const raw = parsed as Record<string, unknown>;
  const script = normalizeScript(raw.script);
  if (script.length < 8) return null;

  const topic = typeof raw.topic === "string" ? raw.topic.trim() : "";
  const podcastTitle = typeof raw.podcastTitle === "string" ? raw.podcastTitle.trim() : "";

  return {
    topic: topic || "Study Session",
    podcastTitle: podcastTitle || "Nova & Alex Study Podcast",
    script,
    keyTakeaways: normalizeTakeaways(raw.keyTakeaways),
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as PodcastRequestBody;
    const text = (body.text ?? "").trim();
    const customTitle = (body.title ?? "").trim();

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: "Please provide more content (at least 50 characters)" },
        { status: 400 },
      );
    }

    const systemPrompt = `You are a podcast script writer for Kyvex,
a study platform for students. You write engaging educational podcast
scripts featuring two hosts:

NOVA 🤖: Enthusiastic AI study coach. Explains clearly, uses analogies,
relates to student life, asks insightful questions, encouraging tone.

ALEX 🎓: Sharp analytical thinker. Challenges assumptions, plays devil's
advocate, connects ideas to bigger concepts, asks "but why?" questions.

Rules:
- They alternate naturally and Nova usually starts and ends
- Each line is 1-3 sentences max and sounds punchy
- They refer to each other by name sometimes
- They make it engaging and fun, not like a textbook
- Include moments of genuine curiosity and mild disagreement
- End with Nova summarizing key takeaways for students
- 12-20 exchanges total depending on content complexity
- Sound like real people talking

You MUST respond with ONLY valid JSON and no markdown.
Use this exact structure:
{
  "topic": "<the main topic in 3-5 words>",
  "podcastTitle": "<catchy podcast episode title>",
  "script": [
    { "speaker": "Nova", "line": "..." },
    { "speaker": "Alex", "line": "..." }
  ],
  "keyTakeaways": ["<3-5 key points from the discussion>"]
}`;

    const userPrompt = `Create a podcast episode script based on these
student notes. Make it educational, engaging, and genuinely helpful
for a student studying this material.

Student notes:
${text.slice(0, 3000)}`;

    const raw = await runGroqPrompt({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const parsed = extractJsonBlock<PodcastGenerationResult>(raw);
    const result = normalizePodcastResult(parsed);

    if (!result) {
      throw new Error("Invalid podcast response format");
    }

    const saved = await db.podcast.create({
      data: {
        userId: session.user.id,
        title: customTitle || result.podcastTitle,
        sourceText: text,
        script: result.script,
        topic: result.topic,
      },
      select: { id: true },
    });

    const appUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    void fetch(`${appUrl}/api/nova`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "NOTE_GENERATED" }),
    }).catch(() => undefined);

    return NextResponse.json({ ...result, podcastId: saved.id });
  } catch (error) {
    console.error("Podcast generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate podcast" },
      { status: 500 },
    );
  }
}
