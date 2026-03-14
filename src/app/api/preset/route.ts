import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const ALLOWED_PRESETS = ["HIGHSCHOOL", "COLLEGE", "UNIVERSITY"] as const;

type Preset = (typeof ALLOWED_PRESETS)[number];

function isPreset(value: string): value is Preset {
  return ALLOWED_PRESETS.includes(value as Preset);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { preset: true, presetSet: true },
  });

  return NextResponse.json(user);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { preset } = (await req.json()) as { preset?: string };
  if (!preset || !isPreset(preset)) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { preset, presetSet: true },
    select: { preset: true, presetSet: true },
  });

  return NextResponse.json(user);
}
