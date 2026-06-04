"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Upload,
  Quote as QuoteIcon,
  Columns2,
  AlertTriangle,
  Search,
  FileText,
  Check,
  Info,
  Wand2,
  X,
  RotateCcw,
} from "lucide-react";
import { useToast } from "~/app/_components/toast";
import type { PresentationData, SlideData } from "~/types/presentation";

// ---------------- Types & constants ----------------

type NoteItem = {
  id: string;
  title: string;
  content: string;
  format: string;
  updatedAt: string;
  tags?: string[];
};

type Level = "elementary" | "high_school" | "university" | "phd";
type StyleId = "minimal" | "professional" | "creative" | "academic";

const LEVELS: { id: Level; label: string }[] = [
  { id: "elementary", label: "Elementary" },
  { id: "high_school", label: "High School (Ontario)" },
  { id: "university", label: "University" },
  { id: "phd", label: "PhD" },
];

const STYLES: {
  id: StyleId;
  label: string;
  description: string;
  swatch: { bg: string; accent: string; text: string };
}[] = [
  {
    id: "minimal",
    label: "Minimalist",
    description: "Clean white • blue accent",
    swatch: { bg: "#ffffff", accent: "#4f6ef7", text: "#1a1a2e" },
  },
  {
    id: "professional",
    label: "Professional",
    description: "Navy • slate corporate",
    swatch: { bg: "#f8fafc", accent: "#1e40af", text: "#1e293b" },
  },
  {
    id: "creative",
    label: "Creative",
    description: "Deep purple • neon",
    swatch: { bg: "#0f0f1a", accent: "#7c3aed", text: "#f0f0ff" },
  },
];

const SLIDE_COUNTS = [6, 8, 10, 12, 15];

// ---------------- Page ----------------

export default function PresentationCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Stage: config → loading → deck
  const [stage, setStage] = useState<"config" | "deck">("config");

  // Config
  const [inputType, setInputType] = useState<"topic" | "notes">("topic");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [level, setLevel] = useState<Level>("high_school");
  const [style, setStyle] = useState<StyleId>("creative");
  const [includeSources, setIncludeSources] = useState(true);
  const [slideCount, setSlideCount] = useState<number>(10);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deck state
  const [deck, setDeck] = useState<PresentationData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [imgLoadingId, setImgLoadingId] = useState<string | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Load notes when "Notes" mode selected
  useEffect(() => {
    if (inputType !== "notes" || notes.length > 0) return;
    setNotesLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/notes?limit=100&sort=updated");
        const data = (await res.json().catch(() => ({}))) as { notes?: NoteItem[] };
        setNotes(data.notes ?? []);
      } catch {
        // silent
      } finally {
        setNotesLoading(false);
      }
    })();
  }, [inputType, notes.length]);

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, noteSearch]);

  const canGenerate = useMemo(() => {
    if (generating) return false;
    if (inputType === "topic") return topic.trim().length >= 4;
    return !!selectedNoteId;
  }, [generating, inputType, topic, selectedNoteId]);

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);

    let inputText = "";
    let resolvedSubject = subject.trim();
    if (inputType === "topic") {
      inputText = topic.trim();
      if (!resolvedSubject) resolvedSubject = topic.trim();
    } else {
      const note = notes.find((n) => n.id === selectedNoteId);
      if (!note) {
        setError("Please pick a note.");
        setGenerating(false);
        return;
      }
      inputText = stripHtml(note.content);
      if (!resolvedSubject) resolvedSubject = note.title;
    }

    try {
      const res = await fetch("/api/presentation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: inputText,
          inputType,
          slideCount,
          style,
          subject: resolvedSubject,
          includeNotes: true,
          level,
          includeSources,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        presentation?: PresentationData;
        error?: string;
      };
      if (!res.ok || !data.presentation) {
        setError(data.error ?? "Failed to generate presentation.");
        return;
      }
      setDeck(data.presentation);
      setCurrentIdx(0);
      setStage("deck");
      showToast("Deck ready", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  };

  // Deck mutators
  const updateSlide = (idx: number, patch: Partial<SlideData>) => {
    setDeck((prev) =>
      prev
        ? {
            ...prev,
            slides: prev.slides.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
          }
        : prev,
    );
  };

  const updateBullet = (idx: number, bulletIdx: number, value: string) => {
    setDeck((prev) => {
      if (!prev) return prev;
      const slide = prev.slides[idx];
      if (!slide) return prev;
      const nextBullets = [...(slide.bullets ?? [])];
      nextBullets[bulletIdx] = value;
      return {
        ...prev,
        slides: prev.slides.map((s, i) => (i === idx ? { ...s, bullets: nextBullets } : s)),
      };
    });
  };

  const generateImage = async (slideIdx: number) => {
    if (!deck) return;
    const slide = deck.slides[slideIdx];
    if (!slide) return;
    const prompt = slide.imagePrompt ?? slide.title;
    setImgLoadingId(slide.id);
    try {
      const res = await fetch(
        `/api/presentation/image?prompt=${encodeURIComponent(prompt)}&seed=${encodeURIComponent(slide.id)}`,
      );
      const data = (await res.json().catch(() => ({}))) as {
        imageUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.imageUrl) {
        showToast(data.error ?? "Failed to fetch image", "error");
        return;
      }
      updateSlide(slideIdx, { imageUrl: data.imageUrl });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Network error", "error");
    } finally {
      setImgLoadingId(null);
    }
  };

  const uploadImage = async (slideIdx: number, file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      showToast("Image must be smaller than 4 MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateSlide(slideIdx, { imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const exportPptx = async () => {
    if (!deck || exporting) return;
    setExporting(true);
    try {
      const sanitizedDeck: PresentationData = {
        ...deck,
        slides: deck.slides.map((s) => {
          const next: SlideData = { ...s };
          // Strip data: URLs (the server-side downloader can't fetch base64 reliably and
          // pptxgenjs would choke). Server-rendered exports keep only http(s) imageUrls.
          if (next.imageUrl?.startsWith("data:")) delete next.imageUrl;
          return next;
        }),
      };
      const res = await fetch("/api/presentation/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation: sanitizedDeck }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(data.error ?? "Export failed", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(deck.title)}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("PPTX downloaded", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export error", "error");
    } finally {
      setExporting(false);
    }
  };

  // ----- Render -----

  const updateDeckTitle = (title: string) => setDeck((prev) => (prev ? { ...prev, title } : prev));

  if (stage === "deck" && deck) {
    return (
      <DeckViewer
        deck={deck}
        currentIdx={currentIdx}
        onCurrentChange={setCurrentIdx}
        onUpdateSlide={updateSlide}
        onUpdateBullet={updateBullet}
        onUpdateDeckTitle={updateDeckTitle}
        onGenerateImage={generateImage}
        onUploadImage={uploadImage}
        imgLoadingId={imgLoadingId}
        exporting={exporting}
        onExport={exportPptx}
        onBack={() => setStage("config")}
        onClose={() => router.push("/dashboard")}
        themeId={style}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300/40 to-violet-400/40 ring-1 ring-white/15 shadow-[0_0_25px_rgba(167,139,250,0.45)]">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Presentation Architect</h1>
            <p className="text-sm text-white/60">
              Nova drafts a full slide deck — pick a level, style, and source. Edit inline, then export to PowerPoint.
            </p>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          {/* Source picker */}
          <div className="mb-6">
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Source</label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1 ring-1 ring-white/10">
              <SourceTab active={inputType === "topic"} onClick={() => setInputType("topic")} label="Topic" />
              <SourceTab active={inputType === "notes"} onClick={() => setInputType("notes")} label="My Notes" />
            </div>

            {inputType === "topic" ? (
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. The Krebs cycle in cellular respiration"
                className="mt-3 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-amber-300/50"
                aria-label="Topic"
              />
            ) : (
              <div className="mt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="search"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Search notes…"
                    className="w-full rounded-xl border border-white/15 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-amber-300/50"
                  />
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-black/20">
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-6 text-white/50">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-white/50">
                      {notes.length === 0 ? "No notes yet — create some in My Notes." : "No matches."}
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {filteredNotes.map((n) => {
                        const sel = selectedNoteId === n.id;
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedNoteId(sel ? null : n.id)}
                              className={`group flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                                sel ? "bg-amber-300/10" : "hover:bg-white/[0.04]"
                              }`}
                              aria-pressed={sel}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${
                                  sel
                                    ? "bg-amber-300 text-black ring-amber-200"
                                    : "bg-white/[0.04] text-white/60 ring-white/10"
                                }`}
                              >
                                {sel ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold">{n.title}</div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Optional: subject line for the deck (e.g. Biology — Cell Respiration)"
              className="mt-3 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-amber-300/50"
              aria-label="Subject"
            />
          </div>

          {/* Level slider */}
          <div className="mb-6">
            <label htmlFor="level-slider" className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-white/55">
              <span>Level</span>
              <span className="font-semibold text-amber-200">{LEVELS.find((l) => l.id === level)?.label}</span>
            </label>
            <input
              id="level-slider"
              type="range"
              min={0}
              max={LEVELS.length - 1}
              step={1}
              value={LEVELS.findIndex((l) => l.id === level)}
              onChange={(e) => setLevel(LEVELS[Number(e.target.value)]!.id)}
              className="kyvex-range w-full accent-amber-300"
              aria-label="Audience level"
            />
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
              {LEVELS.map((l) => (
                <span key={l.id} className={l.id === level ? "text-amber-200" : ""}>
                  {l.label.split(" ")[0]}
                </span>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="mb-6">
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Style</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {STYLES.map((s) => {
                const sel = style === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      sel
                        ? "border-amber-300/60 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
                        : "border-white/10 bg-black/20 hover:border-white/25"
                    }`}
                    aria-pressed={sel}
                  >
                    <div
                      className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-black/20"
                      style={{
                        background: `linear-gradient(135deg, ${s.swatch.bg} 0%, ${s.swatch.bg} 50%, ${s.swatch.accent} 50%, ${s.swatch.accent} 100%)`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{s.label}</div>
                      <div className="text-[11px] text-white/50">{s.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slide count + sources toggle */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Slides</label>
              <div className="flex gap-1.5">
                {SLIDE_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSlideCount(n)}
                    className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      slideCount === n
                        ? "bg-amber-300 text-black"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Citations</label>
              <button
                type="button"
                onClick={() => setIncludeSources((v) => !v)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                  includeSources
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                    : "border-white/15 bg-black/30 text-white/60 hover:border-white/25"
                }`}
                aria-pressed={includeSources}
              >
                <span>Include sources & citations</span>
                <span
                  className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
                    includeSources ? "bg-emerald-400" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white transition ${
                      includeSources ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate}
            whileHover={canGenerate ? { scale: 1.01 } : undefined}
            whileTap={canGenerate ? { scale: 0.99 } : undefined}
            animate={
              canGenerate
                ? {
                    boxShadow: [
                      "0 0 0 0 rgba(251,191,36,0)",
                      "0 0 30px 6px rgba(167,139,250,0.45)",
                      "0 0 0 0 rgba(251,191,36,0)",
                    ],
                  }
                : { boxShadow: "0 0 0 0 rgba(251,191,36,0)" }
            }
            transition={{ duration: 1.8, repeat: Infinity }}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-extrabold transition ${
              canGenerate
                ? "bg-gradient-to-r from-amber-300 via-violet-400 to-amber-400 text-black"
                : "cursor-not-allowed bg-white/5 text-white/30"
            }`}
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Drafting deck with Nova…
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5" /> Generate Presentation
              </>
            )}
          </motion.button>
        </motion.section>
      </div>

      <style jsx global>{`
        .kyvex-range {
          height: 6px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            rgba(251, 191, 36, 0.6),
            rgba(167, 139, 250, 0.6),
            rgba(45, 212, 191, 0.6)
          );
          appearance: none;
          outline: none;
        }
        .kyvex-range::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 0 18px rgba(251, 191, 36, 0.65);
          cursor: pointer;
        }
        .kyvex-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border: 0;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 0 18px rgba(251, 191, 36, 0.65);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ---------------- Deck Viewer ----------------

function DeckViewer({
  deck,
  currentIdx,
  onCurrentChange,
  onUpdateSlide,
  onUpdateBullet,
  onUpdateDeckTitle,
  onGenerateImage,
  onUploadImage,
  imgLoadingId,
  exporting,
  onExport,
  onBack,
  onClose,
  themeId,
}: {
  deck: PresentationData;
  currentIdx: number;
  onCurrentChange: (i: number) => void;
  onUpdateSlide: (idx: number, patch: Partial<SlideData>) => void;
  onUpdateBullet: (idx: number, bulletIdx: number, value: string) => void;
  onUpdateDeckTitle: (title: string) => void;
  onGenerateImage: (idx: number) => void;
  onUploadImage: (idx: number, file: File) => void;
  imgLoadingId: string | null;
  exporting: boolean;
  onExport: () => void;
  onBack: () => void;
  onClose: () => void;
  themeId: StyleId;
}) {
  const slide = deck.slides[currentIdx];

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/70 hover:bg-white/10"
            aria-label="Back to configuration"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="min-w-0">
            <Editable
              value={deck.title}
              onChange={onUpdateDeckTitle}
              className="block max-w-[40vw] truncate text-sm font-semibold text-white/90"
              ariaLabel="Deck title"
              placeholder="Deck title…"
            />
            <div className="text-[11px] text-white/50">
              Slide {currentIdx + 1} of {deck.slides.length} ·{" "}
              {STYLES.find((s) => s.id === themeId)?.label ?? themeId}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            title="Upload this .pptx file to Google Drive — right-click → Open with → Google Slides — to edit it online."
            className="hidden items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/55 ring-1 ring-white/10 sm:inline-flex"
          >
            <Info className="h-3 w-3" /> Drive→Slides tip
          </span>
          <button
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-2 text-sm font-bold text-black shadow-[0_8px_22px_rgba(251,191,36,0.35)] transition hover:brightness-110 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Building…" : "Export .pptx"}
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-lg bg-white/5 p-2 text-white/60 hover:bg-red-500/20 hover:text-red-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail strip */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-white/10 bg-black/30 p-2 md:block">
          <ul className="space-y-2">
            {deck.slides.map((s, i) => (
              <li key={s.id ?? i}>
                <button
                  type="button"
                  onClick={() => onCurrentChange(i)}
                  className={`group block w-full overflow-hidden rounded-xl border text-left transition ${
                    i === currentIdx
                      ? "border-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.4)]"
                      : "border-white/10 hover:border-white/25"
                  }`}
                  aria-current={i === currentIdx ? "true" : undefined}
                >
                  <div className="relative aspect-[16/9] w-full bg-black/40">
                    <ThumbContent slide={s} />
                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="px-2 py-1">
                    <div className="truncate text-[11px] font-medium text-white/85">{s.title}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main editor */}
        <main className="relative flex flex-1 flex-col overflow-y-auto p-6">
          {slide && (
            <SlideEditor
              key={slide.id}
              slide={slide}
              index={currentIdx}
              onUpdateSlide={(patch) => onUpdateSlide(currentIdx, patch)}
              onUpdateBullet={(bi, value) => onUpdateBullet(currentIdx, bi, value)}
              onGenerateImage={() => onGenerateImage(currentIdx)}
              onUploadImage={(file) => onUploadImage(currentIdx, file)}
              isImgLoading={imgLoadingId === slide.id}
            />
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => onCurrentChange(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <div className="flex flex-wrap gap-1">
              {deck.slides.map((s, i) => (
                <button
                  key={s.id ?? i}
                  onClick={() => onCurrentChange(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-6 w-6 rounded-md text-[11px] font-semibold transition ${
                    i === currentIdx ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/15"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => onCurrentChange(Math.min(deck.slides.length - 1, currentIdx + 1))}
              disabled={currentIdx === deck.slides.length - 1}
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-30"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------- Slide editor ----------------

function SlideEditor({
  slide,
  index,
  onUpdateSlide,
  onUpdateBullet,
  onGenerateImage,
  onUploadImage,
  isImgLoading,
}: {
  slide: SlideData;
  index: number;
  onUpdateSlide: (patch: Partial<SlideData>) => void;
  onUpdateBullet: (bi: number, value: string) => void;
  onGenerateImage: () => void;
  onUploadImage: (file: File) => void;
  isImgLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="rounded-md bg-white/10 px-2 py-0.5 uppercase tracking-wider text-white/60">
          {slide.type === "two_column" ? (
            <span className="inline-flex items-center gap-1">
              <Columns2 className="h-3 w-3" /> Two-column
            </span>
          ) : slide.type === "quote" ? (
            <span className="inline-flex items-center gap-1">
              <QuoteIcon className="h-3 w-3" /> Quote
            </span>
          ) : (
            slide.type
          )}
        </span>
        <span className="text-white/40">Slide {index + 1}</span>
      </div>

      {/* Title */}
      <Editable
        value={slide.title}
        onChange={(v) => onUpdateSlide({ title: v })}
        className="text-3xl font-extrabold leading-tight tracking-tight text-white"
        ariaLabel="Slide title"
      />

      {slide.subtitle !== undefined && (
        <Editable
          value={slide.subtitle}
          onChange={(v) => onUpdateSlide({ subtitle: v })}
          className="mt-2 text-base text-white/70"
          ariaLabel="Subtitle"
          placeholder="Subtitle…"
        />
      )}

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {slide.bullets && (
            <ul className="space-y-2">
              {slide.bullets.map((b, bi) => (
                <li key={bi} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                  <Editable
                    value={b}
                    onChange={(v) => onUpdateBullet(bi, v)}
                    className="flex-1 text-base text-white/85"
                    ariaLabel={`Bullet ${bi + 1}`}
                    placeholder="Bullet…"
                  />
                </li>
              ))}
            </ul>
          )}

          {slide.type === "two_column" && (
            <div className="grid grid-cols-2 gap-4">
              <Column
                header={slide.leftHeader ?? ""}
                bullets={slide.leftBullets ?? []}
                onHeader={(v) => onUpdateSlide({ leftHeader: v })}
                onBullets={(arr) => onUpdateSlide({ leftBullets: arr })}
              />
              <Column
                header={slide.rightHeader ?? ""}
                bullets={slide.rightBullets ?? []}
                onHeader={(v) => onUpdateSlide({ rightHeader: v })}
                onBullets={(arr) => onUpdateSlide({ rightBullets: arr })}
              />
            </div>
          )}

          {slide.type === "quote" && (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <Editable
                value={slide.quote ?? ""}
                onChange={(v) => onUpdateSlide({ quote: v })}
                className="text-xl italic text-white/90"
                ariaLabel="Quote"
                placeholder="The quote…"
              />
              <Editable
                value={slide.attribution ?? ""}
                onChange={(v) => onUpdateSlide({ attribution: v })}
                className="mt-2 text-sm text-white/55"
                ariaLabel="Attribution"
                placeholder="— Attribution"
              />
            </div>
          )}

          {slide.notes !== undefined && (
            <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-xs uppercase tracking-wider text-white/55">
                Speaker notes
              </summary>
              <Editable
                value={slide.notes ?? ""}
                onChange={(v) => onUpdateSlide({ notes: v })}
                className="mt-2 whitespace-pre-wrap text-sm text-white/75"
                multiline
                ariaLabel="Speaker notes"
                placeholder="Speaker notes…"
              />
            </details>
          )}

          {slide.sources && slide.sources.length > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-emerald-200/80">Sources</div>
              <ol className="ml-4 list-decimal space-y-0.5 text-xs text-emerald-100/85">
                {slide.sources.map((src, si) => (
                  <li key={si}>
                    <Editable
                      value={src}
                      onChange={(v) => {
                        const next = [...(slide.sources ?? [])];
                        next[si] = v;
                        onUpdateSlide({ sources: next });
                      }}
                      className="inline"
                      ariaLabel={`Source ${si + 1}`}
                    />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Image area */}
        <div className="space-y-2">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {slide.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.imageUrl}
                alt={slide.imagePrompt ?? slide.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-white/45">
                <ImageIcon className="h-8 w-8 text-white/30" />
                <span>{slide.imagePrompt ?? "No image yet"}</span>
              </div>
            )}
            {isImgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onGenerateImage}
              disabled={isImgLoading}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30 transition hover:bg-amber-300/25 disabled:opacity-60"
            >
              {slide.imageUrl ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {slide.imageUrl ? "Regenerate" : "Generate Image"}
            </button>
            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/75 ring-1 ring-white/10 transition hover:bg-white/10">
              <Upload className="h-3.5 w-3.5" /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadImage(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {slide.imageUrl && (
            <button
              onClick={() => onUpdateSlide({ imageUrl: undefined })}
              className="w-full rounded-lg bg-white/5 px-3 py-1.5 text-[11px] text-white/55 hover:bg-white/10 hover:text-white/80"
            >
              Remove image
            </button>
          )}
          {slide.imagePrompt && (
            <p className="text-[10px] italic text-white/40">prompt: {slide.imagePrompt}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Column({
  header,
  bullets,
  onHeader,
  onBullets,
}: {
  header: string;
  bullets: string[];
  onHeader: (v: string) => void;
  onBullets: (arr: string[]) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <Editable
        value={header}
        onChange={onHeader}
        className="mb-2 text-sm font-bold text-amber-200"
        ariaLabel="Column header"
        placeholder="Header…"
      />
      <ul className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm text-white/80">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
            <Editable
              value={b}
              onChange={(v) => {
                const next = [...bullets];
                next[i] = v;
                onBullets(next);
              }}
              className="flex-1"
              ariaLabel={`Column bullet ${i + 1}`}
              placeholder="Point…"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Editable text ----------------

function Editable({
  value,
  onChange,
  className = "",
  multiline = false,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  ariaLabel?: string;
  placeholder?: string;
}) {
  // contentEditable that fires onChange on blur to keep React state stable
  return (
    <span
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const text = (e.currentTarget.textContent ?? "").replace(/\u200B/g, "");
        if (text !== value) onChange(text);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      className={`outline-none transition focus:ring-2 focus:ring-amber-300/60 rounded-sm px-0.5 ${
        !value ? "text-white/40 before:content-[attr(data-placeholder)]" : ""
      } ${className}`}
    >
      {value}
    </span>
  );
}

// ---------------- Thumbnail content ----------------

function ThumbContent({ slide }: { slide: SlideData }) {
  return (
    <div className="absolute inset-0 flex flex-col gap-1 p-2">
      <div className="line-clamp-2 text-[10px] font-bold text-white/85">{slide.title}</div>
      {slide.bullets && (
        <ul className="space-y-0.5 text-[8px] leading-snug text-white/60">
          {slide.bullets.slice(0, 3).map((b, i) => (
            <li key={i} className="line-clamp-1">
              • {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------- Helpers ----------------

function stripHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kyvex-presentation"
  );
}

function SourceTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-amber-300 text-black" : "text-white/65 hover:bg-white/5"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
