"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { EmptyState } from "~/app/_components/empty-state";

type Group = {
  id: string;
  name: string;
  topic: string | null;
  inviteCode: string;
  _count: { members: number; messages: number };
};

export default function StudyGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/study-groups");
      const data = (await response.json()) as { groups?: Group[] };
      setGroups(data.groups ?? []);
    };
    void load();
  }, []);

  const createGroup = async () => {
    setError("");
    const response = await fetch("/api/study-groups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, topic }),
    });

    const data = (await response.json()) as { group?: Group; error?: string };
    if (!response.ok || !data.group) {
      setError(data.error ?? "Failed to create group");
      return;
    }

    router.push(`/study-groups/${data.group.id}`);
  };

  const joinGroup = async () => {
    setError("");
    const response = await fetch("/api/study-groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode }),
    });

    const data = (await response.json()) as { groupId?: string; error?: string };
    if (!response.ok || !data.groupId) {
      setError(data.error ?? "Failed to join group");
      return;
    }

    router.push(`/study-groups/${data.groupId}`);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">AI Study Groups 🤝</h1>
        <p className="mb-8 text-lg text-gray-600">Collaborate with friends while an AI moderator keeps sessions focused.</p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Group</h2>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Group name"
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Topic (optional)"
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button onClick={() => void createGroup()} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white">
              Create Group
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Join Group</h2>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Invite code"
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-wider"
            />
            <button onClick={() => void joinGroup()} className="w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700">
              Join Group
            </button>
          </div>
        </div>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Active Groups</h2>
          {groups.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No study groups yet"
              description="Create a new group to study with friends, or join an existing group using an invite code."
            />
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => router.push(`/study-groups/${group.id}`)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-left hover:bg-gray-100"
                >
                  <p className="font-semibold text-gray-900">{group.name}</p>
                  <p className="text-xs text-gray-500">{group.topic || "General"} • Code: {group.inviteCode} • {group._count.members} members</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
