import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

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
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const room = await db.studyRoom.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true } },
        members: {
          where: { lastSeen: { gte: activeSince } },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Room GET error:", error);
    return NextResponse.json({ error: "Failed to load room" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const room = await db.studyRoom.findUnique({ where: { id }, select: { hostId: true } });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== session.user.id) {
      return NextResponse.json({ error: "Only host can delete this room" }, { status: 403 });
    }

    await db.studyRoom.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Room DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
