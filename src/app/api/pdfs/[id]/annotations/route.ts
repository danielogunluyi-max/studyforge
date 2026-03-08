import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

type CreateAnnotationBody = {
  page?: number;
  type?: string;
  color?: string;
  text?: string;
  note?: string;
  rects?: unknown;
};

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

    const doc = await db.pDFDocument.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const annotations = await db.annotation.findMany({
      where: { docId: id, userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error("Annotations GET error:", error);
    return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as CreateAnnotationBody;

    const doc = await db.pDFDocument.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const page = Number(body.page);
    const type = String(body.type ?? "").trim();
    const color = String(body.color ?? "").trim();
    const text = typeof body.text === "string" ? body.text.trim() : null;
    const note = typeof body.note === "string" ? body.note.trim() : null;

    if (!Number.isInteger(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    if (!["highlight", "note", "underline"].includes(type)) {
      return NextResponse.json({ error: "Invalid annotation type" }, { status: 400 });
    }

    if (!color) {
      return NextResponse.json({ error: "Color is required" }, { status: 400 });
    }

    if (!Array.isArray(body.rects) || body.rects.length === 0) {
      return NextResponse.json({ error: "rects must be a non-empty array" }, { status: 400 });
    }

    const annotation = await db.annotation.create({
      data: {
        docId: id,
        userId: session.user.id,
        page,
        type,
        color,
        text,
        note,
        rects: body.rects,
      },
    });

    return NextResponse.json({ annotation });
  } catch (error) {
    console.error("Annotations POST error:", error);
    return NextResponse.json({ error: "Failed to create annotation" }, { status: 500 });
  }
}
