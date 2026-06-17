import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { groqJSON } from "~/server/groq";

const prisma = db as any;

function inferSubjects(tags: string[]): string[] {
  return tags.map((t) => t.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as {
    answer?: string;
    challengeId?: string;
  };

  const answer = body.answer?.trim() || "";
  const challengeId = body.challengeId ?? "";

  if (answer && challengeId) {
    const challenge = await prisma.crossoverChallenge.findFirst({
      where: { id: challengeId, userId },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const scored = await groqJSON<{ score?: number; feedback?: string; modelAnswer?: string }>({
      user: `Grade this student's answer to a crossover challenge.
Challenge: ${challenge.challenge}
Student answer: ${answer}
Respond ONLY as JSON:
{"score": 82, "feedback": "...", "modelAnswer": "ideal answer"}`,
      maxTokens: 300,
    });

    if (!scored) return NextResponse.json({ error: "Grading failed" }, { status: 500 });

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
  }

  const notes = await prisma.note.findMany({
    where: { userId },
    select: { tags: true, content: true },
    take: 50,
  });

  const subjects = [...new Set(notes.flatMap((n: any) => inferSubjects(n.tags)))];
  if (subjects.length < 2) {
    return NextResponse.json({ error: "Need notes from at least 2 subjects" }, { status: 400 });
  }

  const s1 = subjects[Math.floor(Math.random() * subjects.length)] as string;
  const s2 = subjects.find((s) => s !== s1) as string | undefined;
  if (!s2) {
    return NextResponse.json({ error: "Need notes from at least 2 subjects" }, { status: 400 });
  }

  const parsed = await groqJSON<{ challenge?: string; hint?: string; difficulty?: string }>({
    user: `Create a crossover challenge combining ${s1} and ${s2}.
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
    maxTokens: 300,
  });

  if (!parsed) return NextResponse.json({ error: "Generation failed" }, { status: 500 });

  const createdChallenge = await prisma.crossoverChallenge.create({
    data: {
      userId,
      subject1: s1,
      subject2: s2,
      challenge: parsed.challenge || `Connect ${s1} and ${s2} in one argument.`,
    },
  });

  return NextResponse.json({ challenge: createdChallenge, ...parsed });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const challenges = await prisma.crossoverChallenge.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ challenges });
}
