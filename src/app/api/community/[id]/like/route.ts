import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const existing = await db.communityLike.findUnique({
    where: { userId_postId: { userId: session.user.id, postId: id } },
  });

  if (existing) {
    await db.communityLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await db.communityLike.create({ data: { userId: session.user.id, postId: id } });
  return NextResponse.json({ liked: true });
}
