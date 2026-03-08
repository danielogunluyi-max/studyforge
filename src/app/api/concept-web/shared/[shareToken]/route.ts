import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shareToken: string }> },
) {
  try {
    const { shareToken } = await context.params;

    const web = await db.conceptWeb.findFirst({
      where: { shareToken, isShared: true },
      select: {
        id: true,
        title: true,
        topic: true,
        webData: true,
        updatedAt: true,
        user: { select: { name: true } },
      },
    });

    if (!web) {
      return NextResponse.json({ error: "Shared concept web not found" }, { status: 404 });
    }

    return NextResponse.json({
      web: {
        id: web.id,
        title: web.title,
        topic: web.topic,
        webData: web.webData,
        updatedAt: web.updatedAt,
        ownerName: web.user.name ?? "Kyvex User",
      },
    });
  } catch (error) {
    console.error("Shared concept web get error:", error);
    return NextResponse.json({ error: "Failed to load shared concept web" }, { status: 500 });
  }
}
