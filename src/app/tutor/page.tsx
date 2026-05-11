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
} from "lucide-react";
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
  const { showToast } = useToast();

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex h-[100dvh] w-full max-w-7xl flex-col px-4 sm:px-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" aria-hidden="true" />
              <span className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_20px_rgba(240,180,41,0.6)]" aria-hidden="true" />
              <Sparkles size={14} className="relative z-10 text-black" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Nova AI</h1>
              <p className="text-xs text-zinc-500">Ontario Grade 11–12 tutor · {subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={newChat}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Start a new chat"
            >
              New Chat
            </button>
            <button
              type="button"
              onClick={() => setContextOpen((p) => !p)}
              className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white active:scale-95 lg:flex"
              aria-label={contextOpen ? "Hide context panel" : "Show context panel"}
              aria-expanded={contextOpen}
            >
              {contextOpen ? <PanelRightClose size={14} aria-hidden="true" /> : <PanelRightOpen size={14} aria-hidden="true" />}
              Context
            </button>
          </div>
        </header>

        {/* Main grid: chat + context sidebar */}
        <div className={`grid min-h-0 flex-1 gap-6 ${contextOpen ? "lg:grid-cols-[1fr_300px]" : "lg:grid-cols-1"}`}>
          {/* Chat column */}
          <section className="relative flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-6 pb-40">
                {messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base leading-relaxed text-zinc-100 sm:max-w-[70%]">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <article key={message.id} className="flex gap-3">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-sm font-bold text-black shadow-[0_0_15px_rgba(240,180,41,0.4)]" aria-hidden="true">
                        N
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="kv-prose break-words text-base leading-relaxed text-zinc-100"
                          dangerouslySetInnerHTML={{ __html: formatNova(message.content) }}
                        />

                        {message.content && !isLoading && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void saveAssistantMessage(message)}
                              disabled={savingId === message.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-2.5 py-1 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-50"
                              aria-label="Save this response to your notes"
                            >
                              {savingId === message.id ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Save size={12} aria-hidden="true" />}
                              Save to Notes
                            </button>
                            <button
                              type="button"
                              onClick={() => void generateFlashcards()}
                              disabled={flashcardsLoading || messages.length < 2}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-2.5 py-1 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-50"
                              aria-label="Create flashcards from this conversation"
                            >
                              {flashcardsLoading ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Layers size={12} aria-hidden="true" />}
                              Create Flashcards
                            </button>
                            <button
                              type="button"
                              onClick={() => void eli5Message(message)}
                              disabled={eli5Loading && eli5MessageId === message.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-2.5 py-1 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-50"
                              aria-label="Ask Nova to explain this in simpler language"
                            >
                              {eli5Loading && eli5MessageId === message.id ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Wand2 size={12} aria-hidden="true" />}
                              Explain Simpler
                            </button>
                          </div>
                        )}

                        {eli5Results[message.id] && (
                          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Simpler</p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{eli5Results[message.id]}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ),
                )}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-sm font-bold text-black" aria-hidden="true">N</div>
                    <div className="flex items-center gap-1 pt-2.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" />
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            {/* Floating pill input */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-4 pt-8">
              <div className="pointer-events-auto mx-auto max-w-3xl">
                {slashSuggestions.length > 0 && (
                  <div className="mb-2 overflow-hidden rounded-xl border border-amber-500/20 bg-zinc-950/95 shadow-2xl backdrop-blur-md" role="listbox" aria-label="Slash command suggestions">
                    {slashSuggestions.map((c) => (
                      <button
                        key={c.cmd}
                        type="button"
                        onClick={() => {
                          setInput(c.cmd + " ");
                          inputRef.current?.focus();
                        }}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-amber-500/10"
                      >
                        <span className="font-mono text-sm font-semibold text-amber-400">{c.cmd}</span>
                        <span className="text-xs text-zinc-400">{c.description}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className={`flex items-end gap-2 rounded-full border bg-zinc-950/95 p-1.5 pl-5 shadow-2xl backdrop-blur-md transition-all ${
                  matchedCommand ? "border-amber-500/40 shadow-[0_0_30px_rgba(240,180,41,0.15)]" : "border-white/10"
                }`}>
                  {matchedCommand && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 font-mono text-xs font-bold text-amber-300">
                      {matchedCommand.cmd}
                    </span>
                  )}
                  <label htmlFor="nova-input" className="sr-only">Message Nova</label>
                  <textarea
                    ref={inputRef}
                    id="nova-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder={matchedCommand ? matchedCommand.description : "Ask Nova anything…  try / for commands"}
                    rows={1}
                    className="max-h-32 flex-1 resize-none bg-transparent py-2.5 text-base text-white placeholder-zinc-500 outline-none"
                    style={{ minHeight: 24 }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || isThinking}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-30 ${
                      input.trim() && !isThinking
                        ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(240,180,41,0.5)] hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(240,180,41,0.7)]"
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
                            ? "border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(240,180,41,0.3)]"
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
      `}</style>
    </main>
  );
}
