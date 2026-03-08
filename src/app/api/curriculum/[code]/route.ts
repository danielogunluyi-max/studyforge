import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

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

    const progress = await db.ontarioCurriculumProgress.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id,
        },
      },
    });

    return NextResponse.json({
      course,
      progress: progress ?? null,
    });
  } catch (error) {
    console.error("curriculum detail error", error);
    return NextResponse.json({ error: "Failed to load curriculum course" }, { status: 500 });
  }
}
