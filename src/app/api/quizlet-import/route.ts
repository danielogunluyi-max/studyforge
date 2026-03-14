import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pastedText, deckName, subject } = await req.json()
  // Quizlet export format: "term\tdefinition\n"
  // User pastes their Quizlet export text

  const lines = pastedText.split('\n').filter((l: string) => l.trim())
  const cards: { question: string; answer: string }[] = []

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 2) {
      cards.push({ question: parts[0].trim(), answer: parts[1].trim() })
    }
  }

  if (cards.length === 0) {
    // Try AI parsing if tab format didn't work
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Parse these flashcards into question/answer pairs. They may be in any format.
Text: ${pastedText.slice(0, 3000)}
Respond ONLY as JSON array: [{"question":"...","answer":"..."}]`
      }],
      max_tokens: 1000,
    })
    try {
      const parsed = JSON.parse(
        (completion.choices[0]?.message?.content || '[]')
          .replace(/```json|```/g, '').trim()
      )
      cards.push(...parsed)
    } catch { /* ignore */ }
  }

  if (cards.length === 0) {
    return NextResponse.json({ error: 'No cards found. Try copying from Quizlet export.' }, { status: 400 })
  }

  // Create deck + flashcards
  const deck = await prisma.flashcardDeck.create({
    data: {
      userId: session.user.id,
      name: deckName || 'Imported from Quizlet',
      description: 'Imported via Quizlet importer',
      subject: subject || 'General',
      flashcards: {
        create: cards.map((c, i) => ({
          question: c.question,
          answer: c.answer,
          order: i,
        }))
      }
    },
    include: { flashcards: true }
  })

  return NextResponse.json({ deck, count: cards.length })
}
