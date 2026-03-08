import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type HeartbeatBody = {
  status?: "studying" | "on_break" | "away";
};

function isValidStatus(value: unknown): value is "studying" | "on_break" | "away" {
  return value === "studying" || value === "on_break" || value === "away";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as HeartbeatBody;
    const status = isValidStatus(body.status) ? body.status : "studying";

    await db.roomMember.updateMany({
      where: {
        roomId: id,
        userId: session.user.id,
      },
      data: {
        lastSeen: new Date(),
        status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Room heartbeat error:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
