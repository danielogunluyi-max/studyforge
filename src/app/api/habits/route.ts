import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const habits = await db.habit.findMany({
    where: { userId: session.user.id, active: true },
    orderBy: { createdAt: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEntries = await db.habitEntry.findMany({
    where: { userId: session.user.id, date: { gte: today } },
  });

  return NextResponse.json({ habits, todayEntries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, emoji, color } = (await req.json()) as {
    name?: string;
    emoji?: string;
    color?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const habit = await db.habit.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      emoji: emoji || "✅",
      color: color || "#f0b429",
    },
  });

  return NextResponse.json({ habit });
}
