import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type CreateRoomBody = {
  name?: string;
  subject?: string;
  description?: string;
  isPublic?: boolean;
  maxMembers?: number;
};

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const STALE_ROOM_MS = 30 * 60 * 1000;

export async function GET() {
  try {
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);
    const staleCutoff = new Date(Date.now() - STALE_ROOM_MS);

    const rooms = await db.studyRoom.findMany({
      where: { isPublic: true },
      include: {
        host: { select: { id: true, name: true } },
        members: {
          where: { lastSeen: { gte: activeSince } },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const staleRoomIds = rooms
      .filter((room) => room.members.length === 0 && room.createdAt < staleCutoff)
      .map((room) => room.id);

    if (staleRoomIds.length > 0) {
      await db.studyRoom.deleteMany({ where: { id: { in: staleRoomIds } } });
    }

    const visibleRooms = rooms
      .filter((room) => !staleRoomIds.includes(room.id))
      .map((room) => ({
        ...room,
        activeMemberCount: room.members.length,
      }))
      .sort((a, b) => b.activeMemberCount - a.activeMemberCount);

    return NextResponse.json({ rooms: visibleRooms });
  } catch (error) {
    console.error("Rooms GET error:", error);
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateRoomBody;
    const name = String(body.name ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const isPublic = body.isPublic ?? true;
    const maxMembers = Number.isFinite(body.maxMembers) ? Number(body.maxMembers) : 10;

    if (!name || !subject) {
      return NextResponse.json({ error: "Name and subject are required" }, { status: 400 });
    }

    const safeMaxMembers = Math.min(20, Math.max(2, maxMembers));

    const room = await db.studyRoom.create({
      data: {
        name,
        subject,
        description: description || null,
        isPublic,
        maxMembers: safeMaxMembers,
        hostId: session.user.id,
        pomodoroState: {
          phase: "work",
          timeLeft: 25 * 60,
          isRunning: false,
          startedAt: null,
          workSessionsCompleted: 0,
        },
      },
      include: {
        host: { select: { id: true, name: true } },
      },
    });

    await db.roomMember.create({
      data: {
        roomId: room.id,
        userId: session.user.id,
        status: "studying",
      },
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Rooms POST error:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
