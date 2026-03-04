import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { ensureGroupMember, isOwner } from "~/server/study-groups";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;

    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership || !isOwner(membership.role)) {
      return NextResponse.json({ error: "Only owner can update settings" }, { status: 403 });
    }

    const body = (await request.json()) as { name?: string; topic?: string; isPublic?: boolean };
    const name = body.name?.trim();
    const topic = body.topic?.trim();

    const group = await db.studyGroup.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(topic !== undefined ? { topic: topic || null } : {}),
        ...(body.isPublic !== undefined ? { isPublic: Boolean(body.isPublic) } : {}),
      },
      select: { id: true, name: true, topic: true, isPublic: true },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Group settings patch error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
