import { NextResponse } from "next/server";
import { getAuthSession } from "~/server/auth/session";
import { db } from "~/server/db";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const { content } = (await req.json()) as { content?: string };

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const comment = await db.communityComment.create({
    data: { userId: session.user.id, postId: id, content: content.trim() },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment });
}
