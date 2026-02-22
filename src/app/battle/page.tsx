"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { EmptyState } from "~/app/_components/empty-state";
import { Button } from "~/app/_components/button";

type NoteOption = { id: string; title: string };

type BattleRecord = {
  id: string;
  code: string;
  status: string;
  hostScore: number;
  opponentScore: number;
  createdAt: string;
  host?: { name: string | null };
  opponent?: { name: string | null } | null;
};

export default function BattlePage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteOption[]>([]);
  const [history, setHistory] = useState<BattleRecord[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [battleTitle, setBattleTitle] = useState("Study Battle");
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [notesRes, battlesRes] = await Promise.all([fetch("/api/notes"), fetch("/api/battle")]);
      const notesData = (await notesRes.json()) as { notes?: Array<{ id: string; title: string }> };
      const battlesData = (await battlesRes.json()) as { battles?: BattleRecord[] };
      setNotes((notesData.notes ?? []).map((note) => ({ id: note.id, title: note.title })));
      setHistory(battlesData.battles ?? []);
    };

    void loadData();
  }, []);

  const createBattle = async () => {
    setIsCreating(true);
    setError("");
    try {
      const response = await fetch("/api/battle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: selectedNoteId || undefined, title: battleTitle, questionCount }),
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

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Study Battle Arena ⚔️</h1>
        <p className="mb-8 text-lg text-gray-600">Challenge friends in real-time quiz battles and climb the leaderboard.</p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Battle</h2>
            <input
              value={battleTitle}
              onChange={(event) => setBattleTitle(event.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Battle title"
            />
            <select
              value={selectedNoteId}
              onChange={(event) => setSelectedNoteId(event.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Pick a note</option>
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
              {isCreating ? "Creating..." : "Create Battle"}
            </Button>
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

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold">Leaderboard Preview</p>
              <p className="mt-2">Complete battles: {history.filter((battle) => battle.status === "completed").length}</p>
              <p>Wins (host perspective quick metric): {history.filter((battle) => battle.hostScore > battle.opponentScore).length}</p>
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Battle History</h2>
          {history.length === 0 ? (
            <EmptyState
              icon="⚔️"
              title="No battles yet"
              description="Create your first battle to challenge friends or join an existing battle with a code."
            />
          ) : (
            <div className="space-y-3">
              {history.map((battle) => (
                <button
                  key={battle.id}
                  onClick={() => router.push(`/battle/${battle.id}`)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <p className="font-semibold">{battle.code} • {battle.status}</p>
                  <p className="text-xs text-gray-500">Score: {battle.hostScore} - {battle.opponentScore} • {new Date(battle.createdAt).toLocaleString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
