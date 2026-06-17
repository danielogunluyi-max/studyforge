import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma, type Prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { syllabusText, courseName, semester } = (await req.json()) as {
    syllabusText?: string;
    courseName?: string;
    semester?: string;
  };

  const parsed = await groqJSON<{
    units?: Record<string, unknown>[];
    keyDates?: Record<string, unknown>[];
    weeklyPlan?: Record<string, unknown>[];
    totalStudyHours?: number;
    recommendation?: string;
  }>({
    user: `You are an academic planner. Analyze this course syllabus and generate a complete semester study plan.

Course: ${courseName}
Semester: ${semester}
Syllabus: ${(syllabusText ?? "").slice(0, 6000)}

Respond ONLY in JSON:
{
  "units": [
    {
      "name": "Unit 1: Introduction",
      "weeks": "1-2",
      "topics": ["Topic 1", "Topic 2"],
      "assessments": ["Quiz 1 - Week 2"],
      "studyHours": 4,
      "difficulty": "low"
    }
  ],
  "keyDates": [
    { "event": "Midterm Exam", "week": 7, "type": "exam" },
    { "event": "Assignment 1 Due", "week": 4, "type": "assignment" }
  ],
  "weeklyPlan": [
    { "week": 1, "focus": "Unit 1 intro", "tasks": ["Read ch1", "Make notes"], "hours": 3 }
  ],
  "totalStudyHours": 120,
  "recommendation": "Front-load difficult units in weeks 3-5"
}`,
    maxTokens: 2000,
  });

  if (!parsed) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  const analysis = await prisma.syllabusAnalysis.create({
    data: {
      userId,
      originalText: (syllabusText ?? "").slice(0, 10000),
      courseName: courseName ?? "",
      semester: semester ?? "",
      plan: parsed as unknown as Prisma.InputJsonValue,
      events: (parsed.keyDates || []) as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ ...parsed, id: analysis.id });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const analyses = await prisma.syllabusAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, courseName: true, semester: true, createdAt: true },
  });
  return NextResponse.json({ analyses });
}
