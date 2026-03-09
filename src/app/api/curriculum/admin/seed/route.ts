import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { seedCourseByCode } from "@/lib/curriculumSeeder";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { courseCode?: string; force?: boolean };
    const courseCode = String(body.courseCode ?? "").trim().toUpperCase();

    if (!courseCode) {
      return NextResponse.json({ success: false, error: "courseCode is required" }, { status: 400 });
    }

    const result = await seedCourseByCode(courseCode, { force: body.force === true });

    if (!result.seeded) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Seeding failed",
          expectationsSeeded: result.expectationsSeeded,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      expectationsSeeded: result.expectationsSeeded,
    });
  } catch (error) {
    console.error("admin seed route error", error);
    return NextResponse.json({ success: false, error: "Failed to seed course" }, { status: 500 });
  }
}
