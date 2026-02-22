import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const predictions = await db.examPrediction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Error fetching exam predictions:", error);
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}
