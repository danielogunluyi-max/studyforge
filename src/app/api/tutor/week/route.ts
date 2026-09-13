import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { buildNovaWeekContext } from "~/server/nova-week";

/** GET /api/tutor/week — signature "knows your week" line (omit-don't-invent). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const week = await buildNovaWeekContext(session.user.id);
    return NextResponse.json({
      line: week.line,
      briefing: week.briefing,
      clauses: week.clauses,
    });
  } catch (error) {
    console.error("[tutor/week]", error);
    return NextResponse.json({ line: null, briefing: null, clauses: [] });
  }
}
