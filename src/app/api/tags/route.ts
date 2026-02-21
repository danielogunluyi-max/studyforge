import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type TagActionInput =
  | { action: "rename"; oldTag: string; newTag: string }
  | { action: "delete"; tag: string }
  | { action: "merge"; sourceTag: string; targetTag: string };

function normalizeTag(tag: string): string {
  return tag.trim().slice(0, 32);
}

function dedupeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean)));
}

async function updateTagsForUser(
  userId: string,
  mapper: (tags: string[]) => string[],
): Promise<void> {
  const notes = await db.note.findMany({
    where: { userId },
    select: { id: true, tags: true },
  });

  const updates: Array<ReturnType<typeof db.note.update>> = [];

  for (const note of notes) {
      const nextTags = dedupeTags(mapper(note.tags));
      const current = note.tags.join("|");
      const next = nextTags.join("|");
      if (current === next) continue;

      updates.push(
        db.note.update({
        where: { id: note.id },
        data: { tags: nextTags },
        }),
      );
  }

  if (updates.length) {
    await db.$transaction(updates);
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await db.note.findMany({
      where: { userId: session.user.id },
      select: { tags: true },
    });

    const countMap = new Map<string, number>();

    for (const note of notes) {
      for (const tag of note.tags) {
        const normalized = normalizeTag(tag);
        if (!normalized) continue;
        countMap.set(normalized, (countMap.get(normalized) ?? 0) + 1);
      }
    }

    const tags = Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as TagActionInput;

    if (body.action === "rename") {
      const oldTag = normalizeTag(body.oldTag);
      const newTag = normalizeTag(body.newTag);
      if (!oldTag || !newTag) {
        return NextResponse.json({ error: "Both old and new tag are required" }, { status: 400 });
      }

      await updateTagsForUser(session.user.id, (tags) =>
        tags.map((tag) => (normalizeTag(tag) === oldTag ? newTag : tag)),
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      const tagToDelete = normalizeTag(body.tag);
      if (!tagToDelete) {
        return NextResponse.json({ error: "Tag is required" }, { status: 400 });
      }

      await updateTagsForUser(session.user.id, (tags) =>
        tags.filter((tag) => normalizeTag(tag) !== tagToDelete),
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "merge") {
      const source = normalizeTag(body.sourceTag);
      const target = normalizeTag(body.targetTag);
      if (!source || !target) {
        return NextResponse.json({ error: "Source and target tags are required" }, { status: 400 });
      }

      await updateTagsForUser(session.user.id, (tags) =>
        tags.map((tag) => (normalizeTag(tag) === source ? target : tag)),
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating tags:", error);
    return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
  }
}
