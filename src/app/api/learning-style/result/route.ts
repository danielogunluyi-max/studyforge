import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";

type Scores = {
  visual: number;
  auditory: number;
  reading: number;
  kinesthetic: number;
};

const STYLES: Style[] = ["visual", "auditory", "reading", "kinesthetic"];

function validStyle(value: string): value is Style {
  return STYLES.includes(value as Style);
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getTopStyle(scores: Scores): Style {
  const entries = Object.entries(scores) as Array<[Style, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "reading";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [history, distribution, user] = await Promise.all([
      db.learningStyleResult.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.user.groupBy({
        by: ["learningStyle"],
        _count: { _all: true },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true },
      }),
    ]);

    const latest = history[0] ?? null;
    const previous = history[1] ?? null;
    const dominantChanged = Boolean(previous && latest && previous.dominantStyle !== latest.dominantStyle);

    const counts: Record<Style, number> = {
      visual: 0,
      auditory: 0,
      reading: 0,
      kinesthetic: 0,
    };

    for (const item of distribution) {
      const style = item.learningStyle ?? "reading";
      if (validStyle(style)) {
        counts[style] += item._count._all;
      }
    }

    const totalUsers = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const comparison = {
      totalUsers,
      counts,
      percentages: {
        visual: totalUsers ? Math.round((counts.visual / totalUsers) * 100) : 0,
        auditory: totalUsers ? Math.round((counts.auditory / totalUsers) * 100) : 0,
        reading: totalUsers ? Math.round((counts.reading / totalUsers) * 100) : 0,
        kinesthetic: totalUsers ? Math.round((counts.kinesthetic / totalUsers) * 100) : 0,
      },
    };

    return NextResponse.json({
      user: { id: user?.id ?? session.user.id, name: user?.name ?? "StudyForge Learner" },
      history,
      latest,
      dominantChanged,
      comparison,
    });
  } catch (error) {
    console.error("Learning style result get error:", error);
    return NextResponse.json({ error: "Failed to load learning style results" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      dominantStyle?: string;
      scores?: Partial<Scores>;
      autoAdapt?: boolean;
    };

    const dominantStyle = (body.dominantStyle ?? "").trim().toLowerCase();
    if (!validStyle(dominantStyle)) {
      return NextResponse.json({ error: "Invalid dominant style" }, { status: 400 });
    }

    const scores: Scores = {
      visual: normalizePercent(body.scores?.visual ?? 0),
      auditory: normalizePercent(body.scores?.auditory ?? 0),
      reading: normalizePercent(body.scores?.reading ?? 0),
      kinesthetic: normalizePercent(body.scores?.kinesthetic ?? 0),
    };

    const resolvedDominant = getTopStyle(scores);

    const [saved] = await Promise.all([
      db.learningStyleResult.create({
        data: {
          userId: session.user.id,
          dominantStyle: resolvedDominant,
          visualPercent: scores.visual,
          auditoryPercent: scores.auditory,
          readingPercent: scores.reading,
          kinestheticPercent: scores.kinesthetic,
        },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: {
          learningStyle: resolvedDominant,
          autoAdapt: typeof body.autoAdapt === "boolean" ? body.autoAdapt : true,
          lastActive: new Date(),
        },
        select: { id: true },
      }),
    ]);

    return NextResponse.json({ saved });
  } catch (error) {
    console.error("Learning style result post error:", error);
    return NextResponse.json({ error: "Failed to save learning style result" }, { status: 500 });
  }
}
