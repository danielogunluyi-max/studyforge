import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

type CreateFocusBody = {
  goal?: string;
  durationMins?: number;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await db.focusSession.findMany({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        goal: true,
        durationMins: true,
        actualMins: true,
        completed: true,
        abandoned: true,
        distractions: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Focus sessions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch focus sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateFocusBody;
    const durationMins = Number(body.durationMins);

    if (!Number.isInteger(durationMins) || durationMins < 5 || durationMins > 180) {
      return NextResponse.json(
        { error: "durationMins must be an integer between 5 and 180" },
        { status: 400 },
      );
    }

    const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 180) : null;

    const created = await db.focusSession.create({
      data: {
        userId: session.user.id,
        goal: goal || null,
        durationMins,
      },
    });

    return NextResponse.json({ session: created });
  } catch (error) {
    console.error("Focus session POST error:", error);
    return NextResponse.json({ error: "Failed to start focus session" }, { status: 500 });
  }
}
