import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject')
  const preset = searchParams.get('preset')
  const q = searchParams.get('q')

  const where: { subject?: { contains: string; mode: 'insensitive' }; preset?: string; title?: { contains: string; mode: 'insensitive' } } = {}
  if (subject) where.subject = { contains: subject, mode: 'insensitive' }
  if (preset) where.preset = preset
  if (q) where.title = { contains: q, mode: 'insensitive' }

  const decks = await prisma.sharedDeck.findMany({
    where,
    orderBy: { downloads: 'desc' },
    take: 50,
    include: {
      user: { select: { name: true } },
      deck: { include: { cards: { select: { id: true } } } }
    }
  })
  return NextResponse.json(
    { decks },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deckId, title, subject, description, preset } = await req.json()

  // Check deck belongs to user
  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId: session.user.id }
  })
  if (!deck) return NextResponse.json({ error: 'Deck not found' }, { status: 404 })

  const shared = await prisma.sharedDeck.create({
    data: {
      userId: session.user.id,
      deckId,
      title: title || deck.title,
      subject: subject || deck.subject || 'General',
      description,
      preset: preset || 'HIGHSCHOOL',
    }
  })
  return NextResponse.json({ shared })
}
