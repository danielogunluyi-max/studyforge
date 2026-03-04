"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { EmptyState } from "~/app/_components/empty-state";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";

type NoteOption = { id: string; title: string };

type Room = { subject: string; online: number; waiting: number };

type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: string;
  achievements: string[];
};

type Tournament = {
  id: string;
  rounds: Array<{
    name: string;
    matches: Array<{ id: string; playerA: string; playerB: string; winner: string | null }>;
  }>;
};

type BattleRecord = {
  id: string;
  code: string;
  status: string;
  mode?: string;
  subject?: string | null;
  hostScore: number;
  opponentScore: number;
  createdAt: string;
  participants?: Array<{
    userId: string;
    score: number;
    correctCount: number;
    totalAnswered: number;
  }>;
  host?: { name: string | null };
  opponent?: { name: string | null } | null;
};

type BattleProfile = {
  xp: number;
  level: string;
  levelProgress: number;
  battleWinStreak: number;
  soloSessionsCompleted: number;
  achievements: string[];
};

const ARENA_SUBJECTS = ["Math", "Biology", "History", "Chemistry", "English", "Physics"];
const TRACKS = [
  { id: "focus", name: "Focus Drive", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "pulse", name: "Arena Pulse", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
];

export default function BattlePage() {
  const router = useRouter();

  const [notes, setNotes] = useState<NoteOption[]>([]);
  const [history, setHistory] = useState<BattleRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [profile, setProfile] = useState<BattleProfile | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);

  const [mode, setMode] = useState<"pvp" | "solo" | "ai">("pvp");
  const [subject, setSubject] = useState("Math");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [battleTitle, setBattleTitle] = useState("Study Battle");

  const [joinCode, setJoinCode] = useState("");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("all");
  const [leaderboardSubject, setLeaderboardSubject] = useState("All");
  const [selectedTrack, setSelectedTrack] = useState(TRACKS[0]?.src ?? "");

  const [reactions, setReactions] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isBuildingBracket, setIsBuildingBracket] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [notesRes, battlesRes, roomsRes] = await Promise.all([fetch("/api/notes"), fetch("/api/battle"), fetch("/api/battle/rooms")]);
      const notesData = (await notesRes.json()) as { notes?: Array<{ id: string; title: string }> };
      const battlesData = (await battlesRes.json()) as { battles?: BattleRecord[]; profile?: BattleProfile };
      const roomsData = (await roomsRes.json()) as { rooms?: Room[] };

      setNotes((notesData.notes ?? []).map((note) => ({ id: note.id, title: note.title })));
      setHistory(battlesData.battles ?? []);
      setProfile(battlesData.profile ?? null);
      setRooms(roomsData.rooms ?? []);
    };

    void loadData();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const params = new URLSearchParams();
      params.set("period", leaderboardPeriod);
      params.set("subject", leaderboardSubject);
      const response = await fetch(`/api/battle/leaderboard?${params.toString()}`);
      const data = (await response.json()) as { leaderboard?: LeaderboardRow[] };
      setLeaderboard(data.leaderboard ?? []);
    };

    void loadLeaderboard();
  }, [leaderboardPeriod, leaderboardSubject]);

  const createBattle = async () => {
    setIsCreating(true);
    setError("");
    try {
      if (mode !== "pvp") {
        const response = await fetch("/api/battle/solo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", mode, subject, difficulty, questionCount }),
        });

        const data = (await response.json()) as { session?: { id: string }; error?: string };
        if (!response.ok || !data.session?.id) {
          setError(data.error ?? "Failed to start session");
          return;
        }

        router.push(`/battle/${data.session.id}`);
        return;
      }

      const response = await fetch("/api/battle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: selectedNoteId || undefined,
          title: battleTitle,
          questionCount,
          subject,
          difficulty,
          mode,
        }),
      });

      const data = (await response.json()) as { battle?: { id: string }; error?: string };
      if (!response.ok || !data.battle) {
        setError(data.error ?? "Failed to create battle");
        return;
      }

      router.push(`/battle/${data.battle.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async (roomSubject: string) => {
    setIsJoiningRoom(true);
    setError("");
    try {
      const response = await fetch("/api/battle/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: roomSubject }),
      });

      const data = (await response.json()) as { battle?: { id: string }; battleId?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to join room");
        return;
      }

      const battleId = data.battle?.id ?? data.battleId;
      if (battleId) {
        router.push(`/battle/${battleId}`);
      }
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const joinBattle = async () => {
    setError("");
    const response = await fetch("/api/battle/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode }),
    });

    const data = (await response.json()) as { battle?: { id: string }; battleId?: string; error?: string };

    if (!response.ok) {
      setError(data.error ?? "Failed to join battle");
      return;
    }

    const battleId = data.battle?.id ?? data.battleId;
    if (battleId) {
      router.push(`/battle/${battleId}`);
    }
  };

  const createTournament = async () => {
    setIsBuildingBracket(true);
    setError("");
    try {
      const response = await fetch("/api/battle/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: 8, subject }),
      });
      const data = (await response.json()) as { tournament?: Tournament; error?: string };
      if (!response.ok || !data.tournament) {
        setError(data.error ?? "Failed to create tournament");
        return;
      }
      setTournament(data.tournament);
    } finally {
      setIsBuildingBracket(false);
    }
  };

  const pushReaction = (emoji: string) => {
    setReactions((prev) => [...prev.slice(-5), emoji]);
  };

  return (
    <main className="app-premium-dark min-h-screen bg-gray-950">
      <AppNav />
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <PageHero
          title="Study Battle Arena"
          description="Real-time duels, solo practice, AI rivals, rooms, and tournament ladders."
          actions={<Button href="/my-notes" variant="secondary" size="sm">Choose Note Source</Button>}
        />

        {profile && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Battle Progression</p>
                <p className="text-xl font-bold text-gray-900">{profile.level} • {profile.xp} XP</p>
                <p className="text-sm text-gray-600">Streak: {profile.battleWinStreak} • Solo sessions: {profile.soloSessionsCompleted}</p>
              </div>
              <div className="min-w-56 flex-1">
                <div className="h-2 overflow-hidden rounded bg-gray-200">
                  <div className="h-full bg-blue-600" style={{ width: `${profile.levelProgress}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">Level progress: {profile.levelProgress}%</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(profile.achievements.length ? profile.achievements : ["No achievements yet"]).slice(0, 8).map((badge) => (
                <span key={badge} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-gray-800">Battle mode</p>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            {[
              { value: "pvp", label: "PVP Live" },
              { value: "solo", label: "Solo Practice" },
              { value: "ai", label: "AI Duel" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={mode === option.value ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMode(option.value as "pvp" | "solo" | "ai")}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Session</h2>
            <input
              value={battleTitle}
              onChange={(event) => setBattleTitle(event.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Battle title"
            />

            <label className="mb-1 block text-xs font-semibold text-gray-600">Subject</label>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {ARENA_SUBJECTS.map((roomSubject) => (
                <option key={roomSubject} value={roomSubject}>{roomSubject}</option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-semibold text-gray-600">Difficulty</label>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <label className="mb-1 block text-xs font-semibold text-gray-600">Optional note source</label>
            <select
              value={selectedNoteId}
              onChange={(event) => setSelectedNoteId(event.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Use subject-only generation</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>{note.title}</option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-semibold text-gray-600">Question Count</label>
            <input
              type="number"
              min={5}
              max={20}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button
              onClick={() => void createBattle()}
              disabled={isCreating}
              fullWidth
              loading={isCreating}
            >
              {isCreating ? "Starting..." : mode === "pvp" ? "Create Live Battle" : mode === "ai" ? "Start AI Duel" : "Start Solo Session"}
            </Button>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">Powerups in battle room</p>
              <p>Double Points • Freeze Timer • Skip Question • Option Swap</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Join Battle</h2>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-widest"
              placeholder="Enter battle code"
            />
            <Button
              onClick={() => void joinBattle()}
              variant="secondary"
              fullWidth
            >
              Join Battle
            </Button>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <p className="mb-2 text-sm font-semibold text-gray-900">Subject Rooms</p>
              <div className="space-y-2">
                {(rooms.length ? rooms : ARENA_SUBJECTS.map((item) => ({ subject: item, online: 0, waiting: 0 }))).map((room) => (
                  <div key={room.subject} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-sm text-gray-700">{room.subject} • {room.online} online</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void joinRoom(room.subject)}
                      disabled={isJoiningRoom}
                    >
                      Quick Join
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-semibold">Emoji Battle Chat</p>
              <div className="mt-2 flex gap-2">
                {"🔥⚡😎🎯👏".split("").map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => pushReaction(emoji)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-lg hover:bg-gray-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">Recent: {reactions.join(" ") || "No reactions yet"}</p>
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Global Leaderboard</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={leaderboardSubject}
                  onChange={(event) => setLeaderboardSubject(event.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                >
                  <option value="All">All Subjects</option>
                  {ARENA_SUBJECTS.map((roomSubject) => (
                    <option key={roomSubject} value={roomSubject}>{roomSubject}</option>
                  ))}
                </select>
                <select
                  value={leaderboardPeriod}
                  onChange={(event) => setLeaderboardPeriod(event.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="all">All-time</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {leaderboard.slice(0, 8).map((row) => (
                <div key={row.userId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-gray-800">#{row.rank} {row.name}</p>
                  <p className="text-gray-600">{row.xp} XP • {row.level}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tournament Mode</h2>
              <Button size="sm" onClick={() => void createTournament()} loading={isBuildingBracket}>
                Generate Bracket
              </Button>
            </div>
            {!tournament ? (
              <p className="text-sm text-gray-600">Create a quick elimination bracket and warm up with ranked rounds.</p>
            ) : (
              <div className="space-y-3">
                {tournament.rounds.map((round) => (
                  <div key={round.name} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{round.name}</p>
                    <div className="space-y-2 text-sm text-gray-700">
                      {round.matches.map((match) => (
                        <p key={match.id}>{match.playerA} vs {match.playerB} {match.winner ? `• Winner: ${match.winner}` : "• Pending"}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Arena Music</h2>
          <p className="mb-2 text-xs text-gray-500 md:hidden">Mini player</p>
          <div className="mb-3 hidden flex-wrap gap-2 md:flex">
            {TRACKS.map((track) => (
              <Button
                key={track.id}
                size="sm"
                variant={selectedTrack === track.src ? "primary" : "secondary"}
                onClick={() => setSelectedTrack(track.src)}
              >
                {track.name}
              </Button>
            ))}
          </div>
          <audio controls className="w-full max-w-full" src={selectedTrack}>
            <track kind="captions" />
          </audio>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Battle History</h2>
          {history.length === 0 ? (
            <EmptyState
              title="No battles yet"
              description="Create your first battle to challenge friends or join an existing battle with a code."
            />
          ) : (
            <div className="space-y-3">
              {history.map((battle) => (
                <Button
                  key={battle.id}
                  onClick={() => router.push(`/battle/${battle.id}`)}
                  variant="secondary"
                  fullWidth
                  className="justify-start border-gray-200 bg-gray-50 text-left text-gray-700 hover:bg-gray-100"
                >
                  <p className="font-semibold">{battle.code} • {battle.mode ?? "pvp"} • {battle.status}</p>
                  <p className="text-xs text-gray-500">{battle.subject ?? "Mixed"} • Score: {battle.hostScore} - {battle.opponentScore} • {new Date(battle.createdAt).toLocaleString()}</p>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
