import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { runGroqPrompt } from "~/server/groq";

type NotePayload = {
  title: string;
  content: string;
  format: string;
  tags?: string[];
  folderId?: string | null;
};

type NotePatchPayload = {
  id?: string;
  isPinned?: boolean;
  markViewed?: boolean;
  isShared?: boolean;
  folderId?: string | null;
  duplicate?: boolean;
};

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  const cleaned = tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .slice(0, 20)
    .map((tag) => tag.slice(0, 32));

  return Array.from(new Set(cleaned));
}

function parseTagArray(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return sanitizeTags(parsed);
  } catch {
    // continue
  }

  const codeBlock = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? trimmed.match(/```\s*([\s\S]*?)```/i)?.[1];
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock) as unknown;
      return sanitizeTags(parsed);
    } catch {
      // continue
    }
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]) as unknown;
      return sanitizeTags(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

async function autoGenerateTags(content: string): Promise<string[]> {
  const sample = content.trim().slice(0, 3500);
  if (!sample) return [];

  const prompt = `Given this study note content, return ONLY a JSON array of 3-5 short tags like subject, topic, format. Example: ["Biology", "Photosynthesis", "Flashcards"]. Content: ${sample}`;

  try {
    const raw = await runGroqPrompt({
      user: prompt,
      temperature: 0.2,
      maxTokens: 160,
    });

    return parseTagArray(raw).slice(0, 5);
  } catch {
    return [];
  }
}

async function updateStudyStreak(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lastActive: true, studyStreak: true },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let nextStreak = 1;
  if (user?.lastActive) {
    const last = new Date(user.lastActive);
    const lastStart = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const dayDiff = Math.floor((todayStart.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff <= 0) {
      nextStreak = user.studyStreak || 1;
    } else if (dayDiff === 1) {
      nextStreak = (user.studyStreak || 0) + 1;
    } else {
      nextStreak = 1;
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      lastActive: now,
      studyStreak: nextStreak,
    },
  });
}

function getDateFilter(period: string | null) {
  if (!period) return undefined;

  const now = new Date();
  if (period === "7d") {
    const date = new Date(now);
    date.setDate(now.getDate() - 7);
    return { gte: date };
  }

  if (period === "month") {
    const date = new Date(now.getFullYear(), now.getMonth(), 1);
    return { gte: date };
  }

  return undefined;
}

function calculateRelevance(input: { title: string; content: string; tags: string[] }, q: string): number {
  if (!q) return 0;

  const query = q.toLowerCase();
  const title = input.title.toLowerCase();
  const content = input.content.toLowerCase();
  const tags = input.tags.map((tag) => tag.toLowerCase());

  let score = 0;

  if (title.includes(query)) score += 8;
  if (content.includes(query)) score += 3;
  if (tags.some((tag) => tag === query)) score += 10;
  if (tags.some((tag) => tag.includes(query))) score += 5;

  const titleOccurrences = title.split(query).length - 1;
  const contentOccurrences = content.split(query).length - 1;

  score += Math.min(titleOccurrences, 3) * 3;
  score += Math.min(contentOccurrences, 5);

  return score;
}

// GET notes for current user with optional search and filters
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const tag = (searchParams.get("tag") ?? "").trim();
    const format = (searchParams.get("format") ?? "").trim();
    const period = (searchParams.get("period") ?? "").trim();
    const folderId = (searchParams.get("folderId") ?? "").trim();
    const sort = (searchParams.get("sort") ?? "newest").trim().toLowerCase();
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    // Validate pagination params
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: NonNullable<Parameters<typeof db.note.findMany>[0]>["where"] = {
      userId: session.user.id,
      ...(format ? { format } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(folderId ? { folderId } : {}),
      ...(period ? { createdAt: getDateFilter(period) } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { content: { contains: q, mode: "insensitive" as const } },
              { tags: { has: q } },
            ],
          }
        : {}),
    };

    // Get total count and paginated notes in parallel
    const [total, notes, recentlyViewed] = await Promise.all([
      db.note.count({ where: whereClause }),
      db.note.findMany({
        where: whereClause,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          format: true,
          createdAt: true,
          content: true,
          tags: true,
          isPinned: true,
          lastViewedAt: true,
          isShared: true,
          folderId: true,
        },
      }),
      db.note.findMany({
        where: {
          userId: session.user.id,
          lastViewedAt: { not: null },
        },
        orderBy: { lastViewedAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          format: true,
          createdAt: true,
          content: true,
          tags: true,
          isPinned: true,
          lastViewedAt: true,
          isShared: true,
          folderId: true,
        },
      }),
    ]);

    const withScore = notes.map((note) => ({
      ...note,
      relevanceScore: calculateRelevance(note, q),
    }));

    const sortBy = (a: (typeof withScore)[number], b: (typeof withScore)[number]) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      if (q && b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sort === "a-z") {
        return a.title.localeCompare(b.title);
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    const sorted = withScore.sort(sortBy);

    return NextResponse.json({
      notes: sorted,
      recentlyViewed,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + notes.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST (create new note)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, format, tags, folderId } = (await request.json()) as NotePayload;

    if (!title || !content || !format) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let nextTags = sanitizeTags(tags);
    if (!nextTags.length) {
      nextTags = await autoGenerateTags(content);
    }

    const note = await db.note.create({
      data: {
        title,
        content,
        format,
        tags: nextTags,
        folderId: folderId ?? undefined,
        userId: session.user.id,
      },
    });

    await updateStudyStreak(session.user.id);

    return NextResponse.json({ note });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating note:", errorMessage);
    return NextResponse.json(
      { error: "Failed to save note", details: errorMessage },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, isPinned, markViewed, isShared, folderId, duplicate } = (await request.json()) as NotePatchPayload;

    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const note = await db.note.findUnique({ where: { id } });
    if (!note || note.userId !== session.user.id) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    if (duplicate) {
      const copied = await db.note.create({
        data: {
          title: `Copy of ${note.title}`,
          content: note.content,
          format: note.format,
          tags: note.tags,
          userId: session.user.id,
          folderId: note.folderId,
        },
        select: {
          id: true,
          title: true,
          format: true,
          createdAt: true,
          content: true,
          tags: true,
          isPinned: true,
          lastViewedAt: true,
          isShared: true,
          folderId: true,
        },
      });

      await updateStudyStreak(session.user.id);
      return NextResponse.json({ note: copied });
    }

    const data: { isPinned?: boolean; lastViewedAt?: Date; isShared?: boolean; folderId?: string | null } = {};
    if (typeof isPinned === "boolean") {
      data.isPinned = isPinned;
    }
    if (markViewed) {
      data.lastViewedAt = new Date();
    }
    if (typeof isShared === "boolean") {
      data.isShared = isShared;
    }
    if (typeof folderId !== "undefined") {
      data.folderId = folderId;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
    }

    const updated = await db.note.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        format: true,
        createdAt: true,
        content: true,
        tags: true,
        isPinned: true,
        lastViewedAt: true,
        isShared: true,
        folderId: true,
      },
    });

    return NextResponse.json({ note: updated });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating note:", errorMessage);
    return NextResponse.json({ error: "Failed to update note", details: errorMessage }, { status: 500 });
  }
}

// DELETE a note
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const note = await db.note.findUnique({ where: { id } });

    if (!note || note.userId !== session.user.id) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    await db.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting note:", errorMessage);
    return NextResponse.json(
      { error: "Failed to delete note", details: errorMessage },
      { status: 500 },
    );
  }
}
