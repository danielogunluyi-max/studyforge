import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const podcasts = await db.podcast.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      topic: true,
      createdAt: true,
      script: true,
    },
  });

  return NextResponse.json({ podcasts });
}
