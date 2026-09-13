"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { useToast } from "~/app/_components/toast";
import { renderMath } from "@/lib/mathRenderer";
import { formatTorontoDate } from "~/lib/toronto-time";

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

export default function TutorChat() {
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
  const [pendingNoteId, setPendingNoteId] = useState("");
  const [mockExamId, setMockExamId] = useState("");
  const [mockExamLabel, setMockExamLabel] = useState("");
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
    const sp = new URLSearchParams(window.location.search);
    const noteId = sp.get("noteId")?.trim() ?? "";
    if (noteId) setPendingNoteId(noteId);
    const mockId = sp.get("mockId")?.trim() ?? "";
    if (mockId) setMockExamId(mockId);
  }, []);

  useEffect(() => {
    if (!mockExamId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/mock-exam/${mockExamId}/attempt`);
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as {
          exam?: { title?: string; noteId?: string | null; curriculumCode?: string | null; subject?: string };
          latestAttempt?: { scorePercent?: number } | null;
        };
        if (data.exam?.title) {
          const score =
            typeof data.latestAttempt?.scorePercent === "number"
              ? ` · ${Math.round(data.latestAttempt.scorePercent)}%`
              : "";
          setMockExamLabel(`${data.exam.title}${score}`);
        }
        if (data.exam?.curriculumCode) setCurriculumCode(data.exam.curriculumCode);
        if (data.exam?.noteId) setPendingNoteId(data.exam.noteId);
      } catch {
        // optional
      }
    })();
  }, [mockExamId]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/notes?limit=100");
      if (!response.ok) return;
      const data = (await response.json()) as { notes?: NoteItem[] };
      setNotes(data.notes ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!pendingNoteId) return;
    const note = notes.find((item) => item.id === pendingNoteId);
    if (!note) return;
    setLoadedNote({ id: note.id, title: note.title, content: note.content });
    setSelectedNoteId(note.id);
  }, [pendingNoteId, notes]);

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

  // Streaming typewriter effect with atomic ref for smooth rendering
  const streamingContentRef = useRef<string>("");
  const typeAssistantMessage = async (content: string) => {
    const id = makeId();
    setIsTypingResponse(true);
    streamingContentRef.current = "";
    setMessages((prev) => [
      ...prev,
      { id, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    // Type ~3 chars per tick for fluid streaming
    const step = 3;
    for (let index = 0; index < content.length; index += step) {
      await new Promise((resolve) => window.setTimeout(resolve, 12));
      const next = content.slice(0, Math.min(index + step, content.length));
      streamingContentRef.current = next;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: next } : m)));
    }

    streamingContentRef.current = content;
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
          mockExamId: mockExamId || undefined,
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
          mockExamId: mockExamId || undefined,
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

  const openThreadTitle =
    conversations.find((c) => c.id === conversationId)?.title ?? "New chat";

  return (
    <div className="flex min-h-[70vh] border" style={{ borderColor: "var(--border-default)", borderRadius: "var(--kv-radius)", background: "var(--bg-card)" }}>
      <aside
        className="hidden md:flex flex-col"
        style={{ width: 250, borderRight: "1px solid var(--border-default)", flex: "none" }}
      >
        <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
          <span className="kv-meta">Chats</span>
          <button type="button" onClick={newChat} className="kv-btn-ghost" style={{ padding: "4px 8px" }} aria-label="Start a new chat">
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversation ? <p className="kv-meta px-3 py-3">Loading</p> : null}
          {conversations.length === 0 && !loadingConversation ? (
            <p className="kv-sub px-3 py-3">No chats yet.</p>
          ) : (
            conversations.map((c) => {
              const active = c.id === conversationId;
              return (
                <div key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => void loadConversation(c.id)}
                    className={active ? "thread-row on" : "thread-row"}
                    aria-label={`Open conversation: ${c.title}`}
                    aria-current={active ? "true" : undefined}
                  >
                    {active ? (
                      <span className="dot" aria-hidden />
                    ) : (
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          border: "1px solid var(--kv-text-ghost)",
                          display: "inline-block",
                          flex: "none",
                        }}
                      />
                    )}
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteConversation(c.id)}
                    className="absolute right-1 top-1.5 kv-btn-ghost opacity-0 group-hover:opacity-100"
                    style={{ padding: 4 }}
                    aria-label={`Delete conversation ${c.title}`}
                  >
                    <Trash2 size={11} aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <span className="kv-meta truncate">open thread / {openThreadTitle}</span>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {mockExamLabel ? (
              <span className="kv-meta truncate" style={{ maxWidth: 220 }}>
                Mock · {mockExamLabel}
              </span>
            ) : null}
            {loadedNote ? (
              <span className="kv-meta flex items-center gap-2">
                Linked note
                {curriculumCode ? <span className="kv-chip kv-chip-course">{curriculumCode}</span> : null}
                <span className="truncate" style={{ maxWidth: 180 }}>{loadedNote.title}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="mb-6 flex justify-end">
                <p className="nova-reply" style={{ color: "var(--kv-text-primary)" }}>
                  {message.content}
                </p>
              </div>
            ) : (
              <article key={message.id} className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className="nova-k" aria-hidden>K</span>
                  <span className="kv-meta">Kyvex / Nova</span>
                </div>
                <div
                  className="nova-reply"
                  dangerouslySetInnerHTML={{ __html: formatNova(message.content) }}
                />
                {message.content && !isLoading ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => triggerSaveWithFlight(message)}
                      disabled={savingId === message.id}
                      className="kv-btn-ghost"
                      aria-label="Send this response to your notes"
                    >
                      {savingId === message.id ? "Saving…" : "Save to notes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void generateFlashcards()}
                      disabled={flashcardsLoading || messages.length < 2}
                      className="kv-btn-ghost"
                      aria-label="Create flashcards from this conversation"
                    >
                      {flashcardsLoading ? "Generating…" : "Flashcards"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void eli5Message(message)}
                      disabled={eli5Loading && eli5MessageId === message.id}
                      className="kv-btn-ghost"
                      aria-label="Ask Nova to explain this in simpler language"
                    >
                      {eli5Loading && eli5MessageId === message.id ? "Working…" : "Explain simpler"}
                    </button>
                  </div>
                ) : null}
                {eli5Results[message.id] ? (
                  <p className="nova-reply mt-3">{eli5Results[message.id]}</p>
                ) : null}
              </article>
            ),
          )}
          {isLoading ? <p className="kv-meta">Thinking…</p> : null}
          <div ref={endRef} />
        </div>

        <div style={{ borderTop: "1px solid var(--border-default)" }}>
          <div className="kv-tabs px-4 pt-3" role="radiogroup" aria-label="Teaching style">
            <button
              type="button"
              role="radio"
              aria-checked={teachingStyle === "direct"}
              onClick={() => setTeachingStyle("direct")}
              className={teachingStyle === "direct" ? "kv-tab on" : "kv-tab"}
            >
              Direct
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={teachingStyle === "socratic"}
              onClick={() => setTeachingStyle("socratic")}
              className={teachingStyle === "socratic" ? "kv-tab on" : "kv-tab"}
            >
              Socratic
            </button>
          </div>
          {slashSuggestions.length > 0 ? (
            <div className="px-4" role="listbox" aria-label="Slash command suggestions">
              {slashSuggestions.map((c) => (
                <button
                  key={c.cmd}
                  type="button"
                  onClick={() => {
                    setInput(c.cmd + " ");
                    inputRef.current?.focus();
                  }}
                  className="kv-row"
                  style={{ width: "100%", background: "transparent", textAlign: "left", cursor: "pointer" }}
                >
                  <span className="kv-row-title">{c.cmd}</span>
                  <span className="kv-row-side">{c.description}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2 px-4 py-3">
            {matchedCommand ? <span className="kv-chip">{matchedCommand.cmd}</span> : null}
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
              className="kv-field bare flex-1"
              style={{ resize: "none", minHeight: 34, maxHeight: 120 }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isThinking}
              className="send"
              aria-label="Send message to Nova"
            >
              {isThinking ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M2 7h9M8 3.5 11.5 7 8 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {COMMANDS.map((c) => (
              <button
                key={c.cmd}
                type="button"
                onClick={() => {
                  setInput(c.cmd + " ");
                  inputRef.current?.focus();
                }}
                className="kv-chip"
                style={
                  matchedCommand?.cmd === c.cmd
                    ? { borderColor: "var(--kv-accent-text)", color: "var(--kv-accent-text)" }
                    : undefined
                }
                aria-label={`Insert command ${c.cmd}: ${c.description}`}
              >
                {c.cmd}
              </button>
            ))}
          </div>
        </div>
      </section>

      {contextOpen ? (
        <aside
          className="hidden lg:flex min-h-0 w-[280px] flex-none flex-col gap-4 overflow-y-auto px-4 py-4"
          style={{ borderLeft: "1px solid var(--border-default)" }}
          aria-label="Context panel"
        >
          <button type="button" onClick={() => setContextOpen(false)} className="kv-btn-ghost self-end" style={{ padding: "4px 8px" }}>
            Hide
          </button>
          <div>
            <h2 className="kv-meta">Subject</h2>
            <label htmlFor="ctx-subject" className="sr-only">Subject mode</label>
            <select
              id="ctx-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="kv-field mt-2"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <h2 className="kv-meta">Ontario course</h2>
            <label htmlFor="ctx-curriculum" className="sr-only">Ontario course</label>
            <select
              id="ctx-curriculum"
              value={curriculumCode}
              onChange={(e) => setCurriculumCode(e.target.value)}
              className="kv-field mt-2"
            >
              <option value="">No course selected</option>
              {curriculumOptions.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.code} – {course.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <h2 className="kv-meta">Linked Note</h2>
            {loadedNote ? (
              <div className="mt-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="kv-row-title">{loadedNote.title}</p>
                  <button type="button" onClick={clearLoadedNote} className="kv-btn-ghost" style={{ padding: 4 }} aria-label="Unlink note">
                    <X size={14} />
                  </button>
                </div>
                <p className="kv-sub mt-1 line-clamp-2">{loadedNote.content.slice(0, 120)}…</p>
              </div>
            ) : (
              <>
                <label htmlFor="ctx-note" className="sr-only">Link a note</label>
                <select
                  id="ctx-note"
                  value={selectedNoteId}
                  onChange={(e) => setSelectedNoteId(e.target.value)}
                  className="kv-field mt-2"
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
                  className="kv-btn mt-2 w-full justify-center"
                >
                  Link Note
                </button>
              </>
            )}
          </div>
          {snippets.length > 0 ? (
            <div>
              <h2 className="kv-meta">Saved snippets</h2>
              {snippets.map((s) => (
                <div key={s.id} className="kv-row">
                  <div>
                    <div className="kv-row-title" style={{ fontWeight: 400, fontSize: 13 }}>{s.text}</div>
                  </div>
                  <span className="kv-row-side">{formatTorontoDate(s.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setContextOpen(true)}
          className="kv-btn-ghost hidden lg:inline-flex self-start m-3"
          aria-label="Show context panel"
        >
          Context
        </button>
      )}
    </div>
  );
}