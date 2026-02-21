import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// GET all notes for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const notes = await db.note.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        format: true,
        createdAt: true,
        content: true,
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST (create new note)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { title, content, format } = await request.json() as { title: string; content: string; format: string };

    if (!title || !content || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const note = await db.note.create({
      data: {
        title,
        content,
        format,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating note:", errorMessage);
    console.error("Full error:", error);
    return NextResponse.json(
      { error: "Failed to save note", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE a note
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Note ID required" },
        { status: 400 }
      );
    }

    // Verify the note belongs to the current user
    const note = await db.note.findUnique({
      where: { id },
    });

    if (!note || note.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Note not found or unauthorized" },
        { status: 404 }
      );
    }

    await db.note.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting note:", errorMessage);
    return NextResponse.json(
      { error: "Failed to delete note", details: errorMessage },
      { status: 500 }
    );
  }
}