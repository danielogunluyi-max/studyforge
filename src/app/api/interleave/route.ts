import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { type Prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { subjects, totalMinutes } = (await req.json()) as {
    subjects?: string[];
    totalMinutes?: number;
  };

  if (!Array.isArray(subjects) || subjects.length === 0 || typeof totalMinutes !== "number") {
    return NextResponse.json({ error: "Missing subjects or totalMinutes" }, { status: 400 });
  }

  const parsed = await groqJSON<Record<string, unknown>>({
    user: `Create an interleaved study schedule for ${totalMinutes} minutes covering: ${subjects.join(", ")}.\n\nInterleaving means mixing subjects so the brain can't rely on context — proven to improve retention by 40-60%.\n\nRespond ONLY in this JSON format:\n{\n  "blocks": [\n    { "subject": "Math", "minutes": 20, "task": "Practice differentiation problems", "type": "practice" },\n    { "subject": "Biology", "minutes": 15, "task": "Review cell respiration notes", "type": "review" }\n  ],\n  "rationale": "Why this interleaving order maximizes retention",\n  "expectedBenefit": "Specific benefit vs blocked studying"\n}`,
    maxTokens: 800,
  });

  if (!parsed) return NextResponse.json({ error: "Schedule generation failed" }, { status: 500 });

  await db.interleavingSession.create({
    data: {
      userId,
      subjects,
      schedule: parsed as Prisma.InputJsonValue,
      totalMinutes,
    },
  });

  return NextResponse.json(parsed);
}
