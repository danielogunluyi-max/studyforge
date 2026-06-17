import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma, type Prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { essay, subject, gradeLevel } = (await req.json()) as {
    essay?: string;
    subject?: string;
    gradeLevel?: string;
  };

  if (!essay?.trim()) {
    return NextResponse.json({ error: "Essay is required" }, { status: 400 });
  }

  const parsed = await groqJSON<Record<string, unknown>>({
    user: `You are an Ontario high school teacher grading a student essay using the Ontario Achievement Chart (Knowledge/Understanding, Thinking, Communication, Application).

Subject: ${subject || "English"}
Grade Level: ${gradeLevel || "Grade 11"}
Essay: ${(essay || "").slice(0, 4000)}

Grade using Ontario's 4 categories (each out of 100):
Respond ONLY in JSON:
{
  "overallGrade": 78,
  "letterGrade": "B+",
  "categories": {
    "knowledge": { "score": 80, "comment": "..." },
    "thinking": { "score": 75, "comment": "..." },
    "communication": { "score": 82, "comment": "..." },
    "application": { "score": 74, "comment": "..." }
  },
  "strengths": ["Clear thesis", "Good evidence use"],
  "improvements": ["Needs stronger transitions", "Expand conclusion"],
  "inlineComments": [
    { "quote": "first 50 chars of a sentence", "comment": "specific feedback" }
  ],
  "overallFeedback": "2-3 sentence overall assessment"
}`,
    maxTokens: 1000,
  });

  if (!parsed) return NextResponse.json({ error: "Grading failed" }, { status: 500 });

  const overallGrade = typeof parsed.overallGrade === "number" ? parsed.overallGrade : 0;
  const improvements = Array.isArray(parsed.improvements) ? parsed.improvements : [];

  await prisma.essayGrade.create({
    data: {
      userId,
      essay: essay.slice(0, 10000),
      subject: subject || "English",
      grade: overallGrade,
      feedback: parsed as Prisma.InputJsonValue,
      suggestions: improvements as string[],
    },
  });

  return NextResponse.json(parsed);
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const grades = await prisma.essayGrade.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, subject: true, grade: true, createdAt: true },
  });

  return NextResponse.json({ grades });
}
