import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = body.text?.trim() ?? "";

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const parsed = await groqJSON({
    user: `You are an academic integrity advisor. Analyze this student essay for:
1. Signs of AI-generated content (overly formal, generic phrasing, no personal voice)
2. Sections that sound copied/templated
3. Inconsistencies in writing style that suggest patchwork composition
4. Overall originality assessment

Text: ${text.slice(0, 4000)}

Respond ONLY in JSON:
{
  "originalityScore": 85,
  "aiLikelihoodScore": 20,
  "riskLevel": "low|medium|high",
  "flags": [
    {
      "phrase": "exact flagged phrase (under 15 words)",
      "reason": "why this was flagged",
      "type": "ai_generated|templated|inconsistent_style"
    }
  ],
  "verdict": "Overall assessment in 2 sentences",
  "recommendation": "What the student should do"
}`,
    maxTokens: 800,
  });

  if (!parsed) return NextResponse.json({ error: "Check failed" }, { status: 500 });
  return NextResponse.json(parsed);
}
