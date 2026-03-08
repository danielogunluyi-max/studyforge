import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

type EndFocusBody = {
  completed?: boolean;
  abandoned?: boolean;
  actualMins?: number;
  distractions?: number;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as EndFocusBody;

    const completed = Boolean(body.completed);
    const abandoned = Boolean(body.abandoned);
    const actualMins = Number(body.actualMins);
    const distractions = Number(body.distractions);

    if (!Number.isFinite(actualMins) || actualMins < 0 || actualMins > 1440) {
      return NextResponse.json({ error: "actualMins must be between 0 and 1440" }, { status: 400 });
    }

    if (!Number.isFinite(distractions) || distractions < 0 || !Number.isInteger(distractions)) {
      return NextResponse.json({ error: "distractions must be a non-negative integer" }, { status: 400 });
    }

    const existing = await db.focusSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Focus session not found" }, { status: 404 });
    }

    const updated = await db.focusSession.update({
      where: { id },
      data: {
        completed,
        abandoned,
        actualMins: Math.round(actualMins),
        distractions,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error("Focus session PATCH error:", error);
    return NextResponse.json({ error: "Failed to end focus session" }, { status: 500 });
  }
}
