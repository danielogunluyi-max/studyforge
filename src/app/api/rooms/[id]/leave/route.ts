import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

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
      select: { id: true, hostId: true },
    });

    if (!room) {
      return NextResponse.json({ success: true });
    }

    await db.roomMember.deleteMany({
      where: {
        roomId: id,
        userId: session.user.id,
      },
    });

    const remainingMembers = await db.roomMember.findMany({
      where: { roomId: id },
      orderBy: { joinedAt: "asc" },
      take: 1,
    });

    if (remainingMembers.length === 0) {
      await db.studyRoom.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (room.hostId === session.user.id) {
      await db.studyRoom.update({
        where: { id },
        data: {
          hostId: remainingMembers[0]!.userId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Room leave error:", error);
    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
  }
}
