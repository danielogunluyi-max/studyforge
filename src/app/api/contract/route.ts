import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { auth } from '~/server/auth';

const prisma = db as any;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    commitment?: string;
    dailyHours?: number;
    durationDays?: number;
  };

  const commitment = body.commitment?.trim() ?? '';
  const dailyHours = Number(body.dailyHours ?? 0);
  const durationDays = Number(body.durationDays ?? 0);

  if (!commitment || dailyHours <= 0 || durationDays <= 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const endDate = new Date(Date.now() + durationDays * 86400000);
  const contract = await prisma.studyContract.create({
    data: {
      userId: session.user.id,
      commitment,
      dailyHours,
      durationDays,
      endDate,
    },
  });

  return NextResponse.json({ contract });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contracts = await prisma.studyContract.findMany({
    where: { userId: session.user.id },
    include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 7 } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ contracts });
}
