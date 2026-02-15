import { NextResponse } from "next/server";
import { db } from "~/server/db";

// GET all notes
export async function GET() {
  try {
    const notes = await db.note.findMany({
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
    const { title, content, format } = await request.json();

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
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}

// DELETE a note
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Note ID required" },
        { status: 400 }
      );
    }

    await db.note.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}