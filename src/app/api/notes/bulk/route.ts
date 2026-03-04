import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type BulkPayload = {
  ids?: string[];
  action?: "delete" | "move";
  folderId?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as BulkPayload;
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

    if (!ids.length) {
      return NextResponse.json({ error: "No notes selected" }, { status: 400 });
    }

    if (body.action === "delete") {
      const result = await db.note.deleteMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    if (body.action === "move") {
      await db.note.updateMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
        data: {
          folderId: body.folderId ?? null,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid bulk action" }, { status: 400 });
  } catch (error) {
    console.error("Bulk notes action error:", error);
    return NextResponse.json({ error: "Bulk action failed" }, { status: 500 });
  }
}
