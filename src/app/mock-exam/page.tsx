"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Sparkles,
  FileText,
  Search,
  Clock,
  Trophy,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Calendar,
} from "lucide-react";
import { useToast } from "~/app/_components/toast";

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

const SUBJECTS = ["General", "Math", "Science", "English", "History", "Chemistry", "Physics", "Biology"];

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

export default function MockExamHubPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // notes
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // generation form
  const [subject, setSubject] = useState("General");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [numMC, setNumMC] = useState(10);
  const [numSA, setNumSA] = useState(5);
  const [timeLimit, setTimeLimit] = useState(45);
  const [pasteText, setPasteText] = useState("");

  // ui state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // exams list
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);

  // ---- fetch notes & exams ----
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

  const canGenerate =
    !generating && (selectedNoteId !== null || pasteText.trim().length >= 80);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        numMultipleChoice: numMC,
        numShortAnswer: numSA,
        timeLimitMinutes: timeLimit,
        curriculumCode: curriculumCode.trim() || undefined,
        subject: subject !== "General" ? subject : undefined,
      };
      if (selectedNoteId) {
        body.noteId = selectedNoteId;
      } else {
        body.sourceText = pasteText.trim();
        if (!body.subject) body.subject = "General";
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
        return;
      }
      showToast("Mock exam ready", "success");
      router.push(`/mock-exam/${data.exam.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/40 to-amber-400/30 ring-1 ring-white/15 shadow-[0_0_25px_rgba(52,211,153,0.35)]">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Mock Exam</h1>
            <p className="text-sm text-white/60">
              Pick a note → Nova builds a 10 MC + 5 SA Ontario-style exam → take it timed → get instant feedback.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* LEFT: Note picker */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Pick a note</h2>
              <span className="text-xs text-white/45">{filteredNotes.length} note(s)</span>
            </div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes by title or tag…"
                className="w-full rounded-xl border border-white/15 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-amber-300/50"
                aria-label="Search notes"
              />
            </div>

            <div className="max-h-[26rem] overflow-y-auto rounded-2xl border border-white/10 bg-black/20">
              {notesLoading ? (
                <div className="flex items-center justify-center py-10 text-white/50">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-white/50">
                  No notes match. Create some in <strong className="text-white/80">My Notes</strong> first.
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {filteredNotes.map((n) => {
                    const selected = selectedNoteId === n.id;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedNoteId(selected ? null : n.id)}
                          className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                            selected
                              ? "bg-amber-300/10"
                              : "hover:bg-white/[0.04]"
                          }`}
                          aria-pressed={selected}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${
                              selected
                                ? "bg-amber-300 text-black ring-amber-200"
                                : "bg-white/[0.04] text-white/60 ring-white/10"
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{n.title}</div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                              <Calendar className="h-3 w-3" />
                              {timeAgo(n.updatedAt)}
                              {n.tags && n.tags.length > 0 && (
                                <span className="truncate">· {n.tags.slice(0, 3).join(" · ")}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 transition ${
                              selected ? "text-amber-300" : "text-white/30 group-hover:text-white/60"
                            }`}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Paste fallback */}
            <details className="group mt-4">
              <summary className="cursor-pointer select-none text-xs text-white/55 hover:text-white/80">
                …or paste study material instead
              </summary>
              <textarea
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  if (e.target.value.trim().length >= 80) setSelectedNoteId(null);
                }}
                rows={5}
                placeholder="Paste at least 80 characters of study material…"
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-amber-300/50"
              />
            </details>
          </motion.section>

          {/* RIGHT: Exam settings + generate */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          >
            <h2 className="mb-4 text-base font-bold">Exam settings</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="mx-subject" className="mb-1 block text-xs uppercase tracking-wider text-white/55">
                  Subject
                </label>
                <select
                  id="mx-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/50"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s} className="bg-[#0d1228]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mx-course" className="mb-1 block text-xs uppercase tracking-wider text-white/55">
                  Course code
                </label>
                <input
                  id="mx-course"
                  type="text"
                  value={curriculumCode}
                  onChange={(e) => setCurriculumCode(e.target.value.toUpperCase())}
                  placeholder="SCH4U"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-amber-300/50"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <NumberPicker
                id="mx-mc"
                label="Multiple choice"
                value={numMC}
                onChange={setNumMC}
                min={5}
                max={20}
                step={5}
              />
              <NumberPicker
                id="mx-sa"
                label="Short answer"
                value={numSA}
                onChange={setNumSA}
                min={0}
                max={10}
                step={1}
              />
              <NumberPicker
                id="mx-time"
                label="Minutes"
                value={timeLimit}
                onChange={setTimeLimit}
                min={10}
                max={120}
                step={5}
              />
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/65">
              {selectedNoteId
                ? `Source: ${notes.find((n) => n.id === selectedNoteId)?.title ?? "Selected note"}`
                : pasteText.trim().length >= 80
                  ? `Source: pasted text (${pasteText.trim().length} chars)`
                  : "Pick a note on the left, or paste at least 80 characters of source material."}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              whileHover={canGenerate ? { scale: 1.01 } : undefined}
              whileTap={canGenerate ? { scale: 0.99 } : undefined}
              animate={
                canGenerate
                  ? {
                      boxShadow: [
                        "0 0 0 0 rgba(251,191,36,0)",
                        "0 0 30px 6px rgba(251,191,36,0.45)",
                        "0 0 0 0 rgba(251,191,36,0)",
                      ],
                    }
                  : { boxShadow: "0 0 0 0 rgba(251,191,36,0)" }
              }
              transition={{ duration: 1.8, repeat: Infinity }}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-extrabold transition ${
                canGenerate
                  ? "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black"
                  : "cursor-not-allowed bg-white/5 text-white/30"
              }`}
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Building exam with Nova…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Generate Mock Exam
                </>
              )}
            </motion.button>
          </motion.section>
        </div>

        {/* PAST EXAMS */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Trophy className="h-4 w-4 text-amber-300" /> My exams
            </h2>
            <button
              onClick={() => void refreshExams()}
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              <RotateCcw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {examsLoading ? (
            <div className="flex items-center justify-center py-10 text-white/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : exams.length === 0 ? (
            <div className="rounded-2xl bg-black/20 px-5 py-10 text-center text-sm text-white/55">
              No exams yet. Generate one above to get started.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((ex) => {
                const totalPoints = ex.questions.reduce((s, q) => s + (q.points ?? 1), 0);
                const lastAttempt = ex.attempts[0];
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/mock-exam/${ex.id}`)}
                      className="group flex w-full flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-black/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{ex.title}</div>
                          <div className="text-[11px] uppercase tracking-wider text-white/45">
                            {ex.subject}
                            {ex.curriculumCode ? ` · ${ex.curriculumCode}` : ""}
                          </div>
                        </div>
                        {lastAttempt && (
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${
                              lastAttempt.score >= 80
                                ? "bg-emerald-500/20 text-emerald-200"
                                : lastAttempt.score >= 60
                                  ? "bg-amber-500/20 text-amber-200"
                                  : "bg-red-500/20 text-red-200"
                            }`}
                          >
                            {Math.round(lastAttempt.score)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/55">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {ex.questions.length} Qs
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {ex.timeLimit}m
                        </span>
                        <span>· {totalPoints} pts</span>
                      </div>
                      <div className="text-[10px] text-white/35">
                        {ex.attempts.length > 0
                          ? `Last attempt ${timeAgo(lastAttempt!.createdAt)}`
                          : `Created ${timeAgo(ex.createdAt)} — not attempted yet`}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  );
}

function NumberPicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs uppercase tracking-wider text-white/55">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-white/15 bg-black/30">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex-1 px-2 py-2 text-white/70 hover:text-white"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
          min={min}
          max={max}
          className="w-12 bg-transparent text-center text-sm font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex-1 px-2 py-2 text-white/70 hover:text-white"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
