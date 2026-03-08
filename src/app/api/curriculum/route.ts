import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const grade = Number(searchParams.get("grade") ?? "11");
    const subject = (searchParams.get("subject") ?? "").trim();
    const query = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));

    const courses = await db.ontarioCurriculumCourse.findMany({
      where: {
        ...(Number.isFinite(grade) ? { grade } : {}),
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
      include: {
        units: {
          include: { expectations: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: [{ subject: "asc" }, { code: "asc" }],
      take: limit,
    });

    return NextResponse.json({
      courses: courses.map((course) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        grade: course.grade,
        subject: course.subject,
        destination: course.destination,
        description: course.description,
        keywords: course.keywords,
        unitCount: course.units.length,
        expectationCount: course.units.reduce((sum, unit) => sum + unit.expectations.length, 0),
      })),
    });
  } catch (error) {
    console.error("curriculum list error", error);
    return NextResponse.json({ error: "Failed to load curriculum" }, { status: 500 });
  }
}
