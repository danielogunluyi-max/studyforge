import { db } from "~/server/db";

export type CurriculumContext = {
  code: string;
  title: string;
  subject: string;
  description: string;
  unitTitles: string[];
  expectationTitles: string[];
  /** Real student progress — omit from prompt when null */
  progress?: {
    confidence: number;
    completedUnits: string[];
    completedExpectations: number;
    totalExpectations: number;
    coveragePct: number | null;
    untouchedUnits: string[];
  } | null;
};

export async function getCurriculumContext(
  code?: string | null,
  userId?: string | null,
): Promise<CurriculumContext | null> {
  const normalizedCode = String(code ?? "")
    .trim()
    .toUpperCase();

  if (!normalizedCode) return null;

  const course = await db.ontarioCurriculumCourse.findUnique({
    where: { code: normalizedCode },
    include: {
      units: {
        orderBy: { orderIndex: "asc" },
        include: { expectations: true },
      },
    },
  });

  if (!course) return null;

  const totalExpectations = course.units.reduce((n, u) => n + u.expectations.length, 0);
  let progress: CurriculumContext["progress"] = null;

  if (userId) {
    const row = await db.ontarioCurriculumProgress.findUnique({
      where: {
        userId_courseId: { userId, courseId: course.id },
      },
    });
    if (row) {
      const done = new Set(row.completedExpectations);
      const doneUnits = new Set(row.completedUnits);
      const untouchedUnits = course.units
        .filter(
          (u) =>
            !doneUnits.has(u.code) && !u.expectations.some((e) => done.has(e.code)),
        )
        .map((u) => `${u.code} ${u.title}`);
      progress = {
        confidence: row.confidence,
        completedUnits: row.completedUnits,
        completedExpectations: row.completedExpectations.length,
        totalExpectations,
        coveragePct:
          totalExpectations > 0
            ? Math.round((row.completedExpectations.length / totalExpectations) * 100)
            : null,
        untouchedUnits: untouchedUnits.slice(0, 6),
      };
    }
  }

  return {
    code: course.code,
    title: course.title,
    subject: course.subject,
    description: course.description,
    unitTitles: course.units.map((unit) => `${unit.code} - ${unit.title}`),
    expectationTitles: course.units.flatMap((unit) =>
      unit.expectations.map((expectation) => `${expectation.code} ${expectation.title}`),
    ),
    progress,
  };
}

export function curriculumContextToPrompt(context: CurriculumContext | null): string {
  if (!context) return "";

  const lines = [
    `Ontario Curriculum Context:`,
    `Course: ${context.code} - ${context.title} (${context.subject})`,
    `Description: ${context.description}`,
    `Units: ${context.unitTitles.join(", ")}`,
    `Key expectations: ${context.expectationTitles.slice(0, 12).join("; ")}`,
  ];

  if (context.progress) {
    lines.push(
      `Student progress (real): confidence ${context.progress.confidence}%` +
        (context.progress.coveragePct !== null
          ? `; expectation coverage ${context.progress.coveragePct}% (${context.progress.completedExpectations}/${context.progress.totalExpectations})`
          : ""),
    );
    if (context.progress.completedUnits.length > 0) {
      lines.push(`Completed units: ${context.progress.completedUnits.join(", ")}`);
    }
    if (context.progress.untouchedUnits.length > 0) {
      lines.push(`Untouched units: ${context.progress.untouchedUnits.join("; ")}`);
    }
  }

  return lines.join("\n");
}
