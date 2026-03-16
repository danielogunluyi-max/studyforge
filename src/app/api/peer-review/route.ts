import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

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
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

  const review = await prisma.peerReview.update({
    where: { id: body.reviewId },
    data: {
      reviewerId: session.user.id,
      feedback: body.feedback?.trim() || null,
      rating: body.rating ?? null,
      status: 'reviewed',
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
