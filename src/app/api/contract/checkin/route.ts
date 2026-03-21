import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { getAuthSession } from '~/server/auth/session';

const prisma = db as any;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    contractId?: string;
    hoursStudied?: number;
    notes?: string;
    mood?: number;
  };

  const contractId = body.contractId ?? '';
  const hoursStudied = Number(body.hoursStudied ?? 0);
  const mood = Number(body.mood ?? 3);
  const notes = body.notes?.trim() || '';

  if (!contractId || hoursStudied < 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const contract = await prisma.studyContract.findFirst({
    where: { id: contractId, userId: session.user.id },
    include: { checkIns: { take: 7, orderBy: { createdAt: 'desc' } } },
  });

  if (!contract) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const metGoal = hoursStudied >= contract.dailyHours;
  const streak = metGoal ? contract.currentStreak + 1 : 0;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `You are a supportive but honest accountability coach. A student just checked in on their study contract.

Contract: "${contract.commitment}"
Goal: ${contract.dailyHours} hours/day for ${contract.durationDays} days
Today: Studied ${hoursStudied} hours
Met goal: ${metGoal}
Current streak: ${streak} days
Mood: ${mood}/5
Notes: ${notes || 'None'}

Write a 2-3 sentence response. Be warm, specific, and motivating.
If they missed their goal, be honest but kind.
If they hit their goal, celebrate specifically.`,
      },
    ],
    max_tokens: 150,
  });

  const aiResponse = completion.choices[0]?.message?.content || '';

  const checkIn = await prisma.contractCheckIn.create({
    data: {
      contractId,
      userId: session.user.id,
      hoursStudied,
      notes: notes || null,
      mood,
      aiResponse,
    },
  });

  await prisma.studyContract.update({
    where: { id: contractId },
    data: { currentStreak: streak, totalDays: { increment: 1 } },
  });

  return NextResponse.json({ checkIn, aiResponse, metGoal, streak });
}
