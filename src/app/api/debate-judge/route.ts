import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { getAuthSession } from '~/server/auth/session';

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    topic?: string;
    argument?: string;
    code?: string;
  };

  const topic = body.topic?.trim() ?? '';
  const argument = body.argument?.trim() ?? '';
  const code = body.code?.trim() ?? '';

  if (code) {
    const debate = await prisma.debateJudge.findUnique({ where: { code } });
    if (!debate) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
    }

    if (debate.player2Id) {
      return NextResponse.json({ error: 'Debate full' }, { status: 400 });
    }

    const updated = await prisma.debateJudge.update({
      where: { code },
      data: { player2Id: session.user.id, player2Arg: argument || null, status: 'judging' },
    });

    if (debate.player1Arg && argument) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: `You are a fair academic debate judge. Judge these two arguments.

Topic: ${debate.topic}
Argument A: ${debate.player1Arg}
Argument B: ${argument}

Be objective and specific. Score each on: logic, evidence, clarity, persuasiveness.

Respond ONLY in JSON:
{
  "winner": "A|B|tie",
  "scores": {
    "A": {"logic": 80, "evidence": 75, "clarity": 85, "persuasiveness": 78},
    "B": {"logic": 70, "evidence": 82, "clarity": 72, "persuasiveness": 80}
  },
  "verdict": "detailed explanation of the decision",
  "strongestPoint": "The single best argument made in the debate",
  "weakestPoint": "The biggest weakness in the debate overall"
}`,
          },
        ],
        max_tokens: 600,
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      try {
        const judged = JSON.parse(raw.replace(/```json|```/g, '').trim()) as {
          winner?: 'A' | 'B' | 'tie';
          verdict?: string;
          scores?: unknown;
        };

        const winnerId =
          judged.winner === 'A' ? debate.player1Id : judged.winner === 'B' ? session.user.id : null;

        await prisma.debateJudge.update({
          where: { code },
          data: {
            verdict: judged.verdict ?? null,
            scores: (judged.scores ?? null) as never,
            winnerId,
            status: 'complete',
          },
        });

        return NextResponse.json({ debate: updated, verdict: judged, status: 'complete' });
      } catch {
        // fall through and return updated
      }
    }

    return NextResponse.json({ debate: updated });
  }

  if (!topic || !argument) {
    return NextResponse.json({ error: 'topic and argument are required' }, { status: 400 });
  }

  const debate = await prisma.debateJudge.create({
    data: {
      topic,
      player1Id: session.user.id,
      player1Arg: argument,
      code: generateCode(),
    },
  });

  return NextResponse.json({ debate });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (code) {
    const debate = await prisma.debateJudge.findUnique({
      where: { code },
      include: {
        player1: { select: { name: true } },
        player2: { select: { name: true } },
      },
    });

    return NextResponse.json({ debate });
  }

  const debates = await prisma.debateJudge.findMany({
    where: { OR: [{ player1Id: session.user.id }, { player2Id: session.user.id }] },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({ debates });
}
