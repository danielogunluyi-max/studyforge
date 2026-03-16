import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Body = {
  text?: string;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const text = body.text?.trim() ?? '';

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `You are an academic integrity advisor. Analyze this student essay for:
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
      },
    ],
    max_tokens: 800,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
