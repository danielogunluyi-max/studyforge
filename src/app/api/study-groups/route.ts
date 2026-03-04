import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    const now = Date.now();
    const activeThreshold = new Date(now - 5 * 60 * 1000);

    const groups = await db.studyGroupMember.findMany({
      where: {
        userId: session.user.id,
        group: {
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { topic: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              take: 5,
            },
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

    const mapped = groups.map((entry) => {
      const activeNow = entry.group.members.some((member) => {
        if (!member.lastSeenAt) return false;
        return member.lastSeenAt >= activeThreshold;
      });

      const avatars = entry.group.members.map((member) => ({
        userId: member.userId,
        name: member.user?.name || "Member",
        image: member.user?.image || null,
        role: member.role,
      }));

      return {
        ...entry.group,
        myRole: entry.role,
        avatars,
        activeNow,
      };
    });

    const publicGroups = await db.studyGroup.findMany({
      where: {
        isPublic: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { topic: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { lastActiveAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ groups: mapped, publicGroups });
  } catch (error) {
    console.error("Study groups list error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
