import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { groqJSON } from "~/server/groq";

type Body = {
  text?: string;
  type?: "grammar" | "style" | "academic";
};

const prompts: Record<"grammar" | "style" | "academic", string> = {
  grammar: "Fix all grammar, spelling, and punctuation errors.",
  style: "Improve clarity, flow, and sentence variety while preserving the voice.",
  academic: "Elevate to formal academic writing: precise vocabulary, proper hedging, strong transitions.",
};

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Body;
  const text = body.text?.trim() ?? "";
  const mode = body.type && prompts[body.type] ? body.type : "grammar";

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const parsed = await groqJSON({
    user: `You are an expert writing editor. ${prompts[mode]}

Original text: ${text.slice(0, 4000)}

Respond ONLY in JSON:
{
  "corrected": "the improved text",
  "changes": [
    {
      "original": "exact original phrase",
      "corrected": "corrected version",
      "type": "grammar|spelling|style|word_choice",
      "explanation": "why this was changed"
    }
  ],
  "overallScore": 85,
  "summary": "2-sentence summary of main issues found"
}`,
    maxTokens: 2000,
  });

  if (!parsed) return NextResponse.json({ error: "Check failed" }, { status: 500 });
  return NextResponse.json(parsed);
}
