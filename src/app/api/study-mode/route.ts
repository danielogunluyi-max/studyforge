import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "~/server/auth";

type PhaseDef = { phase: "learn" | "encode" | "test" | "reflect"; minutes: number; label: string };
type EnrichedPhase = PhaseDef & {
  features: Array<{ label: string; href: string; icon: string }>;
  completed: boolean;
};

const PHASE_CONFIGS: Record<30 | 60 | 90 | 120, PhaseDef[]> = {
  30: [
    { phase: "learn", minutes: 8, label: "Learn" },
    { phase: "encode", minutes: 12, label: "Encode" },
    { phase: "test", minutes: 7, label: "Test" },
    { phase: "reflect", minutes: 3, label: "Reflect" },
  ],
  60: [
    { phase: "learn", minutes: 15, label: "Learn" },
    { phase: "encode", minutes: 22, label: "Encode" },
    { phase: "test", minutes: 15, label: "Test" },
    { phase: "reflect", minutes: 8, label: "Reflect" },
  ],
  90: [
    { phase: "learn", minutes: 22, label: "Learn" },
    { phase: "encode", minutes: 32, label: "Encode" },
    { phase: "test", minutes: 25, label: "Test" },
    { phase: "reflect", minutes: 11, label: "Reflect" },
  ],
  120: [
    { phase: "learn", minutes: 30, label: "Learn" },
    { phase: "encode", minutes: 42, label: "Encode" },
    { phase: "test", minutes: 32, label: "Test" },
    { phase: "reflect", minutes: 16, label: "Reflect" },
  ],
};

const PHASE_FEATURES: Record<PhaseDef["phase"], Array<{ label: string; href: string; icon: string }>> = {
  learn: [
    { label: "Micro-lessons", href: "/micro-lessons", icon: "📖" },
    { label: "Adaptive Notes", href: "/adaptive-notes", icon: "🎯" },
  ],
  encode: [
    { label: "Flashcard Review", href: "/flashcards", icon: "🃏" },
    { label: "Review My Notes", href: "/my-notes", icon: "📝" },
  ],
  test: [
    { label: "Mock Exam", href: "/mock-exam", icon: "📋" },
    { label: "Battle Arena", href: "/battle", icon: "⚔️" },
  ],
  reflect: [
    { label: "Wellness Check", href: "/wellness", icon: "💚" },
    { label: "Focus Score", href: "/focus-score", icon: "🎯" },
  ],
};

function normalizeMinutes(totalMinutes: number): 30 | 60 | 90 | 120 {
  if (totalMinutes === 30 || totalMinutes === 60 || totalMinutes === 90 || totalMinutes === 120) {
    return totalMinutes;
  }
  return 60;
}

function parsePhases(value: unknown): EnrichedPhase[] {
  if (!Array.isArray(value)) return [];
  return value as EnrichedPhase[];
}

export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { topic?: string; subject?: string; totalMinutes?: number };
  const mins = normalizeMinutes(body.totalMinutes ?? 60);
  const phases = PHASE_CONFIGS[mins];

  const enrichedPhases: EnrichedPhase[] = phases.map((p) => ({
    ...p,
    features: PHASE_FEATURES[p.phase],
    completed: false,
  }));

  const studySession = await prisma.studyModeSession.create({
    data: {
      userId: uid,
      topic: body.topic ?? "General session",
      subject: body.subject ?? "General",
      totalMinutes: mins,
      phases: enrichedPhases,
      status: "active",
    },
  });

  return NextResponse.json({ session: studySession, phases: enrichedPhases });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { sessionId?: string; action?: string; phaseIndex?: number };
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const studySession = await prisma.studyModeSession.findUnique({
    where: { id: body.sessionId },
  });

  if (!studySession || studySession.userId !== uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const phases = parsePhases(studySession.phases);

  if (body.action === "complete-phase") {
    const phaseIndex = body.phaseIndex ?? 0;
    if (phaseIndex < 0 || phaseIndex >= phases.length) {
      return NextResponse.json({ error: "Invalid phaseIndex" }, { status: 400 });
    }

    phases[phaseIndex] = { ...phases[phaseIndex], completed: true };
    const nextPhase = phaseIndex + 1;
    const allDone = nextPhase >= phases.length;

    await prisma.studyModeSession.update({
      where: { id: body.sessionId },
      data: {
        phases,
        currentPhase: allDone ? phaseIndex : nextPhase,
        status: allDone ? "completed" : "active",
        completedAt: allDone ? new Date() : null,
      },
    });

    return NextResponse.json({ phases, currentPhase: nextPhase, completed: allDone });
  }

  if (body.action === "abandon") {
    await prisma.studyModeSession.update({
      where: { id: body.sessionId },
      data: { status: "abandoned" },
    });
    return NextResponse.json({ abandoned: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await prisma.studyModeSession.findFirst({
    where: { userId: uid, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ active });
}
