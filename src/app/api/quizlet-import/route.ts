import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GROQ_TEXT_MODEL, isRateLimited, BUSY_MESSAGE } from "~/lib/groq";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pastedText, deckName, subject } = await req.json()
  // Quizlet export format: "term\tdefinition\n"
  // User pastes their Quizlet export text

  const lines = pastedText.split('\n').filter((l: string) => l.trim())
  const cards: { front: string; back: string }[] = []

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 2) {
      cards.push({ front: parts[0].trim(), back: parts[1].trim() })
    }
  }

  if (cards.length === 0) {
    // Try AI parsing if tab format didn't work
    let completion
    try {
      completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [{
        role: 'user',
        content: `Parse these flashcards into question/answer pairs. They may be in any format.
Text: ${pastedText.slice(0, 3000)}
Respond ONLY as JSON array: [{"question":"...","answer":"..."}]`
      }],
      max_tokens: 1000,
    })
    } catch (error) {
      if (isRateLimited(error)) {
        return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
      }
      throw error
    }
    try {
      const parsed = JSON.parse(
        (completion.choices[0]?.message?.content || '[]')
          .replace(/```json|```/g, '').trim()
      ) as Array<{ question?: string; answer?: string; front?: string; back?: string }>
      for (const item of parsed) {
        const front = item.front ?? item.question
        const back = item.back ?? item.answer
        if (front && back) cards.push({ front, back })
      }
    } catch { /* ignore */ }
  }

  if (cards.length === 0) {
    return NextResponse.json({ error: 'No cards found. Try copying from Quizlet export.' }, { status: 400 })
  }

  // Create deck + flashcards
  const deck = await prisma.flashcardDeck.create({
    data: {
      userId: session.user.id,
      title: deckName || 'Imported from Quizlet',
      description: 'Imported via Quizlet importer',
      subject: subject || 'General',
      cards: {
        create: cards.map((c) => ({
          front: c.front,
          back: c.back,
        }))
      }
    },
    include: { cards: true }
  })

  return NextResponse.json({ deck, count: cards.length })
}
