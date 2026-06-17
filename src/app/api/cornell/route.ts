import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { text, topic } = (await req.json()) as { text?: string; topic?: string };

  const parsed = await groqJSON({
    user: `Convert these notes into Cornell Note format.

Cornell Notes has 3 sections:
1. CUE column (left): key questions and keywords that prompt recall
2. NOTES column (right): detailed notes organized by topic
3. SUMMARY (bottom): 3-5 sentence summary of entire content

Topic: ${topic}
Raw notes: ${text}

Respond ONLY in this JSON:
{
  "cues": ["Question or keyword 1", "Question or keyword 2", ...],
  "notes": [
    { "cue": "matching cue", "content": "detailed note content" }
  ],
  "summary": "3-5 sentence summary of all content"
}`,
    maxTokens: 1500,
  });

  if (!parsed) return NextResponse.json({ error: "Formatting failed" }, { status: 500 });
  return NextResponse.json(parsed);
}
