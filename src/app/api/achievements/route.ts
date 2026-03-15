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
  { key: "exam_90", title: "High Achiever", description: "Scored 90%+ on an exam", emoji: "🏆" },
  { key: "exam_100", title: "Perfect Score", description: "Scored 100% on an exam", emoji: "💯" },
  { key: "feynman_first", title: "Feynman Fan", description: "Completed your first Feynman session", emoji: "🔬" },
  { key: "feynman_10", title: "Deep Thinker", description: "Completed 10 Feynman sessions", emoji: "🧪" },
  { key: "streak_7", title: "Week Warrior", description: "7-day study streak", emoji: "🔥" },
  { key: "streak_30", title: "Monthly Grind", description: "30-day study streak", emoji: "⚡" },
  { key: "streak_100", title: "Legendary", description: "100-day study streak", emoji: "👑" },
  { key: "first_battle", title: "Fighter", description: "Played your first Battle Arena", emoji: "⚔️" },
  { key: "battle_win", title: "Champion", description: "Won a Battle Arena", emoji: "🥇" },
  { key: "first_podcast", title: "Podcaster", description: "Generated your first podcast", emoji: "🎙" },
  { key: "first_diagram", title: "Visual Thinker", description: "Created your first diagram", emoji: "🗺" },
  { key: "curriculum_10", title: "Ontario Scholar", description: "Completed 10 curriculum expectations", emoji: "🍁" },
  { key: "dna_analyzed", title: "Know Thyself", description: "Generated your Study DNA", emoji: "🧬" },
  { key: "community_post", title: "Community Member", description: "Made your first community post", emoji: "🌍" },
  { key: "first_wellness", title: "Self-Aware", description: "Completed your first wellness check-in", emoji: "💚" },
  { key: "all_features", title: "Kyvex Explorer", description: "Used 10+ different features", emoji: "🚀" },
  { key: "night_owl", title: "Night Owl", description: "Studied after midnight", emoji: "🦉" },
  { key: "early_bird", title: "Early Bird", description: "Studied before 7am", emoji: "🐦" },
] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unlocked = await prisma.achievement.findMany({
    where: { userId: session.user.id },
    orderBy: { unlockedAt: "desc" },
  });

  const unlockedKeys = new Set(unlocked.map((a) => a.key));

  const all = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlockedKeys.has(a.key),
    unlockedAt: unlocked.find((u) => u.key === a.key)?.unlockedAt || null,
  }));

  return NextResponse.json({ achievements: all, unlockedCount: unlocked.length, total: ACHIEVEMENTS.length });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = (await req.json()) as { key?: string };
  const achievement = ACHIEVEMENTS.find((a) => a.key === key);
  if (!achievement) return NextResponse.json({ error: "Unknown achievement" }, { status: 400 });

  try {
    const earned = await prisma.achievement.create({
      data: { userId: session.user.id, ...achievement },
    });
    return NextResponse.json({ achievement: earned, isNew: true });
  } catch {
    return NextResponse.json({ isNew: false });
  }
}
