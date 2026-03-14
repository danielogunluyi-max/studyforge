import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subjects, totalMinutes } = (await req.json()) as {
    subjects?: string[];
    totalMinutes?: number;
  };

  if (!Array.isArray(subjects) || subjects.length === 0 || typeof totalMinutes !== "number") {
    return NextResponse.json({ error: "Missing subjects or totalMinutes" }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `Create an interleaved study schedule for ${totalMinutes} minutes covering: ${subjects.join(", ")}.\n\nInterleaving means mixing subjects so the brain can't rely on context — proven to improve retention by 40-60%.\n\nRespond ONLY in this JSON format:\n{\n  "blocks": [\n    { "subject": "Math", "minutes": 20, "task": "Practice differentiation problems", "type": "practice" },\n    { "subject": "Biology", "minutes": 15, "task": "Review cell respiration notes", "type": "review" }\n  ],\n  "rationale": "Why this interleaving order maximizes retention",\n  "expectedBenefit": "Specific benefit vs blocked studying"\n}`,
      },
    ],
    max_tokens: 800,
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Record<string, unknown>;

    await db.interleavingSession.create({
      data: {
        userId: session.user.id,
        subjects,
        schedule: parsed,
        totalMinutes,
      },
    });

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Schedule generation failed" }, { status: 500 });
  }
}
