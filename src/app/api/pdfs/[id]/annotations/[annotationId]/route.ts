import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

type UpdateAnnotationBody = {
  color?: string;
  text?: string | null;
  note?: string | null;
  rects?: unknown;
  type?: string;
  page?: number;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; annotationId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, annotationId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as UpdateAnnotationBody;

    const existing = await db.annotation.findFirst({
      where: {
        id: annotationId,
        docId: id,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
    }

    const updateData: {
      color?: string;
      text?: string | null;
      note?: string | null;
      rects?: unknown;
      type?: string;
      page?: number;
    } = {};

    if (typeof body.color === "string" && body.color.trim()) {
      updateData.color = body.color.trim();
    }

    if (typeof body.text === "string") {
      updateData.text = body.text.trim() || null;
    }

    if (body.text === null) {
      updateData.text = null;
    }

    if (typeof body.note === "string") {
      updateData.note = body.note.trim() || null;
    }

    if (body.note === null) {
      updateData.note = null;
    }

    if (Array.isArray(body.rects) && body.rects.length > 0) {
      updateData.rects = body.rects;
    }

    if (typeof body.type === "string" && ["highlight", "note", "underline"].includes(body.type)) {
      updateData.type = body.type;
    }

    if (typeof body.page === "number" && Number.isInteger(body.page) && body.page > 0) {
      updateData.page = body.page;
    }

    const annotation = await db.annotation.update({
      where: { id: annotationId },
      data: updateData as never,
    });

    return NextResponse.json({ annotation });
  } catch (error) {
    console.error("Annotation PATCH error:", error);
    return NextResponse.json({ error: "Failed to update annotation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; annotationId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, annotationId } = await context.params;

    const existing = await db.annotation.findFirst({
      where: {
        id: annotationId,
        docId: id,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
    }

    await db.annotation.delete({ where: { id: annotationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Annotation DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete annotation" }, { status: 500 });
  }
}
