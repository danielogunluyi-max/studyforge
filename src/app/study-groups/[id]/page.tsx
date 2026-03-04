"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";

type GroupMember = {
  id: string;
  userId: string;
  role: string;
  lastSeenAt: string | null;
  user: { id: string; name: string | null; email: string | null; image: string | null };
};

type GroupMessage = {
  id: string;
  message: string;
  isAI: boolean;
  metadata?: { resourceType?: string; preview?: { title?: string; url?: string; host?: string } } | null;
  timestamp: string;
  senderName?: string;
  user?: { id: string; name?: string | null; email?: string | null; image?: string | null } | null;
};

type GroupData = {
  id: string;
  name: string;
  topic: string | null;
  isPublic?: boolean;
  inviteCode: string;
  streakCount: number;
  lastActiveAt: string | null;
  members: GroupMember[];
  pomodoroTimer?: {
    status: string;
    mode: string;
    remainingSeconds: number;
    cycleCount: number;
    startedAt: string | null;
  } | null;
};

type SharedNote = {
  id: string;
  createdAt: string;
  sharedBy: { name: string | null; email: string | null };
  note: { id: string; title: string; content: string; format: string };
  comments: Array<{ id: string; comment: string; createdAt: string; user: { name: string | null; email: string | null } }>;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  knownBy: string[];
  learningBy: string[];
  creator: { name: string | null; email: string | null };
};

type QuizSubmission = {
  id: string;
  userId: string;
  score: number;
  user?: { name: string | null; email: string | null };
};

type QuizQuestion = { question: string; options: string[] };

type QuizRound = {
  id: string;
  title: string;
  questions: QuizQuestion[];
  submissions: QuizSubmission[];
};

type ScheduleItem = { id: string; title: string; startsAt: string };

type LeaderboardRow = {
  id?: string;
  userId: string;
  user?: { name: string | null; email: string | null } | null;
  notesSaved?: number;
  quizzesCompleted?: number;
  messagesSent?: number;
  allTimeScore?: number;
};

type LeaderboardData = { weekly: LeaderboardRow[]; allTime: LeaderboardRow[]; topWeeklyUserId: string | null };

type ResourceItem = { id: string; type: string; title: string; pinned: boolean };

const TABS = ["Chat", "Shared Notes", "Group Quiz", "Flashcards", "Schedule", "Leaderboard", "Resources"] as const;
type Tab = (typeof TABS)[number];

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name || email || "M").trim();
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? "M"}${parts[1]?.[0] ?? "M"}`.toUpperCase();
  return (source.slice(0, 2) || "M").toUpperCase();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function StudyGroupInteriorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const groupId = params?.id;

  const [activeTab, setActiveTab] = useState<Tab>("Chat");
  const [group, setGroup] = useState<GroupData | null>(null);
  const [myRole, setMyRole] = useState("member");

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [myNotes, setMyNotes] = useState<Array<{ id: string; title: string; format: string }>>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [noteComments, setNoteComments] = useState<Record<string, string>>({});

  const [quizRound, setQuizRound] = useState<QuizRound | null>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizIndex, setQuizIndex] = useState(0);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashFront, setFlashFront] = useState("");
  const [flashBack, setFlashBack] = useState("");

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");

  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceType, setResourceType] = useState("link");

  const [settingsName, setSettingsName] = useState("");
  const [settingsTopic, setSettingsTopic] = useState("");
  const [settingsPublic, setSettingsPublic] = useState(false);

  const [timerRemaining, setTimerRemaining] = useState(1500);

  const milestoneText = useMemo(() => {
    const streak = group?.streakCount ?? 0;
    if (streak >= 30) return "🔥 30-day milestone unlocked";
    if (streak >= 7) return "🔥 7-day momentum streak";
    return null;
  }, [group?.streakCount]);

  const canManage = myRole === "owner" || myRole === "moderator";
  const isOwner = myRole === "owner";

  useEffect(() => {
    if (!groupId) return;

    const loadBase = async () => {
      const response = await fetch(`/api/study-groups/${groupId}`);
      const data = (await response.json()) as { group?: GroupData; me?: { role: string } };
      if (response.ok && data.group) {
        setGroup(data.group);
        setMyRole(data.me?.role ?? "member");
      }
    };

    void loadBase();
    const poll = setInterval(() => void loadBase(), 5000);
    return () => clearInterval(poll);
  }, [groupId]);

  useEffect(() => {
    if (!group?.pomodoroTimer) return;
    const timer = group.pomodoroTimer;
    const remaining = (() => {
      if (timer.status !== "running" || !timer.startedAt) return timer.remainingSeconds;
      const elapsed = Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000);
      return Math.max(0, timer.remainingSeconds - elapsed);
    })();
    setTimerRemaining(remaining);
  }, [group?.pomodoroTimer]);

  useEffect(() => {
    if (!group) return;
    setSettingsName(group.name);
    setSettingsTopic(group.topic ?? "");
    setSettingsPublic(Boolean(group.isPublic));
  }, [group]);

  useEffect(() => {
    const tick = setInterval(() => setTimerRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!groupId || activeTab !== "Chat") return;

    const loadMessages = async () => {
      const response = await fetch(`/api/study-groups/${groupId}/messages`);
      const data = (await response.json()) as { messages?: GroupMessage[] };
      if (response.ok) setMessages(data.messages ?? []);
    };

    void loadMessages();
    const poll = setInterval(() => void loadMessages(), 3000);
    return () => clearInterval(poll);
  }, [groupId, activeTab]);

  useEffect(() => {
    if (!groupId) return;

    const loadTabData = async () => {
      const notesRes = await fetch(`/api/study-groups/${groupId}/notes`);
      const flashRes = await fetch(`/api/study-groups/${groupId}/flashcards`);
      const quizRes = await fetch(`/api/study-groups/${groupId}/quiz`);
      const schedRes = await fetch(`/api/study-groups/${groupId}/schedule`);
      const leadRes = await fetch(`/api/study-groups/${groupId}/leaderboard`);
      const resourceRes = await fetch(`/api/study-groups/${groupId}/resources`);

      const notesData = (await notesRes.json()) as { sharedNotes?: SharedNote[]; myNotes?: Array<{ id: string; title: string; format: string }> };
      const flashData = (await flashRes.json()) as { cards?: Flashcard[] };
      const quizData = (await quizRes.json()) as { round?: QuizRound };
      const schedData = (await schedRes.json()) as { items?: ScheduleItem[] };
      const leadData = (await leadRes.json()) as LeaderboardData;
      const resourceData = (await resourceRes.json()) as { resources?: ResourceItem[] };

      setSharedNotes(notesData.sharedNotes ?? []);
      setMyNotes(notesData.myNotes ?? []);
      setFlashcards(flashData.cards ?? []);
      setQuizRound(quizData.round ?? null);
      setSchedule(schedData.items ?? []);
      setLeaderboard(leadData ?? null);
      setResources(resourceData.resources ?? []);
    };

    void loadTabData();
    const poll = setInterval(() => void loadTabData(), 4000);
    return () => clearInterval(poll);
  }, [groupId]);

  const sendChat = async () => {
    if (!groupId || !chatInput.trim()) return;
    setChatLoading(true);
    await fetch(`/api/study-groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatInput }),
    });
    setChatInput("");
    setChatLoading(false);
  };

  const runAiSummary = async () => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/ai-moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "summary" }),
    });
  };

  const shareNote = async () => {
    if (!groupId || !selectedNoteId) return;
    await fetch(`/api/study-groups/${groupId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "share", noteId: selectedNoteId }),
    });
    setSelectedNoteId("");
  };

  const startQuiz = async () => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", questionCount: 5 }),
    });
  };

  const finishQuiz = async () => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish" }),
    });
  };

  const submitQuizAnswer = async () => {
    if (!groupId || !quizAnswer) return;
    await fetch(`/api/study-groups/${groupId}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", answerIndex: quizIndex, selected: quizAnswer }),
    });
    setQuizAnswer("");
    setQuizIndex((prev) => prev + 1);
  };

  const addFlashcard = async () => {
    if (!groupId || !flashFront.trim() || !flashBack.trim()) return;
    await fetch(`/api/study-groups/${groupId}/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", front: flashFront, back: flashBack }),
    });
    setFlashFront("");
    setFlashBack("");
  };

  const markFlashcard = async (cardId: string, status: "known" | "learning") => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark", cardId, status }),
    });
  };

  const addSchedule = async () => {
    if (!groupId || !scheduleTitle.trim() || !scheduleStart) return;
    await fetch(`/api/study-groups/${groupId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: scheduleTitle, startsAt: scheduleStart }),
    });
    setScheduleTitle("");
    setScheduleStart("");
  };

  const addResource = async () => {
    if (!groupId || !resourceTitle.trim()) return;
    await fetch(`/api/study-groups/${groupId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "share", type: resourceType, title: resourceTitle, url: resourceUrl }),
    });
    setResourceTitle("");
    setResourceUrl("");
  };

  const togglePinResource = async (resourceId: string, pinned: boolean) => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pin", resourceId, pinned }),
    });
  };

  const addNoteComment = async (sharedNoteId: string) => {
    if (!groupId) return;
    const comment = (noteComments[sharedNoteId] ?? "").trim();
    if (!comment) return;
    await fetch(`/api/study-groups/${groupId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", sharedNoteId, comment }),
    });
    setNoteComments((prev) => ({ ...prev, [sharedNoteId]: "" }));
  };

  const saveSettings = async () => {
    if (!groupId || !settingsName.trim()) return;
    await fetch(`/api/study-groups/${groupId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settingsName.trim(),
        topic: settingsTopic.trim(),
        isPublic: settingsPublic,
      }),
    });
  };

  const setPomodoro = async (action: "start" | "pause" | "reset") => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/pomodoro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  };

  const updateRole = async (userId: string, role: "moderator" | "member") => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
  };

  const kickMember = async (userId: string) => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "kick", userId }),
    });
  };

  const deleteGroup = async () => {
    if (!groupId) return;
    await fetch(`/api/study-groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-group" }),
    });
    router.push("/study-groups");
  };

  const quizQuestions = quizRound?.questions ?? [];
  const activeQuestion = quizQuestions[quizIndex] ?? null;

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{group?.name || "Study Room"}</h1>
              <p className="text-sm text-gray-600">Topic: {group?.topic ?? "General"}</p>
              <p className="mt-1 text-xs font-semibold text-blue-700">Invite code: {group?.inviteCode || "..."}</p>
              <p className="mt-1 text-sm text-orange-600">🔥 Streak: {group?.streakCount ?? 0} days</p>
              {milestoneText && <p className="text-xs font-semibold text-orange-500">{milestoneText}</p>}
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pomodoro</p>
              <p className="text-2xl font-bold text-blue-900">{formatDuration(timerRemaining)}</p>
              <p className="text-xs text-blue-700">25:00 study / 05:00 break</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => setPomodoro("start")} disabled={!canManage}>Start</Button>
                <Button size="sm" variant="secondary" onClick={() => setPomodoro("pause")} disabled={!canManage}>Pause</Button>
                <Button size="sm" variant="secondary" onClick={() => setPomodoro("reset")} disabled={!canManage}>Reset</Button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {group?.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                  {initials(member.user.name, member.user.email)}
                </span>
                <span>{member.user.name || member.user.email || "Member"}</span>
                <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-gray-600">{member.role}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
            {TABS.map((tab) => (
              <Button key={tab} size="sm" variant={activeTab === tab ? "primary" : "secondary"} onClick={() => setActiveTab(tab)}>
                {tab}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => void runAiSummary()}>End Session Summary</Button>
            {isOwner && <Button size="sm" variant="danger" onClick={() => void deleteGroup()}>Delete Group</Button>}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {activeTab === "Chat" && (
            <div>
              <div className="mb-3 h-[420px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500">No messages yet.</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div key={message.id} className={`rounded-lg p-3 ${message.isAI ? "border border-blue-200 bg-blue-50" : "border border-gray-200 bg-white"}`}>
                        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-semibold ${message.isAI ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                            {message.isAI ? "AI" : initials(message.user?.name, message.user?.email)}
                          </span>
                          <span className="font-semibold">{message.isAI ? "StudyForge AI" : message.senderName || message.user?.name || message.user?.email || "Member"}</span>
                          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-800">{message.message}</p>
                        {message.metadata?.preview?.url && (
                          <a href={message.metadata.preview.url} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded border border-blue-200 bg-white px-2 py-1 text-xs text-blue-700">
                            Link preview: {message.metadata.preview.title || message.metadata.preview.host}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask questions with ? , mention @AI, or /quiz" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <Button onClick={() => void sendChat()} loading={chatLoading} disabled={!chatInput.trim() || chatLoading}>Send</Button>
              </div>
            </div>
          )}

          {activeTab === "Shared Notes" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <select value={selectedNoteId} onChange={(event) => setSelectedNoteId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Select your note to share</option>
                  {myNotes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <Button onClick={() => void shareNote()} disabled={!selectedNoteId}>Share</Button>
              </div>
              <div className="space-y-3">
                {sharedNotes.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="font-semibold text-gray-900">{entry.note.title}</p>
                    <p className="text-xs text-gray-500">Shared by {entry.sharedBy.name ?? entry.sharedBy.email} • {new Date(entry.createdAt).toLocaleString()}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-gray-700">{entry.note.content}</p>
                    <div className="mt-2 space-y-1">
                      {entry.comments.map((comment) => (
                        <p key={comment.id} className="text-xs text-gray-600">{comment.user.name || comment.user.email}: {comment.comment}</p>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={noteComments[entry.id] ?? ""}
                        onChange={(event) => setNoteComments((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                        placeholder="Add comment"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs"
                      />
                      <Button size="sm" variant="secondary" onClick={() => void addNoteComment(entry.id)} disabled={!(noteComments[entry.id] ?? "").trim()}>
                        Comment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Group Quiz" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => void startQuiz()} disabled={!canManage}>Start Group Quiz</Button>
                <Button variant="secondary" onClick={() => void finishQuiz()} disabled={!canManage}>Finish Quiz</Button>
              </div>
              {!quizRound ? (
                <p className="text-sm text-gray-500">No active group quiz yet.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Question {quizIndex + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{activeQuestion?.question || "All answered"}</p>
                    <div className="mt-3 space-y-2">
                      {(activeQuestion?.options ?? []).map((option) => (
                        <Button key={option} size="sm" fullWidth variant={quizAnswer === option ? "primary" : "secondary"} onClick={() => setQuizAnswer(option)} className="justify-start text-left">
                          {option}
                        </Button>
                      ))}
                    </div>
                    <Button className="mt-3" size="sm" onClick={() => void submitQuizAnswer()} disabled={!quizAnswer}>Submit Answer</Button>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Live Leaderboard</p>
                    <div className="space-y-2 text-sm">
                      {(quizRound.submissions ?? []).map((row: QuizSubmission, idx: number) => (
                        <p key={row.id}>#{idx + 1} {row.user?.name ?? row.user?.email ?? "Member"} • {row.score}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Flashcards" && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={flashFront} onChange={(event) => setFlashFront(event.target.value)} placeholder="Front" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input value={flashBack} onChange={(event) => setFlashBack(event.target.value)} placeholder="Back" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <Button onClick={() => void addFlashcard()}>Add Card</Button>
              </div>
              <div className="space-y-3">
                {flashcards.map((card) => (
                  <div key={card.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="font-semibold text-gray-900">{card.front}</p>
                    <p className="text-sm text-gray-700">{card.back}</p>
                    <p className="text-xs text-gray-500">By {card.creator.name || card.creator.email}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => void markFlashcard(card.id, "known")}>Known</Button>
                      <Button size="sm" variant="secondary" onClick={() => void markFlashcard(card.id, "learning")}>Still Learning</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Schedule" && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} placeholder="Session title" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input type="datetime-local" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <Button onClick={() => void addSchedule()}>Add</Button>
              </div>
              <div className="space-y-2">
                {schedule.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {item.title} • {new Date(item.startsAt).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Leaderboard" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Weekly</p>
                <div className="space-y-2 text-sm">
                  {(leaderboard?.weekly ?? []).map((row: LeaderboardRow, idx: number) => (
                    <p key={row.id}>#{idx + 1} {row.user?.name ?? row.user?.email ?? "Member"} • notes {row.notesSaved} • quiz {row.quizzesCompleted} • msgs {row.messagesSent} {leaderboard?.topWeeklyUserId === row.userId ? "👑" : ""}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">All-time</p>
                <div className="space-y-2 text-sm">
                  {(leaderboard?.allTime ?? []).map((row: LeaderboardRow, idx: number) => (
                    <p key={row.userId}>#{idx + 1} {row.user?.name ?? row.user?.email ?? "Member"} • {row.allTimeScore}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Resources" && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_1fr_auto]">
                <select value={resourceType} onChange={(event) => setResourceType(event.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
                  <option value="link">Link</option>
                  <option value="pdf">PDF</option>
                  <option value="note">Note</option>
                  <option value="video">Video</option>
                </select>
                <input value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} placeholder="Resource title" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="URL (optional)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <Button onClick={() => void addResource()}>Share</Button>
              </div>
              <div className="space-y-2">
                {resources.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <p>{item.type === "pdf" ? "📄" : item.type === "note" ? "📝" : item.type === "video" ? "🎬" : "🔗"} {item.title}</p>
                    {canManage && (
                      <Button size="sm" variant="secondary" onClick={() => void togglePinResource(item.id, !item.pinned)}>
                        {item.pinned ? "Unpin" : "Pin"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">Member Roles</p>
          <div className="space-y-2">
            {group?.members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <p>{member.user.name || member.user.email || "Member"} <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{member.role}</span></p>
                {isOwner && member.role !== "owner" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void updateRole(member.userId, member.role === "moderator" ? "member" : "moderator")}>{member.role === "moderator" ? "Set Member" : "Set Moderator"}</Button>
                    <Button size="sm" variant="danger" onClick={() => void kickMember(member.userId)}>Kick</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {isOwner && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-900">Group Settings</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
              <input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} placeholder="Group name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={settingsTopic} onChange={(event) => setSettingsTopic(event.target.value)} placeholder="Topic" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <input type="checkbox" checked={settingsPublic} onChange={(event) => setSettingsPublic(event.target.checked)} />
                Public
              </label>
              <Button onClick={() => void saveSettings()} disabled={!settingsName.trim()}>Save</Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
