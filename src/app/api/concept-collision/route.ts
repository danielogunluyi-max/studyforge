import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function POST() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const notes = await prisma.note.findMany({
    where: { userId },
    select: { title: true, subject: true, content: true },
    take: 30,
    orderBy: { createdAt: "desc" },
  });

  const subjects = [...new Set(notes.map((n) => n.subject).filter(Boolean))];
  if (subjects.length < 2) {
    return NextResponse.json({ error: "Need notes from at least 2 subjects to find collisions" }, { status: 400 });
  }

  const noteSummary = notes.map((n) => `[${n.subject}] ${n.title}: ${n.content.slice(0, 200)}`).join("\n");

  const parsed = await groqJSON<{ collisions?: Array<{ concept1: string; concept2: string; subject1: string; subject2: string; connection: string; strength: number }> }>({
    user: `Find hidden conceptual connections between topics from different subjects in this student's notes. These are "concept collisions" - moments where two seemingly unrelated subjects share deep structural or conceptual similarities.

Notes: ${noteSummary}

Find 5 surprising connections. Respond ONLY in JSON:
{
  "collisions": [
    {
      "concept1": "Cell division (Biology)",
      "concept2": "Algorithm recursion (Computer Science)",
      "subject1": "Biology",
      "subject2": "Computer Science",
      "connection": "Both involve a process that replicates itself with stopping conditions...",
      "strength": 78,
      "insight": "Understanding recursion can help you visualize mitosis and vice versa"
    }
  ]
}`,
    maxTokens: 1000,
  });

  if (!parsed) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  for (const c of parsed.collisions || []) {
    await prisma.conceptCollision.create({
      data: {
        userId,
        concept1: c.concept1,
        concept2: c.concept2,
        subject1: c.subject1,
        subject2: c.subject2,
        connection: c.connection,
        strength: c.strength,
      },
    });
  }

  return NextResponse.json(parsed);
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const collisions = await prisma.conceptCollision.findMany({
    where: { userId },
    orderBy: { strength: "desc" },
    take: 20,
  });
  return NextResponse.json({ collisions });
}
