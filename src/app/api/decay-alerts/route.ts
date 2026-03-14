import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generate decay alerts from flashcard review history
  const decks = await prisma.flashcardDeck.findMany({
    where: { userId: session.user.id },
    include: {
      flashcards: {
        select: { id: true, question: true, nextReviewAt: true, interval: true }
      }
    }
  })

  const now = new Date()
  const alerts = []

  for (const deck of decks) {
    for (const card of deck.flashcards) {
      if (!card.nextReviewAt) continue
      const daysOverdue = (now.getTime() - card.nextReviewAt.getTime()) / 86400000
      if (daysOverdue > 0) {
        const decayScore = Math.min(100, daysOverdue * 15)
        alerts.push({
          conceptId: card.id,
          conceptType: 'flashcard',
          conceptTitle: card.question.slice(0, 60),
          decayScore: Math.round(decayScore),
          daysOverdue: Math.round(daysOverdue),
          deckName: deck.name,
          deckId: deck.id,
        })
      }
    }
  }

  alerts.sort((a, b) => b.decayScore - a.decayScore)

  return NextResponse.json({ alerts: alerts.slice(0, 20) })
}
