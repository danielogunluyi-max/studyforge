/**
 * Curriculum write-backs — touch real OntarioCurriculumProgress from
 * notes / deck study / mock results. Never invent expectation codes.
 */

import { db } from "~/server/db";
import { getMoatMap } from "~/lib/curriculum-moat-maps";

const COURSE_CODE = /^[A-Z]{3,4}\d[A-Z]$/i;

export function extractCourseCodes(tags: string[] | undefined | null): string[] {
  if (!Array.isArray(tags)) return [];
  const out = new Set<string>();
  for (const tag of tags) {
    const t = String(tag ?? "").trim().toUpperCase();
    if (COURSE_CODE.test(t)) out.add(t);
  }
  return [...out];
}

function fuzzyMatchUnitCode(
  label: string,
  units: Array<{ code: string; title: string }>,
): string | null {
  const needle = label.trim().toLowerCase();
  if (!needle) return null;

  for (const unit of units) {
    if (unit.code.toLowerCase() === needle) return unit.code;
    if (unit.title.toLowerCase() === needle) return unit.code;
  }

  for (const unit of units) {
    const title = unit.title.toLowerCase();
    if (needle.includes(title) || title.includes(needle)) return unit.code;
  }

  return null;
}

function matchUnitAgainstCourse(
  label: string,
  courseCode: string,
  units: Array<{ code: string; title: string }>,
): string | null {
  const direct = fuzzyMatchUnitCode(label, units);
  if (direct) return direct;

  const map = getMoatMap(courseCode);
  if (!map) return null;
  const needle = label.trim().toLowerCase();
  for (const unit of map.units) {
    if (unit.name.toLowerCase() === needle || needle.includes(unit.name.toLowerCase())) {
      return unit.code;
    }
    if (unit.topics.some((t) => needle.includes(t.toLowerCase()) || t.toLowerCase().includes(needle))) {
      return unit.code;
    }
  }
  return null;
}

async function ensureProgress(userId: string, courseCode: string) {
  const course = await db.ontarioCurriculumCourse.findUnique({
    where: { code: courseCode.toUpperCase() },
    include: { units: { select: { code: true, title: true } } },
  });
  if (!course) return null;

  const existing = await db.ontarioCurriculumProgress.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (existing) return { course, progress: existing };

  const progress = await db.ontarioCurriculumProgress.create({
    data: {
      userId,
      courseId: course.id,
      completedUnits: [],
      completedExpectations: [],
      confidence: 0,
      lastStudiedAt: new Date(),
    },
  });
  return { course, progress };
}

/** Note tagged with a course code → touch progress (confidence + lastStudied). */
export async function writebackNoteTags(userId: string, tags: string[]): Promise<void> {
  const codes = extractCourseCodes(tags);
  for (const code of codes) {
    const row = await ensureProgress(userId, code);
    if (!row) continue;
    await db.ontarioCurriculumProgress.update({
      where: { id: row.progress.id },
      data: {
        confidence: Math.min(100, (row.progress.confidence ?? 0) + 2),
        lastStudiedAt: new Date(),
      },
    });
  }
}

/** Deck study — match deck.subject to a course code or subject name. */
export async function writebackDeckStudy(userId: string, deckSubject: string): Promise<void> {
  const raw = deckSubject.trim();
  if (!raw) return;

  let code = COURSE_CODE.test(raw) ? raw.toUpperCase() : null;
  if (!code) {
    const course = await db.ontarioCurriculumCourse.findFirst({
      where: {
        OR: [
          { subject: { equals: raw, mode: "insensitive" } },
          { title: { equals: raw, mode: "insensitive" } },
          { code: { equals: raw.toUpperCase() } },
        ],
      },
      select: { code: true },
    });
    code = course?.code ?? null;
  }
  if (!code) return;

  const row = await ensureProgress(userId, code);
  if (!row) return;
  await db.ontarioCurriculumProgress.update({
    where: { id: row.progress.id },
    data: {
      confidence: Math.min(100, (row.progress.confidence ?? 0) + 3),
      lastStudiedAt: new Date(),
    },
  });
}

/**
 * Mock attempt with curriculumCode — strengths (≥80%) can mark matched units
 * complete; never invent expectation codes. Weaknesses only bump lastStudied.
 */
export async function writebackMockAttempt(input: {
  userId: string;
  curriculumCode: string | null | undefined;
  strengths: string[];
  weaknesses: string[];
  scorePercent: number;
}): Promise<void> {
  const code = (input.curriculumCode ?? "").trim().toUpperCase();
  if (!code || !COURSE_CODE.test(code)) return;

  const row = await ensureProgress(input.userId, code);
  if (!row) return;

  const units = row.course.units;
  const completedUnits = new Set(row.progress.completedUnits);
  const completedExpectations = new Set(row.progress.completedExpectations);

  for (const label of input.strengths) {
    const unitCode = matchUnitAgainstCourse(label, code, units);
    if (!unitCode) continue;
    completedUnits.add(unitCode);
    // Mark that unit's expectations done only when overall mock score is strong
    if (input.scorePercent >= 80) {
      const unit = await db.ontarioCurriculumUnit.findFirst({
        where: { courseId: row.course.id, code: unitCode },
        include: { expectations: { select: { code: true } } },
      });
      for (const exp of unit?.expectations ?? []) {
        completedExpectations.add(exp.code);
      }
    }
  }

  const confidenceBump = Math.min(
    8,
    Math.max(1, Math.round(input.scorePercent / 20)) + (input.strengths.length > 0 ? 2 : 0),
  );

  await db.ontarioCurriculumProgress.update({
    where: { id: row.progress.id },
    data: {
      completedUnits: [...completedUnits],
      completedExpectations: [...completedExpectations],
      confidence: Math.min(100, (row.progress.confidence ?? 0) + confidenceBump),
      lastStudiedAt: new Date(),
    },
  });

  void input.weaknesses;
}

/** Units with zero expectation progress for courses the student has touched. */
export async function getUntouchedCurriculumUnits(
  userId: string,
  limit = 4,
): Promise<Array<{ courseCode: string; unitCode: string; unitTitle: string }>> {
  const progresses = await db.ontarioCurriculumProgress.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          code: true,
          units: { select: { code: true, title: true, expectations: { select: { code: true } } } },
        },
      },
    },
    take: 12,
  });

  const out: Array<{ courseCode: string; unitCode: string; unitTitle: string }> = [];
  for (const progress of progresses) {
    const doneExp = new Set(progress.completedExpectations);
    const doneUnits = new Set(progress.completedUnits);
    for (const unit of progress.course.units) {
      const anyExp = unit.expectations.some((e) => doneExp.has(e.code));
      if (doneUnits.has(unit.code) || anyExp) continue;
      out.push({
        courseCode: progress.course.code,
        unitCode: unit.code,
        unitTitle: unit.title,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
