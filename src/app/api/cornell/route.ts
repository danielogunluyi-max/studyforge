import { auth } from "~/server/auth"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = assertGroqRateLimit(session.user.id);
  if (limited) return limited;

  const { text, topic } = await req.json()

  let completion
  try {
    completion = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [{
      role: 'user',
      content: `Convert these notes into Cornell Note format.

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
}`
    }],
    max_tokens: 1500,
  })
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    throw error
  }

  const raw = completion.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Formatting failed' }, { status: 500 })
  }
}
