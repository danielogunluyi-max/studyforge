import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma } from "@/lib/prisma";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { subject, sourceText } = (await req.json()) as { subject?: string; sourceText?: string };

  const raw = await runGroqPrompt({
    user: `Generate 20 rapid-fire multiple choice questions for a Battle Royale study game.
Subject: ${subject}
Content: ${(sourceText || subject || "").slice(0, 3000)}
Make questions progressively harder. Each has 4 options, 15 seconds to answer.
Respond ONLY as JSON array:
[{"q":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A)...","points":10}]`,
    maxTokens: 2000,
  });

  const questions = extractJsonBlock(raw) ?? [];

  const battle = await prisma.battleRoyale.create({
    data: {
      hostId: userId,
      code: generateCode(),
      subject: subject ?? "",
      questions,
      players: {
        create: { userId },
      },
    },
    include: { players: true },
  });

  return NextResponse.json({ battle });
}

export async function GET(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || undefined;

  if (code) {
    const battle = await prisma.battleRoyale.findUnique({
      where: { code },
      include: {
        players: { include: { user: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ battle });
  }

  const battles = await prisma.battleRoyale.findMany({
    where: { hostId: userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ battles });
}
