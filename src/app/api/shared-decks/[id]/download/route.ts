import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const shared = await prisma.sharedDeck.findUnique({
    where: { id },
    include: { deck: { include: { cards: true } } }
  })
  if (!shared) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Clone deck to user's library
  const newDeck = await prisma.flashcardDeck.create({
    data: {
      userId: session.user.id,
      title: `${shared.title} (copy)`,
      description: shared.description || '',
      subject: shared.subject,
      cards: {
        create: shared.deck.cards.map((f) => ({
          front: f.front,
          back: f.back,
        }))
      }
    },
    include: { cards: true }
  })

  // Increment downloads
  await prisma.sharedDeck.update({
    where: { id },
    data: { downloads: { increment: 1 } }
  })

  return NextResponse.json({ deck: newDeck })
}
