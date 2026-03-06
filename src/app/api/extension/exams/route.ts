import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

function safeDaysUntil(examDate: Date): number {
  const diff = examDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function urgencyFromDays(days: number) {
  if (days >= 30) return "green";
  if (days >= 14) return "yellow";
  if (days >= 7) return "orange";
  return "red";
}

async function resolveUserId(request: NextRequest) {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  return typeof token?.sub === "string" ? token.sub : null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exams = await db.exam.findMany({
      where: {
        userId,
        examDate: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) },
      },
      orderBy: [{ examDate: "asc" }, { createdAt: "desc" }],
      take: 50,
    });

    const payload = exams.map((exam) => {
      const daysLeft = safeDaysUntil(exam.examDate);
      return {
        id: exam.id,
        subject: exam.subject,
        examDate: exam.examDate.toISOString(),
        board: exam.board,
        difficulty: exam.difficulty,
        topics: exam.topics,
        daysLeft,
        urgency: urgencyFromDays(daysLeft),
      };
    });

    return NextResponse.json({ exams: payload });
  } catch (error) {
    console.error("Extension exams GET error:", error);
    return NextResponse.json({ error: "Failed to fetch extension exams" }, { status: 500 });
  }
}
