"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  CalendarDays,
  ClipboardList,
  Compass,
  FileAudio,
  FileText,
  Flame,
  Gauge,
  Headphones,
  Heart,
  Image as ImageIcon,
  Layers,
  LineChart,
  MessageSquare,
  Mic,
  Network,
  NotebookPen,
  Orbit,
  PencilLine,
  Radar,
  Repeat2,
  ScanLine,
  Scroll,
  Sparkles,
  Stethoscope,
  StickyNote,
  Swords,
  Target,
  Trophy,
  Upload,
  Video,
  Volume2,
  Wand2,
  Wrench,
} from "lucide-react";

export const FEATURE_PREFS_EVENT = "kyvex:feature-preferences-changed";

type FeatureNode = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type FeatureCluster = {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  icon: LucideIcon;
  /** Tailwind-ish gradient stop colors expressed as raw rgb strings */
  glow: {
    /** Active track gradient start */
    from: string;
    /** Active track gradient end */
    to: string;
    /** Soft halo radius color (used in spotlight + card outline) */
    halo: string;
    /** Solid accent for chips + icon tint */
    accent: string;
  };
  features: FeatureNode[];
};

const CLUSTERS: FeatureCluster[] = [
  {
    id: "dashboard-goals",
    title: "Dashboard & Goals",
    subtitle: "Mission Control",
    tagline: "Sculpt the surface that greets you every morning.",
    icon: Compass,
    glow: {
      from: "34, 211, 238",
      to: "59, 130, 246",
      halo: "56, 189, 248",
      accent: "#38bdf8",
    },
    features: [
      { key: "planner", label: "Daily Planner", description: "Time-block today with AI suggestions.", icon: ClipboardList },
      { key: "calendar", label: "Smart Calendar", description: "Exams, classes, and Nova reminders.", icon: CalendarDays },
      { key: "habits", label: "Habit Tracker", description: "Streaks, rituals, and study cadence.", icon: Repeat2 },
      { key: "wellness", label: "Wellness Check-ins", description: "Mood + energy gates before deep work.", icon: Heart },
      { key: "focus-score", label: "Focus Score", description: "Live attention rating across sessions.", icon: Gauge },
      { key: "grade-calc", label: "Grade Calculator", description: "What-if forecasts for each course.", icon: LineChart },
      { key: "mastery", label: "Mastery Tracker", description: "Topic-level retention meter.", icon: Target },
      { key: "achievements", label: "Achievements", description: "Badges and milestones surfaced on home.", icon: Trophy },
    ],
  },
  {
    id: "notes-studio",
    title: "Notes & Content Studio",
    subtitle: "The Writing Forge",
    tagline: "Choose which formatters live inside the notes toolbar.",
    icon: NotebookPen,
    glow: {
      from: "240, 180, 41",
      to: "245, 158, 11",
      halo: "250, 204, 21",
      accent: "#f0b429",
    },
    features: [
      { key: "generator", label: "AI Note Generator", description: "One-click structured notes from any source.", icon: Wand2 },
      { key: "cornell", label: "Cornell Format", description: "Cue · Notes · Summary split layout.", icon: Layers },
      { key: "narrative", label: "Narrative Mode", description: "Convert notes into story-form recall.", icon: Scroll },
      { key: "compress", label: "One-Page Compress", description: "Distill any note into a single sheet.", icon: FileText },
      { key: "adaptive-notes", label: "Adaptive Notes", description: "Notes restructure based on your gaps.", icon: Sparkles },
      { key: "micro-lessons", label: "Micro-Lessons", description: "Auto-split notes into 90-second bites.", icon: StickyNote },
      { key: "listen", label: "Listen Mode", description: "Pristine TTS playback of any note.", icon: Volume2 },
      { key: "content-hub", label: "Content Hub", description: "Cross-link notes, decks, and uploads.", icon: Network },
    ],
  },
  {
    id: "nova-ai",
    title: "Nova AI Modifiers",
    subtitle: "Tutor Cortex",
    tagline: "Pick the reasoning modes Nova can deploy on demand.",
    icon: Brain,
    glow: {
      from: "20, 184, 166",
      to: "16, 185, 129",
      halo: "45, 212, 191",
      accent: "#14b8a6",
    },
    features: [
      { key: "tutor", label: "Nova Tutor Chat", description: "Conversational tutor with memory.", icon: MessageSquare },
      { key: "voice-tutor", label: "Voice Tutor", description: "Hands-free voice tutoring sessions.", icon: Mic },
      { key: "feynman", label: "Feynman Mode", description: "Force yourself to teach the concept back.", icon: PencilLine },
      { key: "diagrams", label: "Diagram Generation", description: "Auto-build visual explainers.", icon: Orbit },
      { key: "debate", label: "Debate Mode", description: "Argue both sides with Nova as moderator.", icon: Swords },
      { key: "counterargument", label: "Counterargument", description: "Nova stress-tests your reasoning.", icon: Radar },
      { key: "concept-web", label: "Concept Web", description: "Pull-from-memory mind-map weaver.", icon: Network },
      { key: "knowledge-map", label: "Knowledge Map", description: "Topic graph of everything you know.", icon: Activity },
    ],
  },
  {
    id: "flashcards-lab",
    title: "Flashcards & Test Lab",
    subtitle: "Retention Engine",
    tagline: "Curate which recall surfaces exist in your study deck.",
    icon: Layers,
    glow: {
      from: "168, 85, 247",
      to: "139, 92, 246",
      halo: "192, 132, 252",
      accent: "#a855f7",
    },
    features: [
      { key: "flashcards", label: "Flashcards Hub", description: "Spaced repetition decks with Nova review.", icon: Layers },
      { key: "mock-exam", label: "Mock Exams", description: "Full-length timed exam simulator.", icon: ClipboardList },
      { key: "photo-quiz", label: "Photo Quiz", description: "Snap a page, get instant questions.", icon: ImageIcon },
      { key: "battle", label: "Flashcard Battle", description: "Head-to-head review races.", icon: Swords },
      { key: "battle-royale", label: "Battle Royale", description: "Multi-player elimination drills.", icon: Flame },
      { key: "predictor", label: "Score Predictor", description: "Forecast next exam based on practice.", icon: LineChart },
      { key: "autopsy", label: "Mistake Autopsy", description: "Deep post-mortem on missed questions.", icon: Stethoscope },
      { key: "crossover", label: "Crossover Drills", description: "Mash topics together to stress recall.", icon: Repeat2 },
    ],
  },
  {
    id: "ingestion",
    title: "Ingestion Methods",
    subtitle: "Material Intake",
    tagline: "Pick the doors Kyvex opens for new material.",
    icon: Upload,
    glow: {
      from: "239, 68, 68",
      to: "244, 63, 94",
      halo: "248, 113, 113",
      accent: "#ef4444",
    },
    features: [
      { key: "youtube-import", label: "YouTube Import", description: "Stream-to-notes with Nova summarizer.", icon: Video },
      { key: "smart-upload", label: "Smart Upload", description: "Drop PDF · DOCX · slides for parsing.", icon: Upload },
      { key: "audio", label: "Audio → Notes", description: "Transcribe + structure any recording.", icon: FileAudio },
      { key: "lecture", label: "Lecture Capture", description: "Live mic capture with chapter detection.", icon: Headphones },
      { key: "capture", label: "Screenshot Capture", description: "Save snippets to the capture gallery.", icon: ScanLine },
      { key: "handwriting", label: "Handwriting OCR", description: "Photographed notes → searchable text.", icon: PencilLine },
      { key: "classroom-import", label: "Google Classroom", description: "Pull assignments + materials in.", icon: ClipboardList },
      { key: "quizlet-import", label: "Quizlet Import", description: "Migrate decks into Kyvex flashcards.", icon: Wrench },
    ],
  },
];

type Props = {
  initialEnabled?: string[];
  initialHidden?: string[];
};

export default function FeatureMatrix({ initialEnabled, initialHidden }: Props) {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(initialEnabled ?? []));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(initialHidden ?? []));
  const [loaded, setLoaded] = useState<boolean>(Boolean(initialEnabled));
  const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);

  // First load — fetch from API if we weren't seeded
  useEffect(() => {
    if (loaded) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/feature-preferences", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load feature preferences");
        const data = await res.json();
        if (cancelled) return;
        const en: string[] = Array.isArray(data?.prefs?.enabledFeatures) ? data.prefs.enabledFeatures : [];
        const hi: string[] = Array.isArray(data?.prefs?.hiddenFeatures) ? data.prefs.hiddenFeatures : [];
        setEnabled(new Set(en));
        setHidden(new Set(hi));
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setError("Could not load your matrix. Try refreshing.");
        setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded]);

  const totals = useMemo(() => {
    const all = CLUSTERS.flatMap((c) => c.features.map((f) => f.key));
    const on = all.filter((k) => enabled.has(k)).length;
    return { total: all.length, on };
  }, [enabled]);

  const persist = useCallback(
    async (nextEnabled: Set<string>, nextHidden: Set<string>) => {
      saveAbortRef.current?.abort();
      const ctrl = new AbortController();
      saveAbortRef.current = ctrl;
      try {
        const res = await fetch("/api/feature-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabledFeatures: Array.from(nextEnabled),
            hiddenFeatures: Array.from(nextHidden),
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("save failed");
        // Tell the rest of the app to refresh visibility
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(FEATURE_PREFS_EVENT, {
              detail: {
                enabledFeatures: Array.from(nextEnabled),
                hiddenFeatures: Array.from(nextHidden),
              },
            }),
          );
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Couldn't save toggle — change kept locally.");
      }
    },
    [],
  );

  const handleToggle = useCallback(
    (key: string, next: boolean) => {
      setEnabled((prev) => {
        const en = new Set(prev);
        if (next) en.add(key);
        else en.delete(key);

        setHidden((prevHidden) => {
          const hi = new Set(prevHidden);
          if (next) hi.delete(key);
          else hi.add(key);
          // fire & forget persistence with the freshest sets
          setSavingKeys((s) => {
            const n = new Set(s);
            n.add(key);
            return n;
          });
          void persist(en, hi).finally(() => {
            setSavingKeys((s) => {
              const n = new Set(s);
              n.delete(key);
              return n;
            });
          });
          return hi;
        });
        return en;
      });
    },
    [persist],
  );

  return (
    <section className="relative w-full">
      {/* Header */}
      <header className="mb-7 flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />
          Personal Customization Matrix
        </span>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-white md:text-[32px]">
          Sculpt your Kyvex.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
          Toggle entire feature clusters on or off. Anything you switch off vanishes from your sidebar, toolbars, and command surfaces — instantly and across the whole platform.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-zinc-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {totals.on} of {totals.total} active
          </div>
          {error && (
            <span className="text-[11px] font-medium text-rose-400">{error}</span>
          )}
        </div>
      </header>

      {/* Cluster grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {CLUSTERS.map((cluster, idx) => (
          <MatrixCard
            key={cluster.id}
            cluster={cluster}
            index={idx}
            enabled={enabled}
            saving={savingKeys}
            onToggle={handleToggle}
            loaded={loaded}
          />
        ))}
      </div>

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          :global([data-matrix-card]) {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Card                                                       */
/* ─────────────────────────────────────────────────────────── */

function MatrixCard({
  cluster,
  index,
  enabled,
  saving,
  onToggle,
  loaded,
}: {
  cluster: FeatureCluster;
  index: number;
  enabled: Set<string>;
  saving: Set<string>;
  onToggle: (key: string, next: boolean) => void;
  loaded: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const activeInCluster = cluster.features.filter((f) => enabled.has(f.key)).length;
  const hasAny = activeInCluster > 0;

  const handleMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
  }, []);

  const Icon = cluster.icon;

  const cardStyle: CSSProperties = {
    // CSS custom props consumed by the spotlight overlay
    ["--mx" as any]: "50%",
    ["--my" as any]: "50%",
    ["--halo" as any]: cluster.glow.halo,
    ["--accent" as any]: cluster.glow.accent,
  };

  return (
    <motion.div
      data-matrix-card
      ref={ref}
      onPointerMove={handleMove}
      style={cardStyle}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-xl transition-colors duration-300 hover:border-white/[0.12]"
    >
      {/* Cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(360px circle at var(--mx) var(--my), rgba(var(--halo), 0.14), transparent 60%)",
        }}
      />

      {/* Soft active-state outline glow */}
      {hasAny && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-50"
          style={{
            boxShadow: `inset 0 0 0 1px rgba(var(--halo), 0.18), 0 0 60px -30px rgba(var(--halo), 0.4)`,
          }}
        />
      )}

      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40"
              style={{
                boxShadow: `inset 0 0 18px rgba(var(--halo), 0.18)`,
              }}
            >
              <Icon size={20} strokeWidth={1.5} style={{ color: cluster.glow.accent }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[15px] font-bold text-white">{cluster.title}</h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    background: `rgba(var(--halo), 0.12)`,
                    color: cluster.glow.accent,
                  }}
                >
                  {cluster.subtitle}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] leading-snug text-zinc-500">{cluster.tagline}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Active
            </span>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: hasAny ? cluster.glow.accent : "#52525b" }}
            >
              {activeInCluster}
              <span className="text-zinc-600">/{cluster.features.length}</span>
            </span>
          </div>
        </div>

        {/* Feature rows */}
        <div className="flex flex-col gap-1.5">
          {cluster.features.map((feature) => (
            <MatrixRow
              key={feature.key}
              feature={feature}
              enabled={enabled.has(feature.key)}
              saving={saving.has(feature.key)}
              cluster={cluster}
              onToggle={(next) => onToggle(feature.key, next)}
              disabled={!loaded}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Row                                                        */
/* ─────────────────────────────────────────────────────────── */

function MatrixRow({
  feature,
  enabled,
  saving,
  cluster,
  onToggle,
  disabled,
}: {
  feature: FeatureNode;
  enabled: boolean;
  saving: boolean;
  cluster: FeatureCluster;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}) {
  const Icon = feature.icon;
  return (
    <motion.div
      layout
      initial={false}
      animate={{
        backgroundColor: enabled ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.012)",
      }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.05] px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <motion.div
          animate={{
            opacity: enabled ? 1 : 0.45,
            scale: enabled ? 1 : 0.94,
          }}
          transition={{ duration: 0.25 }}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30"
          style={{
            color: enabled ? cluster.glow.accent : "#71717a",
            boxShadow: enabled ? `inset 0 0 10px rgba(${cluster.glow.halo}, 0.18)` : undefined,
          }}
        >
          <Icon size={15} strokeWidth={1.7} />
        </motion.div>
        <div className="min-w-0">
          <motion.p
            animate={{ color: enabled ? "rgb(255,255,255)" : "rgb(161,161,170)" }}
            transition={{ duration: 0.25 }}
            className="truncate text-[13.5px] font-semibold"
          >
            {feature.label}
          </motion.p>
          <p className="truncate text-[11.5px] leading-snug text-zinc-500">{feature.description}</p>
        </div>
      </div>

      <MatrixSlider
        checked={enabled}
        onChange={onToggle}
        cluster={cluster}
        disabled={disabled}
        loading={saving}
        ariaLabel={`Toggle ${feature.label}`}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Slider                                                     */
/* ─────────────────────────────────────────────────────────── */

function MatrixSlider({
  checked,
  onChange,
  cluster,
  disabled,
  loading,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  cluster: FeatureCluster;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel: string;
}) {
  const trackStyle: CSSProperties = checked
    ? {
        background: `linear-gradient(135deg, rgba(${cluster.glow.from}, 0.95) 0%, rgba(${cluster.glow.to}, 0.95) 100%)`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.10) inset, 0 0 18px -2px rgba(${cluster.glow.halo}, 0.55)`,
      }
    : {
        background: "rgba(255,255,255,0.05)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.07) inset",
      };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 flex-shrink-0 rounded-full p-0 outline-none transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <motion.span
        aria-hidden
        animate={trackStyle as any}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 rounded-full"
      />

      {/* Slider knob */}
      <motion.span
        aria-hidden
        layout
        initial={false}
        animate={{
          x: checked ? 22 : 2,
          scale: 1,
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.7 }}
        style={{
          willChange: "transform",
          background: checked
            ? "linear-gradient(180deg,#ffffff 0%,#e4e4e7 100%)"
            : "rgba(255,255,255,0.55)",
          boxShadow: checked
            ? `0 4px 14px -2px rgba(${cluster.glow.halo}, 0.6), 0 0 0 1px rgba(0,0,0,0.18)`
            : "0 1px 2px rgba(0,0,0,0.4)",
        }}
        className="absolute top-1/2 block h-[22px] w-[22px] -translate-y-1/2 rounded-full"
      />

      {/* Inner indent glow */}
      <AnimatePresence>
        {checked && (
          <motion.span
            key="indent"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-[3px] rounded-full"
            style={{
              boxShadow: `inset 0 0 8px rgba(255,255,255,0.25)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Saving pulse */}
      <AnimatePresence>
        {loading && (
          <motion.span
            key="saving"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute -right-3 -top-1 h-2 w-2 rounded-full"
            style={{
              background: cluster.glow.accent,
              boxShadow: `0 0 8px ${cluster.glow.accent}`,
            }}
          />
        )}
      </AnimatePresence>
    </button>
  );
}
