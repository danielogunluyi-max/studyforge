import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's notes from different subjects
  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
    select: { title: true, subject: true, content: true },
    take: 30,
    orderBy: { createdAt: 'desc' }
  })

  const subjects = [...new Set(notes.map(n => n.subject).filter(Boolean))]
  if (subjects.length < 2) {
    return NextResponse.json({ error: 'Need notes from at least 2 subjects to find collisions' }, { status: 400 })
  }

  const noteSummary = notes.map(n => `[${n.subject}] ${n.title}: ${n.content.slice(0, 200)}`).join('\n')

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Find hidden conceptual connections between topics from different subjects in this student's notes. These are "concept collisions" - moments where two seemingly unrelated subjects share deep structural or conceptual similarities.

Notes: ${noteSummary}

Find 5 surprising connections. Respond ONLY in JSON:
{
  "collisions": [
    {
      "concept1": "Cell division (Biology)",
      "concept2": "Algorithm recursion (Computer Science)",
      "subject1": "Biology",
      "subject2": "Computer Science",
      "connection": "Both involve a process that replicates itself with stopping conditions...",
      "strength": 78,
      "insight": "Understanding recursion can help you visualize mitosis and vice versa"
    }
  ]
}`
    }],
    max_tokens: 1000,
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    // Save collisions
    for (const c of parsed.collisions || []) {
      await prisma.conceptCollision.create({
        data: {
          userId: session.user.id,
          concept1: c.concept1,
          concept2: c.concept2,
          subject1: c.subject1,
          subject2: c.subject2,
          connection: c.connection,
          strength: c.strength,
        }
      })
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const collisions = await prisma.conceptCollision.findMany({
    where: { userId: session.user.id },
    orderBy: { strength: 'desc' },
    take: 20,
  })
  return NextResponse.json({ collisions })
}
