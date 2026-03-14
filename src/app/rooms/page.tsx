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
    <main className="kv-page min-h-screen bg-[var(--bg-base)] px-5 py-7 pb-24 text-[var(--text-primary)] md:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="kv-page-title">Study Rooms 🏠</h1>
            <p className="kv-page-subtitle mt-1 mb-0 text-[var(--text-secondary)]">
              Study together in real time - shared focus, shared Pomodoro
            </p>
          </div>
          <button className="kv-btn-primary" onClick={() => setShowCreate(true)}>
            + Create Room
          </button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <div className="h-2 w-2 animate-[pulse-green_2s_infinite] rounded-full bg-[var(--accent-green)] shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
          <span className="text-xs text-[var(--text-secondary)]">
            {totalActive} students studying right now
          </span>
        </div>

        <div className="kv-tabs mb-4 flex gap-2 overflow-x-auto pb-2">
          {SUBJECT_FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`kv-tab cursor-pointer whitespace-nowrap rounded-full border-none px-3.5 py-2 text-xs ${active ? "active" : ""}`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="kv-alert-error mb-4 border-[var(--accent-red)] px-3.5 py-2.5 text-[var(--accent-red)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-[220px] rounded-[14px]" />
              ))
            : null}

          {!loading && visibleRooms.map((room) => (
            <div key={room.id} className="kv-card relative p-5 transition-transform duration-200">
              <div className="absolute right-3 top-3 rounded-[20px] border border-[var(--accent-green)] bg-[rgba(16,185,129,0.15)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-green)]">
                ● LIVE
              </div>

              <h3 className="mb-1 text-base font-bold text-[var(--text-primary)]">
                {room.name}
              </h3>
              <span className="badge border border-[var(--accent-blue)] bg-[rgba(59,130,246,0.15)] text-[var(--accent-blue)]">
                {room.subject}
              </span>

              {room.description && (
                <p className="my-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  {room.description}
                </p>
              )}

              <div className="my-3 flex items-center gap-1.5">
                {room.members.slice(0, 5).map((member, index) => (
                  <div
                    key={member.userId}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--bg-card)] text-[11px] font-bold text-white"
                    style={{ background: memberColor(index) }}
                  >
                    {member.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                ))}

                {room.members.length > 5 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    +{room.members.length - 5} more
                  </span>
                )}

                <span className="ml-auto text-xs text-[var(--text-secondary)]">
                  {room.members.length}/{room.maxMembers}
                </span>
              </div>

              {room.pomodoroState?.isRunning && (
                <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)]">
                  ⏱️ {room.pomodoroState.phase === "work" ? "Pomodoro running" : "On break"} - {Math.floor(room.pomodoroState.timeLeft / 60)}:{String(room.pomodoroState.timeLeft % 60).padStart(2, "0")} left
                </div>
              )}

              <div className="mb-3 text-[11px] text-[var(--text-muted)]">
                Hosted by {room.host.name ?? "Host"}
              </div>

              <button
                className="kv-btn-primary w-full"
                onClick={() => router.push(`/rooms/${room.id}`)}
                disabled={room.members.length >= room.maxMembers}
              >
                {room.members.length >= room.maxMembers ? "Room Full" : "Join Room →"}
              </button>
            </div>
          ))}

          {!loading && visibleRooms.length === 0 && (
            <div className="kv-empty col-span-full px-6 py-20 text-center">
              <div className="mb-4 text-6xl">🏠</div>
              <p className="kv-page-title text-2xl">No rooms right now</p>
              <p className="mt-2 text-[var(--text-muted)]">
                Be the first to start a study session!
              </p>
              <button className="kv-btn-primary mt-6" onClick={() => setShowCreate(true)}>
                Create a Room
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-5"
        >
          <div
            className="kv-card w-full max-w-[560px] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="kv-page-title mb-4 text-2xl">Create Study Room</h2>

            <label className="kv-label mb-1.5 block">Room Name</label>
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Nightly Physics Sprint"
              className="kv-input mb-3 w-full px-3 py-2.5"
            />

            <label className="kv-label mb-1.5 block">Subject</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Physics"
              list="room-subjects"
              className="kv-input mb-3 w-full px-3 py-2.5"
            />
            <datalist id="room-subjects">
              {SUBJECT_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            <label className="kv-label mb-1.5 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Open focus room for final exam prep"
              className="kv-textarea mb-3.5 w-full resize-y px-3 py-2.5"
            />

            <label className="kv-label mb-2 block">Max Members</label>
            <div className="mb-3.5 flex gap-2">
              {[2, 5, 10, 20].map((size) => {
                const active = maxMembers === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setMaxMembers(size)}
                    className={`kv-tab cursor-pointer rounded-full border-none px-3 py-1.5 text-xs font-semibold ${active ? "active" : ""}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <label className="kv-label mb-2 block">Visibility</label>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`kv-tab cursor-pointer rounded-full border-none px-3.5 py-2 font-semibold ${isPublic ? "active" : ""}`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`kv-tab cursor-pointer rounded-full border-none px-3.5 py-2 font-semibold ${!isPublic ? "active" : ""}`}
              >
                Private
              </button>
            </div>

            {!isPublic && (
              <div className="kv-card kv-card-elevated mb-3.5 bg-[var(--bg-elevated)] px-3 py-2.5">
                <p className="m-0 text-xs text-[var(--text-secondary)]">Invite code</p>
                <p className="mt-1.5 text-lg font-extrabold tracking-widest text-[var(--text-primary)]">{inviteCode}</p>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button className="kv-btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="kv-btn-primary" disabled={creating || !roomName.trim() || !subject.trim()} onClick={() => void createRoom()}>
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
