"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";

type Message = {
  id: string;
  message: string;
  isAI: boolean;
  timestamp: string;
  user?: { name?: string | null; email?: string | null } | null;
};

export default function StudyGroupRoomPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!groupId) return;

    const loadMessages = async () => {
      const response = await fetch(`/api/study-groups/${groupId}/messages`);
      const data = (await response.json()) as { messages?: Message[] };
      setMessages(data.messages ?? []);
    };

    void loadMessages();
    const interval = setInterval(() => void loadMessages(), 2500);
    return () => clearInterval(interval);
  }, [groupId]);

  const sendMessage = async () => {
    if (!groupId || !input.trim()) return;
    setIsSending(true);

    await fetch(`/api/study-groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    setInput("");
    setIsSending(false);

    if ((messages.length + 1) % 5 === 0) {
      await fetch(`/api/study-groups/${groupId}/ai-moderate`, { method: "POST" });
    }
  };

  const groupedTopics = useMemo(() => {
    const text = messages.map((item) => item.message.toLowerCase()).join(" ");
    const topics = ["definition", "formula", "example", "concept", "application"];
    return topics.filter((topic) => text.includes(topic));
  }, [messages]);

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Study Group Room</h1>
        <p className="mb-6 text-sm text-gray-600">AI moderator prompts every few messages to keep discussion productive.</p>

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 h-[460px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages yet.</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-3 text-sm ${message.isAI ? "border border-blue-200 bg-blue-50" : "border border-gray-200 bg-white"}`}
                    >
                      <p className="mb-1 text-xs font-semibold text-gray-500">
                        {message.isAI ? "🤖 AI Moderator" : message.user?.name || message.user?.email || "Member"}
                      </p>
                      <p className="text-gray-800">{message.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isSending || !input.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
              >
                Send
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Session Insights</h2>
            <p className="text-xs text-gray-600">Messages: {messages.length}</p>
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700">Topics detected</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {groupedTopics.length === 0 ? (
                  <span className="text-xs text-gray-500">No clear topics yet</span>
                ) : (
                  groupedTopics.map((topic) => (
                    <span key={topic} className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {topic}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
