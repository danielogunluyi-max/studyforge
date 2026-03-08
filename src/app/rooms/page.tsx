"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RoomMember = {
  userId: string;
  status: string;
  user: {
    id: string;
    name: string | null;
  };
};

type StudyRoom = {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  isPublic: boolean;
  maxMembers: number;
  pomodoroState: {
    phase: "work" | "break";
    timeLeft: number;
    isRunning: boolean;
  } | null;
  host: {
    id: string;
    name: string | null;
  };
  members: RoomMember[];
  activeMemberCount: number;
};

type RoomsResponse = {
  rooms?: StudyRoom[];
  error?: string;
};

const SUBJECT_FILTERS = [
  "All",
  "Math",
  "Science",
  "English",
  "History",
  "French",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
];

const SUBJECT_SUGGESTIONS = SUBJECT_FILTERS.filter((item) => item !== "All");

function randomInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function memberColor(index: number) {
  const palette = [
    "var(--accent-purple)",
    "var(--accent-blue)",
    "var(--accent-green)",
    "var(--accent-orange)",
    "var(--accent-red)",
  ];
  return palette[index % palette.length] ?? "var(--accent-purple)";
}

export default function RoomsLobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [creating, setCreating] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [inviteCode, setInviteCode] = useState(randomInviteCode());

  const loadRooms = async () => {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as RoomsResponse;
      if (!response.ok) {
        setError(data.error ?? "Failed to load rooms");
        return;
      }
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setError("");
    } catch {
      setError("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRooms();
    const interval = window.setInterval(() => {
      void loadRooms();
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isPublic) return;
    setInviteCode(randomInviteCode());
  }, [isPublic]);

  const visibleRooms = useMemo(() => {
    if (activeFilter === "All") return rooms;
    return rooms.filter((room) => room.subject.toLowerCase() === activeFilter.toLowerCase());
  }, [rooms, activeFilter]);

  const totalActive = useMemo(
    () => rooms.reduce((sum, room) => sum + room.members.length, 0),
    [rooms],
  );

  const createRoom = async () => {
    if (!roomName.trim() || !subject.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim(),
          subject: subject.trim(),
          description: description.trim() || undefined,
          isPublic,
          maxMembers,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { room?: { id: string }; error?: string };
      if (!response.ok || !data.room?.id) {
        setError(data.error ?? "Failed to create room");
        return;
      }

      setShowCreate(false);
      router.push(`/rooms/${data.room.id}`);
    } catch {
      setError("Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        padding: "28px 20px 100px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", gap: 16 }}>
          <div>
            <h1 className="text-title">Study Rooms 🏠</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
              Study together in real time - shared focus, shared Pomodoro
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Room
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent-green)",
              boxShadow: "0 0 0 3px rgba(16,185,129,0.2)",
              animation: "pulse-green 2s infinite",
            }}
          />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {totalActive} students studying right now
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            marginBottom: 18,
          }}
        >
          {SUBJECT_FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  padding: "8px 14px",
                  background: active ? "var(--accent-blue)" : "var(--bg-elevated)",
                  color: active ? "white" : "var(--text-muted)",
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 16, borderColor: "var(--accent-red)", color: "var(--accent-red)", padding: "10px 14px" }}>
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton" style={{ height: 220, borderRadius: 14 }} />
              ))
            : null}

          {!loading && visibleRooms.map((room) => (
            <div key={room.id} className="card" style={{ padding: "20px", position: "relative", transition: "transform 0.2s ease" }}>
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid var(--accent-green)",
                  color: "var(--accent-green)",
                  borderRadius: "20px",
                  padding: "2px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                ● LIVE
              </div>

              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)", marginBottom: "4px" }}>
                {room.name}
              </h3>
              <span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", border: "1px solid var(--accent-blue)" }}>
                {room.subject}
              </span>

              {room.description && (
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "8px 0", lineHeight: 1.5 }}>
                  {room.description}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "12px 0" }}>
                {room.members.slice(0, 5).map((member, index) => (
                  <div
                    key={member.userId}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: memberColor(index),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "white",
                      border: "2px solid var(--bg-card)",
                    }}
                  >
                    {member.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                ))}

                {room.members.length > 5 && (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    +{room.members.length - 5} more
                  </span>
                )}

                <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginLeft: "auto" }}>
                  {room.members.length}/{room.maxMembers}
                </span>
              </div>

              {room.pomodoroState?.isRunning && (
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  ⏱️ {room.pomodoroState.phase === "work" ? "Pomodoro running" : "On break"} - {Math.floor(room.pomodoroState.timeLeft / 60)}:{String(room.pomodoroState.timeLeft % 60).padStart(2, "0")} left
                </div>
              )}

              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                Hosted by {room.host.name ?? "Host"}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={() => router.push(`/rooms/${room.id}`)}
                disabled={room.members.length >= room.maxMembers}
              >
                {room.members.length >= room.maxMembers ? "Room Full" : "Join Room →"}
              </button>
            </div>
          ))}

          {!loading && visibleRooms.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 24px", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏠</div>
              <p className="text-title" style={{ fontSize: 24 }}>No rooms right now</p>
              <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
                Be the first to start a study session!
              </p>
              <button className="btn btn-primary" style={{ marginTop: "24px" }} onClick={() => setShowCreate(true)}>
                Create a Room
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              padding: 20,
            }}
          >
            <h2 className="text-title" style={{ fontSize: 24, marginBottom: 16 }}>Create Study Room</h2>

            <label className="text-label" style={{ display: "block", marginBottom: 6 }}>Room Name</label>
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Nightly Physics Sprint"
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: 10,
                color: "var(--text-primary)",
                padding: "10px 12px",
                marginBottom: 12,
              }}
            />

            <label className="text-label" style={{ display: "block", marginBottom: 6 }}>Subject</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Physics"
              list="room-subjects"
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: 10,
                color: "var(--text-primary)",
                padding: "10px 12px",
                marginBottom: 12,
              }}
            />
            <datalist id="room-subjects">
              {SUBJECT_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            <label className="text-label" style={{ display: "block", marginBottom: 6 }}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Open focus room for final exam prep"
              style={{
                width: "100%",
                resize: "vertical",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: 10,
                color: "var(--text-primary)",
                padding: "10px 12px",
                marginBottom: 14,
              }}
            />

            <label className="text-label" style={{ display: "block", marginBottom: 8 }}>Max Members</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[2, 5, 10, 20].map((size) => {
                const active = maxMembers === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setMaxMembers(size)}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      cursor: "pointer",
                      padding: "7px 12px",
                      background: active ? "var(--accent-blue)" : "var(--bg-elevated)",
                      color: active ? "white" : "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <label className="text-label" style={{ display: "block", marginBottom: 8 }}>Visibility</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  padding: "8px 14px",
                  background: isPublic ? "var(--accent-blue)" : "var(--bg-elevated)",
                  color: isPublic ? "white" : "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  padding: "8px 14px",
                  background: !isPublic ? "var(--accent-blue)" : "var(--bg-elevated)",
                  color: !isPublic ? "white" : "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Private
              </button>
            </div>

            {!isPublic && (
              <div className="card" style={{ padding: "10px 12px", marginBottom: 14, background: "var(--bg-elevated)" }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Invite code</p>
                <p style={{ margin: "6px 0 0", fontSize: 18, letterSpacing: 1.5, color: "var(--text-primary)", fontWeight: 800 }}>{inviteCode}</p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={creating || !roomName.trim() || !subject.trim()} onClick={() => void createRoom()}>
                {creating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </main>
  );
}
