import { getAuthSession } from "~/server/auth/session"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  const battle = await prisma.battleRoyale.findUnique({ where: { code } })
  if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 404 })
  if (battle.status !== 'waiting') return NextResponse.json({ error: 'Battle already started' }, { status: 400 })

  await prisma.battleRoyalePlayer.upsert({
    where: { battleId_userId: { battleId: battle.id, userId: session.user.id } },
    update: {},
    create: { battleId: battle.id, userId: session.user.id }
  })

  return NextResponse.json({ battle })
}
