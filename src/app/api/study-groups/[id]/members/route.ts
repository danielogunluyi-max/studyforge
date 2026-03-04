import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { canManageGroup, ensureGroupMember, isOwner } from "~/server/study-groups";

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

    const members = await db.studyGroupMember.findMany({
      where: { groupId: id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json({ members, myRole: membership.role });
  } catch (error) {
    console.error("Group members get error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership || !isOwner(membership.role)) return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });

    const body = (await request.json()) as { userId?: string; role?: "moderator" | "member" };
    const userId = (body.userId ?? "").trim();
    const role = body.role;
    if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

    const updated = await db.studyGroupMember.update({
      where: { groupId_userId: { groupId: id, userId } },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error("Group members patch error:", error);
    return NextResponse.json({ error: "Failed to update member role" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership || !canManageGroup(membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { userId?: string; action?: "kick" | "delete-group" };

    if (body.action === "delete-group") {
      if (!isOwner(membership.role)) return NextResponse.json({ error: "Only owner can delete group" }, { status: 403 });
      await db.studyGroup.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    const userId = (body.userId ?? "").trim();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const target = await db.studyGroupMember.findUnique({ where: { groupId_userId: { groupId: id, userId } } });
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (target.role === "owner") return NextResponse.json({ error: "Cannot kick owner" }, { status: 409 });

    await db.studyGroupMember.delete({ where: { groupId_userId: { groupId: id, userId } } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Group members delete error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
