import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ACHIEVEMENTS = [
  { key: "first_note", title: "Note Taker", description: "Created your first note", emoji: "📝" },
  { key: "notes_10", title: "Scholar", description: "Created 10 notes", emoji: "📚" },
  { key: "notes_50", title: "Librarian", description: "Created 50 notes", emoji: "🏛" },
  { key: "first_flashcard", title: "Flash!", description: "Created your first flashcard deck", emoji: "🃏" },
  { key: "cards_100", title: "Card Shark", description: "Created 100 flashcards", emoji: "🎴" },
  { key: "cards_500", title: "Memory Master", description: "Created 500 flashcards", emoji: "🧠" },
  { key: "first_exam", title: "Test Ready", description: "Logged your first exam", emoji: "📋" },
  { key: "feynman_first", title: "Feynman Fan", description: "Completed your first Feynman session", emoji: "🔬" },
  { key: "feynman_10", title: "Deep Thinker", description: "Completed 10 Feynman sessions", emoji: "🧪" },
  { key: "streak_7", title: "Week Warrior", description: "7-day study streak", emoji: "🔥" },
  { key: "streak_30", title: "Monthly Grind", description: "30-day study streak", emoji: "⚡" },
  { key: "streak_100", title: "Legendary", description: "100-day study streak", emoji: "👑" },
  { key: "first_podcast", title: "Podcaster", description: "Generated your first podcast", emoji: "🎙" },
  { key: "first_diagram", title: "Visual Thinker", description: "Created your first diagram", emoji: "🗺" },
  { key: "dna_analyzed", title: "Know Thyself", description: "Generated your Study DNA", emoji: "🧬" },
  { key: "community_post", title: "Community Member", description: "Made your first community post", emoji: "🌍" },
  { key: "first_wellness", title: "Self-Aware", description: "Completed your first wellness check-in", emoji: "💚" },
] as const;

function pickAchievement(count: number, keys: readonly string[]): string[] {
  const out: string[] = [];
  if (count > 0 && keys[0]) out.push(keys[0]);
  if (count >= 10 && keys[1]) out.push(keys[1]);
  if (count >= 50 && keys[2]) out.push(keys[2]);
  return out;
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const [noteCount, deckCount, cardCount, examCount, feynmanCount, podcastCount, diagramCount, communityCount, wellnessCount, dnaExists, user] = await Promise.all([
    prisma.note.count({ where: { userId } }),
    prisma.flashcardDeck.count({ where: { userId } }),
    prisma.flashcard.count({ where: { deck: { userId } } }),
    prisma.exam.count({ where: { userId } }),
    prisma.feynmanSession.count({ where: { userId } }),
    prisma.podcast.count({ where: { userId } }),
    prisma.diagram.count({ where: { userId } }),
    prisma.communityPost.count({ where: { userId } }),
    prisma.wellnessEntry.count({ where: { userId } }),
    prisma.studyDNA.findUnique({ where: { userId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { studyStreak: true } }),
  ]);

  const shouldUnlock = new Set<string>();

  pickAchievement(noteCount, ["first_note", "notes_10", "notes_50"]).forEach((k) => shouldUnlock.add(k));
  if (deckCount > 0) shouldUnlock.add("first_flashcard");
  if (cardCount >= 100) shouldUnlock.add("cards_100");
  if (cardCount >= 500) shouldUnlock.add("cards_500");
  if (examCount > 0) shouldUnlock.add("first_exam");
  if (feynmanCount > 0) shouldUnlock.add("feynman_first");
  if (feynmanCount >= 10) shouldUnlock.add("feynman_10");
  if ((user?.studyStreak ?? 0) >= 7) shouldUnlock.add("streak_7");
  if ((user?.studyStreak ?? 0) >= 30) shouldUnlock.add("streak_30");
  if ((user?.studyStreak ?? 0) >= 100) shouldUnlock.add("streak_100");
  if (podcastCount > 0) shouldUnlock.add("first_podcast");
  if (diagramCount > 0) shouldUnlock.add("first_diagram");
  if (dnaExists) shouldUnlock.add("dna_analyzed");
  if (communityCount > 0) shouldUnlock.add("community_post");
  if (wellnessCount > 0) shouldUnlock.add("first_wellness");

  const catalog = new Map(ACHIEVEMENTS.map((item) => [item.key, item]));
  const created: Array<{ key: string; title: string; emoji: string }> = [];

  for (const key of shouldUnlock) {
    const item = catalog.get(key);
    if (!item) continue;

    try {
      const earned = await prisma.achievement.create({
        data: { userId, ...item },
      });
      created.push({ key: earned.key, title: earned.title, emoji: earned.emoji });
    } catch {
      // Ignore duplicates from unique(userId,key).
    }
  }

  return NextResponse.json({ unlocked: created, count: created.length });
}
