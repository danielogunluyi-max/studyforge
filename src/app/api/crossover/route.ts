import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function inferSubjects(tags: string[]): string[] {
  return tags.map((t) => t.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    answer?: string;
    challengeId?: string;
  };

  const answer = body.answer?.trim() || '';
  const challengeId = body.challengeId ?? '';

  if (answer && challengeId) {
    const challenge = await prisma.crossoverChallenge.findFirst({
      where: { id: challengeId, userId: session.user.id },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Grade this student's answer to a crossover challenge.
Challenge: ${challenge.challenge}
Student answer: ${answer}
Respond ONLY as JSON:
{"score": 82, "feedback": "...", "modelAnswer": "ideal answer"}`,
        },
      ],
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    try {
      const scored = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { score?: number; feedback?: string };
      await prisma.crossoverChallenge.update({
        where: { id: challengeId },
        data: {
          userAnswer: answer,
          aiFeedback: scored.feedback ?? null,
          score: scored.score ?? null,
          completed: true,
        },
      });

      return NextResponse.json(scored);
    } catch {
      return NextResponse.json({ error: 'Grading failed' }, { status: 500 });
    }
  }

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
    select: { tags: true, content: true },
    take: 50,
  });

  const subjects = [...new Set(notes.flatMap((n: any) => inferSubjects(n.tags)))];
  if (subjects.length < 2) {
    return NextResponse.json({ error: 'Need notes from at least 2 subjects' }, { status: 400 });
  }

  const s1 = subjects[Math.floor(Math.random() * subjects.length)] as string;
  const s2 = subjects.find((s) => s !== s1) as string | undefined;
  if (!s2) {
    return NextResponse.json({ error: 'Need notes from at least 2 subjects' }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `Create a crossover challenge combining ${s1} and ${s2}.
This should be a single problem that genuinely requires knowledge from BOTH subjects.
Make it interesting and thought-provoking.
Respond ONLY as JSON:
{
  "challenge": "The full challenge question",
  "hint": "A subtle hint",
  "subject1": "${s1}",
  "subject2": "${s2}",
  "difficulty": "medium"
}`,
      },
    ],
    max_tokens: 300,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { challenge?: string };
    const challenge = await prisma.crossoverChallenge.create({
      data: {
        userId: session.user.id,
        subject1: s1,
        subject2: s2,
        challenge: parsed.challenge || `Connect ${s1} and ${s2} in one argument.`,
      },
    });

    return NextResponse.json({ challenge, ...parsed });
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const challenges = await prisma.crossoverChallenge.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ challenges });
}
