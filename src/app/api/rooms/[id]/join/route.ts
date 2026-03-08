import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const room = await db.studyRoom.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true } },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);
    const activeMembers = await db.roomMember.count({
      where: {
        roomId: id,
        lastSeen: { gte: activeSince },
      },
    });

    const existingMember = await db.roomMember.findUnique({
      where: { roomId_userId: { roomId: id, userId: session.user.id } },
      select: { id: true },
    });

    if (!existingMember && activeMembers >= room.maxMembers) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    await db.roomMember.upsert({
      where: { roomId_userId: { roomId: id, userId: session.user.id } },
      create: {
        roomId: id,
        userId: session.user.id,
        status: "studying",
      },
      update: {
        lastSeen: new Date(),
        status: "studying",
      },
    });

    const roomWithMembers = await db.studyRoom.findUnique({
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

    return NextResponse.json({ success: true, room: roomWithMembers });
  } catch (error) {
    console.error("Room join error:", error);
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
