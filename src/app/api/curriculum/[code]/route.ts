import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getMoatMap } from "~/lib/curriculum-moat-maps";

export async function GET(_: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await context.params;
    const normalized = String(code).trim().toUpperCase();

    const course = await db.ontarioCurriculumCourse.findUnique({
      where: { code: normalized },
      include: {
        units: {
          orderBy: { orderIndex: "asc" },
          include: {
            expectations: { orderBy: { code: "asc" } },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const [progress, linkedNotes] = await Promise.all([
      db.ontarioCurriculumProgress.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: course.id,
          },
        },
      }),
      db.note.findMany({
        where: {
          userId: session.user.id,
          tags: { has: normalized },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          format: true,
          updatedAt: true,
          tags: true,
        },
      }),
    ]);

    const completedUnits = new Set(progress?.completedUnits ?? []);
    const completedExpectations = new Set(progress?.completedExpectations ?? []);
    const moat = getMoatMap(normalized);

    const units = course.units.map((unit) => {
      const totalExp = unit.expectations.length;
      const doneExp = unit.expectations.filter((e) => completedExpectations.has(e.code)).length;
      const masteryPct =
        totalExp > 0 ? Math.round((doneExp / totalExp) * 100) : completedUnits.has(unit.code) ? 100 : 0;
      const moatUnit = moat?.units.find((u) => u.code === unit.code);

      return {
        ...unit,
        doneExpectations: doneExp,
        totalExpectations: totalExp,
        masteryPct,
        completed: completedUnits.has(unit.code) || (totalExp > 0 && doneExp === totalExp),
        textbookRef: moatUnit?.textbookRef ?? null,
        topics: moatUnit?.topics ?? [],
        inboxHint: moatUnit?.inboxHint ?? null,
      };
    });

    const totalExpectations = units.reduce((n, u) => n + u.totalExpectations, 0);
    const doneExpectations = units.reduce((n, u) => n + u.doneExpectations, 0);
    const coveragePct =
      totalExpectations > 0 ? Math.round((doneExpectations / totalExpectations) * 100) : null;

    return NextResponse.json({
      course: {
        ...course,
        units,
      },
      progress: progress ?? null,
      linkedNotes,
      moat: moat
        ? {
            textbook: moat.textbook,
            disclaimer:
              "Study map only — chapter references, not textbook content. Photograph pages into Inbox.",
          }
        : null,
      coverage: {
        doneExpectations,
        totalExpectations,
        pct: coveragePct,
      },
    });
  } catch (error) {
    console.error("curriculum detail error", error);
    return NextResponse.json({ error: "Failed to load curriculum course" }, { status: 500 });
  }
}
