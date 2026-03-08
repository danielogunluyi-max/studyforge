import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type PomodoroAction = "start" | "pause" | "reset" | "skip";
type PomodoroPhase = "work" | "break";

type PomodoroState = {
  phase: PomodoroPhase;
  timeLeft: number;
  isRunning: boolean;
  startedAt: string | null;
  workSessionsCompleted: number;
};

type PomodoroBody = {
  action?: PomodoroAction;
  phase?: PomodoroPhase;
};

const WORK_SECONDS = 25 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;

function getDefaultState(): PomodoroState {
  return {
    phase: "work",
    timeLeft: WORK_SECONDS,
    isRunning: false,
    startedAt: null,
    workSessionsCompleted: 0,
  };
}

function parseState(value: unknown): PomodoroState {
  if (!value || typeof value !== "object") return getDefaultState();
  const state = value as Partial<PomodoroState>;
  return {
    phase: state.phase === "break" ? "break" : "work",
    timeLeft: typeof state.timeLeft === "number" ? Math.max(0, Math.floor(state.timeLeft)) : WORK_SECONDS,
    isRunning: Boolean(state.isRunning),
    startedAt: typeof state.startedAt === "string" ? state.startedAt : null,
    workSessionsCompleted:
      typeof state.workSessionsCompleted === "number" ? Math.max(0, Math.floor(state.workSessionsCompleted)) : 0,
  };
}

function deriveTimeLeft(state: PomodoroState): number {
  if (!state.isRunning || !state.startedAt) return state.timeLeft;
  const startedAtMs = new Date(state.startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) return state.timeLeft;
  const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
  return Math.max(0, state.timeLeft - elapsed);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const room = await db.studyRoom.findUnique({
      where: { id },
      select: { id: true, hostId: true, pomodoroState: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== session.user.id) {
      return NextResponse.json({ error: "Only host can control Pomodoro" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as PomodoroBody;
    if (!body.action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const current = parseState(room.pomodoroState);
    const nowIso = new Date().toISOString();
    const currentTimeLeft = deriveTimeLeft(current);

    let nextState: PomodoroState = { ...current, timeLeft: currentTimeLeft };

    if (body.action === "start") {
      nextState = {
        ...nextState,
        isRunning: true,
        startedAt: nowIso,
      };
    }

    if (body.action === "pause") {
      nextState = {
        ...nextState,
        isRunning: false,
        startedAt: null,
      };
    }

    if (body.action === "reset") {
      const phase = body.phase === "break" ? "break" : "work";
      nextState = {
        ...nextState,
        phase,
        timeLeft: phase === "work" ? WORK_SECONDS : SHORT_BREAK_SECONDS,
        isRunning: false,
        startedAt: null,
        workSessionsCompleted: phase === "work" ? 0 : nextState.workSessionsCompleted,
      };
    }

    if (body.action === "skip") {
      if (nextState.phase === "work") {
        const completed = nextState.workSessionsCompleted + 1;
        const longBreak = completed % 4 === 0;
        nextState = {
          ...nextState,
          phase: "break",
          timeLeft: longBreak ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS,
          isRunning: false,
          startedAt: null,
          workSessionsCompleted: completed,
        };
      } else {
        nextState = {
          ...nextState,
          phase: "work",
          timeLeft: WORK_SECONDS,
          isRunning: false,
          startedAt: null,
        };
      }
    }

    const updated = await db.studyRoom.update({
      where: { id },
      data: { pomodoroState: nextState },
      select: { pomodoroState: true },
    });

    return NextResponse.json({ pomodoroState: updated.pomodoroState });
  } catch (error) {
    console.error("Room pomodoro error:", error);
    return NextResponse.json({ error: "Failed to update Pomodoro" }, { status: 500 });
  }
}
