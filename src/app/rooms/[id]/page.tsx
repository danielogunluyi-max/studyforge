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
      <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: 24 }}>
        <div className="card" style={{ maxWidth: 720, margin: "0 auto", padding: 22 }}>
          <h1 className="text-title" style={{ marginBottom: 8 }}>Could not open room</h1>
          <p style={{ color: "var(--accent-red)" }}>{error}</p>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => router.push("/rooms")}>Back to Rooms</button>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-base)", padding: 24 }}>
        <div className="skeleton" style={{ maxWidth: 980, height: 420, margin: "0 auto", borderRadius: 14 }} />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "24px 18px 100px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
          <div>
            <button className="btn btn-ghost" onClick={() => router.push("/rooms")} style={{ marginBottom: 10 }}>
              ← All Rooms
            </button>
            <h1 className="text-title" style={{ marginBottom: 4 }}>{room.name}</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", border: "1px solid var(--accent-blue)" }}>
                {room.subject}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{activeCount} studying now</span>
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
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

                <div style={{ position: "absolute", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: 1 }}>{formatClock(effectiveTimeLeft)}</p>
                  <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
                    {pomodoroState?.phase === "break" ? "Break Time" : "Focus Session"}
                  </p>
                </div>
              </div>
            </div>

            <p style={{ textAlign: "center", margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              Session {sessionOfFour} of 4
            </p>

            {isHost ? (
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
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
              <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--text-secondary)" }}>
                {pomodoroState?.isRunning ? "Shared timer is running" : "⏱️ Waiting for host to start..."}
              </p>
            )}

            <div className="card" style={{ marginTop: 18, padding: 14, background: "var(--bg-elevated)" }}>
              <p className="text-label" style={{ marginBottom: 10 }}>Live Activity</p>
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: "var(--bg-card)",
                }}
              >
                {feed.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>No activity yet</p>
                ) : (
                  feed.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        padding: "4px 0",
                        borderBottom: "1px solid var(--border-default)",
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                        {formatTime(item.timestamp)}
                      </span>
                      <span>{item.message}</span>
                    </div>
                  ))
                )}
                <div ref={feedEndRef} />
              </div>
            </div>

            <div className="card" style={{ marginTop: 14, padding: 14 }}>
              <p className="text-label" style={{ marginBottom: 8 }}>Your Status</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                      style={{
                        border: "none",
                        borderRadius: 999,
                        cursor: "pointer",
                        padding: "8px 12px",
                        background: active ? "var(--accent-blue)" : "var(--bg-elevated)",
                        color: active ? "white" : "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>In This Room</h2>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{members.length}</span>
            </div>

            <div>
              {members.map((member) => (
                <div
                  key={member.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: member.userId === room.hostId ? "var(--accent-purple)" : "var(--bg-elevated)",
                      border: `2px solid ${statusColor(member.status)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {member.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      {member.user.name ?? "Student"}
                      {member.userId === room.hostId && (
                        <span style={{ fontSize: "10px", color: "var(--accent-purple)" }}>HOST</span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: statusColor(member.status) }}>
                      {statusEmoji(member.status)} {statusLabel(member.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 16, padding: 12, background: "var(--bg-elevated)" }}>
              <p className="text-label" style={{ marginBottom: 8 }}>Room Info</p>
              <div style={{ marginBottom: 8 }}>
                <span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", border: "1px solid var(--accent-blue)" }}>
                  {room.subject}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
                Room created by {room.host?.name ?? "Host"}
              </p>
              <button className="btn btn-ghost" style={{ marginTop: 10, width: "100%" }}>
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
