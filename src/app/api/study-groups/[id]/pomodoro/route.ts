import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { canManageGroup, ensureGroupMember } from "~/server/study-groups";

const STUDY_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function getRemaining(timer: { status: string; mode: string; remainingSeconds: number; startedAt: Date | null }) {
  if (timer.status !== "running" || !timer.startedAt) return timer.remainingSeconds;
  const elapsed = Math.floor((Date.now() - timer.startedAt.getTime()) / 1000);
  return Math.max(0, timer.remainingSeconds - elapsed);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const timer = await db.groupPomodoroTimer.findUnique({ where: { groupId: id } });
    return NextResponse.json({ timer, remainingSeconds: timer ? getRemaining(timer) : STUDY_SECONDS });
  } catch (error) {
    console.error("Pomodoro get error:", error);
    return NextResponse.json({ error: "Failed to fetch timer" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!canManageGroup(membership.role) && membership.role !== "owner") return NextResponse.json({ error: "Only host/moderator can manage timer" }, { status: 403 });

    const body = (await request.json()) as { action?: "start" | "pause" | "reset" };
    const timer = await db.groupPomodoroTimer.findUnique({ where: { groupId: id } });
    if (!timer) return NextResponse.json({ error: "Timer not found" }, { status: 404 });

    if (body.action === "pause") {
      const remaining = getRemaining(timer);
      const updated = await db.groupPomodoroTimer.update({ where: { groupId: id }, data: { status: "paused", remainingSeconds: remaining, startedAt: null } });
      return NextResponse.json({ timer: updated, remainingSeconds: remaining });
    }

    if (body.action === "reset") {
      const resetValue = timer.mode === "study" ? STUDY_SECONDS : BREAK_SECONDS;
      const updated = await db.groupPomodoroTimer.update({ where: { groupId: id }, data: { status: "paused", remainingSeconds: resetValue, startedAt: null } });
      return NextResponse.json({ timer: updated, remainingSeconds: resetValue });
    }

    const remaining = getRemaining(timer);
    const updated = await db.groupPomodoroTimer.update({
      where: { groupId: id },
      data: {
        status: "running",
        remainingSeconds: remaining,
        startedAt: new Date(),
        hostId: session.user.id,
      },
    });

    return NextResponse.json({ timer: updated, remainingSeconds: remaining });
  } catch (error) {
    console.error("Pomodoro post error:", error);
    return NextResponse.json({ error: "Failed to update timer" }, { status: 500 });
  }
}
