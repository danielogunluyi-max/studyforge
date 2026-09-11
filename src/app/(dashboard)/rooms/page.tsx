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
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="kv-crumb">Kyvex / <b>Study Rooms</b></div>
            <h1 className="kv-title" style={{ marginTop: 14 }}>Study Rooms</h1>
            <p className="kv-sub" style={{ marginTop: 10 }}>
              Study together in real time - shared focus, shared Pomodoro
            </p>
          </div>
          <button type="button" className="kv-btn" onClick={() => setShowCreate(true)}>
            Create Room
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
          <span className="dot" aria-hidden />
          <span className="kv-meta">{totalActive} students studying right now</span>
        </div>

        <div className="kv-tabs" style={{ marginTop: 22, overflowX: "auto", flexWrap: "wrap" }}>
          {SUBJECT_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={filter === activeFilter ? "kv-tab on" : "kv-tab"}
            >
              {filter}
            </button>
          ))}
        </div>

        {error ? (
          <p className="kv-meta" style={{ marginTop: 16, color: "#E5484D" }}>{error}</p>
        ) : null}

        {loading ? (
          <p className="kv-meta" style={{ marginTop: 24 }}>Loading rooms</p>
        ) : null}

        {!loading && visibleRooms.map((room) => {
          const full = room.members.length >= room.maxMembers;
          return (
            <div key={room.id} className="kv-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="kv-row-title">{room.name}</div>
                <div className="kv-row-sub">
                  <span className="kv-chip">{room.subject}</span>
                  {room.isPublic ? null : <span className="kv-chip">Private</span>}
                </div>
                {room.description ? (
                  <p className="kv-meta" style={{ marginTop: 6 }}>{room.description}</p>
                ) : null}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {room.members.slice(0, 5).map((member) => (
                    <span key={member.userId} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <i className="frame-dot" aria-hidden />
                      <span className="kv-avatar">
                        {member.user.name?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    </span>
                  ))}
                  {room.members.length > 5 ? (
                    <span className="kv-meta">+{room.members.length - 5}</span>
                  ) : null}
                </div>
                {room.pomodoroState?.isRunning ? (
                  <p className="kv-meta" style={{ marginTop: 6 }}>
                    {room.pomodoroState.phase === "work" ? "Pomodoro running" : "On break"}
                    {" · "}
                    <span className="num">
                      {Math.floor(room.pomodoroState.timeLeft / 60)}:{String(room.pomodoroState.timeLeft % 60).padStart(2, "0")}
                    </span>
                    {" left"}
                  </p>
                ) : null}
                <p className="kv-meta" style={{ marginTop: 6 }}>
                  Hosted by {room.host.name ?? "Host"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span className="dot" aria-hidden />
                <span className="kv-meta">Live</span>
                <span className="kv-row-side">{room.members.length}/{room.maxMembers}</span>
                <button
                  type="button"
                  className="kv-btn-ghost"
                  onClick={() => router.push(`/rooms/${room.id}`)}
                  disabled={full}
                >
                  {full ? "Room full" : "Join"}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && visibleRooms.length === 0 ? (
          <div style={{ marginTop: 32, paddingTop: 32, borderTop: "1px solid var(--border-default)", textAlign: "center" }}>
            <h2 className="kv-title" style={{ fontSize: 22 }}>No rooms right now</h2>
            <p className="kv-sub" style={{ margin: "10px auto 0" }}>
              Be the first to start a study session!
            </p>
            <button type="button" className="kv-btn" style={{ marginTop: 20 }} onClick={() => setShowCreate(true)}>
              Create a Room
            </button>
          </div>
        ) : null}
      </div>

      {showCreate ? (
        <div
          onClick={() => setShowCreate(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 16px",
            overflowY: "auto",
            background: "rgba(0,0,0,0.72)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              border: "1px solid var(--border-default)",
              background: "var(--bg-base)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border-default)" }}>
              <h2 className="kv-title" style={{ fontSize: 18, margin: 0 }}>Create Study Room</h2>
              <button type="button" className="kv-btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>

            <div style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
              <div>
                <label className="kv-meta" htmlFor="room-name" style={{ display: "block", marginBottom: 8 }}>Room Name</label>
                <input
                  id="room-name"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Nightly Physics Sprint"
                  className="kv-field"
                />
              </div>

              <div>
                <label className="kv-meta" htmlFor="room-subject" style={{ display: "block", marginBottom: 8 }}>Subject</label>
                <input
                  id="room-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Physics"
                  list="room-subjects"
                  className="kv-field"
                />
                <datalist id="room-subjects">
                  {SUBJECT_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="kv-meta" htmlFor="room-description" style={{ display: "block", marginBottom: 8 }}>Description (optional)</label>
                <textarea
                  id="room-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Open focus room for final exam prep"
                  className="kv-field"
                />
              </div>

              <div>
                <p className="kv-meta" style={{ marginBottom: 8 }}>Max Members</p>
                <div className="kv-tabs" style={{ flexWrap: "wrap" }}>
                  {[2, 5, 10, 20].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setMaxMembers(size)}
                      className={maxMembers === size ? "kv-tab on" : "kv-tab"}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="kv-meta" style={{ marginBottom: 8 }}>Visibility</p>
                <div className="kv-tabs">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={isPublic ? "kv-tab on" : "kv-tab"}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={!isPublic ? "kv-tab on" : "kv-tab"}
                  >
                    Private
                  </button>
                </div>
              </div>

              {!isPublic ? (
                <div>
                  <p className="kv-meta">Invite code</p>
                  <p className="num" style={{ marginTop: 8, fontSize: 18, fontWeight: 600, letterSpacing: "0.12em" }}>{inviteCode}</p>
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                <button type="button" className="kv-btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button
                  type="button"
                  className="kv-btn"
                  disabled={creating || !roomName.trim() || !subject.trim()}
                  onClick={() => void createRoom()}
                >
                  {creating ? "Creating..." : "Create Room"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
