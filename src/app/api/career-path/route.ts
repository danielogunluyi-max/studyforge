import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { getAuthSession } from '~/server/auth/session';
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function inferSubjectsFromTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => /math|bio|chem|phys|english|history|geo|cs|computer|business|accounting|science/i.test(tag));
}

type PathRaw = {
  career?: string;
  description?: string;
  requiredSubjects?: string[];
  ontarioUniversities?: string[];
  avgSalary?: string;
  jobGrowth?: string;
  grade12Courses?: string[];
  match?: number;
};

/** Ground match% in real recorded marks for overlapping subjects — omit if no marks. */
function groundMatch(
  path: PathRaw,
  exams: Array<{ subject: string; scorePercent: number | null }>,
): number | null {
  const required = (path.requiredSubjects ?? []).map((s) => s.toLowerCase());
  if (required.length === 0 || exams.length === 0) return null;

  const scores: number[] = [];
  for (const exam of exams) {
    if (exam.scorePercent == null) continue;
    const subj = (exam.subject || '').toLowerCase();
    if (required.some((r) => subj.includes(r) || r.includes(subj))) {
      scores.push(exam.scorePercent);
    }
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const limited = assertGroqRateLimit(session.user.id);
  if (limited) return limited;

  const [exams, notes] = await Promise.all([
    prisma.exam.findMany({
      where: { userId: session.user.id, resultRecorded: true },
      select: { subject: true, scorePercent: true },
    }),
    prisma.note.findMany({ where: { userId: session.user.id }, select: { tags: true }, take: 200 }),
  ]);

  const subjects = [...new Set(notes.flatMap((n: any) => inferSubjectsFromTags(n.tags)))];
  const strongSubjects = exams
    .filter((e: any) => (e.scorePercent || 0) >= 80)
    .map((e: any) => e.subject)
    .filter(Boolean);

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: `You are a Canadian academic career counselor. Based on this Ontario high school student's academic profile, suggest career paths.

Strong subjects (scored 80%+ on recorded exams): ${strongSubjects.join(', ') || 'None yet'}
Subjects studied: ${subjects.join(', ') || 'Various'}

Suggest 5 career paths. For each, include Ontario-specific university programs.
Do NOT invent a match percentage — the app computes that from real marks.

Respond ONLY in JSON:
{
  "topPath": "Software Engineering",
  "paths": [
    {
      "career": "Software Engineer",
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
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    throw error;
  }

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as {
      topPath?: string;
      paths?: PathRaw[];
    };

    const groundedPaths = (parsed.paths ?? []).map((path) => {
      const match = groundMatch(path, exams);
      return {
        career: path.career ?? 'Career',
        description: path.description ?? '',
        requiredSubjects: path.requiredSubjects ?? [],
        ontarioUniversities: path.ontarioUniversities ?? [],
        avgSalary: path.avgSalary ?? '',
        jobGrowth: path.jobGrowth ?? '',
        grade12Courses: path.grade12Courses ?? [],
        ...(match !== null ? { match } : {}),
      };
    });

    const careerPath = await prisma.careerPath.upsert({
      where: { userId: session.user.id },
      update: {
        strongSubjects,
        interests: subjects,
        paths: groundedPaths as never,
        topPath: parsed.topPath || '',
        requiredCourses: {} as never,
      },
      create: {
        userId: session.user.id,
        strongSubjects,
        interests: subjects,
        paths: groundedPaths as never,
        topPath: parsed.topPath || '',
        requiredCourses: {} as never,
      },
    });

    return NextResponse.json({ careerPath, topPath: parsed.topPath, paths: groundedPaths });
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
