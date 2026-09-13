/**
 * "Nova knows your week" — assemble real, omit-don't-invent clauses
 * from calendar exams, due cards, mock misses, and untouched curriculum units.
 */

import { prisma } from "@/lib/prisma";
import { formatTorontoDate } from "~/lib/toronto-time";
import { getUntouchedCurriculumUnits } from "~/server/curriculum-writeback";

export type NovaWeekClause = {
  kind: "exam" | "due" | "misses" | "units";
  text: string;
  href?: string;
};

export type NovaWeekContext = {
  /** Nova chat opener (includes "Want to start there?") */
  line: string | null;
  /** Dashboard hero — same clauses, no question */
  briefing: string | null;
  clauses: NovaWeekClause[];
  /** Compact block for the tutor system prompt */
  promptBlock: string;
};

type BreakdownQ = { isCorrect?: boolean; prompt?: string };

function weekdayLabel(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      weekday: "long",
    }).format(d);
  } catch {
    return formatTorontoDate(d);
  }
}

export async function buildNovaWeekContext(userId: string): Promise<NovaWeekContext> {
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [upcomingExam, dueCount, recentAttempt, untouched] = await Promise.all([
    prisma.exam
      .findFirst({
        where: {
          userId,
          examDate: { gte: now, lte: in14 },
        },
        orderBy: { examDate: "asc" },
        select: { id: true, subject: true, examDate: true, board: true },
      })
      .catch(() => null),
    prisma.flashcard
      .count({
        where: {
          deck: { userId },
          nextReview: { lte: now },
        },
      })
      .catch(() => 0),
    prisma.mockExamAttempt
      .findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          examId: true,
          breakdown: true,
          exam: { select: { id: true, title: true, noteId: true, curriculumCode: true } },
        },
      })
      .catch(() => null),
    getUntouchedCurriculumUnits(userId, 4).catch(() => []),
  ]);

  const clauses: NovaWeekClause[] = [];

  if (upcomingExam) {
    const codeOrSubject = (upcomingExam.board || upcomingExam.subject || "").trim();
    const day = weekdayLabel(upcomingExam.examDate);
    clauses.push({
      kind: "exam",
      text: codeOrSubject ? `${codeOrSubject} test ${day}` : `Exam ${day}`,
      href: "/planner",
    });
  }

  if (dueCount > 0) {
    clauses.push({
      kind: "due",
      text: `${dueCount} card${dueCount === 1 ? "" : "s"} due`,
      href: "/flashcards",
    });
  }

  let missQs: number[] = [];
  if (recentAttempt?.breakdown) {
    const breakdown = recentAttempt.breakdown as {
      perQuestion?: BreakdownQ[];
    };
    const per = breakdown.perQuestion;
    if (Array.isArray(per)) {
      missQs = per
        .map((q, i) => (q && q.isCorrect === false ? i + 1 : null))
        .filter((n): n is number => n !== null)
        .slice(0, 6);
    }
  }

  if (missQs.length > 0 && recentAttempt?.exam) {
    const qLabel =
      missQs.length === 1
        ? `Q${missQs[0]}`
        : missQs.length === 2
          ? `Q${missQs[0]} & Q${missQs[1]}`
          : `Q${missQs.slice(0, -1).join(", Q")} & Q${missQs[missQs.length - 1]}`;
    const title = recentAttempt.exam.title?.slice(0, 40) || "your last mock";
    clauses.push({
      kind: "misses",
      text: `you missed ${qLabel} on ${title}`,
      href: `/tutor?mockId=${encodeURIComponent(recentAttempt.exam.id)}${
        recentAttempt.exam.noteId
          ? `&noteId=${encodeURIComponent(recentAttempt.exam.noteId)}`
          : ""
      }`,
    });
  }

  // Prefer real curriculum untouched units (omit when absent — no fake claims).
  if (untouched.length > 0) {
    const primary = untouched[0]!;
    const label =
      untouched.length === 1
        ? `1 unit you haven't touched (${primary.courseCode} ${primary.unitTitle})`
        : `${untouched.length} units you haven't touched`;
    clauses.push({
      kind: "units",
      text: label,
      href: `/curriculum/${encodeURIComponent(primary.courseCode)}`,
    });
  }

  if (clauses.length === 0) {
    return { line: null, briefing: null, clauses: [], promptBlock: "" };
  }

  const briefing = clauses.map((c) => c.text).join(" · ");
  const line = `${briefing}. Want to start there?`;

  const promptLines = [
    "=== THIS WEEK (real data — omit any claim not listed here) ===",
    ...clauses.map((c) => `- ${c.text}${c.href ? ` → ${c.href}` : ""}`),
    "=== END THIS WEEK ===",
  ];

  return { line, briefing, clauses, promptBlock: promptLines.join("\n") };
}
