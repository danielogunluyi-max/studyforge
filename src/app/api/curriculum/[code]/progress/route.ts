import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type ProgressBody = {
  completedUnits?: string[];
  completedExpectations?: string[];
  confidence?: number;
};

export async function GET(_: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await context.params;
    const normalized = String(code).trim().toUpperCase();

    const course = await db.ontarioCurriculumCourse.findUnique({ where: { code: normalized } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const progress = await db.ontarioCurriculumProgress.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id,
        },
      },
    });

    return NextResponse.json({ progress: progress ?? null });
  } catch (error) {
    console.error("curriculum progress GET error", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await context.params;
    const normalized = String(code).trim().toUpperCase();

    const course = await db.ontarioCurriculumCourse.findUnique({ where: { code: normalized } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as ProgressBody;

    const completedUnits = Array.isArray(body.completedUnits)
      ? body.completedUnits.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const completedExpectations = Array.isArray(body.completedExpectations)
      ? body.completedExpectations.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const confidence = Number.isFinite(Number(body.confidence))
      ? Math.max(0, Math.min(100, Math.round(Number(body.confidence))))
      : 0;

    const progress = await db.ontarioCurriculumProgress.upsert({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id,
        },
      },
      update: {
        completedUnits,
        completedExpectations,
        confidence,
        lastStudiedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        courseId: course.id,
        completedUnits,
        completedExpectations,
        confidence,
        lastStudiedAt: new Date(),
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("curriculum progress POST error", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
