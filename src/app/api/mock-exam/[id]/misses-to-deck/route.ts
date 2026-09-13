import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type MissRow = {
  questionId: string;
  prompt: string;
  isCorrect: boolean;
  type?: string;
  correctOption?: string | null;
  modelAnswer?: string | null;
  feedback?: string | null;
  explanation?: string | null;
  yourOption?: string | null;
  yourText?: string | null;
};

type BreakdownShape = {
  perQuestion?: MissRow[];
};

function missesMarker(examId: string) {
  return `kyvex:misses:${examId}`;
}

function cardFromMiss(m: MissRow): { front: string; back: string } | null {
  const front = String(m.prompt ?? "").trim();
  if (!front) return null;

  const parts: string[] = [];
  if (m.type === "multiple_choice") {
    if (m.correctOption) parts.push(`Correct: ${m.correctOption}`);
    if (m.explanation) parts.push(String(m.explanation).trim());
    if (m.yourOption) parts.push(`You chose: ${m.yourOption}`);
  } else {
    if (m.modelAnswer) parts.push(`Model answer: ${m.modelAnswer}`);
    if (m.feedback) parts.push(`Feedback: ${m.feedback}`);
    if (m.yourText) parts.push(`Your answer: ${m.yourText}`);
  }

  const back = parts.filter(Boolean).join("\n\n").trim();
  if (!back) return null;
  return { front: front.slice(0, 2000), back: back.slice(0, 4000) };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: examId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { attemptId?: string };

    const exam = await db.mockExam.findFirst({
      where: { id: examId, userId: session.user.id },
      select: {
        id: true,
        title: true,
        subject: true,
        curriculumCode: true,
        noteId: true,
      },
    });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const attempt = body.attemptId
      ? await db.mockExamAttempt.findFirst({
          where: { id: body.attemptId, examId, userId: session.user.id },
        })
      : await db.mockExamAttempt.findFirst({
          where: { examId, userId: session.user.id },
          orderBy: { createdAt: "desc" },
        });

    if (!attempt) {
      return NextResponse.json({ error: "No attempt found to convert" }, { status: 404 });
    }

    const breakdown = (attempt.breakdown ?? {}) as BreakdownShape;
    const misses = (breakdown.perQuestion ?? []).filter((q) => q && q.isCorrect === false);
    if (misses.length === 0) {
      return NextResponse.json({ error: "No misses on this attempt — nothing to convert." }, { status: 400 });
    }

    const cards = misses
      .map(cardFromMiss)
      .filter((c): c is { front: string; back: string } => Boolean(c));

    if (cards.length === 0) {
      return NextResponse.json({ error: "Could not build cards from misses." }, { status: 400 });
    }

    const marker = missesMarker(examId);
    const existing = await db.flashcardDeck.findFirst({
      where: {
        userId: session.user.id,
        description: { contains: marker },
      },
      include: { cards: { select: { front: true } } },
    });

    const courseSuffix = exam.curriculumCode ? ` · ${exam.curriculumCode}` : "";
    const title = `Misses · ${exam.title}`.slice(0, 120);
    const subject = exam.curriculumCode || exam.subject || "General";

    if (existing) {
      const existingFronts = new Set(existing.cards.map((c) => c.front.trim().toLowerCase()));
      const toAdd = cards.filter((c) => !existingFronts.has(c.front.trim().toLowerCase()));
      if (toAdd.length > 0) {
        await db.flashcard.createMany({
          data: toAdd.map((c) => ({
            deckId: existing.id,
            front: c.front,
            back: c.back,
          })),
        });
      }
      await db.flashcardDeck.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
      const total = existing.cards.length + toAdd.length;
      return NextResponse.json({
        deckId: existing.id,
        merged: true,
        created: false,
        added: toAdd.length,
        cardCount: total,
        skippedDuplicates: cards.length - toAdd.length,
        title: existing.title,
        subject,
      });
    }

    const deck = await db.flashcardDeck.create({
      data: {
        userId: session.user.id,
        title,
        subject,
        description: `${marker}${courseSuffix}`,
        cards: {
          create: cards.map((c) => ({ front: c.front, back: c.back })),
        },
      },
    });

    return NextResponse.json({
      deckId: deck.id,
      merged: false,
      created: true,
      added: cards.length,
      cardCount: cards.length,
      skippedDuplicates: 0,
      title,
      subject,
    });
  } catch (error) {
    console.error("[mock-exam/misses-to-deck]", error);
    return NextResponse.json({ error: "Failed to create misses deck" }, { status: 500 });
  }
}
