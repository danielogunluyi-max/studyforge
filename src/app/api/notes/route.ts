import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type NotePayload = {
  title: string;
  content: string;
  format: string;
  tags?: string[];
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
    const [total, notes] = await Promise.all([
      db.note.count({ where: whereClause }),
      db.note.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          format: true,
          createdAt: true,
          content: true,
          tags: true,
        },
      }),
    ]);

    const withScore = notes.map((note) => ({
      ...note,
      relevanceScore: calculateRelevance(note, q),
    }));

    const sorted = q
      ? withScore.sort((a, b) => {
          if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
      : withScore;

    return NextResponse.json({
      notes: sorted,
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

    const { title, content, format, tags } = (await request.json()) as NotePayload;

    if (!title || !content || !format) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const note = await db.note.create({
      data: {
        title,
        content,
        format,
        tags: sanitizeTags(tags),
        userId: session.user.id,
      },
    });

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
