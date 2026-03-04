import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type FolderPayload = {
  name?: string;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [folders, notes] = await Promise.all([
      db.folder.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, createdAt: true },
      }),
      db.note.findMany({
        where: { userId: session.user.id },
        select: { folderId: true },
      }),
    ]);

    const counts = notes.reduce<Record<string, number>>((acc, note) => {
      if (!note.folderId) return acc;
      acc[note.folderId] = (acc[note.folderId] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      folders: folders.map((folder) => ({
        ...folder,
        noteCount: counts[folder.id] ?? 0,
      })),
    });
  } catch (error) {
    console.error("Error loading folders:", error);
    return NextResponse.json({ error: "Failed to load folders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as FolderPayload;
    const name = (body.name ?? "").trim().slice(0, 48);

    if (!name) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const folder = await db.folder.create({
      data: {
        name,
        userId: session.user.id,
      },
      select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json({ folder: { ...folder, noteCount: 0 } });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
