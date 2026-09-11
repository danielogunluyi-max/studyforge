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
  const isHost = Boolean(room?.hostId === currentUserId);

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
      <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="kv-crumb">Kyvex / <b>Study Rooms</b></div>
          <h1 className="kv-title" style={{ marginTop: 14 }}>Could not open room</h1>
          <p className="kv-sub" style={{ marginTop: 10, color: "#E5484D" }}>{error}</p>
          <button type="button" className="kv-btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push("/rooms")}>
            Back to Rooms
          </button>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="kv-crumb">Kyvex / <b>Study Rooms</b></div>
          <p className="kv-meta" style={{ marginTop: 24 }}>Loading room</p>
        </div>
      </main>
    );
  }

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="kv-crumb">Kyvex / <b>Study Rooms</b></div>
            <h1 className="kv-title" style={{ marginTop: 14 }}>{room.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span className="kv-chip">{room.subject}</span>
              <span className="dot" aria-hidden />
              <span className="kv-meta">{activeCount} studying now</span>
            </div>
          </div>

          <button
            type="button"
            className="kv-btn-danger"
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

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 28 }}>
          <section style={{ flex: "2 1 420px", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="180" height="180" viewBox="0 0 200 200" aria-hidden="true">
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="var(--border-default)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="var(--kv-accent)"
                    strokeWidth="10"
                    strokeLinecap="butt"
                    transform="rotate(-90 100 100)"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.5s linear" }}
                  />
                </svg>

                <div style={{ position: "absolute", textAlign: "center" }}>
                  <p className="num" style={{ margin: 0, fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em" }}>
                    {formatClock(effectiveTimeLeft)}
                  </p>
                  <p className="kv-meta" style={{ marginTop: 8 }}>
                    {pomodoroState?.phase === "break" ? "Break Time" : "Focus Session"}
                  </p>
                </div>
              </div>
            </div>

            <p className="kv-meta" style={{ textAlign: "center", marginTop: 8 }}>
              Session {sessionOfFour} of 4
            </p>

            {isHost ? (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                <button type="button" className="kv-btn" onClick={() => void controlPomodoro("start")} disabled={Boolean(pomodoroState?.isRunning)}>
                  Start
                </button>
                <button type="button" className="kv-btn-ghost" onClick={() => void controlPomodoro("pause")} disabled={!pomodoroState?.isRunning}>
                  Pause
                </button>
                <button type="button" className="kv-btn-ghost" onClick={() => void controlPomodoro("skip")}>
                  Skip
                </button>
                <button type="button" className="kv-btn-ghost" onClick={() => void controlPomodoro("reset")}>
                  Reset
                </button>
              </div>
            ) : (
              <p className="kv-meta" style={{ textAlign: "center", marginTop: 16 }}>
                {pomodoroState?.isRunning ? "Shared timer is running" : "Waiting for host to start"}
              </p>
            )}

            <p className="kv-meta" style={{ marginTop: 28 }}>Live Activity</p>
            <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 8 }}>
              {feed.length === 0 ? (
                <p className="kv-meta">No activity yet</p>
              ) : (
                feed.map((item) => (
                  <div key={item.id} className="kv-row">
                    <span className="kv-row-title" style={{ fontWeight: 400, fontSize: 13 }}>{item.message}</span>
                    <span className="kv-meta">{formatTime(item.timestamp)}</span>
                  </div>
                ))
              )}
              <div ref={feedEndRef} />
            </div>

            <p className="kv-meta" style={{ marginTop: 28 }}>Your Status</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {[
                { key: "studying" as const, label: "Studying" },
                { key: "on_break" as const, label: "On Break" },
                { key: "away" as const, label: "Away" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    const nextStatus = option.key;
                    setMyStatus(nextStatus);
                    void postHeartbeat(nextStatus);
                  }}
                  className={myStatus === option.key ? "kv-btn-ghost on" : "kv-btn-ghost"}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <aside style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div className="kv-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <h2 className="kv-row-title" style={{ margin: 0 }}>In This Room</h2>
              <span className="kv-row-side">{members.length}</span>
            </div>

            {members.map((member) => {
              const live = member.status === "studying";
              return (
                <div key={member.userId} className="kv-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <i className={live ? "dot" : "frame-dot"} aria-hidden />
                    <span className="kv-avatar">
                      {member.user.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="kv-row-title" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {member.user.name ?? "Student"}
                        {member.userId === room.hostId ? (
                          <span className="kv-chip">Host</span>
                        ) : null}
                      </div>
                      <div className="kv-meta" style={{ marginTop: 4 }}>{statusLabel(member.status)}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            <p className="kv-meta" style={{ marginTop: 28 }}>Room Info</p>
            <div className="kv-row-sub" style={{ marginTop: 10 }}>
              <span className="kv-chip">{room.subject}</span>
            </div>
            <p className="kv-meta" style={{ marginTop: 10 }}>
              Room created by {room.host?.name ?? "Host"}
            </p>
            <button type="button" className="kv-btn-ghost" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
              Report Room
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
