import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dna = await prisma.studyDNA.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json({ dna })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gather all user activity data
  const [notes, decks, feynman, exams, focus, wellness] = await Promise.all([
    prisma.note.findMany({ where: { userId: session.user.id }, select: { subject: true, createdAt: true }, take: 100 }),
    prisma.flashcardDeck.findMany({ where: { userId: session.user.id }, select: { subject: true }, take: 50 }),
    prisma.feynmanSession.findMany({ where: { userId: session.user.id }, select: { score: true, concept: true }, take: 50 }),
    prisma.exam.findMany({ where: { userId: session.user.id }, select: { subject: true, score: true }, take: 50 }),
    prisma.focusSession.findMany({ where: { userId: session.user.id }, select: { duration: true, createdAt: true }, take: 100 }),
    prisma.wellnessEntry.findMany({ where: { userId: session.user.id }, select: { mood: true, energy: true, createdAt: true }, take: 30 }),
  ])

  const dataStr = JSON.stringify({ notes: notes.length, feynmanAvg: feynman.reduce((a,f)=>a+(f.score||0),0)/(feynman.length||1), exams: exams.length, focusSessions: focus.length, subjects: [...new Set(notes.map(n=>n.subject).filter(Boolean))] })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Analyze this student's learning data and generate their Study DNA profile.

Data: ${dataStr}

Respond ONLY in JSON:
{
  "visualScore": 72,
  "auditoryScore": 45,
  "readWriteScore": 88,
  "kinestheticScore": 60,
  "bestTimeOfDay": "evening",
  "avgSessionMinutes": 35,
  "learningVelocity": 1.2,
  "profile": {
    "type": "Read/Write Learner",
    "strengths": ["Note-taking", "Written explanations", "Structured review"],
    "weaknesses": ["Visual diagrams", "Audio content"],
    "recommendation": "You learn best through writing and reading. Use Cornell notes and written Feynman technique.",
    "superpower": "You can process and retain written information 20% faster than average.",
    "kryptonite": "You struggle with purely visual or diagram-based content."
  }
}`
    }],
    max_tokens: 600,
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const dna = await prisma.studyDNA.upsert({
      where: { userId: session.user.id },
      update: { ...parsed },
      create: { userId: session.user.id, ...parsed },
    })
    return NextResponse.json({ dna })
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
