import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { syllabusText, courseName, semester } = await req.json()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `You are an academic planner. Analyze this course syllabus and generate a complete semester study plan.

Course: ${courseName}
Semester: ${semester}
Syllabus: ${syllabusText.slice(0, 6000)}

Respond ONLY in JSON:
{
  "units": [
    {
      "name": "Unit 1: Introduction",
      "weeks": "1-2",
      "topics": ["Topic 1", "Topic 2"],
      "assessments": ["Quiz 1 - Week 2"],
      "studyHours": 4,
      "difficulty": "low"
    }
  ],
  "keyDates": [
    { "event": "Midterm Exam", "week": 7, "type": "exam" },
    { "event": "Assignment 1 Due", "week": 4, "type": "assignment" }
  ],
  "weeklyPlan": [
    { "week": 1, "focus": "Unit 1 intro", "tasks": ["Read ch1", "Make notes"], "hours": 3 }
  ],
  "totalStudyHours": 120,
  "recommendation": "Front-load difficult units in weeks 3-5"
}`
    }],
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const analysis = await prisma.syllabusAnalysis.create({
      data: {
        userId: session.user.id,
        originalText: syllabusText.slice(0, 10000),
        courseName,
        semester,
        plan: parsed,
        events: parsed.keyDates || [],
      }
    })

    return NextResponse.json({ ...parsed, id: analysis.id })
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const analyses = await prisma.syllabusAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, courseName: true, semester: true, createdAt: true }
  })
  return NextResponse.json({ analyses })
}
