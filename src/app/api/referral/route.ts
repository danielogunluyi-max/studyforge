import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  if (!user?.referralCode) {
    user = await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode: generateReferralCode() },
      select: { referralCode: true },
    });
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: session.user.id },
    include: { referred: { select: { name: true, createdAt: true } } },
  });

  return NextResponse.json({
    code: user?.referralCode,
    referralCount: referrals.filter((r) => r.used).length,
    referrals: referrals.map((r) => ({
      name: r.referred?.name || "Anonymous",
      joinedAt: r.referred?.createdAt,
      used: r.used,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = (await req.json()) as { code?: string };
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });

  if (!referrer) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  if (referrer.id === session.user.id) return NextResponse.json({ error: "Cannot use own code" }, { status: 400 });

  const existing = await prisma.referral.findFirst({
    where: { referrerId: referrer.id, referredId: session.user.id },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ success: true, message: "Referral already applied!" });
  }

  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredId: session.user.id,
      code,
      used: true,
      usedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, message: "Referral applied!" });
}
