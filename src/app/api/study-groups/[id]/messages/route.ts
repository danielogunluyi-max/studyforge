import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

async function ensureMembership(groupId: string, userId: string) {
  const membership = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return Boolean(membership);
}

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
    const allowed = await ensureMembership(id, session.user.id);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await db.groupMessage.findMany({
      where: { groupId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: "asc" },
      take: 200,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Study group messages get error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
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
    const allowed = await ensureMembership(id, session.user.id);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { message?: string };
    const message = (body.message ?? "").trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const saved = await db.groupMessage.create({
      data: {
        groupId: id,
        userId: session.user.id,
        message,
        isAI: false,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ message: saved });
  } catch (error) {
    console.error("Study group messages post error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
