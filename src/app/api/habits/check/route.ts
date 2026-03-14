import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId, completed } = (await req.json()) as { habitId?: string; completed?: boolean };
  if (!habitId || typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const habit = await db.habit.findFirst({
    where: { id: habitId, userId: session.user.id },
  });
  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await db.habitEntry.findFirst({
    where: {
      userId: session.user.id,
      habitName: habit.name,
      date: { gte: today },
    },
  });

  if (existing) {
    await db.habitEntry.update({
      where: { id: existing.id },
      data: { completed },
    });
  } else {
    await db.habitEntry.create({
      data: {
        userId: session.user.id,
        habitName: habit.name,
        completed,
      },
    });
  }

  if (completed && (!existing || !existing.completed)) {
    await db.habit.update({
      where: { id: habitId },
      data: { streak: { increment: 1 } },
    });
  }

  return NextResponse.json({ success: true });
}
