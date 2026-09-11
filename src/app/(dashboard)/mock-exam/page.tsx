"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "~/app/_components/toast";
import { formatTorontoDate } from "~/lib/toronto-time";

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
  return formatTorontoDate(iso);
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
    const noteId = new URLSearchParams(window.location.search).get("noteId")?.trim();
    if (!noteId) return;
    setSelectedNoteId(noteId);
    setPasteText("");
  }, []);

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
    void handleGenerate();
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
    <main className="mx-auto w-full max-w-[860px] px-4 py-8">
      <div className="kv-crumb">Kyvex / <b>Mock Exam</b></div>
      <header className="mt-5 mb-8">
        <h1 className="kv-title">Configure the simulation.</h1>
        <p className="kv-sub mt-2">
          Three dials. One ignition. Nova builds an Ontario-spec exam tailored to your source.
        </p>
      </header>

      <section
        className="border p-6"
        style={{
          borderColor: "var(--border-default)",
          borderRadius: "var(--kv-radius)",
          background: "var(--bg-card)",
          boxShadow: "none",
        }}
      >
        <FieldGroup label="Course Track" hint={selectedTrack?.subject ?? ""}>
          <CapsuleTrack
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

        <FieldGroup label="Question Volume" hint={`${volume} questions`}>
          <CapsuleTrack
            options={VOLUME_OPTS}
            value={volume}
            onChange={(v) => setVolume(v)}
            cols={3}
          />
        </FieldGroup>

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
            options={FOCUS_OPTS}
            value={focus}
            onChange={(v) => setFocus(v)}
            cols={3}
          />
        </FieldGroup>

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

        {error ? (
          <p role="alert" style={{ marginTop: 16, color: "var(--kv-text-primary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="kv-chip kv-chip-stale">Error</span>
            {error}
          </p>
        ) : null}

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
      </section>

      <PastExamsSection
        exams={exams}
        loading={examsLoading}
        onRefresh={() => void refreshExams()}
        onOpen={(id) => router.push(`/mock-exam/${id}`)}
      />
    </main>
  );
}

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
    <div className="flex flex-col gap-2.5" style={{ marginTop: 22 }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="kv-meta">{label}</span>
        {hint ? <span className="kv-row-side">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function CapsuleTrack<T extends string | number>({
  options,
  value,
  onChange,
  cols = 3,
}: {
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div
      className="opts"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, marginTop: 8 }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={active ? "kv-opt sel" : "kv-opt"}
            aria-pressed={active}
          >
            <span className="box" aria-hidden />
            <span>
              <span className={/^[A-Z]{3,4}\d[A-Z]$/.test(String(opt.label)) ? "kv-chip kv-chip-course" : undefined}>
                {opt.label}
              </span>
              {opt.sub ? <span className="kv-meta" style={{ display: "block", marginTop: 4 }}>{opt.sub}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
    <div>
      <div className="kv-tabs" style={{ marginBottom: 12 }}>
        {(["notes", "paste"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={mode === m ? "kv-tab on" : "kv-tab"}
          >
            {m === "notes" ? "From Notes" : "Paste Text"}
          </button>
        ))}
      </div>

      {mode === "notes" ? (
        <div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by title or tag"
            className="kv-field"
          />
          <div style={{ marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
            {loading ? (
              <p className="kv-meta">Loading</p>
            ) : notes.length === 0 ? (
              <p className="kv-sub">No notes match. Create one in My Notes.</p>
            ) : (
              notes.map((n) => {
                const isSel = selectedNoteId === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNoteId(isSel ? null : n.id)}
                    className="kv-row"
                    style={{ width: "100%", background: "transparent", textAlign: "left", cursor: "pointer" }}
                    aria-pressed={isSel}
                  >
                    <div>
                      <div className="kv-row-title">{n.title}</div>
                      <div className="kv-row-sub">
                        {(n.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={tag} className={/^[A-Z]{3,4}\d[A-Z]$/i.test(tag) ? "kv-chip kv-chip-course" : "kv-chip"}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="kv-row-side">{timeAgo(n.updatedAt)}</span>
                  </button>
                );
              })
            )}
          </div>
          {selected ? (
            <p className="kv-meta" style={{ marginTop: 8 }}>Source · {selected.title}</p>
          ) : null}
        </div>
      ) : (
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder="Paste at least 80 characters of study material…"
            className="kv-field"
            style={{ resize: "vertical" }}
          />
          <p className="kv-meta num" style={{ marginTop: 6, textAlign: "right" }}>
            {pasteText.trim().length} chars
            {pasteText.trim().length < 80 ? " · need ≥ 80" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="kv-btn mt-6 w-full justify-center"
    >
      {isLoading ? "Igniting…" : label}
    </button>
  );
}

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
    <section style={{ marginTop: 28 }}>
      <div className="flex items-center justify-between gap-3">
        <p className="kv-meta">Past simulations</p>
        <button type="button" onClick={onRefresh} className="kv-btn-ghost">
          Refresh
        </button>
      </div>
      {loading ? (
        <p className="kv-meta" style={{ marginTop: 12 }}>Loading</p>
      ) : (
        exams.map((ex) => {
          const lastAttempt = ex.attempts[0];
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => onOpen(ex.id)}
              className="kv-row"
              style={{ width: "100%", background: "transparent", textAlign: "left", cursor: "pointer" }}
            >
              <div>
                <div className="kv-row-title">{ex.title}</div>
                <div className="kv-row-sub">
                  {ex.curriculumCode ? (
                    <span className="kv-chip kv-chip-course">{ex.curriculumCode}</span>
                  ) : (
                    <span className="kv-chip">{ex.subject}</span>
                  )}
                  <span className="kv-chip">{ex.questions.length} q</span>
                  <span className="kv-chip">{ex.timeLimit} min</span>
                </div>
              </div>
              <span className="kv-row-side num">
                {lastAttempt ? `${Math.round(lastAttempt.score)}%` : "Not attempted"}
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}
