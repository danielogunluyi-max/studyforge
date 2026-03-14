import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

function calcBurnout(mood: number, energy: number, stress: number): number {
  // Higher stress + lower mood + lower energy = higher burnout.
  return Math.round((((6 - mood) * 20 + (6 - energy) * 20 + stress * 20) / 3));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mood, energy, stress, notes } = (await req.json()) as {
    mood?: number;
    energy?: number;
    stress?: number;
    notes?: string;
  };

  if (
    typeof mood !== "number" ||
    typeof energy !== "number" ||
    typeof stress !== "number" ||
    mood < 1 || mood > 5 ||
    energy < 1 || energy > 5 ||
    stress < 1 || stress > 5
  ) {
    return NextResponse.json({ error: "Invalid mood/energy/stress values" }, { status: 400 });
  }

  const burnoutScore = calcBurnout(mood, energy, stress);

  const entry = await db.wellnessEntry.create({
    data: {
      userId: session.user.id,
      mood,
      energy,
      stress,
      notes,
      burnoutScore,
    },
  });

  return NextResponse.json({ entry, burnoutScore });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await db.wellnessEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const avgBurnout = entries.length
    ? entries.reduce((a, e) => a + e.burnoutScore, 0) / entries.length
    : 0;

  return NextResponse.json({ entries, avgBurnout: Math.round(avgBurnout) });
}
