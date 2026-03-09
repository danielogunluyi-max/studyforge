import { NextResponse } from "next/server";

import { getCourseSeedStatuses } from "@/lib/curriculumSeeder";
import { auth } from "~/server/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courses = await getCourseSeedStatuses();

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("admin status route error", error);
    return NextResponse.json({ error: "Failed to load seeding status" }, { status: 500 });
  }
}
