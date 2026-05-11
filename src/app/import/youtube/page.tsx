"use client";

import { useMemo, useState } from "react";
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
  MonitorPlay,
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
  notes: string;
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

// ---------- "video frame -> text lines" loader ----------
function TranscribingAnimation({ stage }: { stage: string }) {
  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-10 backdrop-blur-xl">
      <div className="relative h-44 w-72 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-red-500/30 via-purple-500/20 to-amber-400/20 shadow-[0_0_40px_rgba(239,68,68,0.35)]">
        {/* fake video scanlines */}
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        {/* play icon pulses then dissolves */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <MonitorPlay className="h-14 w-14 text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.7)]" />
        </motion.div>
        {/* "transcribed text" lines escaping the frame */}
        <div className="absolute -bottom-2 left-0 right-0 px-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="my-1 h-1.5 rounded-full bg-white/70"
              initial={{ width: "20%", opacity: 0 }}
              animate={{ width: ["20%", "85%", "60%"], opacity: [0, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}
            />
          ))}
        </div>
      </div>

      {/* "text lines being written" outside the frame */}
      <div className="w-full space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-2 rounded-full bg-gradient-to-r from-amber-300/80 via-white/60 to-transparent"
            initial={{ width: "10%", opacity: 0.2 }}
            animate={{ width: ["10%", "95%", "70%"], opacity: [0.2, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
        <span>{stage}</span>
      </div>
    </div>
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

  const valid = useMemo(() => isValidYouTubeUrl(url), [url]);

  const renderedNotes = useMemo(
    () => (result ? renderMarkdown(result.notes) : ""),
    [result],
  );

  async function handleImport() {
    if (!valid || loading) return;
    setError(null);
    setResult(null);
    setSaved(null);
    setLoading(true);
    setStage("Fetching transcript from YouTube…");

    // soft staged messaging while we wait
    const stageTimers = [
      setTimeout(() => setStage("Cleaning up captions…"), 2500),
      setTimeout(() => setStage("Asking Nova to summarise into Ontario-style notes…"), 5000),
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
      showToast("Notes generated", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      stageTimers.forEach(clearTimeout);
      setLoading(false);
    }
  }

  async function handleSaveToNotes() {
    if (!result || saving) return;
    setSaving(true);
    try {
      const tags = [subject, "YouTube Import"].filter((t) => t && t !== "General");
      const contentWithSource = `> Imported from [${result.title}](${result.videoUrl}) — ${result.author}\n\n${result.notes}`;

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
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/40 to-amber-500/30 ring-1 ring-white/15 shadow-[0_0_25px_rgba(239,68,68,0.35)]">
            <MonitorPlay className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">YouTube Import</h1>
            <p className="text-sm text-white/60">
              Paste a lecture link → get exam-ready Ontario-style study notes in seconds.
            </p>
          </div>
        </motion.div>

        {/* Input card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          <label htmlFor="yt-url" className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">
            YouTube URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                id="yt-url"
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && valid && !loading) void handleImport();
                }}
                aria-label="YouTube video URL"
                className="w-full rounded-2xl border border-white/15 bg-black/30 py-4 pl-12 pr-4 text-base text-white placeholder-white/30 outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/30"
                disabled={loading}
              />
            </div>
            <motion.button
              type="button"
              onClick={() => void handleImport()}
              disabled={!valid || loading}
              whileHover={valid && !loading ? { scale: 1.03 } : undefined}
              whileTap={valid && !loading ? { scale: 0.97 } : undefined}
              animate={
                valid && !loading
                  ? {
                      boxShadow: [
                        "0 0 0 0 rgba(251,191,36,0)",
                        "0 0 30px 6px rgba(251,191,36,0.55)",
                        "0 0 0 0 rgba(251,191,36,0)",
                      ],
                    }
                  : { boxShadow: "0 0 0 0 rgba(251,191,36,0)" }
              }
              transition={{ duration: 1.8, repeat: Infinity }}
              className={`group relative flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold transition ${
                valid && !loading
                  ? "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black"
                  : "cursor-not-allowed bg-white/5 text-white/30"
              }`}
              aria-label="Generate AI notes from this video"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Magic
                </>
              )}
            </motion.button>
          </div>

          {/* Subject + course code */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="yt-subject" className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
                Subject
              </label>
              <select
                id="yt-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/60"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s} className="bg-[#0d1228]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="yt-course" className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
                Ontario course code <span className="text-white/30">(optional)</span>
              </label>
              <input
                id="yt-course"
                type="text"
                placeholder="e.g. SCH4U, MHF4U"
                value={curriculumCode}
                onChange={(e) => setCurriculumCode(e.target.value.toUpperCase())}
                disabled={loading}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-amber-300/60"
              />
            </div>
          </div>

          {!valid && url.length > 0 && !loading && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-300/90">
              <AlertTriangle className="h-3.5 w-3.5" />
              That URL doesn't look like a YouTube link.
            </p>
          )}
        </motion.section>

        {/* Error */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6 flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
              <div className="flex-1">
                <p className="font-semibold text-red-100">Couldn't import this video</p>
                <p className="mt-1 text-red-200/90">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="rounded-lg px-2 py-1 text-xs text-red-200/80 hover:bg-red-500/20"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading animation */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-8"
            >
              <TranscribingAnimation stage={stage} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold">{result.title}</h2>
                  <p className="text-xs text-white/55">
                    by {result.author} · {result.transcriptLength.toLocaleString()} chars transcribed
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={result.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open video
                  </a>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try another
                  </button>
                  {saved ? (
                    <button
                      onClick={() => router.push("/my-notes")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved · Open My Notes
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleSaveToNotes()}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 px-3 py-2 text-xs font-semibold text-black hover:brightness-110 disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Save to My Notes
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-black/25 p-5 ring-1 ring-white/10">
                <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
                  <FileText className="h-3.5 w-3.5" />
                  AI-generated study notes
                </div>
                <article
                  className="prose-invert max-w-none text-[15px]"
                  dangerouslySetInnerHTML={{ __html: renderedNotes }}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
