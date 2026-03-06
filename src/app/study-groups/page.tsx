"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/app/_components/button";
import { EmptyState } from "~/app/_components/empty-state";
import { PageHero } from "~/app/_components/page-hero";
import { useToast } from "~/app/_components/toast";

type Group = {
  id: string;
  name: string;
  topic: string | null;
  inviteCode: string;
  streakCount?: number;
  activeNow?: boolean;
  myRole?: string;
  avatars?: Array<{ userId: string; name: string; image: string | null; role: string }>;
  _count: { members: number; messages: number };
};

type PublicGroup = {
  id: string;
  name: string;
  topic: string | null;
  inviteCode: string;
  _count: { members: number; messages: number };
};

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? "S"}${parts[1]?.[0] ?? "G"}`.toUpperCase();
  return (name.slice(0, 2) || "SG").toUpperCase();
}

export default function StudyGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([]);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/study-groups${params.toString() ? `?${params.toString()}` : ""}`);
      const data = (await response.json()) as { groups?: Group[]; publicGroups?: PublicGroup[] };
      setGroups(data.groups ?? []);
      setPublicGroups(data.publicGroups ?? []);
    };
    void load();
  }, [search]);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  const createGroup = async () => {
    setError("");
    const response = await fetch("/api/study-groups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, topic, isPublic }),
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
    <main className="app-premium-dark min-h-screen bg-gray-950">
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <PageHero
          title="AI Study Groups"
          description="Powerful collaborative rooms with AI moderation, quizzes, shared notes, and streak tracking."
          actions={<Button href="/battle" variant="secondary" size="sm">Open Battle Arena</Button>}
        />

        <div className="mb-6 card">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Find public groups by subject</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by subject or group name"
            className="w-full input"
          />
        </div>

        <div className="stagger-grid grid gap-6 lg:grid-cols-2">
          <div className="stagger-card card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Group</h2>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Group name"
              className="mb-3 w-full input"
            />
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Topic (optional)"
              className="mb-4 w-full input"
            />
            <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
              Make this group public/discoverable
            </label>
            <Button 
              onClick={() => void createGroup()} 
              fullWidth
              size="md"
            >
              Create Group
            </Button>
          </div>

          <div className="stagger-card card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Join Group</h2>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Invite code"
              className="mb-4 w-full input tracking-wider"
            />
            <Button 
              onClick={() => void joinGroup()} 
              variant="secondary"
              fullWidth
              size="md"
            >
              Join Group
            </Button>
          </div>
        </div>

        <div className="mt-8 card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">My Study Rooms</h2>
          {groups.length === 0 ? (
            <EmptyState
              title="No study groups yet"
              description="Create a new group to study with friends, or join an existing group using an invite code."
            />
          ) : (
            <div className="stagger-grid grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <div key={group.id} className="stagger-card panel-muted p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.topic ?? "General"} • {group.myRole ?? "member"}</p>
                    </div>
                    {group.activeNow ? <span className="badge badge-success px-2 py-0.5 text-xs font-semibold">Active Now</span> : null}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(group.avatars ?? []).slice(0, 4).map((avatar) => (
                      <span key={avatar.userId} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {initials(avatar.name)}
                      </span>
                    ))}
                    <span className="badge badge-neutral px-2 py-1 text-xs">🔥 {group.streakCount ?? 0}</span>
                    <span className="badge badge-neutral px-2 py-1 text-xs">{group._count.members} members</span>
                  </div>
                  <Button onClick={() => router.push(`/study-groups/${group.id}`)} fullWidth>
                    Enter Study Room
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Public Groups</h2>
          {publicGroups.length === 0 ? (
            <p className="text-sm text-gray-500">No public groups match your search.</p>
          ) : (
            <div className="stagger-grid space-y-2">
              {publicGroups.map((group) => (
                <div key={group.id} className="stagger-card flex items-center justify-between panel-muted px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-gray-700">{group.name} • {group.topic ?? "General"} • {group._count.members} members</p>
                  <Button size="sm" variant="secondary" onClick={() => setJoinCode(group.inviteCode)}>Use Code</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

