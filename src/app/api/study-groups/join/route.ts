import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { inviteCode?: string };
    const inviteCode = (body.inviteCode ?? "").trim().toUpperCase();

    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const group = await db.studyGroup.findUnique({ where: { inviteCode } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await db.studyGroupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: session.user.id,
        },
      },
      create: {
        groupId: group.id,
        userId: session.user.id,
      },
      update: {},
    });

    return NextResponse.json({ groupId: group.id });
  } catch (error) {
    console.error("Study group join error:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}
