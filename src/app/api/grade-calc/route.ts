import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseName, currentGrade, currentWeight, finalWeight, targetGrade } = await req.json()

  // Formula: needed = (target - current * currentWeight/100) / (finalWeight/100)
  const earnedPoints = currentGrade * (currentWeight / 100)
  const targetPoints = targetGrade
  const remaining = finalWeight / 100
  const neededOnFinal = (targetPoints - earnedPoints) / remaining

  const calc = await prisma.gradeCalculation.create({
    data: {
      userId: session.user.id,
      courseName,
      currentGrade,
      currentWeight,
      finalWeight,
      targetGrade,
      neededOnFinal: Math.round(neededOnFinal * 10) / 10,
    }
  })

  return NextResponse.json({
    neededOnFinal: Math.round(neededOnFinal * 10) / 10,
    isPossible: neededOnFinal <= 100,
    isEasy: neededOnFinal <= 60,
    message: neededOnFinal > 100
      ? `You need ${neededOnFinal.toFixed(1)}% - unfortunately not achievable.`
      : neededOnFinal <= 0
      ? `You already have ${targetGrade}%! You just need to show up.`
      : `You need ${neededOnFinal.toFixed(1)}% on your final to hit ${targetGrade}%.`,
    calc,
  })
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const calcs = await prisma.gradeCalculation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ calcs })
}
