"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";

type Subject = "Math" | "Science" | "English" | "History" | "Chemistry" | "Physics" | "General";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type NoteItem = {
  id: string;
  title: string;
  content: string;
  format: string;
};

type LoadedNote = {
  id: string;
  title: string;
  content: string;
} | null;

const SUBJECTS: Subject[] = ["Math", "Science", "English", "History", "Chemistry", "Physics", "General"];
const COMMANDS = ["/quiz me", "/explain", "/example", "/summary"];
const STORAGE_KEY = "studyforge-tutor-session";

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function stripTitle(content: string): string {
  return content.trim().slice(0, 70) || "Tutor Insight";
}

export default function TutorPage() {
  const [subject, setSubject] = useState<Subject>("General");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      content: "Hi! I’m Nova, your StudyForge AI Tutor ✨ Tell me what topic you want to learn, and we’ll break it down together step by step.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [loadedNote, setLoadedNote] = useState<LoadedNote>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [error, setError] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);

  const transcript = useMemo(
    () => messages.map((message) => `${message.role === "user" ? "Student" : "Nova"}: ${message.content}`).join("\n\n"),
    [messages],
  );

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        subject?: Subject;
        messages?: ChatMessage[];
        loadedNote?: LoadedNote;
      };

      if (parsed.subject && SUBJECTS.includes(parsed.subject)) {
        setSubject(parsed.subject);
      }
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        setMessages(parsed.messages);
      }
      if (parsed.loadedNote) {
        setLoadedNote(parsed.loadedNote);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        subject,
        messages,
        loadedNote,
      }),
    );
  }, [subject, messages, loadedNote]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/notes?limit=100");
      if (!response.ok) return;
      const data = (await response.json()) as { notes?: NoteItem[] };
      setNotes(data.notes ?? []);
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  const sendMessage = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || isThinking) return;

    setError("");

    const newUserMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);

    const command = COMMANDS.find((item) => text.toLowerCase().startsWith(item)) as
      | "/quiz me"
      | "/explain"
      | "/example"
      | "/summary"
      | undefined;

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
          loadedNote,
          command,
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok || !data.message) {
        setError(data.error ?? "Nova is unavailable right now.");
        return;
      }

      const assistantContent = data.message ?? "";

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: assistantContent,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const loadSelectedNote = () => {
    const note = notes.find((item) => item.id === selectedNoteId);
    if (!note) return;
    setLoadedNote({ id: note.id, title: note.title, content: note.content });
  };

  const saveAssistantMessage = async (message: ChatMessage) => {
    if (message.role !== "assistant") return;

    setSavingId(message.id);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: stripTitle(message.content),
          content: message.content,
          format: "summary",
          tags: ["Nova Tutor", subject],
        }),
      });
    } finally {
      setSavingId(null);
    }
  };

  const generateFlashcards = async () => {
    if (messages.length < 2) return;
    setFlashcardsLoading(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          messages: messages.map((message) => ({ role: message.role, content: message.content })),
          loadedNote,
          command: "flashcards",
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok || !data.message) {
        setError(data.error ?? "Could not generate flashcards.");
        return;
      }

      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Flashcards • ${subject} • ${new Date().toLocaleDateString()}`,
          content: data.message,
          format: "flashcards",
          tags: ["Nova Tutor", "Flashcards", subject],
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: "I generated flashcards from this chat and saved them to your notes ✅",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setFlashcardsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070b1a] text-white">
      <AppNav />
      <div className="mx-auto flex h-[calc(100vh-72px)] w-full max-w-6xl flex-col px-4 py-4 pb-28 sm:px-6 sm:pb-4">
        <div className="mb-3 rounded-xl border border-slate-700 bg-[#0d142b] p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/30 text-xl">🤖</div>
              <div>
                <h1 className="text-xl font-semibold">Nova, your StudyForge AI Tutor</h1>
                <p className="text-sm text-slate-300">Conversational tutoring with guided reasoning.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-400/40 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200">{subject}</span>
              {loadedNote && (
                <span className="rounded-full border border-purple-400/40 bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200">
                  Note: {loadedNote.title}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto_auto]">
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value as Subject)}
              className="rounded-lg border border-slate-600 bg-[#131b36] px-3 py-2 text-sm"
            >
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={selectedNoteId}
              onChange={(event) => setSelectedNoteId(event.target.value)}
              className="rounded-lg border border-slate-600 bg-[#131b36] px-3 py-2 text-sm"
            >
              <option value="">Load my note...</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>{note.title}</option>
              ))}
            </select>

            <Button size="sm" variant="secondary" onClick={loadSelectedNote} disabled={!selectedNoteId}>Load my note</Button>
            <Button size="sm" onClick={() => void generateFlashcards()} loading={flashcardsLoading} disabled={flashcardsLoading || messages.length < 2}>
              Generate Flashcards from this chat
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-700 bg-[#0a1126] p-3 sm:p-4">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: `fadeIn 180ms ease-out ${Math.min(index * 18, 220)}ms both` }}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%] ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-600 bg-[#111a38] text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.role === "assistant" && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => void saveAssistantMessage(message)}
                        loading={savingId === message.id}
                        disabled={savingId === message.id}
                      >
                        Save to Notes
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-600 bg-[#111a38] px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" />
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-700 bg-[#0d142b]/95 p-3 backdrop-blur sm:static sm:mt-3 sm:rounded-xl sm:border sm:bg-[#0d142b] sm:p-3 sm:backdrop-blur-none">
          <div className="mx-auto w-full max-w-6xl sm:max-w-none">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask Nova anything..."
              className="flex-1 rounded-lg border border-slate-600 bg-[#131b36] px-3 py-2 text-sm"
            />
            <Button onClick={() => void sendMessage()} disabled={!input.trim() || isThinking}>Send</Button>
          </div>

          <div className="mt-2 overflow-x-auto whitespace-nowrap text-xs text-slate-300">
            <div className="flex min-w-max items-center gap-2">
              <span className="text-slate-400">Commands:</span>
              {COMMANDS.map((command) => (
                <button
                  key={command}
                  type="button"
                  className="shrink-0 rounded-full border border-slate-500/60 px-2 py-1 transition hover:border-blue-400 hover:text-blue-200"
                  onClick={() => setInput(command)}
                >
                  {command}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
