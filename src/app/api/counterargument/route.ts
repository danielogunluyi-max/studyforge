import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    argument?: string;
    topic?: string;
    userRebuttal?: string;
    sessionId?: string;
  };

  const argument = body.argument?.trim() ?? '';
  const topic = body.topic?.trim() || 'General';
  const userRebuttal = body.userRebuttal?.trim() || '';
  const sessionId = body.sessionId ?? '';

  if (userRebuttal && sessionId) {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Score this student's rebuttal to a counterargument.
Topic: ${topic}
Original argument: ${argument}
Student's rebuttal: ${userRebuttal}
Respond ONLY as JSON:
{
  "score": 75,
  "feedback": "specific feedback",
  "strongPoints": ["..."],
  "weakPoints": ["..."],
  "improvedVersion": "How the rebuttal could be stronger"
}`,
        },
      ],
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    try {
      const scored = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { score?: number };
      const existing = await prisma.counterargumentSession.findFirst({
        where: { id: sessionId, userId: session.user.id },
        select: { userRebuttals: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const prior = Array.isArray(existing.userRebuttals) ? existing.userRebuttals : [];
      await prisma.counterargumentSession.update({
        where: { id: sessionId },
        data: {
          userRebuttals: [...prior, userRebuttal] as never,
          score: Number(scored.score ?? 0),
        },
      });

      return NextResponse.json(scored);
    } catch {
      return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
    }
  }

  if (!argument) {
    return NextResponse.json({ error: 'Argument is required' }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `You are a rigorous academic debate opponent. Destroy this argument with the strongest possible counterarguments.

Topic: ${topic}
Argument: ${argument}

Find the weakest points, logical fallacies, missing evidence, and alternative perspectives.
Be intellectually brutal but academically fair.

Respond ONLY in JSON:
{
  "counterarguments": [
    {
      "attack": "The specific weakness",
      "explanation": "Why this undermines the argument",
      "strength": 85,
      "type": "logical_flaw|missing_evidence|alternative_view|factual_error"
    }
  ],
  "overallWeakness": "The single biggest flaw in this argument",
  "verdict": "Overall assessment of argument strength 0-100"
}`,
      },
    ],
    max_tokens: 800,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { counterarguments?: unknown[] };
    const session2 = await prisma.counterargumentSession.create({
      data: {
        userId: session.user.id,
        originalArgument: argument,
        topic,
        counterarguments: (parsed.counterarguments ?? []) as never,
        userRebuttals: [] as never,
        score: 0,
      },
    });

    return NextResponse.json({ ...parsed, sessionId: session2.id });
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
