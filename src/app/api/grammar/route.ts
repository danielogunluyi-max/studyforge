import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Body = {
  text?: string;
  type?: 'grammar' | 'style' | 'academic';
};

const prompts: Record<'grammar' | 'style' | 'academic', string> = {
  grammar: 'Fix all grammar, spelling, and punctuation errors.',
  style: 'Improve clarity, flow, and sentence variety while preserving the voice.',
  academic: 'Elevate to formal academic writing: precise vocabulary, proper hedging, strong transitions.',
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const text = body.text?.trim() ?? '';
  const mode = body.type && prompts[body.type] ? body.type : 'grammar';

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `You are an expert writing editor. ${prompts[mode]}

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
      },
    ],
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
