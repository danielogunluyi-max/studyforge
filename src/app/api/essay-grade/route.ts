import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { essay, subject, gradeLevel } = (await req.json()) as {
    essay?: string;
    subject?: string;
    gradeLevel?: string;
  };

  if (!essay?.trim()) {
    return NextResponse.json({ error: "Essay is required" }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `You are an Ontario high school teacher grading a student essay using the Ontario Achievement Chart (Knowledge/Understanding, Thinking, Communication, Application).

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
      },
    ],
    max_tokens: 1000,
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Record<string, unknown>;
    const overallGrade = typeof parsed.overallGrade === "number" ? parsed.overallGrade : 0;
    const improvements = Array.isArray(parsed.improvements) ? parsed.improvements : [];

    await prisma.essayGrade.create({
      data: {
        userId: session.user.id,
        essay: essay.slice(0, 10000),
        subject: subject || "English",
        grade: overallGrade,
        feedback: parsed,
        suggestions: improvements,
      },
    });

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grades = await prisma.essayGrade.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, subject: true, grade: true, createdAt: true },
  });

  return NextResponse.json({ grades });
}
