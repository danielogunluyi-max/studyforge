import { getAuthSession } from "~/server/auth/session"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const session = await getAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, score, totalMarks, wrongAnswers, examId } = await req.json()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `You are an academic performance diagnostician. Perform a detailed exam autopsy.

Subject: ${subject}
Score: ${score}/${totalMarks} (${((score/totalMarks)*100).toFixed(1)}%)
Wrong answers/areas: ${wrongAnswers || 'Not provided'}

Respond ONLY in JSON:
{
  "overallDiagnosis": "One sentence summary of what happened",
  "weakAreas": ["Topic 1", "Topic 2"],
  "strongAreas": ["Topic 3", "Topic 4"],
  "rootCauses": [
    { "cause": "Insufficient practice on X", "severity": "high" },
    { "cause": "Conceptual gap in Y", "severity": "medium" }
  ],
  "actionPlan": [
    { "action": "Review X using Feynman technique", "priority": 1, "timeEstimate": "2 hours" },
    { "action": "Create flashcards for Y formulas", "priority": 2, "timeEstimate": "1 hour" }
  ],
  "preventionStrategy": "What to do differently next time",
  "motivationalNote": "Encouraging but honest note to the student"
}`
    }],
    max_tokens: 800,
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const autopsy = await prisma.examAutopsy.create({
      data: {
        userId: session.user.id,
        examId: examId || null,
        subject,
        score,
        totalMarks,
        diagnosis: parsed,
        weakAreas: parsed.weakAreas || [],
        strongAreas: parsed.strongAreas || [],
        actionPlan: parsed.actionPlan || [],
      }
    })
    return NextResponse.json({ autopsy: { ...autopsy, ...parsed } })
  } catch {
    return NextResponse.json({ error: 'Autopsy failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const autopsies = await prisma.examAutopsy.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ autopsies })
}
