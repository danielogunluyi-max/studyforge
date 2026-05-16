"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  BookOpen,
  FileText,
  Bookmark,
  Save,
  Wand2,
  Layers,
  PanelRightClose,
  PanelRightOpen,
  X,
  Loader2,
  MessageSquare,
  Trash2,
  Mic,
  Paperclip,
  Compass,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "~/app/_components/toast";
import { renderMath } from "@/lib/mathRenderer";

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

type SavedSnippet = {
  id: string;
  text: string;
  createdAt: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  subject: string | null;
  updatedAt: string;
  messageCount: number;
};

const SUBJECTS: Subject[] = ["Math", "Science", "English", "History", "Chemistry", "Physics", "General"];
const COMMANDS = [
  { cmd: "/quiz", description: "Test me with 3 questions" },
  { cmd: "/explain", description: "Simpler explanation" },
  { cmd: "/example", description: "Show real-world example" },
  { cmd: "/summary", description: "Recap the conversation" },
];
const STORAGE_KEY = "kyvex-tutor-session";
const SNIPPETS_KEY = "kyvex-tutor-snippets";

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function stripTitle(content: string): string {
  return content.trim().slice(0, 70) || "Tutor Insight";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Lightweight markdown -> HTML for Nova responses (then math via renderMath)
function formatNova(text: string): string {
  let html = text;

  // Fenced code blocks first
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, _lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="kv-code"><code>${escapeHtml(code.trim())}</code></pre>`);
    return `\u0000CB${idx}\u0000`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, (_, c) => `<code class="kv-inline-code">${escapeHtml(c)}</code>`);

  // Headings
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="kv-h3">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="kv-h2">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="kv-h1">$1</h1>');

  // Bold + italic
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3');

  // Bullet lists
  html = html.replace(/(?:^[-*]\s+.+(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((l) => l.replace(/^[-*]\s+/, "").trim())
      .filter(Boolean)
      .map((t) => `<li>${t}</li>`)
      .join("");
    return `<ul class="kv-ul">${items}</ul>`;
  });

  // Numbered lists
  html = html.replace(/(?:^\d+\.\s+.+(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((l) => l.replace(/^\d+\.\s+/, "").trim())
      .filter(Boolean)
      .map((t) => `<li>${t}</li>`)
      .join("");
    return `<ol class="kv-ol">${items}</ol>`;
  });

  // Paragraphs: split by blank lines
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (/^<(h\d|ul|ol|pre|blockquote|div)/.test(block.trim())) return block;
      if (/\u0000CB\d+\u0000/.test(block)) return block;
      return `<p>${block.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  // Restore code blocks
  html = html.replace(/\u0000CB(\d+)\u0000/g, (_, i) => codeBlocks[Number(i)] ?? "");

  return renderMath(html);
}

export default function TutorPage() {
  const [subject, setSubject] = useState<Subject>("General");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      content:
        "Hi! I'm **Nova**, your Ontario Grade 11–12 study companion. Ask me anything — concepts, quizzes, summaries, or working through a homework problem step by step. What are we studying today?",
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
  const [snippets, setSnippets] = useState<SavedSnippet[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTypingResponse, setIsTypingResponse] = useState(false);
  const [eli5MessageId, setEli5MessageId] = useState<string | null>(null);
  const [eli5Loading, setEli5Loading] = useState(false);
  const [eli5Results, setEli5Results] = useState<Record<string, string>>({});
  const [contextOpen, setContextOpen] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  // AI Lab redesign state
  const [teachingStyle, setTeachingStyle] = useState<"direct" | "socratic">("direct");
  const [inputFocused, setInputFocused] = useState(false);
  const [showScanLine, setShowScanLine] = useState(true);
  const [flyingMessage, setFlyingMessage] = useState<{
    id: string;
    from: { x: number; y: number; width: number; height: number };
    to: { x: number; y: number };
  } | null>(null);
  const { showToast } = useToast();

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messageBubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isLoading = isThinking || isTypingResponse;
  const trimmedInput = input.trim();
  const isSlashCommand = trimmedInput.startsWith("/");
  const matchedCommand = useMemo(
    () => (isSlashCommand ? COMMANDS.find((c) => trimmedInput.toLowerCase().startsWith(c.cmd)) : undefined),
    [isSlashCommand, trimmedInput],
  );
  const slashSuggestions = useMemo(
    () =>
      isSlashCommand && !matchedCommand
        ? COMMANDS.filter((c) => c.cmd.startsWith(trimmedInput.toLowerCase()))
        : [],
    [isSlashCommand, matchedCommand, trimmedInput],
  );

  // Load persisted session
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          subject?: Subject;
          messages?: ChatMessage[];
          loadedNote?: LoadedNote;
          curriculumCode?: string;
          conversationId?: string | null;
        };
        if (parsed.subject && SUBJECTS.includes(parsed.subject)) setSubject(parsed.subject);
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) setMessages(parsed.messages);
        if (parsed.loadedNote) setLoadedNote(parsed.loadedNote);
        if (parsed.curriculumCode) setCurriculumCode(parsed.curriculumCode);
        if (parsed.conversationId) setConversationId(parsed.conversationId);
      } catch {
        // ignore
      }
    }
    const rawSnips = localStorage.getItem(SNIPPETS_KEY);
    if (rawSnips) {
      try {
        setSnippets(JSON.parse(rawSnips) as SavedSnippet[]);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ subject, messages, loadedNote, curriculumCode, conversationId }),
    );
  }, [subject, messages, loadedNote, curriculumCode, conversationId]);

  // Fetch conversation history list
  const refreshConversations = async () => {
    try {
      const r = await fetch("/api/tutor/conversations");
      if (!r.ok) return;
      const d = (await r.json().catch(() => ({}))) as { conversations?: ConversationSummary[] };
      setConversations(d.conversations ?? []);
    } catch {
      // optional
    }
  };

  useEffect(() => {
    void refreshConversations();
  }, []);

  useEffect(() => {
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
  }, [snippets]);

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

  // Streaming typewriter effect
  const typeAssistantMessage = async (content: string) => {
    const id = makeId();
    setIsTypingResponse(true);
    setMessages((prev) => [
      ...prev,
      { id, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    // Type ~3 chars per tick for fluid streaming
    const step = 3;
    for (let index = 0; index < content.length; index += step) {
      await new Promise((resolve) => window.setTimeout(resolve, 12));
      const next = content.slice(0, Math.min(index + step, content.length));
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: next } : m)));
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

    const cmdMatch = COMMANDS.find((item) => text.toLowerCase().startsWith(item.cmd));
    // Map UI commands to API commands
    const apiCommandMap: Record<string, "/quiz me" | "/explain" | "/example" | "/summary"> = {
      "/quiz": "/quiz me",
      "/explain": "/explain",
      "/example": "/example",
      "/summary": "/summary",
    };
    const command = cmdMatch ? apiCommandMap[cmdMatch.cmd] : undefined;

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          loadedNote,
          command,
          curriculumCode: curriculumCode || undefined,
          conversationId: conversationId || undefined,
          teachingStyle,
        }),
      });

      // Read response body once, parse defensively (server may return HTML error page)
      const rawBody = await response.text();
      let data: { message?: string; error?: string; conversationId?: string | null } = {};
      try {
        data = rawBody ? (JSON.parse(rawBody) as typeof data) : {};
      } catch {
        // Non-JSON response (e.g. Next.js error HTML)
      }

      if (!response.ok || !data.message) {
        const msg =
          data.error ??
          (response.status === 401
            ? "Your session expired — please sign in again."
            : response.status >= 500
              ? `Nova service error (${response.status}). The database may be waking up — try again in a few seconds.`
              : `Nova is unavailable (HTTP ${response.status}).`);
        console.error("[Nova] /api/tutor failed", { status: response.status, body: rawBody.slice(0, 500) });
        setError(msg);
        return;
      }

      if (data.conversationId) setConversationId(data.conversationId);
      await typeAssistantMessage(data.message);
      void refreshConversations();
    } catch (err) {
      console.error("[Nova] fetch error", err);
      setError(`Failed to reach Nova: ${err instanceof Error ? err.message : "network error"}.`);
    } finally {
      setIsThinking(false);
    }
  };

  const loadConversation = async (id: string) => {
    setLoadingConversation(true);
    try {
      const r = await fetch(`/api/tutor/conversations/${id}`);
      if (!r.ok) {
        showToast("Could not load chat", "error");
        return;
      }
      const d = (await r.json().catch(() => ({}))) as {
        conversation?: {
          id: string;
          subject: string | null;
          curriculumCode: string | null;
          messages: { id: string; role: string; content: string; createdAt: string }[];
        };
      };
      const conv = d.conversation;
      if (!conv) return;

      setConversationId(conv.id);
      if (conv.subject && SUBJECTS.includes(conv.subject as Subject)) {
        setSubject(conv.subject as Subject);
      }
      if (conv.curriculumCode) setCurriculumCode(conv.curriculumCode);
      setMessages(
        conv.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt,
          })),
      );
      setEli5Results({});
    } finally {
      setLoadingConversation(false);
    }
  };

  const deleteConversation = async (id: string) => {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    const r = await fetch(`/api/tutor/conversations/${id}`, { method: "DELETE" });
    if (!r.ok) {
      showToast("Could not delete chat", "error");
      return;
    }
    if (conversationId === id) {
      setConversationId(null);
      setMessages([
        {
          id: makeId(),
          role: "assistant",
          content: "New session started. What are we exploring?",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    await refreshConversations();
  };

  const loadSelectedNote = () => {
    const note = notes.find((item) => item.id === selectedNoteId);
    if (!note) return;
    setLoadedNote({ id: note.id, title: note.title, content: note.content });
    showToast(`Loaded "${note.title}" into Nova's context`, "success");
  };

  const clearLoadedNote = () => {
    setLoadedNote(null);
    setSelectedNoteId("");
  };

  const triggerSaveWithFlight = (message: ChatMessage) => {
    if (message.role !== "assistant") return;
    // Capture rects for the flying ghost animation
    const bubble = messageBubbleRefs.current[message.id];
    const notesIcon = document.querySelector<HTMLElement>('a[href="/my-notes"]');
    if (bubble && notesIcon) {
      const fromRect = bubble.getBoundingClientRect();
      const toRect = notesIcon.getBoundingClientRect();
      setFlyingMessage({
        id: message.id,
        from: {
          x: fromRect.left,
          y: fromRect.top,
          width: fromRect.width,
          height: Math.min(fromRect.height, 120),
        },
        to: {
          x: toRect.left + toRect.width / 2 - 14,
          y: toRect.top + toRect.height / 2 - 14,
        },
      });
    }
    void saveAssistantMessage(message);
  };

  const saveAssistantMessage = async (message: ChatMessage) => {
    if (message.role !== "assistant") return;

    setSavingId(message.id);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: stripTitle(message.content),
          content: message.content,
          format: "summary",
          tags: ["Nova Tutor", subject],
        }),
      });
      if (res.ok) {
        showToast("Saved to your notes", "success");
        // also save quick snippet locally
        setSnippets((prev) => [
          { id: message.id, text: message.content.slice(0, 120), createdAt: new Date().toISOString() },
          ...prev.filter((s) => s.id !== message.id),
        ].slice(0, 8));
      } else {
        showToast("Could not save note", "error");
      }
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
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
          title: `Flashcards · ${subject} · ${new Date().toLocaleDateString()}`,
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
          content: "Flashcards generated and saved to your notes ✓",
          createdAt: new Date().toISOString(),
        },
      ]);
      showToast("Flashcards saved to notes", "success");
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const newChat = () => {
    setMessages([
      {
        id: makeId(),
        role: "assistant",
        content: "New session started. What are we exploring?",
        createdAt: new Date().toISOString(),
      },
    ]);
    setEli5Results({});
    setConversationId(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Ambient lab background: faint grid that's only visible during the scan */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,212,191,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 35%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 35%, black 30%, transparent 75%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: showScanLine ? 0.06 : 0 }}
        transition={{ duration: 1.2 }}
      />

      {/* Soft ambient glow behind the orb (cheap perf) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-0 z-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/4"
        style={{
          background: isLoading
            ? "radial-gradient(ellipse at center, rgba(45,212,191,0.18), transparent 60%)"
            : "radial-gradient(ellipse at center, rgba(245,158,11,0.12), transparent 60%)",
          transition: "background 600ms ease",
        }}
      />

      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-7xl flex-col px-4 sm:px-6">
        {/* Top utility bar (kept minimal so the Nova Core stays focal) */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={newChat}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 backdrop-blur-xl transition hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Start a new chat"
          >
            New Chat
          </button>
          <button
            type="button"
            onClick={() => setContextOpen((p) => !p)}
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 backdrop-blur-xl transition hover:bg-white/10 hover:text-white active:scale-95 lg:flex"
            aria-label={contextOpen ? "Hide context panel" : "Show context panel"}
            aria-expanded={contextOpen}
          >
            {contextOpen ? <PanelRightClose size={14} aria-hidden="true" /> : <PanelRightOpen size={14} aria-hidden="true" />}
            Context
          </button>
        </div>

        {/* Centered Nova Core orb header */}
        <header className="flex flex-col items-center justify-center pb-4 pt-3">
          <div className={`kv-orb ${isLoading ? "kv-orb--active" : ""}`} aria-hidden="true">
            <span className="kv-orb-ring kv-orb-ring--1" />
            <span className="kv-orb-ring kv-orb-ring--2" />
            <span className="kv-orb-ring kv-orb-ring--3" />
            <span className="kv-orb-core" />
            <Sparkles size={20} className="kv-orb-icon" aria-hidden="true" />
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Nova</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {isLoading ? (
              <span className="text-teal-300">Thinking…</span>
            ) : (
              <>Ontario Grade 11–12 tutor · {subject}</>
            )}
          </p>
        </header>

        {/* Main grid: chat + context sidebar */}
        <div className={`grid min-h-0 flex-1 gap-6 ${contextOpen ? "lg:grid-cols-[1fr_300px]" : "lg:grid-cols-1"}`}>
          {/* Chat column */}
          <section className="relative flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-6 pb-40">
                <AnimatePresence initial={false}>
                  {messages.map((message) =>
                    message.role === "user" ? (
                      <motion.div
                        key={message.id}
                        layout="position"
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="flex justify-end will-change-transform"
                      >
                        <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base leading-relaxed text-zinc-100 shadow-[0_0_28px_-10px_rgba(96,165,250,0.55)] backdrop-blur-xl sm:max-w-[70%]">
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.article
                        key={message.id}
                        layout="position"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        className="flex gap-3 will-change-transform"
                      >
                        <div
                          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
                            isLoading
                              ? "bg-gradient-to-br from-teal-300 to-cyan-500 text-black shadow-[0_0_18px_rgba(45,212,191,0.55)]"
                              : "bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-[0_0_15px_rgba(240,180,41,0.4)]"
                          }`}
                          aria-hidden="true"
                        >
                          N
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            ref={(el) => {
                              messageBubbleRefs.current[message.id] = el;
                            }}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_0_28px_-10px_rgba(45,212,191,0.5)] backdrop-blur-xl"
                          >
                            <motion.div
                              key={`prose-${message.content.length}`}
                              initial={{ opacity: 0.92 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.18 }}
                              className="kv-prose kv-prose--manifest break-words text-base leading-relaxed text-zinc-100"
                              dangerouslySetInnerHTML={{ __html: formatNova(message.content) }}
                            />
                          </div>

                          {message.content && !isLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.18, duration: 0.3 }}
                              className="mt-3 flex flex-wrap items-center gap-1.5"
                            >
                              <button
                                type="button"
                                onClick={() => triggerSaveWithFlight(message)}
                                disabled={savingId === message.id}
                                title="Send to Notes"
                                className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 backdrop-blur-xl transition hover:border-teal-300/40 hover:bg-teal-400/10 hover:text-teal-200 hover:shadow-[0_0_18px_rgba(45,212,191,0.35)] disabled:opacity-50"
                                aria-label="Send this response to your notes"
                              >
                                {savingId === message.id ? (
                                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                ) : (
                                  <Save size={14} aria-hidden="true" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => void generateFlashcards()}
                                disabled={flashcardsLoading || messages.length < 2}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-50"
                                aria-label="Create flashcards from this conversation"
                              >
                                {flashcardsLoading ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Layers size={12} aria-hidden="true" />}
                                Flashcards
                              </button>
                              <button
                                type="button"
                                onClick={() => void eli5Message(message)}
                                disabled={eli5Loading && eli5MessageId === message.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-50"
                                aria-label="Ask Nova to explain this in simpler language"
                              >
                                {eli5Loading && eli5MessageId === message.id ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Wand2 size={12} aria-hidden="true" />}
                                Explain Simpler
                              </button>
                            </motion.div>
                          )}

                          {eli5Results[message.id] && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 backdrop-blur-xl"
                            >
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Simpler</p>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{eli5Results[message.id]}</p>
                            </motion.div>
                          )}
                        </div>
                      </motion.article>
                    ),
                  )}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-cyan-500 text-sm font-bold text-black shadow-[0_0_18px_rgba(45,212,191,0.55)]" aria-hidden="true">N</div>
                    <div className="flex items-center gap-1 pt-2.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-300" />
                    </div>
                  </motion.div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            {/* Floating glass input bar */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-4 pt-8">
              <div className="pointer-events-auto mx-auto max-w-3xl">
                {/* Teaching Style toggle */}
                <div className="mb-3 flex items-center justify-center">
                  <div
                    role="radiogroup"
                    aria-label="Teaching style"
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={teachingStyle === "direct"}
                      onClick={() => setTeachingStyle("direct")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        teachingStyle === "direct"
                          ? "bg-amber-400/15 text-amber-200 shadow-[0_0_16px_rgba(240,180,41,0.3)]"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Target size={12} aria-hidden="true" />
                      Direct Answer
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={teachingStyle === "socratic"}
                      onClick={() => setTeachingStyle("socratic")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        teachingStyle === "socratic"
                          ? "bg-teal-400/15 text-teal-200 shadow-[0_0_16px_rgba(45,212,191,0.3)]"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Compass size={12} aria-hidden="true" />
                      Socratic Mentor
                    </button>
                  </div>
                </div>

                {slashSuggestions.length > 0 && (
                  <div className="mb-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl" role="listbox" aria-label="Slash command suggestions">
                    {slashSuggestions.map((c) => (
                      <button
                        key={c.cmd}
                        type="button"
                        onClick={() => {
                          setInput(c.cmd + " ");
                          inputRef.current?.focus();
                        }}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-teal-400/10"
                      >
                        <span className="font-mono text-sm font-semibold text-teal-300">{c.cmd}</span>
                        <span className="text-xs text-zinc-400">{c.description}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`flex items-end gap-1 rounded-2xl border bg-white/5 p-1.5 pl-2 shadow-2xl backdrop-blur-2xl transition-all duration-300 will-change-transform ${
                    inputFocused
                      ? "border-blue-400/50 shadow-[0_0_36px_rgba(96,165,250,0.35)]"
                      : matchedCommand
                        ? "border-teal-400/40 shadow-[0_0_28px_rgba(45,212,191,0.2)]"
                        : "border-white/10"
                  }`}
                >
                  <button
                    type="button"
                    title="Voice input (coming soon)"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-90"
                    aria-label="Voice input (coming soon)"
                    onClick={() => showToast("Voice input is coming soon", "info")}
                  >
                    <Mic size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    title="Attach file (coming soon)"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-90"
                    aria-label="Attach file (coming soon)"
                    onClick={() => showToast("File scan is coming soon", "info")}
                  >
                    <Paperclip size={16} aria-hidden="true" />
                  </button>

                  {matchedCommand && (
                    <span className="flex shrink-0 items-center gap-1 self-center rounded-full bg-teal-400/15 px-2 py-1 font-mono text-xs font-bold text-teal-200">
                      {matchedCommand.cmd}
                    </span>
                  )}
                  <label htmlFor="nova-input" className="sr-only">Message Nova</label>
                  <textarea
                    ref={inputRef}
                    id="nova-input"
                    value={input}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder={matchedCommand ? matchedCommand.description : "Ask Nova anything…  try / for commands"}
                    rows={1}
                    className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-white placeholder-zinc-500 outline-none"
                    style={{ minHeight: 24 }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || isThinking}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30 ${
                      input.trim() && !isThinking
                        ? "bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-[0_0_20px_rgba(240,180,41,0.5)] hover:shadow-[0_0_30px_rgba(240,180,41,0.7)]"
                        : "bg-white/10 text-zinc-500"
                    }`}
                    aria-label="Send message to Nova"
                  >
                    {isThinking ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                  </button>
                </div>

                {/* Slash hints */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {COMMANDS.map((c) => {
                    const active = matchedCommand?.cmd === c.cmd;
                    return (
                      <button
                        key={c.cmd}
                        type="button"
                        onClick={() => {
                          setInput(c.cmd + " ");
                          inputRef.current?.focus();
                        }}
                        className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all ${
                          active
                            ? "border-teal-400/50 bg-teal-400/15 text-teal-200 shadow-[0_0_12px_rgba(45,212,191,0.3)]"
                            : "border-white/10 bg-white/5 text-zinc-500 hover:border-white/20 hover:bg-white/10 hover:text-zinc-300"
                        }`}
                        aria-label={`Insert command ${c.cmd}: ${c.description}`}
                      >
                        {c.cmd}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Context sidebar */}
          {contextOpen && (
            <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto pb-40 lg:flex" aria-label="Context panel">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-amber-400" aria-hidden="true" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Subject</h2>
                </div>
                <label htmlFor="ctx-subject" className="sr-only">Subject mode</label>
                <select
                  id="ctx-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wide text-amber-400">ON</span>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Ontario Course</h2>
                </div>
                <label htmlFor="ctx-curriculum" className="sr-only">Ontario course</label>
                <select
                  id="ctx-curriculum"
                  value={curriculumCode}
                  onChange={(e) => setCurriculumCode(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                >
                  <option value="">No course selected</option>
                  {curriculumOptions.map((course) => (
                    <option key={course.code} value={course.code}>
                      {course.code} – {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-amber-400" aria-hidden="true" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Linked Note</h2>
                </div>
                {loadedNote ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{loadedNote.title}</p>
                      <button
                        type="button"
                        onClick={clearLoadedNote}
                        className="shrink-0 rounded-md p-0.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Unlink note"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{loadedNote.content.slice(0, 120)}…</p>
                  </div>
                ) : (
                  <>
                    <label htmlFor="ctx-note" className="sr-only">Link a note</label>
                    <select
                      id="ctx-note"
                      value={selectedNoteId}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                    >
                      <option value="">Pick a note…</option>
                      {notes.map((note) => (
                        <option key={note.id} value={note.id}>{note.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={loadSelectedNote}
                      disabled={!selectedNoteId}
                      className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Link Note
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare size={14} className="text-amber-400" aria-hidden="true" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Recent Chats</h2>
                  {loadingConversation && <Loader2 size={12} className="ml-1 animate-spin text-zinc-500" aria-hidden="true" />}
                </div>
                {conversations.length === 0 ? (
                  <p className="text-xs text-zinc-500">Your past conversations with Nova will appear here.</p>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                    {conversations.map((c) => {
                      const active = c.id === conversationId;
                      return (
                        <li key={c.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => void loadConversation(c.id)}
                            className={`w-full rounded-lg px-2.5 py-2 pr-7 text-left transition ${
                              active
                                ? "bg-amber-500/10 text-amber-200"
                                : "text-zinc-300 hover:bg-white/5 hover:text-white"
                            }`}
                            aria-label={`Open conversation: ${c.title}`}
                          >
                            <p className="line-clamp-1 text-xs font-medium">{c.title}</p>
                            <p className="mt-0.5 text-[10px] text-zinc-500">
                              {c.subject ?? "General"} · {c.messageCount} msgs · {new Date(c.updatedAt).toLocaleDateString()}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteConversation(c.id)}
                            className="absolute right-1 top-1.5 rounded-md p-1 text-zinc-600 opacity-0 transition hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                            aria-label={`Delete conversation ${c.title}`}
                          >
                            <Trash2 size={11} aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Bookmark size={14} className="text-amber-400" aria-hidden="true" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Saved Snippets</h2>
                </div>
                {snippets.length === 0 ? (
                  <p className="text-xs text-zinc-500">Use “Save to Notes” on Nova&apos;s replies — they&apos;ll appear here for quick recall.</p>
                ) : (
                  <ul className="space-y-2">
                    {snippets.map((s) => (
                      <li key={s.id} className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-300">{s.text}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* One-shot scanning line on first mount */}
      <AnimatePresence>
        {showScanLine && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[100dvh] overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-x-0 h-px will-change-transform"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(45,212,191,0.85) 50%, transparent 100%)",
                boxShadow: "0 0 18px 2px rgba(45,212,191,0.55)",
              }}
              initial={{ y: -8 }}
              animate={{ y: "100dvh" }}
              transition={{ duration: 2.4, ease: [0.2, 0.8, 0.4, 1] }}
              onAnimationComplete={() => setShowScanLine(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying ghost: animates a glass copy of the bubble toward the sidebar Notes icon */}
      <AnimatePresence>
        {flyingMessage && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 will-change-transform"
            initial={{
              left: flyingMessage.from.x,
              top: flyingMessage.from.y,
              width: flyingMessage.from.width,
              height: flyingMessage.from.height,
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            animate={{
              left: flyingMessage.to.x,
              top: flyingMessage.to.y,
              width: 28,
              height: 28,
              opacity: 0,
              scale: 0.25,
              rotate: -8,
            }}
            transition={{ duration: 0.85, ease: [0.32, 0.72, 0, 1] }}
            onAnimationComplete={() => setFlyingMessage(null)}
          >
            <div className="h-full w-full rounded-2xl border border-teal-300/50 bg-white/10 shadow-[0_0_28px_rgba(45,212,191,0.55)] backdrop-blur-xl" />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .kv-prose h1.kv-h1 { font-size: 1.5rem; font-weight: 800; color: #fff; margin: 1rem 0 0.5rem; letter-spacing: -0.01em; }
        .kv-prose h2.kv-h2 { font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0.875rem 0 0.5rem; letter-spacing: -0.01em; }
        .kv-prose h3.kv-h3 { font-size: 1.05rem; font-weight: 700; color: #f4f4f5; margin: 0.75rem 0 0.4rem; }
        .kv-prose p { margin: 0.4rem 0; color: #e4e4e7; }
        .kv-prose strong { color: #fff; font-weight: 700; }
        .kv-prose em { color: #fde68a; font-style: italic; }
        .kv-prose ul.kv-ul,
        .kv-prose ol.kv-ol { margin: 0.5rem 0 0.5rem 0; padding-left: 1.25rem; color: #e4e4e7; }
        .kv-prose ul.kv-ul { list-style: disc; }
        .kv-prose ol.kv-ol { list-style: decimal; }
        .kv-prose ul.kv-ul li::marker { color: #f0b429; }
        .kv-prose ol.kv-ol li::marker { color: #f0b429; font-weight: 700; }
        .kv-prose li { margin: 0.2rem 0; }
        .kv-prose code.kv-inline-code {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.1rem 0.35rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9em;
          color: #fde68a;
        }
        .kv-prose pre.kv-code {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          overflow-x: auto;
          margin: 0.75rem 0;
          font-size: 0.875rem;
        }
        .kv-prose pre.kv-code code {
          color: #e4e4e7;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .kv-prose .math-block { margin: 0.5rem 0; overflow-x: auto; }

        /* Nova Core ambient orb */
        .kv-orb {
          position: relative;
          width: 84px;
          height: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
        }
        .kv-orb-core {
          position: absolute;
          inset: 30%;
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, #fde68a 0%, #f59e0b 55%, #b45309 100%);
          box-shadow:
            0 0 32px rgba(245, 158, 11, 0.55),
            inset 0 0 12px rgba(255, 255, 255, 0.35);
          animation: kv-orb-breath 4.2s ease-in-out infinite;
          transition: background 600ms ease, box-shadow 600ms ease;
        }
        .kv-orb-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1.5px solid rgba(245, 158, 11, 0.35);
          opacity: 0;
          animation: kv-orb-pulse 3.4s ease-out infinite;
          transition: border-color 600ms ease;
        }
        .kv-orb-ring--1 { animation-delay: 0s; }
        .kv-orb-ring--2 { animation-delay: 1.13s; }
        .kv-orb-ring--3 { animation-delay: 2.26s; }
        .kv-orb-icon {
          position: relative;
          z-index: 2;
          color: rgba(255, 255, 255, 0.92);
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
        }
        .kv-orb--active .kv-orb-core {
          background: radial-gradient(circle at 30% 30%, #99f6e4 0%, #14b8a6 55%, #0f766e 100%);
          box-shadow:
            0 0 40px rgba(20, 184, 166, 0.65),
            inset 0 0 14px rgba(255, 255, 255, 0.45);
          animation-duration: 1.8s;
        }
        .kv-orb--active .kv-orb-ring {
          border-color: rgba(20, 184, 166, 0.45);
          animation-duration: 1.6s;
        }
        @keyframes kv-orb-breath {
          0%, 100% { transform: scale(0.95); }
          50% { transform: scale(1.06); }
        }
        @keyframes kv-orb-pulse {
          0%   { transform: scale(0.85); opacity: 0.55; }
          70%  { opacity: 0.0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kv-orb-core,
          .kv-orb-ring { animation: none !important; }
        }

        /* Subtle manifestation stagger for Nova prose paragraphs */
        .kv-prose--manifest > p,
        .kv-prose--manifest > ul,
        .kv-prose--manifest > ol,
        .kv-prose--manifest > h1,
        .kv-prose--manifest > h2,
        .kv-prose--manifest > h3 {
          animation: kv-manifest 420ms cubic-bezier(0.2, 0.8, 0.4, 1) both;
        }
        .kv-prose--manifest > *:nth-child(1) { animation-delay: 30ms; }
        .kv-prose--manifest > *:nth-child(2) { animation-delay: 90ms; }
        .kv-prose--manifest > *:nth-child(3) { animation-delay: 150ms; }
        .kv-prose--manifest > *:nth-child(4) { animation-delay: 210ms; }
        .kv-prose--manifest > *:nth-child(5) { animation-delay: 260ms; }
        .kv-prose--manifest > *:nth-child(n+6) { animation-delay: 310ms; }
        @keyframes kv-manifest {
          from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0);  filter: blur(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kv-prose--manifest > * { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
