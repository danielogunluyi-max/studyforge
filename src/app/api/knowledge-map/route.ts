import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connections = await prisma.contentConnection.findMany({
      where: { userId: uid },
      select: {
        sourceId: true,
        targetId: true,
        strength: true,
        sourceType: true,
        targetType: true,
        reason: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ connections });
  } catch {
    return NextResponse.json({ error: "Failed to load knowledge-map connections" }, { status: 500 });
  }
}
