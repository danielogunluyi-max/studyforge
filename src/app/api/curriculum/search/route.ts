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
    const q = String(searchParams.get("q") ?? "").trim();

    if (!q) {
      return NextResponse.json({ courses: [] });
    }

    const courses = await db.ontarioCurriculumCourse.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { keywords: { hasSome: [q] } },
        ],
      },
      orderBy: [{ grade: "asc" }, { code: "asc" }],
      take: 20,
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("curriculum search error", error);
    return NextResponse.json({ error: "Failed to search curriculum" }, { status: 500 });
  }
}
