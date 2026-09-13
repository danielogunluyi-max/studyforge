import { getAuthSession } from "~/server/auth/session"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}


export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = assertGroqRateLimit(session.user.id);
  if (limited) return limited;

  const { subject, sourceText } = await req.json()

  // Generate 20 questions
  let completion
  try {
    completion = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [{
      role: 'user',
      content: `Generate 20 rapid-fire multiple choice questions for a Battle Royale study game.
Subject: ${subject}
Content: ${(sourceText || subject).slice(0, 3000)}
Make questions progressively harder. Each has 4 options, 15 seconds to answer.
Respond ONLY as JSON array:
[{"q":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A)...","points":10}]`
    }],
    max_tokens: 2000,
  })
  } catch (error) {
    if (isRateLimited(error)) {
      return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
    }
    throw error
  }

  const raw = completion.choices[0]?.message?.content || '[]'
  let questions = []
  try {
    questions = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch { questions = [] }

  const battle = await prisma.battleRoyale.create({
    data: {
      hostId: session.user.id,
      code: generateCode(),
      subject,
      questions,
      players: {
        create: { userId: session.user.id }
      }
    },
    include: { players: true }
  })

  return NextResponse.json({ battle })
}


export async function GET(req: Request) {
  const session = await getAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code') || undefined

  if (code) {
    const battle = await prisma.battleRoyale.findUnique({
      where: { code },
      include: {
        players: { include: { user: { select: { name: true } } } }
      }
    })
    return NextResponse.json({ battle })
  }

  const battles = await prisma.battleRoyale.findMany({
    where: { hostId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  return NextResponse.json({ battles })
}
