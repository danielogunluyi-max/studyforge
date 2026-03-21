import { NextResponse } from "next/server";
import { getAuthSession } from "~/server/auth/session";
import { db } from "~/server/db";

  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const captures = await db.quickCapture.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ captures });
}

  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, tags } = (await req.json()) as { content?: string; tags?: string[] };
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const capture = await db.quickCapture.create({
    data: {
      userId: session.user.id,
      content: content.trim(),
      tags: tags || [],
    },
  });

  return NextResponse.json({ capture });
}
