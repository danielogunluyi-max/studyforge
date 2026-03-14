import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shared = await prisma.sharedDeck.findUnique({
    where: { id: params.id },
    include: { deck: { include: { flashcards: true } } }
  })
  if (!shared) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Clone deck to user's library
  const newDeck = await prisma.flashcardDeck.create({
    data: {
      userId: session.user.id,
      name: `${shared.title} (copy)`,
      description: shared.description || '',
      subject: shared.subject,
      flashcards: {
        create: shared.deck.flashcards.map((f, i) => ({
          question: f.question,
          answer: f.answer,
          order: i,
        }))
      }
    },
    include: { flashcards: true }
  })

  // Increment downloads
  await prisma.sharedDeck.update({
    where: { id: params.id },
    data: { downloads: { increment: 1 } }
  })

  return NextResponse.json({ deck: newDeck })
}
