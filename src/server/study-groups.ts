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
