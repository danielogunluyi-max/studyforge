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

    const items = await db.groupScheduleItem.findMany({ where: { groupId: id }, orderBy: { startsAt: "asc" } });
    return NextResponse.json({ items, canManage: canManageGroup(membership.role) });
  } catch (error) {
    console.error("Group schedule get error:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
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

    const body = (await request.json()) as { title?: string; startsAt?: string; endsAt?: string };
    const title = (body.title ?? "").trim();
    if (!title || !body.startsAt) return NextResponse.json({ error: "title and startsAt required" }, { status: 400 });

    const item = await db.groupScheduleItem.create({
      data: {
        groupId: id,
        createdById: session.user.id,
        title,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Group schedule post error:", error);
    return NextResponse.json({ error: "Failed to create schedule item" }, { status: 500 });
  }
}
