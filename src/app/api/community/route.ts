import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await db.communityPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true } },
      likes: { select: { userId: true } },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, topic } = (await req.json()) as { content?: string; topic?: string | null };
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const post = await db.communityPost.create({
    data: { userId: session.user.id, content: content.trim(), topic: topic ?? null },
    include: {
      user: { select: { id: true, name: true } },
      likes: true,
      comments: true,
    },
  });

  return NextResponse.json({ post });
}
