import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { groqJSON } from "~/server/groq";

const prisma = db as any;

function inferSubjectsFromTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => /math|bio|chem|phys|english|history|geo|cs|computer|business|accounting|science/i.test(tag));
}

export async function POST() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const [exams, notes] = await Promise.all([
    prisma.exam.findMany({ where: { userId }, select: { subject: true, scorePercent: true } }),
    prisma.note.findMany({ where: { userId }, select: { tags: true }, take: 200 }),
  ]);

  const subjects = [...new Set(notes.flatMap((n: any) => inferSubjectsFromTags(n.tags)))];
  const strongSubjects = exams
    .filter((e: any) => (e.scorePercent || 0) >= 80)
    .map((e: any) => e.subject)
    .filter(Boolean);

  const parsed = await groqJSON<{ topPath?: string; paths?: unknown[] }>({
    user: `You are a Canadian academic career counselor. Based on this Ontario high school student's academic profile, suggest career paths.

Strong subjects (scored 80%+): ${strongSubjects.join(", ") || "None yet"}
Subjects studied: ${subjects.join(", ") || "Various"}

Suggest 5 career paths. For each, include Ontario-specific university programs.

Respond ONLY in JSON:
{
  "topPath": "Software Engineering",
  "paths": [
    {
      "career": "Software Engineer",
      "match": 92,
      "description": "...",
      "requiredSubjects": ["Math", "Computer Science"],
      "ontarioUniversities": ["University of Waterloo", "University of Toronto"],
      "avgSalary": "$95,000",
      "jobGrowth": "Very High",
      "grade12Courses": ["MCV4U", "MHF4U", "ICS4U"]
    }
  ]
}`,
    maxTokens: 1200,
  });

  if (!parsed) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  const careerPath = await prisma.careerPath.upsert({
    where: { userId },
    update: {
      strongSubjects,
      interests: subjects,
      paths: (parsed.paths ?? []) as never,
      topPath: parsed.topPath || "",
      requiredCourses: {} as never,
    },
    create: {
      userId,
      strongSubjects,
      interests: subjects,
      paths: (parsed.paths ?? []) as never,
      topPath: parsed.topPath || "",
      requiredCourses: {} as never,
    },
  });

  return NextResponse.json({ careerPath, ...parsed });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const careerPath = await prisma.careerPath.findUnique({ where: { userId } });
  return NextResponse.json({ careerPath });
}
