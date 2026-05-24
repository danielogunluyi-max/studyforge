import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma, Prisma } from "@/lib/prisma";

/**
 * Phase 2 — Tiered Grade Calculator API
 *
 * POST accepts a tier-discriminated payload:
 *   - HIGHSCHOOL → "needed on final" calc (legacy, default)
 *   - COLLEGE    → cumulative GPA across course list
 *   - UNIVERSITY → credit-weighted % average + delta vs class
 *
 * GET returns recent calcs, optionally filtered by ?tier=...
 */

type Tier = "HIGHSCHOOL" | "COLLEGE" | "UNIVERSITY";

type HSPayload = {
  tier?: "HIGHSCHOOL";
  courseName?: string;
  currentGrade?: number;
  currentWeight?: number;
  finalWeight?: number;
  targetGrade?: number;
};

type CollegeCourseRow = {
  name?: string;
  credits?: number;
  letterGrade?: string;
};

type CollegePayload = {
  tier: "COLLEGE";
  courseName?: string;
  courses?: CollegeCourseRow[];
};

type UniCourseRow = {
  name?: string;
  grade?: number;
  credits?: number;
  classAverage?: number;
};

type UniPayload = {
  tier: "UNIVERSITY";
  courseName?: string;
  courses?: UniCourseRow[];
};

type CalcPayload = HSPayload | CollegePayload | UniPayload;

const LETTER_GPA: Record<string, number> = {
  "A+": 4.3, A: 4.0, "A-": 3.7,
  "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7,
  "D+": 1.3, D: 1.0, "D-": 0.7,
  F: 0.0,
};

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asTier(value: unknown): Tier {
  if (value === "COLLEGE" || value === "UNIVERSITY") return value;
  return "HIGHSCHOOL";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CalcPayload;
  const tier = asTier((body as { tier?: string }).tier);

  /* ───── COLLEGE — cumulative GPA ────────────────────────── */
  if (tier === "COLLEGE") {
    const payload = body as CollegePayload;
    const rows = (payload.courses ?? [])
      .map((c) => ({
        name: typeof c.name === "string" ? c.name.trim() : "Untitled",
        credits: num(c.credits),
        letterGrade: typeof c.letterGrade === "string" ? c.letterGrade.toUpperCase() : "",
      }))
      .filter((c) => c.credits > 0 && c.letterGrade in LETTER_GPA);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Add at least one course with credits and a valid letter grade." },
        { status: 400 },
      );
    }

    const totalCredits = rows.reduce((a, c) => a + c.credits, 0);
    const points = rows.reduce(
      (a, c) => a + (LETTER_GPA[c.letterGrade] ?? 0) * c.credits,
      0,
    );
    const gpa = totalCredits > 0 ? points / totalCredits : 0;

    const calc = await prisma.gradeCalculation.create({
      data: {
        userId: session.user.id,
        tier: "COLLEGE",
        courseName: payload.courseName?.trim() || "Term GPA",
        gpa: Math.round(gpa * 100) / 100,
        creditHours: totalCredits,
        courses: rows as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      tier: "COLLEGE",
      gpa: Math.round(gpa * 100) / 100,
      totalCredits,
      message:
        gpa >= 3.7
          ? "Outstanding — Dean's List range."
          : gpa >= 3.3
            ? "Strong showing — keep the momentum."
            : gpa >= 2.7
              ? "Solid pass. Room to climb."
              : gpa >= 2.0
                ? "Above the academic-standing line."
                : "Below academic-standing threshold — flag for support.",
      calc,
    });
  }

  /* ───── UNIVERSITY — credit-weighted % + class avg ──────── */
  if (tier === "UNIVERSITY") {
    const payload = body as UniPayload;
    const rows = (payload.courses ?? [])
      .map((c) => ({
        name: typeof c.name === "string" ? c.name.trim() : "Untitled",
        grade: num(c.grade),
        credits: num(c.credits),
        classAverage: typeof c.classAverage === "number" ? c.classAverage : null,
      }))
      .filter((c) => c.credits > 0);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Add at least one course with grade and credits." },
        { status: 400 },
      );
    }

    const totalCredits = rows.reduce((a, c) => a + c.credits, 0);
    const weightedGrade =
      rows.reduce((a, c) => a + c.grade * c.credits, 0) / totalCredits;
    const rowsWithAvg = rows.filter((c) => c.classAverage !== null);
    const weightedClassAvg =
      rowsWithAvg.length > 0
        ? rowsWithAvg.reduce((a, c) => a + (c.classAverage ?? 0) * c.credits, 0) /
          rowsWithAvg.reduce((a, c) => a + c.credits, 0)
        : null;
    const deltaVsAvg = weightedClassAvg !== null ? weightedGrade - weightedClassAvg : null;

    const calc = await prisma.gradeCalculation.create({
      data: {
        userId: session.user.id,
        tier: "UNIVERSITY",
        courseName: payload.courseName?.trim() || "Term Average",
        currentGrade: Math.round(weightedGrade * 10) / 10,
        creditHours: totalCredits,
        classAverage: weightedClassAvg !== null ? Math.round(weightedClassAvg * 10) / 10 : null,
        courses: rows as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      tier: "UNIVERSITY",
      weightedAverage: Math.round(weightedGrade * 10) / 10,
      totalCredits,
      classAverage: weightedClassAvg !== null ? Math.round(weightedClassAvg * 10) / 10 : null,
      deltaVsAvg: deltaVsAvg !== null ? Math.round(deltaVsAvg * 10) / 10 : null,
      message:
        deltaVsAvg === null
          ? `Term average ${weightedGrade.toFixed(1)}% across ${totalCredits.toFixed(1)} credits.`
          : deltaVsAvg >= 5
            ? `${weightedGrade.toFixed(1)}% — well above the class average.`
            : deltaVsAvg >= 0
              ? `${weightedGrade.toFixed(1)}% — at or above class average.`
              : `${weightedGrade.toFixed(1)}% — ${Math.abs(deltaVsAvg).toFixed(1)} points below class average.`,
      calc,
    });
  }

  /* ───── HIGH SCHOOL — needed on final (legacy) ──────────── */
  const payload = body as HSPayload;
  const courseName = payload.courseName?.trim() || "Untitled course";
  const currentGrade = num(payload.currentGrade);
  const currentWeight = num(payload.currentWeight);
  const finalWeight = num(payload.finalWeight);
  const targetGrade = num(payload.targetGrade);

  // Formula: needed = (target - current * currentWeight/100) / (finalWeight/100)
  const earnedPoints = currentGrade * (currentWeight / 100);
  const remaining = finalWeight / 100;
  const neededOnFinal = remaining > 0 ? (targetGrade - earnedPoints) / remaining : 0;

  const calc = await prisma.gradeCalculation.create({
    data: {
      userId: session.user.id,
      tier: "HIGHSCHOOL",
      courseName,
      currentGrade,
      currentWeight,
      finalWeight,
      targetGrade,
      neededOnFinal: Math.round(neededOnFinal * 10) / 10,
    },
  });

  return NextResponse.json({
    tier: "HIGHSCHOOL",
    neededOnFinal: Math.round(neededOnFinal * 10) / 10,
    isPossible: neededOnFinal <= 100,
    isEasy: neededOnFinal <= 60,
    message:
      neededOnFinal > 100
        ? `You need ${neededOnFinal.toFixed(1)}% — unfortunately not achievable.`
        : neededOnFinal <= 0
          ? `You already have ${targetGrade}%! You just need to show up.`
          : `You need ${neededOnFinal.toFixed(1)}% on your final to hit ${targetGrade}%.`,
    calc,
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tierParam = url.searchParams.get("tier");
  const tierFilter =
    tierParam === "HIGHSCHOOL" || tierParam === "COLLEGE" || tierParam === "UNIVERSITY"
      ? (tierParam as Tier)
      : null;

  const calcs = await prisma.gradeCalculation.findMany({
    where: {
      userId: session.user.id,
      ...(tierFilter ? { tier: tierFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ calcs });
}
