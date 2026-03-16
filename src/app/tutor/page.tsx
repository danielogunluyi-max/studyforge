"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/app/_components/button";
import { useToast } from "~/app/_components/toast";
import { renderMath } from "@/lib/mathRenderer";
import LoadingButton from "@/app/_components/loading-button";

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

type CurriculumOption = {
  code: string;
  title: string;
};

const SUBJECTS: Subject[] = ["Math", "Science", "English", "History", "Chemistry", "Physics", "General"];
const COMMANDS = ["/quiz me", "/explain", "/example", "/summary"];
const STORAGE_KEY = "kyvex-tutor-session";

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
      content: "Hi! I'm Nova, your AI study companion on Kyvex. Ask me anything — I can explain concepts, quiz you, summarize your notes, and more. What are we studying today? 🌟",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [loadedNote, setLoadedNote] = useState<LoadedNote>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTypingResponse, setIsTypingResponse] = useState(false);
  const [eli5MessageId, setEli5MessageId] = useState<string | null>(null);
  const [eli5Loading, setEli5Loading] = useState(false);
  const [eli5Results, setEli5Results] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  const endRef = useRef<HTMLDivElement | null>(null);

  const transcript = useMemo(
    () => messages.map((message) => `${message.role === "user" ? "Student" : "Nova"}: ${message.content}`).join("\n\n"),
    [messages],
  );
  const isLoading = isThinking || isTypingResponse;

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
    void (async () => {
      const response = await fetch("/api/curriculum?grade=11&limit=100");
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { courses?: CurriculumOption[] };
      setCurriculumOptions(data.courses ?? []);
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking, isTypingResponse]);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  const typeAssistantMessage = async (content: string) => {
    const id = makeId();
    setIsTypingResponse(true);
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    for (let index = 0; index < content.length; index += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
      const next = content.slice(0, index + 1);
      setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, content: next } : message)));
    }

    setIsTypingResponse(false);
  };

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
          curriculumCode: curriculumCode || undefined,
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok || !data.message) {
        setError(data.error ?? "Nova is unavailable right now.");
        return;
      }

      const assistantContent = data.message ?? "";

      await typeAssistantMessage(assistantContent);
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

  const eli5Message = async (message: ChatMessage) => {
    setEli5MessageId(message.id);
    setEli5Loading(true);
    try {
      const res = await fetch("/api/eli5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content }),
      });
      const data = (await res.json().catch(() => ({}))) as { explanation?: string; error?: string };
      const explanation = data.explanation ?? data.error ?? "Could not generate explanation.";
      setEli5Results((prev) => ({ ...prev, [message.id]: explanation }));
    } catch {
      setEli5Results((prev) => ({ ...prev, [message.id]: "Failed to get ELI5 explanation." }));
    } finally {
      setEli5Loading(false);
      setEli5MessageId(null);
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
          curriculumCode: curriculumCode || undefined,
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
    <main className="app-premium-dark min-h-screen bg-gray-950 text-white kv-animate-in">
      <div className="kv-page mx-auto flex h-[calc(100vh-72px)] w-full max-w-6xl flex-col px-4 py-4 pb-28 sm:px-6 sm:pb-4">
        <div className="kv-card kv-card-elevated mb-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/30 text-xl">🤖</div>
              <div>
                <h1 className="kv-page-title text-3xl font-bold">Nova AI Tutor</h1>
                <p className="kv-page-subtitle text-sm">Conversational tutoring with guided reasoning.</p>
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
              className="kv-select"
            >
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={selectedNoteId}
              onChange={(event) => setSelectedNoteId(event.target.value)}
              className="kv-select"
            >
              <option value="">Load my note...</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>{note.title}</option>
              ))}
            </select>

            <select
              value={curriculumCode}
              onChange={(event) => setCurriculumCode(event.target.value)}
              className="kv-select"
            >
              <option value="">Ontario course (optional)</option>
              {curriculumOptions.map((course) => (
                <option key={course.code} value={course.code}>{course.code} - {course.title}</option>
              ))}
            </select>

            <Button size="sm" variant="secondary" className="kv-btn-secondary" onClick={loadSelectedNote} disabled={!selectedNoteId}>Load my note</Button>
            <LoadingButton
              loading={flashcardsLoading}
              type="button"
              onClick={() => void generateFlashcards()}
              disabled={flashcardsLoading || messages.length < 2}
            >
              Generate Flashcards from this chat
            </LoadingButton>
          </div>
        </div>

        <div className="kv-card flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex kv-animate-in-fast ${message.role === "user" ? "justify-end kv-animate-right" : "justify-start kv-animate-left"}`}
                style={{ animationDelay: `${Math.min(index * 18, 220)}ms` }}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%] ${
                    message.role === "user"
                      ? "chat-bubble-user bg-blue-600 text-white"
                      : "chat-bubble-nova border border-slate-600 bg-[#111a38] text-slate-100"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div
                      className="break-words"
                      dangerouslySetInnerHTML={{ __html: renderMath(message.content) }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  {message.role === "assistant" && (
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
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
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => void eli5Message(message)}
                        loading={eli5Loading && eli5MessageId === message.id}
                        disabled={eli5Loading && eli5MessageId === message.id}
                      >
                        ELI5 this
                      </Button>
                    </div>
                  )}
                  {eli5Results[message.id] && (
                    <div className="mt-3 rounded-xl border border-[rgba(240,180,41,0.3)] bg-[rgba(240,180,41,0.08)] p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">ELI5</p>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">{eli5Results[message.id]}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', gap: '4px', padding: '12px 16px', alignItems: 'center' }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        <div className="md:static fixed bottom-0 left-0 right-0 w-full z-30 md:z-20 md:mt-3 md:rounded-xl kv-card-elevated border-t md:border md:border-t p-3 md:p-3 backdrop-blur md:backdrop-blur-none">
          <div className="mx-auto w-full px-4 sm:px-0 md:max-w-none">
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
              className="kv-input flex-1"
            />
            <LoadingButton
              loading={isThinking}
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isThinking}
            >
              Send
            </LoadingButton>
          </div>

          <div className="mt-2 overflow-x-auto whitespace-nowrap text-xs text-slate-300">
            <div className="flex min-w-max items-center gap-2">
              <span className="text-slate-400">Commands:</span>
              {COMMANDS.map((command) => (
                <button
                  key={command}
                  type="button"
                  className="kv-btn-ghost shrink-0"
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
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-gold);
          border-radius: 50%;
          animation: typing-dot 1.2s ease-in-out infinite;
        }

        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        .chat-bubble-nova {
          animation: slideNovaIn 260ms ease-out both;
        }

        .chat-bubble-user {
          animation: slideUserIn 260ms ease-out both;
        }

        @keyframes slideNovaIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideUserIn {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </main>
  );
}


