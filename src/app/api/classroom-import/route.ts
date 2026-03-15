import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '~/server/auth';
import { extractJsonBlock, runGroqPrompt } from '~/server/groq';

type ImportedFlashcard = {
  question?: string;
  answer?: string;
};

type StudyPlanItem = {
  day?: number;
  task?: string;
  duration?: string;
};

type ImportPayload = {
  notes?: string;
  flashcards?: ImportedFlashcard[];
  studyPlan?: StudyPlanItem[];
  keyDeadlines?: string[];
  difficulty?: 'low' | 'medium' | 'high' | string;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    assignmentText?: string;
    courseName?: string;
    type?: string;
  };

  const assignmentText = body.assignmentText?.trim() ?? '';
  const courseName = body.courseName?.trim() ?? '';
  const type = body.type?.trim() || 'assignment';

  if (!assignmentText) {
    return NextResponse.json({ error: 'Assignment text is required' }, { status: 400 });
  }

  if (!courseName) {
    return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
  }

  try {
    const raw = await runGroqPrompt({
      temperature: 0.4,
      maxTokens: 1500,
      user: `You are a study assistant. A student has pasted their assignment/course material from Google Classroom or Canvas.

Course: ${courseName}
Type: ${type}
Content: ${assignmentText.slice(0, 5000)}

Generate:
1. A clean set of study notes
2. 5 key flashcard pairs
3. A suggested study plan for this assignment

Respond ONLY in JSON:
{
  "notes": "formatted study notes",
  "flashcards": [{"question":"...","answer":"..."}],
  "studyPlan": [
    {"day": 1, "task": "...", "duration": "30 mins"}
  ],
  "keyDeadlines": ["extracted deadlines if any"],
  "difficulty": "low|medium|high"
}`,
    });

    const parsed = extractJsonBlock<ImportPayload>(raw);
    if (!parsed) {
      return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }

    const flashcards = (parsed.flashcards ?? [])
      .map((card) => ({
        question: card.question?.trim() ?? '',
        answer: card.answer?.trim() ?? '',
      }))
      .filter((card) => card.question && card.answer)
      .slice(0, 20);

    const studyPlan = (parsed.studyPlan ?? [])
      .map((item, index) => ({
        day: typeof item.day === 'number' ? item.day : index + 1,
        task: item.task?.trim() ?? 'Review imported material',
        duration: item.duration?.trim() ?? '30 mins',
      }))
      .slice(0, 7);

    const keyDeadlines = (parsed.keyDeadlines ?? [])
      .map((deadline) => deadline.trim())
      .filter(Boolean)
      .slice(0, 10);

    const difficulty = ['low', 'medium', 'high'].includes((parsed.difficulty ?? '').toLowerCase())
      ? (parsed.difficulty as string).toLowerCase()
      : 'medium';

    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        title: `${courseName} - Imported Assignment`,
        content: parsed.notes?.trim() || assignmentText,
        format: 'summary',
        tags: ['Classroom Import', courseName, type],
      },
    });

    const deck = await prisma.flashcardDeck.create({
      data: {
        userId: session.user.id,
        title: `${courseName} Flashcards`,
        subject: courseName,
        description: `Imported from ${type}`,
        cards: {
          create: flashcards.map((card) => ({
            front: card.question,
            back: card.answer,
          })),
        },
      },
      include: {
        cards: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      notes: parsed.notes?.trim() || assignmentText,
      flashcards,
      studyPlan,
      keyDeadlines,
      difficulty,
      noteId: note.id,
      deckId: deck.id,
      cardCount: deck.cards.length,
    });
  } catch (error) {
    console.error('Classroom import failed:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
