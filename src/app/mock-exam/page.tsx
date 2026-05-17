"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useToast } from "~/app/_components/toast";

/* ─────────────────────────────────────────────────────────── */
/*  Types                                                      */
/* ─────────────────────────────────────────────────────────── */

type NoteItem = {
  id: string;
  title: string;
  format: string;
  updatedAt: string;
  tags?: string[];
};

type ExamSummary = {
  id: string;
  title: string;
  subject: string;
  curriculumCode: string | null;
  timeLimit: number;
  createdAt: string;
  questions: Array<{ id: string; points: number }>;
  attempts: Array<{ id: string; score: number; createdAt: string }>;
};

type Volume = 10 | 25 | 50;
type Focus = "mc" | "sa" | "sim";

/* ─────────────────────────────────────────────────────────── */
/*  Course tracks                                              */
/* ─────────────────────────────────────────────────────────── */

const COURSE_TRACKS: { code: string; label: string; subject: string }[] = [
  { code: "SCH4U", label: "Chemistry", subject: "Chemistry" },
  { code: "MCV4U", label: "Calculus", subject: "Math" },
  { code: "ENG4U", label: "English", subject: "English" },
  { code: "SBI4U", label: "Biology", subject: "Biology" },
  { code: "SPH4U", label: "Physics", subject: "Physics" },
  { code: "CGW4U", label: "World Issues", subject: "History" },
];

const VOLUME_OPTS: { value: Volume; label: string; sub: string }[] = [
  { value: 10, label: "10", sub: "Sprint" },
  { value: 25, label: "25", sub: "Standard" },
  { value: 50, label: "50", sub: "Marathon" },
];

const FOCUS_OPTS: { value: Focus; label: string; sub: string }[] = [
  { value: "mc", label: "Multiple Choice", sub: "Pure recall" },
  { value: "sa", label: "Short Answer", sub: "Written depth" },
  { value: "sim", label: "Simulator", sub: "MC + SA blend" },
];

function splitForFocus(volume: Volume, focus: Focus): { mc: number; sa: number } {
  if (focus === "mc") return { mc: volume, sa: 0 };
  if (focus === "sa") return { mc: 0, sa: volume };
  const mc = Math.round(volume * 0.7);
  return { mc, sa: volume - mc };
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ─────────────────────────────────────────────────────────── */
/*  Page                                                       */
/* ─────────────────────────────────────────────────────────── */

export default function MockExamHubPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // notes
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");

  // capsule selections
  const [courseCode, setCourseCode] = useState<string>("SCH4U");
  const [volume, setVolume] = useState<Volume>(25);
  const [focus, setFocus] = useState<Focus>("sim");

  // generation
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [igniting, setIgniting] = useState(false);

  // past exams
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);

  // ── fetch notes ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notes?limit=100&sort=updated");
        const data = (await res.json().catch(() => ({}))) as { notes?: NoteItem[] };
        if (!cancelled) setNotes(data.notes ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── fetch exams ──
  const refreshExams = async () => {
    setExamsLoading(true);
    try {
      const res = await fetch("/api/mock-exam");
      const data = (await res.json().catch(() => ({}))) as { exams?: ExamSummary[] };
      setExams(data.exams ?? []);
    } catch {
      // silent
    } finally {
      setExamsLoading(false);
    }
  };
  useEffect(() => {
    void refreshExams();
  }, []);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  const selectedTrack = COURSE_TRACKS.find((t) => t.code === courseCode);
  const split = splitForFocus(volume, focus);
  // Time: 90s per MC + 180s per SA, rounded up
  const timeLimit = Math.max(10, Math.round((split.mc * 1.5 + split.sa * 3) / 5) * 5);

  const canGenerate =
    !generating && !igniting && (selectedNoteId !== null || pasteText.trim().length >= 80);

  const handleIgnite = () => {
    if (!canGenerate) return;
    setError(null);
    setIgniting(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        numMultipleChoice: split.mc,
        numShortAnswer: split.sa,
        timeLimitMinutes: timeLimit,
        curriculumCode: courseCode,
        subject: selectedTrack?.subject ?? "General",
      };
      if (selectedNoteId) {
        body.noteId = selectedNoteId;
      } else {
        body.sourceText = pasteText.trim();
      }

      const res = await fetch("/api/mock-exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        exam?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.exam?.id) {
        setError(data.error ?? "Failed to generate exam.");
        setIgniting(false);
        return;
      }
      showToast("Mock exam ready", "success");
      router.push(`/mock-exam/${data.exam.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setIgniting(false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
      {/* Faint ambient field */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 500px at 50% -10%, rgba(20,184,166,0.06), transparent 60%)," +
            "radial-gradient(700px 500px at 50% 110%, rgba(59,130,246,0.05), transparent 60%)",
        }}
      />

      <div className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 md:px-6 md:pt-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col items-center gap-3 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-400">
            <Trophy size={12} strokeWidth={1.7} className="text-amber-300/80" />
            Mock Exam Lab
          </span>
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight md:text-[42px]">
            Configure the simulation.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
            Three dials. One ignition. Nova builds an Ontario-spec exam tailored to your source.
          </p>
        </motion.header>

        {/* Glass setup panel */}
        <SetupPanel
          isIgniting={igniting}
          onIgnitionComplete={() => void handleGenerate()}
        >
          {/* Course track */}
          <FieldGroup label="Course Track" hint={selectedTrack?.subject ?? ""}>
            <CapsuleTrack
              trackId="course"
              options={COURSE_TRACKS.map((c) => ({
                value: c.code,
                label: c.code,
                sub: c.label,
              }))}
              value={courseCode}
              onChange={(v) => setCourseCode(v)}
              cols={3}
            />
          </FieldGroup>

          {/* Question volume */}
          <FieldGroup label="Question Volume" hint={`${volume} questions`}>
            <CapsuleTrack
              trackId="volume"
              options={VOLUME_OPTS}
              value={volume}
              onChange={(v) => setVolume(v)}
              cols={3}
            />
          </FieldGroup>

          {/* Exam focus */}
          <FieldGroup
            label="Exam Focus"
            hint={
              focus === "sim"
                ? `${split.mc} MC + ${split.sa} SA`
                : focus === "mc"
                  ? `${split.mc} MC`
                  : `${split.sa} SA`
            }
          >
            <CapsuleTrack
              trackId="focus"
              options={FOCUS_OPTS}
              value={focus}
              onChange={(v) => setFocus(v)}
              cols={3}
            />
          </FieldGroup>

          {/* Source picker */}
          <FieldGroup label="Source Material" hint={`~${timeLimit} min`}>
            <SourcePicker
              notes={filteredNotes}
              loading={notesLoading}
              search={search}
              setSearch={setSearch}
              selectedNoteId={selectedNoteId}
              setSelectedNoteId={(id) => {
                setSelectedNoteId(id);
                if (id) setPasteText("");
              }}
              pasteText={pasteText}
              setPasteText={(t) => {
                setPasteText(t);
                if (t.trim().length >= 80) setSelectedNoteId(null);
              }}
            />
          </FieldGroup>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/[0.05] px-4 py-3 text-[12.5px] text-rose-200"
              >
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" strokeWidth={1.7} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ignition button */}
          <IgnitionButton
            onClick={handleIgnite}
            disabled={!canGenerate}
            isLoading={generating || igniting}
            label={
              !selectedNoteId && pasteText.trim().length < 80
                ? "Pick a note or paste 80+ chars"
                : `Start Mock Exam · ${selectedTrack?.code}`
            }
          />
        </SetupPanel>

        {/* Past exams */}
        <PastExamsSection
          exams={exams}
          loading={examsLoading}
          onRefresh={() => void refreshExams()}
          onOpen={(id) => router.push(`/mock-exam/${id}`)}
        />
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Setup Panel — frosted glass with breathe ring + laser sweep */
/* ─────────────────────────────────────────────────────────── */

function SetupPanel({
  children,
  isIgniting,
  onIgnitionComplete,
}: {
  children: React.ReactNode;
  isIgniting: boolean;
  onIgnitionComplete: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
      style={{ willChange: "transform" }}
    >
      {/* Slow breathing border halo — opacity-only, GPU-friendly */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(45,212,191,0.18), 0 0 40px -16px rgba(45,212,191,0.35)",
        }}
        animate={{ opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Laser sweep — runs once on click, then triggers generation */}
      <AnimatePresence>
        {isIgniting && (
          <motion.div
            key="laser"
            aria-hidden
            initial={{ top: 0, opacity: 0.95 }}
            animate={{ top: "100%", opacity: [0.95, 0.95, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
            onAnimationComplete={onIgnitionComplete}
            className="pointer-events-none absolute left-0 right-0 z-30"
            style={{
              height: 1,
              background: "rgba(34,211,238,1)",
              boxShadow:
                "0 0 18px 2px rgba(34,211,238,0.85), 0 0 40px 4px rgba(34,211,238,0.45)",
              willChange: "transform, top, opacity",
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col gap-7">{children}</div>
    </motion.section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Field Group                                                */
/* ─────────────────────────────────────────────────────────── */

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
          {label}
        </span>
        {hint && (
          <span className="text-[10.5px] font-semibold tracking-wide text-zinc-400">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Capsule Track — segmented control with sliding glass pill  */
/* ─────────────────────────────────────────────────────────── */

function CapsuleTrack<T extends string | number>({
  trackId,
  options,
  value,
  onChange,
  cols = 3,
}: {
  trackId: string;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div
      className="relative grid gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative flex flex-col items-center justify-center rounded-xl px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
            aria-pressed={active}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`capsule-pill-${trackId}`}
                transition={{ type: "spring", stiffness: 450, damping: 26 }}
                className="absolute inset-0 rounded-xl border border-white/20 bg-white/10"
                style={{ willChange: "transform" }}
              />
            )}
            <span
              className={`relative z-10 text-[12.5px] font-bold transition-colors duration-200 ${
                active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </span>
            {opt.sub && (
              <span
                className={`relative z-10 mt-0.5 text-[9.5px] uppercase tracking-[0.18em] transition-colors duration-200 ${
                  active ? "text-zinc-300" : "text-zinc-600"
                }`}
              >
                {opt.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Source Picker — collapsible note list + paste fallback     */
/* ─────────────────────────────────────────────────────────── */

function SourcePicker({
  notes,
  loading,
  search,
  setSearch,
  selectedNoteId,
  setSelectedNoteId,
  pasteText,
  setPasteText,
}: {
  notes: NoteItem[];
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  pasteText: string;
  setPasteText: (v: string) => void;
}) {
  const [mode, setMode] = useState<"notes" | "paste">("notes");
  const selected = notes.find((n) => n.id === selectedNoteId);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
      {/* Mode toggle */}
      <div className="mb-3 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {(["notes", "paste"] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="relative flex-1 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] outline-none"
            >
              {active && (
                <motion.span
                  aria-hidden
                  layoutId="source-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 26 }}
                  className="absolute inset-0 rounded-lg border border-white/20 bg-white/10"
                  style={{ willChange: "transform" }}
                />
              )}
              <span className={`relative z-10 ${active ? "text-white" : "text-zinc-500"}`}>
                {m === "notes" ? "From Notes" : "Paste Text"}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "notes" ? (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <div className="relative mb-2">
              <Search
                size={13}
                strokeWidth={1.7}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes by title or tag"
                className="h-9 w-full rounded-xl border border-white/[0.06] bg-black/30 pl-9 pr-3 text-[12.5px] text-white placeholder:text-zinc-600 outline-none focus:border-white/20"
              />
            </div>

            <div className="max-h-[180px] overflow-y-auto rounded-xl border border-white/[0.05] bg-black/20">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-zinc-600">
                  <Loader2 size={14} className="animate-spin" />
                </div>
              ) : notes.length === 0 ? (
                <p className="px-4 py-5 text-center text-[12px] text-zinc-600">
                  No notes match. Create one in <strong className="text-zinc-400">My Notes</strong>.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {notes.map((n) => {
                    const isSel = selectedNoteId === n.id;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedNoteId(isSel ? null : n.id)}
                          className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            isSel ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
                          }`}
                          aria-pressed={isSel}
                        >
                          <span
                            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              isSel
                                ? "border-cyan-300/40 bg-cyan-300/[0.12] text-cyan-200"
                                : "border-white/10 bg-white/[0.02] text-zinc-500"
                            }`}
                          >
                            <FileText size={12} strokeWidth={1.7} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-semibold text-white">
                              {n.title}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10.5px] text-zinc-600">
                              <Calendar size={9} strokeWidth={1.7} />
                              {timeAgo(n.updatedAt)}
                              {n.tags && n.tags.length > 0 && (
                                <span className="truncate">· {n.tags.slice(0, 2).join(" · ")}</span>
                              )}
                            </p>
                          </div>
                          <ChevronRight
                            size={12}
                            strokeWidth={1.7}
                            className={`flex-shrink-0 transition-colors ${
                              isSel ? "text-cyan-300" : "text-zinc-700 group-hover:text-zinc-500"
                            }`}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selected && (
              <p className="mt-2 truncate rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-1.5 text-[11px] text-cyan-200/90">
                Source · {selected.title}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              placeholder="Paste at least 80 characters of study material…"
              className="w-full rounded-xl border border-white/[0.06] bg-black/30 p-3 text-[12.5px] leading-relaxed text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20"
            />
            <p className="mt-1 text-right text-[10.5px] tabular-nums text-zinc-600">
              {pasteText.trim().length} chars
              {pasteText.trim().length < 80 && (
                <span className="text-rose-400/80"> · need ≥ 80</span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Ignition Button                                            */
/* ─────────────────────────────────────────────────────────── */

function IgnitionButton({
  onClick,
  disabled,
  isLoading,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
      className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-4 text-[14px] font-bold transition-colors disabled:cursor-not-allowed"
      style={{
        willChange: "transform",
        background: disabled
          ? "rgba(255,255,255,0.04)"
          : "linear-gradient(135deg, #061f26 0%, #0e3640 35%, #14b8a6 75%, #3b82f6 100%)",
        color: disabled ? "rgb(82,82,91)" : "rgb(236,254,255)",
      }}
    >
      {/* Animated glow halo (opacity oscillation, GPU-friendly) */}
      {!disabled && !isLoading && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow:
              "0 0 0 1px rgba(45,212,191,0.4) inset, 0 0 32px -6px rgba(45,212,191,0.55), 0 0 60px -10px rgba(59,130,246,0.5)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Inner subtle gloss */}
      {!disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl opacity-50"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
          }}
        />
      )}

      <span className="relative z-10 flex items-center gap-2">
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" strokeWidth={2} />
        ) : (
          <Zap size={16} strokeWidth={2} />
        )}
        {isLoading ? "Igniting…" : label}
      </span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Past Exams                                                 */
/* ─────────────────────────────────────────────────────────── */

function PastExamsSection({
  exams,
  loading,
  onRefresh,
  onOpen,
}: {
  exams: ExamSummary[];
  loading: boolean;
  onRefresh: () => void;
  onOpen: (id: string) => void;
}) {
  if (!loading && exams.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mx-auto mt-12 w-full max-w-5xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
            Archive
          </span>
          <h2 className="mt-1 text-[18px] font-bold text-white">Past Simulations</h2>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <RotateCcw size={11} strokeWidth={1.7} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02] py-10 text-zinc-600">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((ex) => {
            const lastAttempt = ex.attempts[0];
            const totalPts = ex.questions.reduce((s, q) => s + (q.points ?? 1), 0);
            return (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => onOpen(ex.id)}
                  className="group flex w-full flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.04]"
                  style={{ willChange: "transform" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-white">{ex.title}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                        {ex.subject}
                        {ex.curriculumCode ? ` · ${ex.curriculumCode}` : ""}
                      </p>
                    </div>
                    {lastAttempt && (
                      <span
                        className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                          lastAttempt.score >= 80
                            ? "bg-emerald-400/[0.12] text-emerald-300"
                            : lastAttempt.score >= 60
                              ? "bg-amber-400/[0.12] text-amber-300"
                              : "bg-rose-400/[0.12] text-rose-300"
                        }`}
                      >
                        {Math.round(lastAttempt.score)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10.5px] text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <FileText size={11} strokeWidth={1.7} />
                      {ex.questions.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} strokeWidth={1.7} />
                      {ex.timeLimit}m
                    </span>
                    <span>· {totalPts} pts</span>
                  </div>
                  <p className="truncate text-[10px] text-zinc-700">
                    {ex.attempts.length > 0 && lastAttempt
                      ? `Last attempt ${timeAgo(lastAttempt.createdAt)}`
                      : `Created ${timeAgo(ex.createdAt)} · not attempted`}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
