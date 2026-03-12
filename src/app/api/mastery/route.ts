import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

type SubjectBucket = {
  subject: string;
  notes: number;
  flashcardScore: number;
  feynmanScore: number;
  curriculumScore: number;
  examScore: number;
  topics: string[];
  activity: Array<{ date: string; type: string }>;
};

const KNOWN_SUBJECTS = [
  "math",
  "science",
  "english",
  "history",
  "chemistry",
  "physics",
  "biology",
  "french",
  "geography",
  "economics",
  "computer science",
  "art",
  "music",
  "business",
];

const FEYNMAN_KEYWORDS: Record<string, string[]> = {
  math: ["math", "calculus", "algebra", "geometry", "derivative", "integral", "equation", "function", "logarithm", "trigonometry"],
  chemistry: ["chemistry", "chemical", "atom", "molecule", "reaction", "element", "compound", "bond"],
  physics: ["physics", "force", "energy", "gravity", "wave", "quantum", "momentum", "velocity"],
  biology: ["biology", "cell", "dna", "evolution", "photosynthesis", "organism", "gene"],
  history: ["history", "war", "revolution", "empire", "civilization", "century", "colonialism"],
  economics: ["economics", "gdp", "inflation", "supply", "demand", "market", "trade", "interest"],
  "computer science": ["algorithm", "recursion", "database", "machine learning", "internet", "sorting", "complexity", "programming"],
};

function toDayString(date: Date) {
  return date.toISOString().split("T")[0] ?? "";
}

function normalizeSubject(value: string) {
  return value.trim().toLowerCase();
}

function ensureSubject(subjectMap: Record<string, SubjectBucket>, subject: string) {
  const safe = subject.trim() || "General";
  const key = normalizeSubject(safe);

  if (!subjectMap[key]) {
    subjectMap[key] = {
      subject: safe,
      notes: 0,
      flashcardScore: 0,
      feynmanScore: 0,
      curriculumScore: 0,
      examScore: 0,
      topics: [],
      activity: [],
    };
  }

  return key;
}

function inferSubjectFromTags(tags: string[]) {
  const matched = tags.find((tag) => {
    const lowered = tag.toLowerCase();
    return KNOWN_SUBJECTS.some((subject) => lowered.includes(subject));
  });

  return matched || tags[0] || "General";
}

function inferSubjectFromConcept(concept: string) {
  const lowered = concept.toLowerCase();

  for (const [subject, keywords] of Object.entries(FEYNMAN_KEYWORDS)) {
    if (keywords.some((keyword) => lowered.includes(keyword))) {
      return subject;
    }
  }

  return "General";
}

function masteryLabel(score: number) {
  if (score <= 20) return { label: "Not Started", color: "#1e1e30" };
  if (score <= 40) return { label: "Beginner", color: "#ef4444" };
  if (score <= 60) return { label: "Developing", color: "#f97316" };
  if (score <= 80) return { label: "Proficient", color: "#eab308" };
  return { label: "Mastered", color: "#10b981" };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [notes, decks, feynmanSessions, curriculumProgress, exams] = await Promise.all([
    db.note.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        tags: true,
        format: true,
        createdAt: true,
      },
    }),
    db.flashcardDeck.findMany({
      where: { userId },
      include: {
        cards: {
          select: {
            easeFactor: true,
            repetitions: true,
            interval: true,
          },
        },
      },
    }),
    db.feynmanSession.findMany({
      where: { userId },
      select: {
        concept: true,
        score: true,
        gradeLabel: true,
        createdAt: true,
      },
    }),
    db.ontarioCurriculumProgress.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            title: true,
            subject: true,
          },
        },
      },
    }),
    db.exam.findMany({
      where: { userId },
      select: {
        subject: true,
        scorePercent: true,
        resultRecorded: true,
        createdAt: true,
      },
    }),
  ]);

  const subjectMap: Record<string, SubjectBucket> = {};

  for (const note of notes) {
    const tags = Array.isArray(note.tags) ? note.tags : [];
    const subject = inferSubjectFromTags(tags);
    const key = ensureSubject(subjectMap, subject);

    const bucket = subjectMap[key];
    if (!bucket) continue;

    bucket.notes += 1;
    bucket.activity.push({ date: toDayString(note.createdAt), type: "note" });
    if (note.title) bucket.topics.push(note.title);
    if (note.format) bucket.topics.push(note.format);
  }

  for (const deck of decks) {
    const subject = deck.subject || deck.title || "General";
    const key = ensureSubject(subjectMap, subject);
    const bucket = subjectMap[key];
    if (!bucket) continue;

    const cards = deck.cards;
    if (cards.length > 0) {
      const avgEase = cards.reduce((sum, card) => sum + (card.easeFactor || 2.5), 0) / cards.length;
      const avgReps = cards.reduce((sum, card) => sum + (card.repetitions || 0), 0) / cards.length;
      const avgInterval = cards.reduce((sum, card) => sum + (card.interval || 0), 0) / cards.length;

      const easeScore = Math.min(25, Math.max(0, ((avgEase - 1.3) / 1.2) * 25));
      const repBonus = Math.min(5, avgReps * 0.5);
      // No direct lapses field exists in this schema, so use low interval as a light stability penalty proxy.
      const stabilityPenalty = Math.max(0, 3 - avgInterval * 0.2);

      bucket.flashcardScore = Math.max(0, Math.min(25, easeScore + repBonus - stabilityPenalty));
    }

    bucket.topics.push(deck.title);
    bucket.activity.push({ date: toDayString(deck.updatedAt), type: "flashcards" });
  }

  for (const sessionItem of feynmanSessions) {
    const subject = inferSubjectFromConcept(sessionItem.concept);
    const key = ensureSubject(subjectMap, subject);
    const bucket = subjectMap[key];
    if (!bucket) continue;

    const score = Math.max(0, Math.min(25, (sessionItem.score / 100) * 25));
    bucket.feynmanScore = Math.max(bucket.feynmanScore, score);
    bucket.topics.push(sessionItem.concept);
    bucket.activity.push({ date: toDayString(sessionItem.createdAt), type: "feynman" });
  }

  for (const progress of curriculumProgress) {
    const subject = progress.course.subject || progress.course.title || "Curriculum";
    const key = ensureSubject(subjectMap, subject);
    const bucket = subjectMap[key];
    if (!bucket) continue;

    const completed = progress.completedExpectations.length;
    const unitCount = progress.completedUnits.length;
    const confidenceRatio = Math.max(0, Math.min(1, (progress.confidence || 0) / 100));

    const completionRatio = Math.max(0, Math.min(1, (completed + unitCount * 0.4) / 24));
    const curriculumScore = Math.min(20, completionRatio * 14 + confidenceRatio * 6);

    bucket.curriculumScore = Math.max(bucket.curriculumScore, curriculumScore);
    bucket.activity.push({ date: toDayString(progress.updatedAt), type: "curriculum" });
    bucket.topics.push(progress.course.title);
  }

  for (const exam of exams) {
    if (!exam.resultRecorded || exam.scorePercent === null) continue;

    const key = ensureSubject(subjectMap, exam.subject || "General");
    const bucket = subjectMap[key];
    if (!bucket) continue;

    const score = Math.max(0, Math.min(10, ((exam.scorePercent || 0) / 100) * 10));
    bucket.examScore = Math.max(bucket.examScore, score);
    bucket.activity.push({ date: toDayString(exam.createdAt), type: "exam" });
  }

  const subjects = Object.values(subjectMap)
    .map((subject) => {
      const noteScore = Math.min(20, subject.notes * 5);
      const total = noteScore + subject.flashcardScore + subject.feynmanScore + subject.curriculumScore + subject.examScore;
      const mastery = Math.min(100, Math.round(total));
      const meta = masteryLabel(mastery);

      return {
        ...subject,
        noteScore,
        mastery,
        label: meta.label,
        color: meta.color,
        topics: [...new Set(subject.topics)].slice(0, 8),
      };
    })
    .sort((a, b) => b.mastery - a.mastery);

  const totalSubjects = subjects.length;
  const masteredCount = subjects.filter((subject) => subject.mastery > 80).length;
  const avgMastery =
    totalSubjects > 0
      ? Math.round(subjects.reduce((sum, subject) => sum + subject.mastery, 0) / totalSubjects)
      : 0;

  const heatmapData: Record<string, number> = {};
  const allActivity = subjects.flatMap((subject) => subject.activity);
  for (const entry of allActivity) {
    heatmapData[entry.date] = (heatmapData[entry.date] || 0) + 1;
  }

  return NextResponse.json({
    subjects,
    stats: { totalSubjects, masteredCount, avgMastery },
    heatmap: heatmapData,
  });
}
