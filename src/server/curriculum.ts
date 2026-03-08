import { db } from "~/server/db";

export type CurriculumContext = {
  code: string;
  title: string;
  subject: string;
  description: string;
  unitTitles: string[];
  expectationTitles: string[];
};

export async function getCurriculumContext(code?: string | null): Promise<CurriculumContext | null> {
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

  return {
    code: course.code,
    title: course.title,
    subject: course.subject,
    description: course.description,
    unitTitles: course.units.map((unit) => `${unit.code} - ${unit.title}`),
    expectationTitles: course.units.flatMap((unit) =>
      unit.expectations.map((expectation) => `${expectation.code} ${expectation.title}`),
    ),
  };
}

export function curriculumContextToPrompt(context: CurriculumContext | null): string {
  if (!context) return "";

  return `Ontario Curriculum Context:\nCourse: ${context.code} - ${context.title} (${context.subject})\nDescription: ${context.description}\nUnits: ${context.unitTitles.join(", ")}\nKey expectations: ${context.expectationTitles.slice(0, 12).join("; ")}`;
}
