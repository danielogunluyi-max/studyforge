import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { ensureGroupMember } from "~/server/study-groups";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const group = await db.studyGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        pomodoroTimer: true,
        _count: {
          select: {
            messages: true,
            sharedNotes: true,
            flashcards: true,
            resources: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({
      group,
      me: {
        userId: membership.userId,
        role: membership.role,
      },
    });
  } catch (error) {
    console.error("Study group detail error:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}
