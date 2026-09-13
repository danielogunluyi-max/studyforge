import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    content?: string;
    contentType?: string;
    subject?: string;
    feedback?: string;
    reviewId?: string;
    rating?: number;
  };

  const content = body.content?.trim() ?? '';
  const contentType = body.contentType?.trim() ?? 'notes';
  const subject = body.subject?.trim() ?? 'General';

  if (!body.reviewId) {
    const limited = assertGroqRateLimit(session.user.id);
    if (limited) return limited;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    let completion;
    try {
      completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: `Give constructive peer review feedback on this student's ${contentType}.
Subject: ${subject}
Content: ${content.slice(0, 3000)}
Be specific, encouraging, and actionable. 3-4 sentences.`,
        },
      ],
      max_tokens: 200,
    });
    } catch (error) {
      if (isRateLimited(error)) {
        return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
      }
      throw error;
    }

    const aiFeedback = completion.choices[0]?.message?.content || '';

    const review = await prisma.peerReview.create({
      data: {
        authorId: session.user.id,
        content,
        contentType,
        subject,
        aiFeedback,
      },
    });

    return NextResponse.json({ review, aiFeedback });
  }

  const existing = await prisma.peerReview.findUnique({
    where: { id: body.reviewId },
    select: { id: true, authorId: true },
  });
  // IDOR guard: only the author may update; 404 (not 403) to avoid leaking IDs.
  if (!existing || existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const review = await prisma.peerReview.update({
    where: { id: body.reviewId },
    data: {
      reviewerId: session.user.id,
      feedback: body.feedback?.trim() || null,
      rating: body.rating ?? null,
      status: "reviewed",
    },
  });

  return NextResponse.json({ review });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  if (type === 'review') {
    const reviews = await prisma.peerReview.findMany({
      where: { status: 'pending', authorId: { not: session.user.id } },
      take: 5,
      select: { id: true, contentType: true, subject: true, createdAt: true, content: true },
    });

    return NextResponse.json({ reviews });
  }

  const reviews = await prisma.peerReview.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ reviews });
}
