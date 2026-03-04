import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { bumpNotesStats, canManageGroup, ensureGroupMember } from "~/server/study-groups";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sharedNotes = await db.groupSharedNote.findMany({
      where: { groupId: id },
      include: {
        note: { select: { id: true, title: true, content: true, format: true, createdAt: true } },
        sharedBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const myNotes = await db.note.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, format: true, createdAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ sharedNotes, myNotes, canManage: canManageGroup(membership.role) });
  } catch (error) {
    console.error("Group shared notes get error:", error);
    return NextResponse.json({ error: "Failed to fetch shared notes" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const membership = await ensureGroupMember(id, session.user.id);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { action?: "share" | "comment"; noteId?: string; sharedNoteId?: string; comment?: string };

    if (body.action === "comment") {
      const sharedNoteId = (body.sharedNoteId ?? "").trim();
      const comment = (body.comment ?? "").trim();
      if (!sharedNoteId || !comment) return NextResponse.json({ error: "sharedNoteId and comment required" }, { status: 400 });

      const shared = await db.groupSharedNote.findUnique({ where: { id: sharedNoteId }, select: { id: true, groupId: true } });
      if (!shared || shared.groupId !== id) return NextResponse.json({ error: "Shared note not found" }, { status: 404 });

      const created = await db.groupSharedNoteComment.create({
        data: { sharedNoteId, userId: session.user.id, comment },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return NextResponse.json({ comment: created });
    }

    const noteId = (body.noteId ?? "").trim();
    if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });

    const note = await db.note.findUnique({ where: { id: noteId }, select: { id: true, userId: true } });
    if (!note || note.userId !== session.user.id) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const shared = await db.groupSharedNote.upsert({
      where: { groupId_noteId: { groupId: id, noteId } },
      update: { sharedById: session.user.id },
      create: { groupId: id, noteId, sharedById: session.user.id },
      include: {
        note: { select: { id: true, title: true, content: true, format: true, createdAt: true } },
        sharedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await bumpNotesStats(id, session.user.id);

    return NextResponse.json({ sharedNote: shared });
  } catch (error) {
    console.error("Group shared notes post error:", error);
    return NextResponse.json({ error: "Failed to update shared notes" }, { status: 500 });
  }
}
