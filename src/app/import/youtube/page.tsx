"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Link2,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  FileText,
  PlayCircle,
  Cpu,
  Brain,
  Layers,
  HelpCircle,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "~/app/_components/toast";

type ImportResponse = {
  videoId: string;
  videoUrl: string;
  title: string;
  author: string;
  transcriptLength: number;
  transcriptPreview: string;
  transcript?: string;
  notes: string;
};

type ActionKey = "notes" | "flashcards" | "quiz";

const ACTIONS: Array<{
  key: ActionKey;
  title: string;
  description: string;
  accent: "cyan" | "purple" | "red";
  icon: React.ReactNode;
}> = [
  {
    key: "notes",
    title: "AI Notes Matrix",
    description: "Structured Ontario-style study notes ready to revise.",
    accent: "cyan",
    icon: <Brain size={18} aria-hidden="true" />,
  },
  {
    key: "flashcards",
    title: "Smart Flashcard Batch",
    description: "Q&A cards optimized for spaced repetition.",
    accent: "purple",
    icon: <Layers size={18} aria-hidden="true" />,
  },
  {
    key: "quiz",
    title: "Nova Interactive Quiz",
    description: "Practice questions with full step-by-step answers.",
    accent: "red",
    icon: <HelpCircle size={18} aria-hidden="true" />,
  },
];

const ACCENT_STYLES: Record<
  "cyan" | "purple" | "red",
  {
    spotlight: string;
    border: string;
    icon: string;
    glow: string;
    chip: string;
  }
> = {
  cyan: {
    spotlight: "rgba(34,211,238,0.28)",
    border: "hover:border-cyan-400/40",
    icon: "text-cyan-200",
    glow: "shadow-[0_0_28px_rgba(34,211,238,0.35)]",
    chip: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  },
  purple: {
    spotlight: "rgba(168,85,247,0.28)",
    border: "hover:border-purple-400/40",
    icon: "text-purple-200",
    glow: "shadow-[0_0_28px_rgba(168,85,247,0.35)]",
    chip: "border-purple-400/30 bg-purple-400/10 text-purple-200",
  },
  red: {
    spotlight: "rgba(239,68,68,0.28)",
    border: "hover:border-red-400/40",
    icon: "text-red-200",
    glow: "shadow-[0_0_28px_rgba(239,68,68,0.35)]",
    chip: "border-red-400/30 bg-red-400/10 text-red-200",
  },
};

const SUBJECTS = ["General", "Math", "Science", "English", "History", "Chemistry", "Physics", "Biology"];

const YT_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/i;

function isValidYouTubeUrl(url: string): boolean {
  return YT_REGEX.test(url.trim());
}

// ---------- minimal markdown renderer (headings/bold/lists/code) ----------
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderMarkdown(md: string): string {
  let html = md;
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, _l, c) => {
    const i = codeBlocks.length;
    codeBlocks.push(`<pre class="kv-code"><code>${escapeHtml(c.trim())}</code></pre>`);
    return `\u0000CB${i}\u0000`;
  });
  html = html.replace(/`([^`\n]+)`/g, (_, c) => `<code class="kv-inline-code">${escapeHtml(c)}</code>`);
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-semibold text-amber-300 mt-5 mb-2">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-bold text-amber-200 mt-6 mb-3 border-b border-white/10 pb-1">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-extrabold text-white mt-2 mb-4">$1</h1>');
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="text-white">$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
  html = html.replace(/(?:^[-*]\s+.+(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((l) => l.replace(/^[-*]\s+/, "").trim())
      .filter(Boolean)
      .map((t) => `<li class="ml-5 list-disc text-white/85 leading-relaxed">${t}</li>`)
      .join("");
    return `<ul class="my-2 space-y-1">${items}</ul>`;
  });
  html = html.replace(/(?:^\d+\.\s+.+(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((l) => l.replace(/^\d+\.\s+/, "").trim())
      .filter(Boolean)
      .map((t) => `<li class="ml-5 list-decimal text-white/85 leading-relaxed">${t}</li>`)
      .join("");
    return `<ol class="my-2 space-y-1">${items}</ol>`;
  });
  html = html.replace(/\n{2,}/g, '</p><p class="text-white/80 leading-relaxed my-2">');
  html = `<p class="text-white/80 leading-relaxed my-2">${html}</p>`;
  html = html.replace(/<p[^>]*>\s*(<h[1-3])/g, "$1");
  html = html.replace(/(<\/h[1-3]>)\s*<\/p>/g, "$1");
  html = html.replace(/\u0000CB(\d+)\u0000/g, (_, i) => codeBlocks[Number(i)] ?? "");
  return html;
}

// ---------- Terminal-style Processing Feed with downward laser sweep ----------
function ProcessingFeed({
  stage,
  transcript,
  accent = "red",
  label = "processing.feed",
}: {
  stage: string;
  transcript?: string | null;
  accent?: "red" | "cyan" | "purple";
  label?: string;
}) {
  const laserColor =
    accent === "cyan"
      ? "via-cyan-400"
      : accent === "purple"
        ? "via-purple-400"
        : "via-red-500";

  const lines = useMemo(() => {
    if (!transcript) {
      return [
        "$ kyvex transcribe --source youtube",
        "> handshaking with captions server…",
        "> awaiting transcript stream…",
      ];
    }
    // Break the transcript into visually readable chunks
    return transcript
      .split(/(?<=[.!?])\s+/)
      .slice(0, 18)
      .map((s, i) => `[${String(i + 1).padStart(2, "0")}] ${s.trim()}`)
      .filter(Boolean);
  }, [transcript]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
      {/* Terminal title bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400/80" />
            <span className="h-2 w-2 rounded-full bg-yellow-400/70" />
            <span className="h-2 w-2 rounded-full bg-green-400/70" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            <Terminal size={11} className="mr-1 inline align-text-bottom" aria-hidden="true" />
            {label}
          </span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
          <Loader2 size={10} className="animate-spin text-zinc-400" aria-hidden="true" />
          {stage}
        </span>
      </div>

      {/* Body: transcript-style monospace with sweeping laser */}
      <div className="relative max-h-56 overflow-hidden p-4">
        <div
          aria-hidden="true"
          className={`kv-laser-sweep pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${laserColor} to-transparent`}
          style={{ ["--kv-laser-distance" as never]: "224px" }}
        />
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-400">
          {lines.join("\n")}
        </pre>
        {/* fade-out at bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent"
        />
      </div>
    </motion.div>
  );
}

// ---------- Action Node with cursor-tracked radial spotlight ----------
function ActionNode({
  icon,
  title,
  description,
  accent,
  loading,
  done,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: "cyan" | "purple" | "red";
  loading: boolean;
  done: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const styles = ACCENT_STYLES[accent];

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      disabled={loading}
      whileHover={loading ? undefined : { y: -4 }}
      whileTap={loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-xl transition-colors will-change-transform ${styles.border} ${
        loading ? "cursor-progress" : "cursor-pointer"
      } disabled:opacity-90`}
      aria-label={title}
    >
      {/* Cursor-tracked spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), ${styles.spotlight}, transparent 55%)`,
        }}
      />
      {/* Subtle inner highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 40%)",
        }}
      />

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${styles.icon} transition-shadow group-hover:${styles.glow}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            {done && (
              <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide ${styles.chip}`}>
                <CheckCircle2 size={9} aria-hidden="true" />
                Ready
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{description}</p>
        </div>
        <div className="shrink-0 self-center text-zinc-500 transition-transform group-hover:translate-x-0.5">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-zinc-300" aria-hidden="true" />
          ) : (
            <ChevronRight size={14} aria-hidden="true" />
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ----------------------------------------------------------------------

export default function YouTubeImportPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState("General");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("Fetching transcript…");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string } | null>(null);

  // Action / pipeline state
  const [generating, setGenerating] = useState<ActionKey | null>(null);
  const [genStage, setGenStage] = useState("Booting Nova model…");
  const [generated, setGenerated] = useState<Record<ActionKey, string | null>>({
    notes: null,
    flashcards: null,
    quiz: null,
  });
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [pipeline, setPipeline] = useState<ActionKey[]>(["notes"]);

  const valid = useMemo(() => isValidYouTubeUrl(url), [url]);

  // Sync notes content as soon as the initial fetch returns
  useEffect(() => {
    if (result?.notes) {
      setGenerated((prev) => ({ ...prev, notes: result.notes }));
      setActiveAction((prev) => prev ?? "notes");
    }
  }, [result?.notes]);

  const renderedResult = useMemo(() => {
    if (!activeAction) return "";
    const content = generated[activeAction];
    return content ? renderMarkdown(content) : "";
  }, [activeAction, generated]);

  const togglePipeline = (key: ActionKey) => {
    setPipeline((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  async function handleFetch() {
    if (!valid || loading) return;
    setError(null);
    setResult(null);
    setSaved(null);
    setActiveAction(null);
    setGenerated({ notes: null, flashcards: null, quiz: null });
    setLoading(true);
    setStage("Establishing capture stream…");

    const stageTimers = [
      setTimeout(() => setStage("Pulling captions from YouTube…"), 1500),
      setTimeout(() => setStage("Cleaning up transcript…"), 3500),
      setTimeout(() => setStage("Asking Nova to summarise into Ontario-style notes…"), 5500),
      setTimeout(() => setStage("Polishing headings and bullet points…"), 11000),
    ];

    try {
      const res = await fetch("/api/import/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          subject,
          curriculumCode: curriculumCode.trim() || undefined,
        }),
      });
      const raw = await res.text();
      let data: Partial<ImportResponse> & { error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // non-JSON
      }
      if (!res.ok || !data.notes) {
        setError(data.error ?? `Import failed (HTTP ${res.status}).`);
        return;
      }
      setResult(data as ImportResponse);
      showToast("Video staged · notes ready", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      stageTimers.forEach(clearTimeout);
      setLoading(false);
    }
  }

  async function handleAction(key: ActionKey) {
    if (!result) return;
    // If already generated, just switch the active panel
    if (generated[key]) {
      setActiveAction(key);
      return;
    }
    // Notes are auto-populated from the fetch — defensive fallback
    if (key === "notes") {
      setActiveAction("notes");
      return;
    }

    setGenerating(key);
    setActiveAction(key);
    setGenStage(
      key === "flashcards"
        ? "Designing flashcard batch…"
        : "Composing interactive quiz…",
    );

    const format = key === "flashcards" ? "flashcards" : "questions";
    const text =
      result.transcript ??
      result.transcriptPreview ??
      result.notes ??
      "";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          format,
          subject,
          curriculumCode: curriculumCode.trim() || undefined,
          quizQuestionCount: key === "quiz" ? 8 : undefined,
          quizDifficulty: key === "quiz" ? "balanced" : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { notes?: string; error?: string };
      if (!res.ok || !data.notes) {
        showToast(data.error ?? `Generation failed (HTTP ${res.status}).`, "error");
        setActiveAction(null);
        return;
      }
      setGenerated((prev) => ({ ...prev, [key]: data.notes ?? "" }));
      showToast(
        key === "flashcards" ? "Flashcard batch ready" : "Interactive quiz ready",
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Generation failed", "error");
      setActiveAction(null);
    } finally {
      setGenerating(null);
    }
  }

  async function handleSaveToNotes() {
    if (!result || saving) return;
    setSaving(true);
    try {
      const tags = [subject, "YouTube Import"].filter((t) => t && t !== "General");
      const notesContent = generated.notes ?? result.notes;
      const contentWithSource = `> Imported from [${result.title}](${result.videoUrl}) — ${result.author}\n\n${notesContent}`;

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          content: contentWithSource,
          format: "summary",
          tags,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { note?: { id: string }; error?: string };
      if (!res.ok || !data.note) {
        showToast(data.error ?? "Could not save note", "error");
        return;
      }
      setSaved({ id: data.note.id });
      showToast("Saved to My Notes", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setUrl("");
    setResult(null);
    setError(null);
    setSaved(null);
    setActiveAction(null);
    setGenerated({ notes: null, flashcards: null, quiz: null });
  }

  const activeAccent: "cyan" | "purple" | "red" =
    activeAction === "flashcards" ? "purple" : activeAction === "quiz" ? "red" : "cyan";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Ambient red/purple glow at top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.16), transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(168,85,247,0.10), transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/30 to-purple-500/20 backdrop-blur-xl shadow-[0_0_28px_rgba(239,68,68,0.35)]">
            <PlayCircle className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              YouTube Import
            </h1>
            <p className="text-sm text-zinc-500">
              Stream a lecture link into Nova&apos;s data engine. Generate notes, flashcards, and quizzes from a single transcript.
            </p>
          </div>
        </motion.div>

        {/* ─────────────── Stream Input Bar ─────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="mx-auto w-full max-w-3xl"
        >
          <div className="kv-stream-pill group relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-xl transition-all duration-300 focus-within:border-red-500/40 focus-within:bg-white/[0.07] focus-within:shadow-[0_0_44px_rgba(239,68,68,0.22)]">
            <Link2
              size={18}
              className="shrink-0 text-zinc-500 transition-colors group-focus-within:text-red-300"
              aria-hidden="true"
            />
            <input
              id="yt-url"
              type="url"
              inputMode="url"
              placeholder="Paste a YouTube link…"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valid && !loading) void handleFetch();
              }}
              aria-label="YouTube video URL"
              disabled={loading}
              className="min-w-0 flex-1 bg-transparent py-2 text-base text-white placeholder-zinc-500 outline-none disabled:opacity-60"
            />
            <motion.button
              type="button"
              onClick={() => void handleFetch()}
              disabled={!valid || loading}
              whileHover={valid && !loading ? { scale: 1.02 } : undefined}
              whileTap={valid && !loading ? { scale: 0.95 } : undefined}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all will-change-transform ${
                valid && !loading
                  ? "border-red-400/30 bg-gradient-to-br from-red-500/25 to-red-500/10 text-red-100 hover:border-red-400/60 hover:from-red-500/35 hover:shadow-[0_0_28px_rgba(239,68,68,0.45)]"
                  : "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500"
              }`}
              aria-label="Fetch video"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Fetching
                </>
              ) : (
                <>
                  <Sparkles size={14} aria-hidden="true" />
                  Fetch Video
                </>
              )}
            </motion.button>
          </div>

          {/* Inline validation hint */}
          <AnimatePresence>
            {!valid && url.length > 0 && !loading && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 flex items-center justify-center gap-2 text-xs text-amber-300/90"
              >
                <AlertTriangle size={12} aria-hidden="true" />
                That URL doesn&apos;t look like a YouTube link.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Inline error toast */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200 backdrop-blur-xl"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-red-100">Couldn&apos;t fetch this video</p>
                <p className="mt-1 text-red-200/90">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-lg px-2 py-1 text-xs text-red-200/80 transition hover:bg-red-500/20"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initial fetch Processing Feed */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="fetch-feed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mx-auto mt-8 max-w-3xl"
            >
              <ProcessingFeed stage={stage} transcript={null} accent="red" label="fetch.stream" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────── Floating Video Stage ─────────────── */}
        <AnimatePresence>
          {result && !loading && (
            <motion.section
              key="video-stage"
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.7 }}
              className="mt-10 will-change-transform"
            >
              {/* Stage grid */}
              <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
                {/* LEFT — premium thumbnail bezel with ambient blur */}
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-6 -z-10 rounded-[2rem] blur-3xl"
                    style={{
                      background:
                        "radial-gradient(ellipse at 30% 30%, rgba(239,68,68,0.35), transparent 55%), radial-gradient(ellipse at 75% 75%, rgba(168,85,247,0.28), transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.18), transparent 55%)",
                    }}
                  />
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
                    <div className="relative aspect-video w-full bg-black">
                      <img
                        src={`https://i.ytimg.com/vi/${result.videoId}/maxresdefault.jpg`}
                        alt={result.title}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02] will-change-transform"
                        loading="lazy"
                        draggable={false}
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.src.includes("hqdefault")) {
                            img.src = `https://i.ytimg.com/vi/${result.videoId}/hqdefault.jpg`;
                          }
                        }}
                      />
                      {/* Center play overlay */}
                      <a
                        href={result.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/0 via-black/0 to-black/40"
                        aria-label="Open video on YouTube"
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-all group-hover:scale-110 group-hover:border-red-400/60 group-hover:bg-red-500/30 group-hover:shadow-[0_0_44px_rgba(239,68,68,0.5)]">
                          <PlayCircle size={32} aria-hidden="true" />
                        </span>
                      </a>
                      {/* YouTube badge */}
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-md">
                        <PlayCircle size={10} aria-hidden="true" />
                        Live capture
                      </div>
                    </div>
                    <div className="border-t border-white/5 bg-black/40 p-4">
                      <h2 className="line-clamp-2 text-base font-semibold text-zinc-100">
                        {result.title}
                      </h2>
                      <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        <span className="truncate">by {result.author}</span>
                        <span className="text-zinc-700">·</span>
                        <span className="font-mono">
                          {result.transcriptLength.toLocaleString()} chars captured
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Glass Control Terminal */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.45)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-cyan-300" aria-hidden="true" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                        Control Terminal
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {result.videoId}
                    </span>
                  </div>

                  {/* Subject + course code */}
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="yt-subject" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Course assignment
                      </label>
                      <select
                        id="yt-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none backdrop-blur-xl transition focus:border-cyan-400/40 focus:shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s} className="bg-zinc-900">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="yt-course" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Ontario course code <span className="text-zinc-700">(optional)</span>
                      </label>
                      <input
                        id="yt-course"
                        type="text"
                        placeholder="SCH4U · MCV4U · ENG4U"
                        value={curriculumCode}
                        onChange={(e) => setCurriculumCode(e.target.value.toUpperCase().slice(0, 12))}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 outline-none backdrop-blur-xl transition focus:border-cyan-400/40 focus:shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                      />
                    </div>
                  </div>

                  {/* Pipeline toggles */}
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Pipeline · what to generate
                    </p>
                    <div className="space-y-1.5">
                      {ACTIONS.map((a) => {
                        const checked = pipeline.includes(a.key);
                        const s = ACCENT_STYLES[a.accent];
                        return (
                          <label
                            key={a.key}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                              checked
                                ? `${s.chip} border-current/30`
                                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePipeline(a.key)}
                              className="h-3 w-3 cursor-pointer accent-current"
                            />
                            <span className={s.icon}>{a.icon}</span>
                            <span className="flex-1 font-semibold">{a.title}</span>
                            {generated[a.key] && (
                              <CheckCircle2 size={11} className="text-emerald-400" aria-hidden="true" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={result.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink size={11} aria-hidden="true" />
                      Open in YouTube
                    </a>
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <RotateCcw size={11} aria-hidden="true" />
                      New video
                    </button>
                  </div>
                </div>
              </div>

              {/* ─────────────── Interactive Action Nodes ─────────────── */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {ACTIONS.map((a) => (
                  <ActionNode
                    key={a.key}
                    icon={a.icon}
                    title={a.title}
                    description={a.description}
                    accent={a.accent}
                    loading={generating === a.key}
                    done={Boolean(generated[a.key])}
                    onClick={() => void handleAction(a.key)}
                  />
                ))}
              </div>

              {/* Generation processing feed */}
              <AnimatePresence>
                {generating && (
                  <motion.div
                    key={`gen-${generating}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-5"
                  >
                    <ProcessingFeed
                      stage={genStage}
                      transcript={result.transcriptPreview ?? null}
                      accent={generating === "flashcards" ? "purple" : generating === "quiz" ? "red" : "cyan"}
                      label={
                        generating === "flashcards"
                          ? "flashcards.stream"
                          : generating === "quiz"
                            ? "quiz.stream"
                            : "notes.stream"
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result panel */}
              <AnimatePresence mode="wait">
                {activeAction && generated[activeAction] && !generating && (
                  <motion.section
                    key={`result-${activeAction}`}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ACCENT_STYLES[activeAccent].chip}`}
                        >
                          {ACTIONS.find((a) => a.key === activeAction)?.icon}
                          {ACTIONS.find((a) => a.key === activeAction)?.title}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          generated.output
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeAction === "notes" && (
                          <>
                            {saved ? (
                              <button
                                type="button"
                                onClick={() => router.push("/my-notes")}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-emerald-400"
                              >
                                <CheckCircle2 size={11} aria-hidden="true" />
                                Saved · Open My Notes
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleSaveToNotes()}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-60"
                              >
                                {saving ? (
                                  <>
                                    <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                                    Saving…
                                  </>
                                ) : (
                                  <>
                                    <Save size={11} aria-hidden="true" />
                                    Save to My Notes
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/30 p-5">
                      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                        <FileText size={11} aria-hidden="true" />
                        {activeAction === "notes"
                          ? "AI-generated study notes"
                          : activeAction === "flashcards"
                            ? "Smart flashcard batch"
                            : "Nova interactive quiz"}
                      </div>
                      <article
                        className="prose-invert max-w-none text-[15px]"
                        dangerouslySetInnerHTML={{ __html: renderedResult }}
                      />
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Scoped keyframes for the laser sweep */}
      <style jsx global>{`
        @keyframes kv-laser-down {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(var(--kv-laser-distance, 224px));
            opacity: 0;
          }
        }
        .kv-laser-sweep {
          animation: kv-laser-down 2.4s linear infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .kv-laser-sweep {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
