"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Member = {
  userId: string;
  status: "studying" | "on_break" | "away";
  user: {
    id: string;
    name: string | null;
  };
};

type PomodoroState = {
  phase: "work" | "break";
  timeLeft: number;
  isRunning: boolean;
  startedAt: string | null;
  workSessionsCompleted: number;
};

type RoomState = {
  id: string;
  name: string;
  subject: string;
  hostId: string;
  host?: {
    id: string;
    name: string | null;
  };
  createdAt?: string;
  pomodoroState?: PomodoroState | null;
};

type FeedItem = {
  id: number;
  timestamp: number;
  message: string;
};

const WORK_SECONDS = 25 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;

function statusColor(status: string) {
  if (status === "studying") return "var(--accent-green)";
  if (status === "on_break") return "var(--accent-orange)";
  return "var(--text-muted)";
}

function statusEmoji(status: string) {
  if (status === "studying") return "📚";
  if (status === "on_break") return "☕";
  return "👋";
}

function statusLabel(status: string) {
  if (status === "studying") return "Studying";
  if (status === "on_break") return "On break";
  return "Away";
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function timerDuration(state: PomodoroState | null) {
  if (!state) return WORK_SECONDS;
  if (state.phase === "work") return WORK_SECONDS;
  return state.timeLeft > SHORT_BREAK_SECONDS ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
}

export default function RoomInteriorPage() {
  const params = useParams<{ id: string }>();
  const roomId = String(params.id ?? "");
  const router = useRouter();
  const { data: session } = useSession();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pomodoroState, setPomodoroState] = useState<PomodoroState | null>(null);
  const [myStatus, setMyStatus] = useState<"studying" | "on_break" | "away">("studying");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [clockTick, setClockTick] = useState(0);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioReadyRef = useRef(false);
  const prevMembersRef = useRef<Map<string, { name: string; status: string }>>(new Map());
  const prevPhaseRef = useRef<"work" | "break" | null>(null);
  const initializedMembersRef = useRef(false);

  const addFeed = (message: string) => {
    setFeed((prev) => {
      const next = [...prev, { id: Date.now() + Math.floor(Math.random() * 1000), timestamp: Date.now(), message }];
      return next.slice(-20);
    });
  };

  const leaveRoom = async () => {
    if (!roomId) return;
    await fetch(`/api/rooms/${roomId}/leave`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  };

  const postHeartbeat = async (status: "studying" | "on_break" | "away") => {
    if (!roomId) return;
    await fetch(`/api/rooms/${roomId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
      keepalive: true,
    }).catch(() => {});
  };

  const controlPomodoro = async (action: "start" | "pause" | "reset" | "skip") => {
    if (!roomId) return;
    const response = await fetch(`/api/rooms/${roomId}/pomodoro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);

    if (!response?.ok) {
      addFeed("Could not update shared timer");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as { pomodoroState?: PomodoroState };
    if (data.pomodoroState) {
      setPomodoroState(data.pomodoroState);
    }

    if (action === "start") addFeed("Timer started! 25:00 ▶");
    if (action === "pause") addFeed("Timer paused ⏸");
    if (action === "skip") addFeed("Phase skipped ⏭");
    if (action === "reset") addFeed("Timer reset ↺");
  };

  useEffect(() => {
    const maybeEnableAudio = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state !== "running") {
        await audioContextRef.current.resume().catch(() => {});
      }
      audioReadyRef.current = audioContextRef.current.state === "running";
    };

    const onInteract = () => {
      void maybeEnableAudio();
    };

    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract);

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  const playPhaseChime = () => {
    if (!audioReadyRef.current || !audioContextRef.current) return;

    const context = audioContextRef.current;
    const tones = [880, 1046, 1318];
    const now = context.currentTime;

    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0;

      oscillator.connect(gain);
      gain.connect(context.destination);

      const startAt = now + index * 0.06;
      const endAt = startAt + 0.04;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

      oscillator.start(startAt);
      oscillator.stop(endAt + 0.01);
    });
  };

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;
    let eventSource: EventSource | null = null;
    let heartbeatInterval: number | null = null;

    const joinRoom = async () => {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
      }).catch(() => null);

      const data = (await response?.json().catch(() => ({}))) as {
        success?: boolean;
        room?: RoomState & { members?: Member[]; pomodoroState?: PomodoroState };
        error?: string;
      };

      if (!mounted) return;

      if (!response?.ok || !data.room) {
        setError(data.error ?? "Could not join this room");
        return;
      }

      setRoom(data.room);
      setMembers(Array.isArray(data.room.members) ? data.room.members : []);
      setPomodoroState((data.room.pomodoroState as PomodoroState | null) ?? null);
      setError("");

      addFeed(`${session?.user?.name ?? "You"} joined the room 👋`);

      eventSource = new EventSource(`/api/rooms/${roomId}/events`);
      eventSource.onmessage = (event) => {
        const payload = JSON.parse(event.data) as {
          members?: Member[];
          pomodoroState?: PomodoroState | null;
          room?: Partial<RoomState>;
        };

        if (!mounted) return;
        if (Array.isArray(payload.members)) setMembers(payload.members);
        if (payload.pomodoroState) setPomodoroState(payload.pomodoroState);
        if (payload.room) {
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              ...payload.room,
            };
          });
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };

      void postHeartbeat(myStatus);
      heartbeatInterval = window.setInterval(() => {
        void postHeartbeat(myStatus);
      }, 30000);
    };

    const onBeforeUnload = () => {
      const url = `/api/rooms/${roomId}/leave`;
      if (navigator.sendBeacon) {
        const blob = new Blob(["{}"], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        void fetch(url, { method: "POST", keepalive: true });
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    void joinRoom();

    return () => {
      mounted = false;
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (eventSource) eventSource.close();
      if (heartbeatInterval) window.clearInterval(heartbeatInterval);
      void leaveRoom();
    };
  }, [roomId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick((tick) => tick + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!members.length) return;

    const currentMap = new Map<string, { name: string; status: string }>();
    members.forEach((member) => {
      currentMap.set(member.userId, {
        name: member.user.name ?? "Student",
        status: member.status,
      });
    });

    if (!initializedMembersRef.current) {
      initializedMembersRef.current = true;
      prevMembersRef.current = currentMap;
      return;
    }

    const previousMap = prevMembersRef.current;

    currentMap.forEach((value, userId) => {
      if (!previousMap.has(userId)) {
        addFeed(`${value.name} joined the room 👋`);
        return;
      }

      const previous = previousMap.get(userId);
      if (previous && previous.status !== value.status) {
        if (value.status === "on_break") addFeed(`${value.name} is on break ☕`);
        if (value.status === "studying") addFeed(`${value.name} is back to studying 📚`);
        if (value.status === "away") addFeed(`${value.name} is away 👋`);
      }
    });

    previousMap.forEach((value, userId) => {
      if (!currentMap.has(userId)) {
        addFeed(`${value.name} left the room`);
      }
    });

    prevMembersRef.current = currentMap;
  }, [members]);

  useEffect(() => {
    if (!pomodoroState?.phase) return;

    const previousPhase = prevPhaseRef.current;
    if (previousPhase && previousPhase !== pomodoroState.phase) {
      if (pomodoroState.phase === "break") {
        addFeed("Break time! 5:00 🎉");
      } else {
        addFeed("Focus session started! 25:00 ▶");
      }

      playPhaseChime();

      if (previousPhase === "work" && pomodoroState.phase === "break") {
        fetch("/api/nova", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "DECK_COMPLETED" }),
        }).catch(() => {});
      }
    }

    prevPhaseRef.current = pomodoroState.phase;
  }, [pomodoroState?.phase]);

  useEffect(() => {
    if (!feedEndRef.current) return;
    feedEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [feed]);

  const currentUserId = session?.user?.id ?? "";
  const isHost = Boolean(room && room.hostId === currentUserId);

  const effectiveTimeLeft = useMemo(() => {
    void clockTick;
    if (!pomodoroState) return WORK_SECONDS;
    if (!pomodoroState.isRunning || !pomodoroState.startedAt) return pomodoroState.timeLeft;

    const startedMs = new Date(pomodoroState.startedAt).getTime();
    if (!Number.isFinite(startedMs)) return pomodoroState.timeLeft;
    const elapsed = Math.floor((Date.now() - startedMs) / 1000);
    return Math.max(0, pomodoroState.timeLeft - elapsed);
  }, [pomodoroState, clockTick]);

  const duration = timerDuration(pomodoroState);
  const progress = Math.max(0, Math.min(1, effectiveTimeLeft / duration));
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const sessionOfFour = pomodoroState ? (pomodoroState.workSessionsCompleted % 4) + 1 : 1;

  const activeCount = members.length;

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-6">
        <div className="card max-w-[720px] mx-auto p-5">
          <h1 className="text-title mb-2">Could not open room</h1>
          <p className="text-[var(--accent-red)]">{error}</p>
          <button className="btn btn-primary mt-3.5" onClick={() => router.push("/rooms")}>Back to Rooms</button>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-[var(--bg-base)] p-6">
        <div className="skeleton max-w-[980px] h-[420px] mx-auto rounded-[14px]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] px-4 py-6 pb-24 md:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <button className="btn btn-ghost mb-2.5" onClick={() => router.push("/rooms")}>
              ← All Rooms
            </button>
            <h1 className="text-title mb-1">{room.name}</h1>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="badge bg-[rgba(59,130,246,0.15)] text-[var(--accent-blue)] border border-[var(--accent-blue)]">
                {room.subject}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{activeCount} studying now</span>
            </div>
          </div>

          <button
            className="btn btn-danger"
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              void leaveRoom().finally(() => {
                router.push("/rooms");
              });
            }}
          >
            Leave Room
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
            gap: 16,
          }}
        >
          <section className="card p-5">
            <div className="flex justify-center">
              <div className="relative w-[220px] h-[220px] flex items-center justify-center">
                <svg width="180" height="180" viewBox="0 0 200 200" aria-hidden="true">
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="var(--border-strong)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={pomodoroState?.phase === "break" ? "var(--accent-green)" : "var(--accent-blue)"}
                    strokeWidth="10"
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.5s linear" }}
                  />
                </svg>

                <div className="absolute text-center">
                  <p className="m-0 text-[44px] font-extrabold tracking-wider">{formatClock(effectiveTimeLeft)}</p>
                  <p className="mt-1.5 text-[var(--text-secondary)] text-[13px]">
                    {pomodoroState?.phase === "break" ? "Break Time" : "Focus Session"}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center mt-2 text-xs text-[var(--text-muted)]">
              Session {sessionOfFour} of 4
            </p>

            {isHost ? (
              <div className="flex gap-2 justify-center mt-4 flex-wrap">
                <button className="btn btn-primary" onClick={() => void controlPomodoro("start")} disabled={Boolean(pomodoroState?.isRunning)}>
                  ▶ Start
                </button>
                <button className="btn btn-ghost" onClick={() => void controlPomodoro("pause")} disabled={!pomodoroState?.isRunning}>
                  ⏸ Pause
                </button>
                <button className="btn btn-ghost" onClick={() => void controlPomodoro("skip")}>
                  ⏭ Skip
                </button>
                <button className="btn btn-ghost" onClick={() => void controlPomodoro("reset")}>
                  ↺ Reset
                </button>
              </div>
            ) : (
              <p className="text-center mt-3.5 text-[13px] text-[var(--text-secondary)]">
                {pomodoroState?.isRunning ? "Shared timer is running" : "⏱️ Waiting for host to start..."}
              </p>
            )}

            <div className="card mt-4 p-3.5 bg-[var(--bg-elevated)]">
              <p className="text-label mb-2.5">Live Activity</p>
              <div
                className="max-h-[220px] overflow-y-auto border border-[var(--border-default)] rounded-lg px-2.5 py-2 bg-[var(--bg-card)]"
              >
                {feed.length === 0 ? (
                  <p className="m-0 text-xs text-[var(--text-muted)]">No activity yet</p>
                ) : (
                  feed.map((item) => (
                    <div
                      key={item.id}
                      className="text-xs text-[var(--text-muted)] py-1 border-b border-[var(--border-default)] flex gap-2 items-center"
                    >
                      <span className="text-[var(--text-muted)] shrink-0">
                        {formatTime(item.timestamp)}
                      </span>
                      <span>{item.message}</span>
                    </div>
                  ))
                )}
                <div ref={feedEndRef} />
              </div>
            </div>

            <div className="card mt-3.5 p-3.5">
              <p className="text-label mb-2">Your Status</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "studying", label: "📚 Studying" },
                  { key: "on_break", label: "☕ On Break" },
                  { key: "away", label: "👋 Away" },
                ].map((option) => {
                  const active = myStatus === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        const nextStatus = option.key as "studying" | "on_break" | "away";
                        setMyStatus(nextStatus);
                        void postHeartbeat(nextStatus);
                      }}
                      className="border-none rounded-full cursor-pointer px-3 py-2 text-xs font-semibold"
                      style={{
                        background: active ? "var(--accent-blue)" : "var(--bg-elevated)",
                        color: active ? "white" : "var(--text-secondary)",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="m-0 text-base font-bold">In This Room</h2>
              <span className="text-xs text-[var(--text-secondary)]">{members.length}</span>
            </div>

            <div>
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-2.5 py-2.5 border-b border-[var(--border-default)]"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{
                      background: member.userId === room.hostId ? "var(--accent-purple)" : "var(--bg-elevated)",
                      border: `2px solid ${statusColor(member.status)}`,
                    }}
                  >
                    {member.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>

                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      {member.user.name ?? "Student"}
                      {member.userId === room.hostId && (
                        <span className="text-[10px] text-[var(--accent-purple)]">HOST</span>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: statusColor(member.status) }}>
                      {statusEmoji(member.status)} {statusLabel(member.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card mt-4 p-3 bg-[var(--bg-elevated)]">
              <p className="text-label mb-2">Room Info</p>
              <div className="mb-2">
                <span className="badge bg-[rgba(59,130,246,0.15)] text-[var(--accent-blue)] border border-[var(--accent-blue)]">
                  {room.subject}
                </span>
              </div>
              <p className="m-0 text-xs text-[var(--text-secondary)]">
                Room created by {room.host?.name ?? "Host"}
              </p>
              <button className="btn btn-ghost mt-2.5 w-full">
                Report Room
              </button>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          main [style*="grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
