/**
 * Notes linked to weakness:
 * 1) Mock exams with misses that have a noteId
 * 2) Notes tagged with a course code that still has untouched curriculum units
 */

import { prisma } from "@/lib/prisma";
import { getUntouchedCurriculumUnits } from "~/server/curriculum-writeback";

type BreakdownQ = { isCorrect?: boolean };

export async function getWeakNoteIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();

  const attempts = await prisma.mockExamAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      breakdown: true,
      exam: { select: { noteId: true } },
    },
  });

  for (const attempt of attempts) {
    const noteId = attempt.exam?.noteId;
    if (!noteId) continue;
    const per = (attempt.breakdown as { perQuestion?: BreakdownQ[] } | null)?.perQuestion;
    if (!Array.isArray(per)) continue;
    if (per.some((q) => q && q.isCorrect === false)) {
      ids.add(noteId);
    }
  }

  // Cheap curriculum handshake: notes tagged with courses that still have untouched units
  try {
    const untouched = await getUntouchedCurriculumUnits(userId, 8);
    const courseCodes = [...new Set(untouched.map((u) => u.courseCode))];
    if (courseCodes.length > 0) {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          OR: courseCodes.map((code) => ({ tags: { has: code } })),
        },
        select: { id: true },
        take: 40,
      });
      for (const note of notes) ids.add(note.id);
    }
  } catch {
    // ignore — mock-miss path still works
  }

  return [...ids];
}
