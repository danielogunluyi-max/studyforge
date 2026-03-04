import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const SUBJECTS = ["Math", "Biology", "History", "Chemistry", "English", "Physics"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await db.battle.findMany({
      where: {
        status: { in: ["waiting", "active"] },
        subject: { in: SUBJECTS },
      },
      select: {
        subject: true,
        status: true,
        opponentId: true,
      },
    });

    const counts = SUBJECTS.reduce<Record<string, { online: number; waiting: number }>>((acc, subject) => {
      acc[subject] = { online: 0, waiting: 0 };
      return acc;
    }, {} as Record<string, { online: number; waiting: number }>);

    for (const battle of active) {
      const key = battle.subject ?? "";
      if (!counts[key]) continue;
      if (battle.status === "waiting") {
        counts[key].online += 1;
        counts[key].waiting += 1;
      } else {
        counts[key].online += 2;
      }
    }

    return NextResponse.json({
      rooms: SUBJECTS.map((subject) => ({
        subject,
        online: counts[subject]?.online ?? 0,
        waiting: counts[subject]?.waiting ?? 0,
      })),
    });
  } catch (error) {
    console.error("Rooms fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}
