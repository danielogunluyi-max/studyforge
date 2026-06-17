import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { type Prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { topic } = (await req.json()) as { topic?: string };
  if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });

  const parsed = await groqJSON<{
    for?: unknown[];
    against?: unknown[];
    verdict?: string;
    keyTension?: string;
  }>({
    user: `You are an expert academic debate coach. For the topic "${topic}", generate a rigorous academic debate with strong arguments on both sides.\n\nRespond ONLY in this exact JSON format:\n{\n  "for": [\n    { "point": "...", "evidence": "...", "strength": 85 },\n    { "point": "...", "evidence": "...", "strength": 80 },\n    { "point": "...", "evidence": "...", "strength": 75 }\n  ],\n  "against": [\n    { "point": "...", "evidence": "...", "strength": 82 },\n    { "point": "...", "evidence": "...", "strength": 78 },\n    { "point": "...", "evidence": "...", "strength": 71 }\n  ],\n  "verdict": "A balanced one-sentence summary of the debate",\n  "keyTension": "The central tension between the two sides in one sentence"\n}`,
    maxTokens: 1200,
  });

  if (!parsed) return NextResponse.json({ error: "Failed to parse debate" }, { status: 500 });

  await db.debateSession.create({
    data: {
      userId,
      topic,
      forArguments: (parsed.for ?? []) as Prisma.InputJsonValue,
      againstArguments: (parsed.against ?? []) as Prisma.InputJsonValue,
      verdict: parsed.verdict || "",
    },
  });

  return NextResponse.json({ ...parsed, topic });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const sessions = await db.debateSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ sessions });
}
