import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "~/server/auth";

type Suggestion = {
  type: string;
  message: string;
  href: string;
  priority: number;
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp0to100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export async function POST() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    notes,
    decks,
    flashcards,
    exams,
    feynman,
    focus,
    wellness,
    habits,
    contracts,
    crossover,
    reading,
    mockExams,
    lectures,
    debates,
  ] = await Promise.all([
    prisma.note.findMany({ where: { userId: uid }, select: { title: true, content: true, tags: true, createdAt: true } }),
    prisma.flashcardDeck.findMany({ where: { userId: uid }, select: { subject: true } }),
    prisma.flashcard.findMany({ where: { deck: { userId: uid } }, select: { easeFactor: true, interval: true } }),
    prisma.exam.findMany({ where: { userId: uid }, select: { scorePercent: true, subject: true, createdAt: true } }),
    prisma.feynmanSession.findMany({ where: { userId: uid }, select: { score: true, concept: true } }),
    prisma.focusSession.findMany({ where: { userId: uid }, select: { durationMins: true, startedAt: true } }),
    prisma.wellnessEntry.findMany({ where: { userId: uid }, select: { mood: true, energy: true, stress: true } }),
    prisma.habit.findMany({ where: { userId: uid }, select: { streak: true } }),
    prisma.studyContract.findMany({ where: { userId: uid }, select: { currentStreak: true, totalDays: true } }),
    prisma.crossoverChallenge.findMany({ where: { userId: uid, completed: true }, select: { score: true } }),
    prisma.readingSession.findMany({ where: { userId: uid }, select: { wpm: true, comprehension: true } }),
    prisma.mockExam.findMany({ where: { userId: uid }, select: { attempts: { select: { score: true } } } }),
    prisma.lectureSession.findMany({ where: { userId: uid }, select: { id: true } }),
    prisma.debateJudge.findMany({ where: { OR: [{ player1Id: uid }, { player2Id: uid }] }, select: { winnerId: true } }),
  ]);

  const subjectSet = new Set<string>();
  for (const deck of decks) {
    if (deck.subject) subjectSet.add(deck.subject);
  }
  for (const exam of exams) {
    if (exam.subject) subjectSet.add(exam.subject);
  }
  for (const note of notes) {
    for (const tag of note.tags) {
      if (tag) subjectSet.add(tag);
    }
  }

  const subjects = [...subjectSet];
  const knowledgeBreadth = clamp0to100(subjects.length * 8);

  const avgEase = flashcards.length
    ? avg(flashcards.map((f) => f.easeFactor ?? 2.5))
    : 2.5;
  const retentionScore = clamp0to100(((avgEase - 1.3) / (3.5 - 1.3)) * 100);

  const depthScore = clamp0to100(avg(feynman.map((f) => f.score ?? 0)));
  const performanceScore = clamp0to100(avg(exams.map((e) => e.scorePercent ?? 0)));

  const maxHabitStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;
  const contractDays = contracts.reduce((a, c) => a + c.totalDays, 0);
  const consistencyScore = clamp0to100(maxHabitStreak * 3 + contractDays * 2);

  const avgWellness = wellness.length
    ? avg(wellness.map((w) => w.mood)) * 20
    : 50;
  const wellbeingScore = clamp0to100(avgWellness);

  const disciplineScore = clamp0to100(contracts.reduce((a, c) => a + c.currentStreak, 0) * 5);

  const synthesisScore = clamp0to100(avg(crossover.map((c) => c.score ?? 0)));

  const avgWpm = avg(reading.map((r) => r.wpm));
  const velocityScore = clamp0to100((avgWpm / 400) * 100);

  let flashcardGate = "standard";
  if (retentionScore > 90) flashcardGate = "expert";
  else if (retentionScore > 75) flashcardGate = "advanced";
  else if (retentionScore < 60) flashcardGate = "simplified";

  let difficultyGate = "normal";
  if (performanceScore > 85) difficultyGate = "challenge";
  else if (performanceScore > 75) difficultyGate = "hard";
  else if (performanceScore < 60) difficultyGate = "easy";

  const hourCounts: Record<number, number> = {};
  for (const f of focus) {
    const hr = new Date(f.startedAt).getHours();
    hourCounts[hr] = (hourCounts[hr] ?? 0) + 1;
  }
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakHourNum = peakHour ? parseInt(peakHour, 10) : 20;
  const chronotype = peakHourNum < 9 ? "morning" : peakHourNum < 14 ? "afternoon" : peakHourNum < 19 ? "evening" : "night";

  const subjectGraph: Record<string, number> = {};
  for (const deck of decks) {
    subjectGraph[deck.subject] = (subjectGraph[deck.subject] ?? 0) + 1;
  }
  for (const exam of exams) {
    subjectGraph[exam.subject] = (subjectGraph[exam.subject] ?? 0) + 2;
  }
  for (const note of notes) {
    for (const tag of note.tags) {
      subjectGraph[tag] = (subjectGraph[tag] ?? 0) + 1;
    }
  }

  const sortedSubjects = Object.entries(subjectGraph).sort((a, b) => b[1] - a[1]);
  const strongestSubjects = sortedSubjects.slice(0, 3).map((s) => s[0]);
  const weakestSubjects = [...sortedSubjects].reverse().slice(0, 3).map((s) => s[0]);

  const mockExamAttemptCount = mockExams.reduce((acc, exam) => acc + exam.attempts.length, 0);
  const debateWins = debates.filter((d) => d.winnerId === uid).length;

  const featureUsage = {
    notes: notes.length,
    decks: decks.length,
    flashcards: flashcards.length,
    exams: exams.length,
    feynman: feynman.length,
    focus: focus.length,
    lectures: lectures.length,
    debates: debates.length,
    debateWins,
    crossover: crossover.length,
    reading: reading.length,
    mockExams: mockExams.length,
    mockExamAttempts: mockExamAttemptCount,
  };

  const totalStudyHours = focus.reduce((a, f) => a + (f.durationMins ?? 0), 0) / 60;

  const suggestions: Suggestion[] = [];
  if (retentionScore < 60 && flashcards.length > 0) {
    suggestions.push({ type: "review", message: "Your retention is low — review your flashcards", href: "/flashcards", priority: 1 });
  }
  if (depthScore < 70 && notes.length > 0) {
    suggestions.push({ type: "review", message: "Deepen your understanding by reviewing your notes with Nova", href: "/tutor", priority: 2 });
  }
  if (consistencyScore < 30) {
    suggestions.push({ type: "contract", message: "Build consistency with a Study Contract", href: "/contract", priority: 3 });
  }
  if (synthesisScore < 50 && subjects.length >= 2) {
    suggestions.push({ type: "crossover", message: "Try a Crossover Challenge to connect your subjects", href: "/crossover", priority: 4 });
  }
  if (wellbeingScore < 40) {
    suggestions.push({ type: "wellness", message: "Your wellness is low — check in today", href: "/wellness", priority: 5 });
  }

  const contentUnlocks = [
    ...(retentionScore > 75 ? ["advanced-flashcards"] : []),
    ...(performanceScore > 80 ? ["challenge-exams"] : []),
    ...(synthesisScore > 60 ? ["cross-subject-mode"] : []),
  ];

  const sip = await prisma.studentIntelligenceProfile.upsert({
    where: { userId: uid },
    update: {
      knowledgeBreadth,
      retentionScore,
      depthScore,
      performanceScore,
      consistencyScore,
      wellbeingScore,
      disciplineScore,
      synthesisScore,
      velocityScore,
      chronotype,
      strongestSubjects,
      weakestSubjects,
      subjectGraph,
      featureUsage,
      learningPatterns: {
        avgEase,
        avgWpm,
        debateWins,
        mockExamAttemptCount,
      },
      flashcardGate,
      difficultyGate,
      contentUnlocks,
      totalStudyHours,
      lastSuggestions: suggestions,
      suggestionHistory: suggestions,
      lastCalculated: new Date(),
    },
    create: {
      userId: uid,
      knowledgeBreadth,
      retentionScore,
      depthScore,
      performanceScore,
      consistencyScore,
      wellbeingScore,
      disciplineScore,
      synthesisScore,
      velocityScore,
      chronotype,
      strongestSubjects,
      weakestSubjects,
      subjectGraph,
      featureUsage,
      learningPatterns: {
        avgEase,
        avgWpm,
        debateWins,
        mockExamAttemptCount,
      },
      flashcardGate,
      difficultyGate,
      contentUnlocks,
      totalStudyHours,
      lastSuggestions: suggestions,
      suggestionHistory: suggestions,
    },
  });

  return NextResponse.json({ sip, suggestions });
}

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sip = await prisma.studentIntelligenceProfile.findUnique({
    where: { userId: uid },
  });

  return NextResponse.json({ sip });
}
