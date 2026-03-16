import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "~/server/auth";

type HubItem = {
  id: string;
  createdAt: Date;
  type: string;
  icon: string;
  href: string;
  title: string;
  subject?: string | null;
  excerpt?: string;
};

export async function GET(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const subject = searchParams.get("subject");
  const q = searchParams.get("q");

  const notesPromise = type && type !== "note"
    ? Promise.resolve([] as Array<{ id: string; title: string; content: string; tags: string[]; createdAt: Date }>)
    : prisma.note.findMany({
        where: {
          userId: uid,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { content: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(subject
            ? {
                OR: [
                  { tags: { has: subject } },
                  { title: { contains: subject, mode: "insensitive" } },
                  { content: { contains: subject, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: { id: true, title: true, content: true, tags: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

  const decksPromise = type && type !== "deck"
    ? Promise.resolve([] as Array<{ id: string; title: string; subject: string; createdAt: Date; _count: { cards: number } }>)
    : prisma.flashcardDeck.findMany({
        where: {
          userId: uid,
          ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        include: { _count: { select: { cards: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

  const examsPromise = type && type !== "exam"
    ? Promise.resolve([] as Array<{ id: string; subject: string; scorePercent: number | null; createdAt: Date }>)
    : prisma.exam.findMany({
        where: {
          userId: uid,
          ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
        },
        select: { id: true, subject: true, scorePercent: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

  const podcastsPromise = type && type !== "podcast"
    ? Promise.resolve([] as Array<{ id: string; title: string; topic: string; createdAt: Date }>)
    : prisma.podcast.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, topic: true, createdAt: true },
      });

  const diagramsPromise = type && type !== "diagram"
    ? Promise.resolve([] as Array<{ id: string; title: string; type: string; createdAt: Date }>)
    : prisma.diagram.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, type: true, createdAt: true },
      });

  const lecturesPromise = type && type !== "lecture"
    ? Promise.resolve([] as Array<{ id: string; title: string; subject: string; createdAt: Date }>)
    : prisma.lectureSession.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, subject: true, createdAt: true },
      });

  const mockExamsPromise = type && type !== "mock-exam"
    ? Promise.resolve([] as Array<{ id: string; title: string; subject: string; createdAt: Date }>)
    : prisma.mockExam.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, subject: true, createdAt: true },
      });

  const narrativesPromise = type && type !== "narrative"
    ? Promise.resolve([] as Array<{ id: string; topic: string; createdAt: Date }>)
    : prisma.narrativeMemory.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, topic: true, createdAt: true },
      });

  const [notes, decks, exams, podcasts, diagrams, lectures, mockExams, narratives] = await Promise.all([
    notesPromise,
    decksPromise,
    examsPromise,
    podcastsPromise,
    diagramsPromise,
    lecturesPromise,
    mockExamsPromise,
    narrativesPromise,
  ]);

  const allContent: HubItem[] = [
    ...notes.map((n) => ({
      id: n.id,
      createdAt: n.createdAt,
      type: "note",
      icon: "📝",
      href: "/my-notes",
      title: n.title,
      subject: n.tags[0] ?? null,
      excerpt: n.content.slice(0, 100),
    })),
    ...decks.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      type: "deck",
      icon: "🃏",
      href: `/flashcards/${d.id}`,
      title: d.title,
      subject: d.subject,
      excerpt: `${d._count.cards} cards`,
    })),
    ...exams.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      type: "exam",
      icon: "📋",
      href: "/results",
      title: `${e.subject} exam`,
      subject: e.subject,
      excerpt: `${e.scorePercent ?? 0}%`,
    })),
    ...podcasts.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      type: "podcast",
      icon: "🎙",
      href: "/listen",
      title: p.title,
      subject: p.topic,
      excerpt: p.topic,
    })),
    ...diagrams.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      type: "diagram",
      icon: "🗺",
      href: "/diagrams",
      title: d.title,
      subject: d.type,
      excerpt: d.type,
    })),
    ...lectures.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      type: "lecture",
      icon: "🎤",
      href: "/lecture",
      title: l.title,
      subject: l.subject,
      excerpt: l.subject,
    })),
    ...mockExams.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      type: "mock-exam",
      icon: "📝",
      href: "/mock-exam",
      title: m.title,
      subject: m.subject,
      excerpt: m.subject,
    })),
    ...narratives.map((n) => ({
      id: n.id,
      createdAt: n.createdAt,
      type: "narrative",
      icon: "📖",
      href: "/narrative",
      title: n.topic,
      subject: null,
      excerpt: "Memory narrative",
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const subjects = [...new Set(allContent.map((c) => c.subject).filter(Boolean))] as string[];

  return NextResponse.json({
    content: allContent,
    counts: {
      notes: notes.length,
      decks: decks.length,
      exams: exams.length,
      podcasts: podcasts.length,
      diagrams: diagrams.length,
      lectures: lectures.length,
      mockExams: mockExams.length,
      narratives: narratives.length,
      total: allContent.length,
    },
    subjects,
  });
}
