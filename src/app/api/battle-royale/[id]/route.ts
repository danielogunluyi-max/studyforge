import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const battle = await prisma.battleRoyale.findUnique({
    where: { id },
    include: {
      players: { include: { user: { select: { name: true } } } }
    }
  })

  if (!battle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ battle })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json() as { action: 'start' | 'next' | 'finish' }

  const battle = await prisma.battleRoyale.findUnique({
    where: { id },
    include: { players: true }
  })

  if (!battle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (battle.hostId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'start') {
    if (battle.status !== 'waiting') return NextResponse.json({ error: 'Already started' }, { status: 400 })
    const updated = await prisma.battleRoyale.update({
      where: { id },
      data: { status: 'active', currentQuestion: 0 },
      include: { players: { include: { user: { select: { name: true } } } } }
    })
    return NextResponse.json({ battle: updated })
  }

  if (action === 'next') {
    const questions = battle.questions as unknown[]
    const nextQ = (battle.currentQuestion ?? 0) + 1

    if (nextQ >= questions.length) {
      // End the battle
      const updated = await prisma.battleRoyale.update({
        where: { id },
        data: { status: 'finished' },
        include: { players: { include: { user: { select: { name: true } } } } }
      })
      return NextResponse.json({ battle: updated })
    }

    const updated = await prisma.battleRoyale.update({
      where: { id },
      data: { currentQuestion: nextQ },
      include: { players: { include: { user: { select: { name: true } } } } }
    })
    return NextResponse.json({ battle: updated })
  }

  if (action === 'finish') {
    const updated = await prisma.battleRoyale.update({
      where: { id },
      data: { status: 'finished' },
      include: { players: { include: { user: { select: { name: true } } } } }
    })
    return NextResponse.json({ battle: updated })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
