import { NextResponse } from "next/server";
import { db } from "~/server/db";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";

function normalizeStyle(value: string | null | undefined): Style {
  if (value === "visual" || value === "auditory" || value === "reading" || value === "kinesthetic") {
    return value;
  }
  return "reading";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;

    const [user, latestResult] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, learningStyle: true } }),
      db.learningStyleResult.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const style = normalizeStyle(latestResult?.dominantStyle ?? user.learningStyle);

    const breakdown = latestResult
      ? {
          visual: latestResult.visualPercent,
          auditory: latestResult.auditoryPercent,
          reading: latestResult.readingPercent,
          kinesthetic: latestResult.kinestheticPercent,
        }
      : {
          visual: style === "visual" ? 55 : 15,
          auditory: style === "auditory" ? 55 : 15,
          reading: style === "reading" ? 55 : 15,
          kinesthetic: style === "kinesthetic" ? 55 : 15,
        };

    return NextResponse.json({
      user: { id: user.id, name: user.name ?? "StudyForge Learner" },
      style,
      breakdown,
      topTrait: style,
      createdAt: latestResult?.createdAt ?? null,
    });
  } catch (error) {
    console.error("Shared learning style get error:", error);
    return NextResponse.json({ error: "Failed to load shared learning style" }, { status: 500 });
  }
}
