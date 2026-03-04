import { db } from "~/server/db";

export function getWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function getGroupMembership(groupId: string, userId: string) {
  return db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      group: true,
    },
  });
}

export async function ensureGroupMember(groupId: string, userId: string) {
  const membership = await getGroupMembership(groupId, userId);
  return membership ? membership : null;
}

export function canManageGroup(role: string): boolean {
  return role === "owner" || role === "moderator";
}

export function isOwner(role: string): boolean {
  return role === "owner";
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function bumpGroupStreak(groupId: string) {
  const group = await db.studyGroup.findUnique({
    where: { id: groupId },
    select: { id: true, streakCount: true, lastActiveAt: true },
  });

  if (!group) return;

  const now = new Date();
  const today = startOfUtcDay(now);
  const last = group.lastActiveAt ? startOfUtcDay(group.lastActiveAt) : null;

  if (last && today.getTime() === last.getTime()) {
    await db.studyGroup.update({ where: { id: groupId }, data: { lastActiveAt: now } });
    return;
  }

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const nextStreak = last && last.getTime() === yesterday.getTime() ? group.streakCount + 1 : 1;

  await db.studyGroup.update({
    where: { id: groupId },
    data: {
      lastActiveAt: now,
      streakCount: nextStreak,
    },
  });
}

export async function bumpMessageStats(groupId: string, userId: string) {
  const weekKey = getWeekKey();
  await db.groupMemberStats.upsert({
    where: {
      groupId_userId_weekKey: { groupId, userId, weekKey },
    },
    create: {
      groupId,
      userId,
      weekKey,
      messagesSent: 1,
      weeklyScore: 2,
      allTimeScore: 2,
    },
    update: {
      messagesSent: { increment: 1 },
      weeklyScore: { increment: 2 },
      allTimeScore: { increment: 2 },
    },
  });
}

export async function bumpNotesStats(groupId: string, userId: string) {
  const weekKey = getWeekKey();
  await db.groupMemberStats.upsert({
    where: {
      groupId_userId_weekKey: { groupId, userId, weekKey },
    },
    create: {
      groupId,
      userId,
      weekKey,
      notesSaved: 1,
      weeklyScore: 4,
      allTimeScore: 4,
    },
    update: {
      notesSaved: { increment: 1 },
      weeklyScore: { increment: 4 },
      allTimeScore: { increment: 4 },
    },
  });
}

export async function bumpQuizStats(groupId: string, userId: string) {
  const weekKey = getWeekKey();
  await db.groupMemberStats.upsert({
    where: {
      groupId_userId_weekKey: { groupId, userId, weekKey },
    },
    create: {
      groupId,
      userId,
      weekKey,
      quizzesCompleted: 1,
      weeklyScore: 8,
      allTimeScore: 8,
    },
    update: {
      quizzesCompleted: { increment: 1 },
      weeklyScore: { increment: 8 },
      allTimeScore: { increment: 8 },
    },
  });
}
