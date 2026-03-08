import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  XP_EVENTS,
  type XPEvent,
  calculateLevel,
  getNovaState,
  happinessFromActivity,
  xpInCurrentLevel,
} from "@/lib/novaXP";
import { auth } from "~/server/auth";

function clampHappiness(value: number) {
  return Math.max(0, Math.min(100, value));
}

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(startOfDay(a).getTime() - startOfDay(b).getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function isXPEvent(value: unknown): value is XPEvent {
  return typeof value === "string" && value in XP_EVENTS;
}

async function getUserIdFromSession() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getOrCreateNovaStats(userId: string) {
  const existing = await prisma.novaStats.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.novaStats.create({
    data: {
      userId,
      happiness: 50,
      totalXP: 0,
      level: 1,
      streak: 0,
    },
  });
}

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let stats = await getOrCreateNovaStats(userId);

    const now = new Date();
    if (stats.lastActiveDate) {
      const hoursSinceLastActive = (now.getTime() - stats.lastActiveDate.getTime()) / (1000 * 60 * 60);
      const decay = happinessFromActivity(hoursSinceLastActive);

      if (decay < 0) {
        const decayed = clampHappiness(stats.happiness + decay);
        if (decayed !== stats.happiness) {
          stats = await prisma.novaStats.update({
            where: { id: stats.id },
            data: { happiness: decayed },
          });
        }
      }
    }

    const computedLevel = calculateLevel(stats.totalXP);
    if (computedLevel !== stats.level) {
      stats = await prisma.novaStats.update({
        where: { id: stats.id },
        data: { level: computedLevel },
      });
    }

    return NextResponse.json({
      stats,
      level: computedLevel,
      xpInCurrentLevel: xpInCurrentLevel(stats.totalXP),
      novaState: getNovaState(stats.happiness),
    });
  } catch (error) {
    console.error("Nova GET error:", error);
    return NextResponse.json({ error: "Failed to load Nova stats" }, { status: 500 });
  }
}

type NovaAwardBody = {
  event?: XPEvent;
};

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as NovaAwardBody;
    if (!isXPEvent(body.event)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const event = body.event;
    const eventConfig = XP_EVENTS[event];
    let stats = await getOrCreateNovaStats(userId);

    const now = new Date();
    const today = startOfDay(now);

    let nextStreak = 1;
    if (stats.lastActiveDate) {
      const last = startOfDay(stats.lastActiveDate);
      const gap = daysBetween(today, last);
      if (gap === 0) {
        nextStreak = stats.streak;
      } else if (gap === 1) {
        nextStreak = stats.streak + 1;
      }
    }

    const nextTotalXP = stats.totalXP + eventConfig.xp;
    const oldLevel = calculateLevel(stats.totalXP);
    const newLevel = calculateLevel(nextTotalXP);
    const leveledUp = newLevel > oldLevel;

    const happinessBoost = leveledUp ? 10 : 2;
    const nextHappiness = clampHappiness(stats.happiness + happinessBoost);

    stats = await prisma.novaStats.update({
      where: { id: stats.id },
      data: {
        totalXP: nextTotalXP,
        level: newLevel,
        happiness: nextHappiness,
        streak: nextStreak,
        lastActiveDate: today,
        notesGenerated: event === "NOTE_GENERATED" ? { increment: 1 } : undefined,
        flashcardsStudied: event === "FLASHCARD_STUDIED" ? { increment: 1 } : undefined,
        audioConverted: event === "AUDIO_CONVERTED" ? { increment: 1 } : undefined,
        battlesWon: event === "BATTLE_WON" ? { increment: 1 } : undefined,
      },
    });

    return NextResponse.json({
      stats,
      leveledUp,
      xpGained: eventConfig.xp,
      message: eventConfig.message,
    });
  } catch (error) {
    console.error("Nova POST error:", error);
    return NextResponse.json({ error: "Failed to award Nova XP" }, { status: 500 });
  }
}
