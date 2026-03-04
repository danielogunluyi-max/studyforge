import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { canManageGroup, ensureGroupMember } from "~/server/study-groups";

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

    const resources = await db.groupResource.findMany({
      where: { groupId: id },
      include: { sharedBy: { select: { id: true, name: true, email: true } } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ resources, canManage: canManageGroup(membership.role) });
  } catch (error) {
    console.error("Group resources get error:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
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

    const body = (await request.json()) as { action?: "share" | "pin"; type?: string; title?: string; url?: string; noteId?: string; resourceId?: string; pinned?: boolean };

    if (body.action === "pin") {
      if (!canManageGroup(membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const resourceId = (body.resourceId ?? "").trim();
      if (!resourceId) return NextResponse.json({ error: "resourceId required" }, { status: 400 });
      const resource = await db.groupResource.update({ where: { id: resourceId }, data: { pinned: Boolean(body.pinned) } });
      return NextResponse.json({ resource });
    }

    const type = (body.type ?? "link").trim() || "link";
    const title = (body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const resource = await db.groupResource.create({
      data: {
        groupId: id,
        sharedById: session.user.id,
        type,
        title,
        url: body.url?.trim() || null,
        noteId: body.noteId?.trim() || null,
      },
      include: { sharedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ resource });
  } catch (error) {
    console.error("Group resources post error:", error);
    return NextResponse.json({ error: "Failed to update resources" }, { status: 500 });
  }
}
