import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const document = await db.pDFDocument.findFirst({
      where: { id, userId: session.user.id },
      include: {
        annotations: {
          where: { userId: session.user.id },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error("PDF GET by id error:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const document = await db.pDFDocument.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, blobUrl: true },
    });

    if (!document) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    await db.pDFDocument.delete({ where: { id: document.id } });

    if (document.blobUrl) {
      await del(document.blobUrl).catch(() => {
        // Ignore blob cleanup failure after DB delete.
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PDF DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete PDF" }, { status: 500 });
  }
}
