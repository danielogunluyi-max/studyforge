import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { db } from "~/server/db";
import { runGroqPrompt } from "~/server/groq";

const prisma = db as any;

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const body = (await req.json().catch(() => ({}))) as {
    content?: string;
    contentType?: string;
    subject?: string;
    feedback?: string;
    reviewId?: string;
    rating?: number;
  };

  const content = body.content?.trim() ?? "";
  const contentType = body.contentType?.trim() ?? "notes";
  const subject = body.subject?.trim() ?? "General";

  if (!body.reviewId) {
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const aiFeedback = await runGroqPrompt({
      user: `Give constructive peer review feedback on this student's ${contentType}.
Subject: ${subject}
Content: ${content.slice(0, 3000)}
Be specific, encouraging, and actionable. 3-4 sentences.`,
      maxTokens: 200,
    });

    const review = await prisma.peerReview.create({
      data: {
        authorId: userId,
        content,
        contentType,
        subject,
        aiFeedback,
      },
    });

    return NextResponse.json({ review, aiFeedback });
  }

  const review = await prisma.peerReview.update({
    where: { id: body.reviewId },
    data: {
      reviewerId: userId,
      feedback: body.feedback?.trim() || null,
      rating: body.rating ?? null,
      status: "reviewed",
    },
  });

  return NextResponse.json({ review });
}

export async function GET(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "review") {
    const reviews = await prisma.peerReview.findMany({
      where: { status: "pending", authorId: { not: userId } },
      take: 5,
      select: { id: true, contentType: true, subject: true, createdAt: true, content: true },
    });

    return NextResponse.json({ reviews });
  }

  const reviews = await prisma.peerReview.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ reviews });
}
