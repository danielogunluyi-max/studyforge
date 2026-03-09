import { NextResponse } from "next/server";
import { ALL_ONTARIO_COURSES } from "@/lib/ontarioCourses";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradeParam = searchParams.get("grade");
    const grade = gradeParam ? Number(gradeParam) : null;
    const subject = (searchParams.get("subject") ?? "").trim();
    const query = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));

    const courses = await db.ontarioCurriculumCourse.findMany({
      where: {
        ...(Number.isFinite(Number(grade)) && grade !== null ? { grade: Number(grade) } : {}),
        ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
        ...(query
          ? {
              OR: [
                { code: { contains: query, mode: "insensitive" } },
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { keywords: { hasSome: [query] } },
              ],
            }
          : {}),
      },
      include: { units: { include: { expectations: true } } },
      orderBy: [{ subject: "asc" }, { code: "asc" }],
      take: limit,
    });

    const dbMap = new Map(courses.map((course) => [course.code, course]));

    const fullList = ALL_ONTARIO_COURSES.filter((course) => {
      if (grade !== null && Number.isFinite(grade) && course.grade !== grade) return false;
      if (subject && !course.category.toLowerCase().includes(subject.toLowerCase())) return false;
      if (!query) return true;

      const q = query.toLowerCase();
      return (
        course.code.toLowerCase().includes(q) ||
        course.name.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q)
      );
    }).slice(0, limit);

    const mergedCourses = fullList.map((course) => {
      const existing = dbMap.get(course.code);
      const expectationCount = existing
        ? existing.units.reduce((sum, unit) => sum + unit.expectations.length, 0)
        : 0;

      return {
        id: existing?.id ?? course.code,
        code: course.code,
        title: existing?.title ?? course.name,
        grade: course.grade,
        subject: existing?.subject ?? course.category,
        category: existing?.category ?? course.category,
        type: existing?.type ?? course.type,
        destination: existing?.destination ?? course.type,
        description: existing?.description ?? course.description,
        keywords: existing?.keywords ?? [course.category, course.type, `grade-${course.grade}`],
        unitCount: existing?.units.length ?? 0,
        expectationCount,
        isSeeded: existing?.isSeeded ?? false,
      };
    });

    const seededCount = mergedCourses.filter((course) => course.isSeeded).length;
    const totalExpectations = mergedCourses.reduce((sum, course) => sum + course.expectationCount, 0);

    return NextResponse.json({
      courses: mergedCourses,
      stats: {
        totalCourses: mergedCourses.length,
        seededCourses: seededCount,
        totalExpectations,
      },
    });
  } catch (error) {
    console.error("curriculum list error", error);
    return NextResponse.json({ error: "Failed to load curriculum" }, { status: 500 });
  }
}
