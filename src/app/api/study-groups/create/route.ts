import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

function generateInviteCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)] ?? "A";
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { name?: string; topic?: string };
    const name = (body.name ?? "").trim();
    const topic = (body.topic ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    let inviteCode = generateInviteCode();
    for (let tries = 0; tries < 5; tries += 1) {
      const exists = await db.studyGroup.findUnique({ where: { inviteCode } });
      if (!exists) break;
      inviteCode = generateInviteCode();
    }

    const group = await db.studyGroup.create({
      data: {
        name,
        topic: topic || null,
        inviteCode,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        topic: true,
        inviteCode: true,
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Study group create error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
