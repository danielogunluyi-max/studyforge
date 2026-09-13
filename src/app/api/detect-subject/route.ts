import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function parseDetectionJson(text: string): { subject: string; suggestedFormat: string } | null {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as {
      subject?: string;
      suggestedFormat?: string;
      confident?: boolean;
    };

    if (parsed.confident === false) return null;

    if (typeof parsed.subject === "string" && typeof parsed.suggestedFormat === "string") {
      return {
        subject: parsed.subject.trim(),
        suggestedFormat: parsed.suggestedFormat.trim(),
      };
    }
  } catch {
    // ignore
  }

  const match = /\{[\s\S]*\}/.exec(trimmed);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as {
      subject?: string;
      suggestedFormat?: string;
      confident?: boolean;
    };

    if (parsed.confident === false) return null;

    if (typeof parsed.subject === "string" && typeof parsed.suggestedFormat === "string") {
      return {
        subject: parsed.subject.trim(),
        suggestedFormat: parsed.suggestedFormat.trim(),
      };
    }
  } catch {
    // ignore
  }

  return null;
}

function normalizeSuggestedFormat(value: string): string {
  const normalized = value.toLowerCase();
  if (["summary", "detailed", "flashcards", "questions"].includes(normalized)) {
    return normalized;
  }
  return "summary";
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = assertGroqRateLimit(session.user.id);
    if (limited) return limited;

    const { text } = (await request.json()) as { text?: string };
    const sample = (text ?? "").trim().slice(0, 200);

    if (!sample) {
      return NextResponse.json({ subject: "", suggestedFormat: "" });
    }

    const prompt = `Detect the most likely school subject from this text snippet and suggest the best Kyvex output format.

Text snippet:
${sample}

Rules:
- If not confident, return confident: false.
- Suggested format must be one of: summary, detailed, flashcards, questions.
- Use questions for math/problem-solving content, flashcards for definition-heavy content, summary/detailed for prose-heavy notes.

Return JSON only:
{"subject":"string","suggestedFormat":"summary|detailed|flashcards|questions","confident":true|false}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      temperature: 0.1,
      max_tokens: 160,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = parseDetectionJson(raw);

    if (!parsed?.subject || !parsed?.suggestedFormat) {
      return NextResponse.json({ subject: "", suggestedFormat: "" });
    }

    return NextResponse.json({
      subject: parsed.subject,
      suggestedFormat: normalizeSuggestedFormat(parsed.suggestedFormat),
    });
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    console.error("Error detecting subject:", error instanceof Error ? error.stack ?? error.message : error);
    return NextResponse.json({ subject: "", suggestedFormat: "" }, { status: 200 });
  }
}

