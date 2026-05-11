"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Sparkles,
  Layers,
  Flame,
  CheckCircle2,
  X,
  PencilLine,
  Play,
} from "lucide-react";

type DeckSummary = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  totalCards: number;
  dueCards: number;
};

type NoteOption = {
  id: string;
  title: string;
};

type CurriculumOption = {
  code: string;
  title: string;
};

type Props = {
  initialDecks: DeckSummary[];
  studiedToday: number;
  notes: NoteOption[];
  initialGenerateFrom: string;
  studyStreak?: number;
};

type CreateDeckResponse = {
  deck?: {
    id: string;
    title: string;
    subject: string;
    description: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  error?: string;
};

function MasteryRing({ percent, size = 64, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 80 ? "#22c55e" : percent >= 40 ? "#f0b429" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`Mastery ${percent}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 300ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{percent}%</span>
      </div>
    </div>
  );
}

export function DeckLibraryClient({ initialDecks, studiedToday, notes, initialGenerateFrom, studyStreak = 0 }: Props) {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckSummary[]>(initialDecks);
  const [showCreateModal, setShowCreateModal] = useState(Boolean(initialGenerateFrom));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [useAiGenerate, setUseAiGenerate] = useState(Boolean(initialGenerateFrom));
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(20);
  const [selectedNoteId, setSelectedNoteId] = useState(initialGenerateFrom || "");
  const [error, setError] = useState("");

  const totalDecks = decks.length;
  const totalDue = useMemo(() => decks.reduce((sum, deck) => sum + deck.dueCards, 0), [decks]);
  const totalCards = useMemo(() => decks.reduce((sum, d) => sum + d.totalCards, 0), [decks]);
  const totalMastered = useMemo(() => decks.reduce((sum, d) => sum + (d.totalCards - d.dueCards), 0), [decks]);
  const overallMastery = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/curriculum?grade=11&limit=100");
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { courses?: CurriculumOption[] };
      setCurriculumOptions(data.courses ?? []);
    })();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showCreateModal) setShowCreateModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showCreateModal]);

  const submitCreate = async () => {
    if (!title.trim() || !subject.trim()) {
      setError("Title and subject are required");
      return;
    }
    if (useAiGenerate && !selectedNoteId && !topic.trim()) {
      setError("Provide a topic or select a note to generate cards");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const createRes = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, description }),
      });
      const createData = (await createRes.json().catch(() => ({}))) as CreateDeckResponse;

      if (!createRes.ok || !createData.deck) {
        setError(createData.error ?? "Failed to create deck");
        return;
      }

      if (useAiGenerate) {
        const genBody = selectedNoteId
          ? { noteId: selectedNoteId, subject, count, curriculumCode: curriculumCode || undefined }
          : { topic, subject, count, curriculumCode: curriculumCode || undefined };

        const genRes = await fetch(`/api/decks/${createData.deck.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(genBody),
        });

        const genData = (await genRes.json().catch(() => ({}))) as { error?: string };
        if (!genRes.ok) {
          setError(genData.error ?? "Deck created but AI generation failed");
        }
      }

      const nowIso = new Date().toISOString();
      const createdDeck: DeckSummary = {
        id: createData.deck.id,
        title: createData.deck.title,
        subject: createData.deck.subject,
        description: createData.deck.description ?? null,
        createdAt: createData.deck.createdAt ?? nowIso,
        updatedAt: createData.deck.updatedAt ?? nowIso,
        totalCards: 0,
        dueCards: 0,
      };

      setDecks((prev) => [createdDeck, ...prev]);
      router.push(`/flashcards/${createData.deck.id}`);
    } catch {
      setError("Failed to create deck");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 pb-24 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Layers size={24} className="text-amber-400" aria-hidden="true" />
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Flashcard Decks</h1>
            </div>
            <p className="text-base text-zinc-400">Spaced repetition · study smarter, not longer</p>
          </div>
          <div className="flex items-center gap-3">
            {studyStreak > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2" aria-label={`Current study streak: ${studyStreak} days`}>
                <Flame size={16} className="text-amber-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-amber-300">{studyStreak} day streak</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-zinc-100 active:scale-95"
              aria-label="Create a new flashcard deck"
            >
              <Plus size={16} aria-hidden="true" />
              New Deck
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Decks" value={totalDecks} accent="text-white" />
          <StatCard label="Cards Due Today" value={totalDue} accent={totalDue > 0 ? "text-red-400" : "text-emerald-400"} />
          <StatCard label="Studied Today" value={studiedToday} accent="text-amber-400" />
          <StatCard label="Overall Mastery" value={`${overallMastery}%`} accent="text-emerald-400" />
        </div>

        {decks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 px-6 py-20 text-center backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
              <Layers size={32} className="text-amber-400" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-white">No decks yet</p>
            <p className="mt-2 text-base text-zinc-400">Create your first deck or generate cards from your notes.</p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-zinc-100 active:scale-95"
            >
              <Plus size={16} aria-hidden="true" />
              Create First Deck
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {decks.map((deck) => {
              const mastered = Math.max(0, deck.totalCards - deck.dueCards);
              const mastery = deck.totalCards > 0 ? Math.round((mastered / deck.totalCards) * 100) : 0;

              return (
                <div key={deck.id} className="group relative">
                  {/* Stacked card layers behind */}
                  <div className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl border border-white/5 bg-zinc-900/40 transition-all duration-200 group-hover:translate-x-2 group-hover:translate-y-2" aria-hidden="true" />
                  <div className="pointer-events-none absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-2xl border border-white/8 bg-zinc-900/60 transition-all duration-200 group-hover:translate-x-1 group-hover:translate-y-1" aria-hidden="true" />

                  {/* Top card */}
                  <article className="relative flex flex-col rounded-2xl border border-white/10 bg-zinc-900/80 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-amber-500/5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                          {deck.subject}
                        </span>
                        <h3 className="mt-2 truncate text-xl font-bold text-white">{deck.title}</h3>
                      </div>
                      <MasteryRing percent={mastery} />
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-zinc-300">
                        <Layers size={12} aria-hidden="true" />
                        {deck.totalCards} cards
                      </span>
                      {deck.dueCards > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 font-semibold text-red-300">
                          <Flame size={12} aria-hidden="true" />
                          {deck.dueCards} due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-300">
                          <CheckCircle2 size={12} aria-hidden="true" />
                          Up to date
                        </span>
                      )}
                    </div>

                    {deck.description && (
                      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-zinc-400">{deck.description}</p>
                    )}

                    <div className="mt-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/flashcards/${deck.id}/study`)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition-all hover:bg-zinc-100 active:scale-95"
                        aria-label={`Study deck ${deck.title}`}
                      >
                        <Play size={12} aria-hidden="true" />
                        Study
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/flashcards/${deck.id}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                        aria-label={`Edit deck ${deck.title}`}
                      >
                        <PencilLine size={12} aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-deck-title"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 id="create-deck-title" className="text-lg font-bold text-white">Create Deck</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close create deck modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              <div>
                <label htmlFor="deck-title" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Title</label>
                <input
                  id="deck-title"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  placeholder="Deck title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="deck-subject" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Subject</label>
                <input
                  id="deck-subject"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="deck-desc" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Description (optional)</label>
                <textarea
                  id="deck-desc"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={useAiGenerate}
                  onChange={(e) => setUseAiGenerate(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/20"
                />
                <Sparkles size={14} className="text-amber-400" aria-hidden="true" />
                Generate with AI
              </label>

              {useAiGenerate && (
                <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div>
                    <label htmlFor="deck-topic" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Topic</label>
                    <input
                      id="deck-topic"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                      placeholder="What topic should the cards cover?"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="deck-count" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Card count: {count}</label>
                    <input
                      id="deck-count"
                      type="range"
                      min={10}
                      max={50}
                      step={1}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full accent-amber-500"
                      aria-label="Number of cards to generate"
                    />
                  </div>
                  <div>
                    <label htmlFor="deck-note" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">From a note (optional)</label>
                    <select
                      id="deck-note"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                      value={selectedNoteId}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                    >
                      <option value="">No note selected</option>
                      {notes.map((note) => (
                        <option key={note.id} value={note.id}>{note.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="deck-curriculum" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Ontario course (optional)</label>
                    <select
                      id="deck-curriculum"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                      value={curriculumCode}
                      onChange={(e) => setCurriculumCode(e.target.value)}
                    >
                      <option value="">No course</option>
                      {curriculumOptions.map((course) => (
                        <option key={course.code} value={course.code}>{course.code} – {course.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={isSubmitting}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Working..." : useAiGenerate ? "Create & Generate" : "Create Deck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
