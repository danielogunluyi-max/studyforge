"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TimerMode = "work" | "break";
type TimerState = "idle" | "running" | "paused" | "break";

type SavedPomodoroState = {
  workMinutes: number;
  breakMinutes: number;
  mode: TimerMode;
  timerState: TimerState;
  timeLeft: number;
  isRunning: boolean;
  sessionCount: number;
  phaseTotal: number;
  isCollapsed: boolean;
  savedAt: number;
};

type SavedPosition = {
  x: number;
  y: number;
};

const BASE_LEFT = 16;
const BASE_BOTTOM = 16;
const POSITION_KEY = "kyvex:pomodoro-widget-position";
const STATE_KEY = "kyvex:pomodoro-widget-state";
const DEFAULT_WORK_MIN = 25;
const DEFAULT_BREAK_MIN = 5;
const LONG_BREAK_MIN = 15;

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clampMinutes(value: number) {
  if (!Number.isFinite(value)) return 5;
  return Math.max(5, Math.min(60, Math.round(value / 5) * 5));
}

function isSavedPomodoroState(value: unknown): value is SavedPomodoroState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedPomodoroState>;
  return (
    typeof candidate.workMinutes === "number" &&
    typeof candidate.breakMinutes === "number" &&
    (candidate.mode === "work" || candidate.mode === "break") &&
    (candidate.timerState === "idle" || candidate.timerState === "running" || candidate.timerState === "paused" || candidate.timerState === "break") &&
    typeof candidate.timeLeft === "number" &&
    typeof candidate.isRunning === "boolean" &&
    typeof candidate.sessionCount === "number" &&
    typeof candidate.phaseTotal === "number" &&
    typeof candidate.isCollapsed === "boolean" &&
    typeof candidate.savedAt === "number"
  );
}

function isSavedPosition(value: unknown): value is SavedPosition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedPosition>;
  return typeof candidate.x === "number" && typeof candidate.y === "number";
}

function playSoftChime() {
  if (typeof window === "undefined") return;

  const AudioCtx = window.AudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.3;
    gainNode.connect(ctx.destination);

    const tones = [880, 1046, 1318];
    let start = ctx.currentTime;

    tones.forEach((freq) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      oscGain.gain.setValueAtTime(0, start);
      oscGain.gain.linearRampToValueAtTime(0.3, start + 0.01);
      oscGain.gain.linearRampToValueAtTime(0, start + 0.04);

      osc.connect(oscGain);
      oscGain.connect(gainNode);
      osc.start(start);
      osc.stop(start + 0.04);

      start += 0.06;
    });

    window.setTimeout(() => {
      void ctx.close();
    }, 400);
  } catch {
    // Ignore audio errors on unsupported/locked contexts.
  }
}

export function PomodoroWidget() {
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MIN);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MIN);
  const [mode, setMode] = useState<TimerMode>("work");
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MIN * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  const [phaseTotal, setPhaseTotal] = useState(DEFAULT_WORK_MIN * 60);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const endAtRef = useRef<number | null>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const transitionLockRef = useRef(false);

  const ringRadius = 36;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * ringRadius;

  const progressColor = useMemo(() => {
    if (timerState === "paused" || timerState === "idle") return "var(--text-muted)";
    if (mode === "break") return "var(--accent-green)";
    return "var(--accent-blue)";
  }, [mode, timerState]);

  const strokeDashoffset = useMemo(() => {
    if (phaseTotal <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, timeLeft / phaseTotal));
    return circumference * (1 - ratio);
  }, [circumference, phaseTotal, timeLeft]);

  const clampOffset = useCallback((nextX: number, nextY: number) => {
    const width = widgetRef.current?.offsetWidth ?? 320;
    const height = widgetRef.current?.offsetHeight ?? 260;

    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxBottom = Math.max(0, window.innerHeight - height);

    const minOffsetX = -BASE_LEFT;
    const maxOffsetX = maxLeft - BASE_LEFT;
    const minOffsetY = BASE_BOTTOM - maxBottom;
    const maxOffsetY = BASE_BOTTOM;

    return {
      x: Math.max(minOffsetX, Math.min(maxOffsetX, nextX)),
      y: Math.max(minOffsetY, Math.min(maxOffsetY, nextY)),
    };
  }, []);

  const persistPosition = useCallback((nextOffset: { x: number; y: number }) => {
    try {
      sessionStorage.setItem(POSITION_KEY, JSON.stringify(nextOffset));
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const handlePhaseCompletion = useCallback(() => {
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;

    playSoftChime();

    if (mode === "work") {
      const isLongBreak = sessionCount >= 4;
      const nextSession = isLongBreak ? 1 : sessionCount + 1;
      const breakSeconds = (isLongBreak ? LONG_BREAK_MIN : breakMinutes) * 60;

      setSessionCount(nextSession);
      setMode("break");
      setTimerState("break");
      setTimeLeft(breakSeconds);
      setPhaseTotal(breakSeconds);
      setIsRunning(true);
      endAtRef.current = Date.now() + breakSeconds * 1000;
    } else {
      const workSeconds = workMinutes * 60;
      setMode("work");
      setTimerState("running");
      setTimeLeft(workSeconds);
      setPhaseTotal(workSeconds);
      setIsRunning(true);
      endAtRef.current = Date.now() + workSeconds * 1000;
    }

    window.setTimeout(() => {
      transitionLockRef.current = false;
    }, 0);
  }, [breakMinutes, mode, sessionCount, workMinutes]);

  const startTimer = () => {
    if (isRunning) return;
    setIsRunning(true);
    setTimerState(mode === "break" ? "break" : "running");
    endAtRef.current = Date.now() + Math.max(1, timeLeft) * 1000;
  };

  const pauseTimer = () => {
    if (!isRunning) return;

    if (endAtRef.current) {
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
    }

    endAtRef.current = null;
    setIsRunning(false);
    setTimerState("paused");
  };

  const resetTimer = () => {
    const workSeconds = workMinutes * 60;
    setMode("work");
    setTimerState("idle");
    setTimeLeft(workSeconds);
    setPhaseTotal(workSeconds);
    setIsRunning(false);
    setSessionCount(1);
    endAtRef.current = null;
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);

    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      startX: offset.x,
      startY: offset.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;

      const next = clampOffset(
        dragStartRef.current.startX + deltaX,
        dragStartRef.current.startY + deltaY,
      );
      setOffset(next);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      persistPosition(offset);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    // Start collapsed on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    try {
      const rawPos = sessionStorage.getItem(POSITION_KEY);
      if (rawPos) {
        const parsed = JSON.parse(rawPos) as unknown;
        if (isSavedPosition(parsed)) {
          setOffset(clampOffset(parsed.x, parsed.y));
        }
      }

      const rawState = sessionStorage.getItem(STATE_KEY);
      if (!rawState) return;
      const parsedState = JSON.parse(rawState) as unknown;
      if (!isSavedPomodoroState(parsedState)) return;

      const saved = parsedState;
      const nextWork = clampMinutes(saved.workMinutes);
      const nextBreak = clampMinutes(saved.breakMinutes);

      let nextMode = saved.mode;
      let nextSessionCount = Math.max(1, Math.min(4, saved.sessionCount));
      let nextPhaseTotal = Math.max(1, saved.phaseTotal);
      let nextTimeLeft = Math.max(0, saved.timeLeft);
      let nextIsRunning = saved.isRunning;
      let nextTimerState: TimerState = saved.timerState;

      if (saved.isRunning) {
        let elapsed = Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000));
        let remaining = nextTimeLeft - elapsed;

        while (remaining <= 0) {
          if (nextMode === "work") {
            const isLongBreak = nextSessionCount >= 4;
            nextSessionCount = isLongBreak ? 1 : nextSessionCount + 1;
            nextMode = "break";
            nextPhaseTotal = (isLongBreak ? LONG_BREAK_MIN : nextBreak) * 60;
            remaining += nextPhaseTotal;
          } else {
            nextMode = "work";
            nextPhaseTotal = nextWork * 60;
            remaining += nextPhaseTotal;
          }
        }

        nextTimeLeft = Math.max(1, remaining);
        nextIsRunning = true;
        nextTimerState = nextMode === "break" ? "break" : "running";
        endAtRef.current = Date.now() + nextTimeLeft * 1000;
      } else {
        endAtRef.current = null;
      }

      setWorkMinutes(nextWork);
      setBreakMinutes(nextBreak);
      setMode(nextMode);
      setSessionCount(nextSessionCount);
      setPhaseTotal(nextPhaseTotal);
      setTimeLeft(nextTimeLeft);
      setIsRunning(nextIsRunning);
      setTimerState(nextTimerState);
      setIsCollapsed(saved.isCollapsed);
    } catch {
      // Ignore malformed storage.
    }
  }, [clampOffset]);

  useEffect(() => {
    const onResize = () => {
      setOffset((current) => clampOffset(current.x, current.y));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampOffset]);

  useEffect(() => {
    persistPosition(offset);
  }, [offset, persistPosition]);

  useEffect(() => {
    const payload: SavedPomodoroState = {
      workMinutes,
      breakMinutes,
      mode,
      timerState,
      timeLeft,
      isRunning,
      sessionCount,
      phaseTotal,
      isCollapsed,
      savedAt: Date.now(),
    };

    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors.
    }
  }, [breakMinutes, isCollapsed, isRunning, mode, phaseTotal, sessionCount, timeLeft, timerState, workMinutes]);

  useEffect(() => {
    if (!isRunning) return;

    if (!endAtRef.current) {
      endAtRef.current = Date.now() + Math.max(1, timeLeft) * 1000;
    }

    const interval = window.setInterval(() => {
      if (!endAtRef.current) return;
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        handlePhaseCompletion();
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [handlePhaseCompletion, isRunning, timeLeft]);

  const updateWorkMinutes = (next: number) => {
    const clamped = clampMinutes(next);
    setWorkMinutes(clamped);

    if (!isRunning && mode === "work") {
      const workSeconds = clamped * 60;
      setPhaseTotal(workSeconds);
      setTimeLeft(workSeconds);
      if (timerState === "idle") setTimerState("idle");
    }
  };

  const updateBreakMinutes = (next: number) => {
    const clamped = clampMinutes(next);
    setBreakMinutes(clamped);

    if (!isRunning && mode === "break") {
      const breakSeconds = clamped * 60;
      setPhaseTotal(breakSeconds);
      setTimeLeft(breakSeconds);
      if (timerState === "idle") setTimerState("idle");
    }
  };

  const left = BASE_LEFT + offset.x;
  const bottom = BASE_BOTTOM - offset.y;

  return (
    <div
      style={{
        position: "fixed",
        left,
        bottom,
        zIndex: 40,
        width: isCollapsed ? 176 : 320,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <div
        ref={widgetRef}
        style={{
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        <div
          onMouseDown={startDrag}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            background: "var(--bg-card-hover)",
            borderBottom: isCollapsed ? "none" : "1px solid var(--border)",
            padding: "10px 12px",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 4px)",
                gridTemplateRows: "repeat(2, 4px)",
                gap: 3,
                opacity: 0.8,
              }}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={`pomodoro-grip-${index}`} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-secondary)" }} />
              ))}
            </span>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Pomodoro
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                setShowSettings((prev) => !prev);
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
              title="Timer settings"
            >
              ⚙
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCollapsed((prev) => !prev);
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
              title={isCollapsed ? "Expand timer" : "Collapse timer"}
            >
              {isCollapsed ? "📅" : "−"}
            </button>
          </div>
        </div>

        <div style={{ padding: "12px 12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: isCollapsed ? "center" : "flex-start" }}>
            <svg width="84" height="84" viewBox="0 0 84 84" aria-label="Pomodoro progress ring">
              <circle
                cx="42"
                cy="42"
                r={ringRadius}
                fill="none"
                stroke="var(--border)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx="42"
                cy="42"
                r={ringRadius}
                fill="none"
                stroke={progressColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 42 42)"
                style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.2s ease" }}
              />
              <text x="42" y="46" textAnchor="middle" style={{ fill: "var(--text-primary)", fontSize: 13, fontWeight: 700 }}>
                {formatTime(timeLeft)}
              </text>
            </svg>

            {!isCollapsed && (
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                  {timerState === "break" ? "Break" : timerState}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: progressColor }}>
                  {formatTime(timeLeft)}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Session {sessionCount} of 4
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={startTimer}
                    style={{
                      flex: 1,
                      border: "none",
                      borderRadius: 8,
                      background: "var(--accent-blue)",
                      color: "var(--text-primary)",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {timerState === "paused" ? "Resume" : "Start"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    style={{
                      flex: 1,
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--bg-card-hover)",
                      color: "var(--text-primary)",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Pause
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetTimer}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "transparent",
                    color: "var(--text-secondary)",
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>

              {showSettings && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card-hover)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <label htmlFor="pomodoro-work" style={{ fontSize: 12, color: "var(--text-secondary)" }}>Work Duration (minutes)</label>
                    <input
                      id="pomodoro-work"
                      type="number"
                      min={5}
                      max={60}
                      step={5}
                      value={workMinutes}
                      onChange={(event) => {
                        updateWorkMinutes(Number(event.target.value));
                      }}
                      style={{
                        height: 36,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        padding: "0 10px",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label htmlFor="pomodoro-break" style={{ fontSize: 12, color: "var(--text-secondary)" }}>Break Duration (minutes)</label>
                    <input
                      id="pomodoro-break"
                      type="number"
                      min={5}
                      max={60}
                      step={5}
                      value={breakMinutes}
                      onChange={(event) => {
                        updateBreakMinutes(Number(event.target.value));
                      }}
                      style={{
                        height: 36,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        padding: "0 10px",
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

