import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { getAuthSession } from '~/server/auth/session';

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function inferSubjectsFromTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => /math|bio|chem|phys|english|history|geo|cs|computer|business|accounting|science/i.test(tag));
}


export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [exams, notes] = await Promise.all([
    prisma.exam.findMany({ where: { userId: session.user.id }, select: { subject: true, scorePercent: true } }),
    prisma.note.findMany({ where: { userId: session.user.id }, select: { tags: true }, take: 200 }),
  ]);

  const subjects = [...new Set(notes.flatMap((n: any) => inferSubjectsFromTags(n.tags)))];
  const strongSubjects = exams
    .filter((e: any) => (e.scorePercent || 0) >= 80)
    .map((e: any) => e.subject)
    .filter(Boolean);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `You are a Canadian academic career counselor. Based on this Ontario high school student's academic profile, suggest career paths.

Strong subjects (scored 80%+): ${strongSubjects.join(', ') || 'None yet'}
Subjects studied: ${subjects.join(', ') || 'Various'}

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
      },
    ],
    max_tokens: 1200,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { topPath?: string; paths?: unknown[] };

    const careerPath = await prisma.careerPath.upsert({
      where: { userId: session.user.id },
      update: {
        strongSubjects,
        interests: subjects,
        paths: (parsed.paths ?? []) as never,
        topPath: parsed.topPath || '',
        requiredCourses: {} as never,
      },
      create: {
        userId: session.user.id,
        strongSubjects,
        interests: subjects,
        paths: (parsed.paths ?? []) as never,
        topPath: parsed.topPath || '',
        requiredCourses: {} as never,
      },
    });

    return NextResponse.json({ careerPath, ...parsed });
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const careerPath = await prisma.careerPath.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ careerPath });
}
