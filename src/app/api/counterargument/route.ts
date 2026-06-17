import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { groqJSON } from "~/server/groq";

const prisma = db as any;

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as {
    argument?: string;
    topic?: string;
    userRebuttal?: string;
    sessionId?: string;
  };

  const argument = body.argument?.trim() ?? "";
  const topic = body.topic?.trim() || "General";
  const userRebuttal = body.userRebuttal?.trim() || "";
  const sessionId = body.sessionId ?? "";

  if (userRebuttal && sessionId) {
    const scored = await groqJSON<{ score?: number; feedback?: string; strongPoints?: string[]; weakPoints?: string[]; improvedVersion?: string }>({
      user: `Score this student's rebuttal to a counterargument.
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
      maxTokens: 400,
    });

    if (!scored) return NextResponse.json({ error: "Scoring failed" }, { status: 500 });

    const existing = await prisma.counterargumentSession.findFirst({
      where: { id: sessionId, userId },
      select: { userRebuttals: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
  }

  if (!argument) {
    return NextResponse.json({ error: "Argument is required" }, { status: 400 });
  }

  const parsed = await groqJSON<{ counterarguments?: unknown[]; overallWeakness?: string; verdict?: string }>({
    user: `You are a rigorous academic debate opponent. Destroy this argument with the strongest possible counterarguments.

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
    maxTokens: 800,
  });

  if (!parsed) return NextResponse.json({ error: "Generation failed" }, { status: 500 });

  const session2 = await prisma.counterargumentSession.create({
    data: {
      userId,
      originalArgument: argument,
      topic,
      counterarguments: (parsed.counterarguments ?? []) as never,
      userRebuttals: [] as never,
      score: 0,
    },
  });

  return NextResponse.json({ ...parsed, sessionId: session2.id });
}
