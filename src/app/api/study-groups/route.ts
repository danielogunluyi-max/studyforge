import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await db.studyGroupMember.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json({
      groups: groups.map((entry) => entry.group),
    });
  } catch (error) {
    console.error("Study groups list error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
