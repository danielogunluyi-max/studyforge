"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  Loader2,
  Palette,
  Play,
  Presentation as PresentationIcon,
  RefreshCw,
  Save,
  Search,
  Shuffle,
  X,
  Zap,
} from "lucide-react";
import { useToast } from "~/app/_components/toast";
import type { PresentationData, SlideData, ThemeConfig } from "~/types/presentation";

/* ─────────────────────────────────────────────────────────── */
/*  Types                                                      */
/* ─────────────────────────────────────────────────────────── */

type SourceMode = "notes" | "files" | "prompt";
type ThemeId = "academic" | "minimal" | "creative" | "professional";

type CurriculumOption = { code: string; title: string };

type NoteSummary = {
  id: string;
  title: string;
  format: string;
  updatedAt: string;
  tags?: string[];
};

type ThemeOption = {
  id: ThemeId;
  label: string;
  sub: string;
  preview: { bg: string; accent: string; text: string };
  config: ThemeConfig;
};

/* ─────────────────────────────────────────────────────────── */
/*  Constants                                                  */
/* ─────────────────────────────────────────────────────────── */

const SOURCE_OPTIONS: { value: SourceMode; label: string; sub: string }[] = [
  { value: "notes", label: "Notes", sub: "Paste content" },
  { value: "files", label: "Uploads", sub: "From My Notes" },
  { value: "prompt", label: "AI Prompt", sub: "Topic or idea" },
];

const SLIDE_COUNT_OPTIONS = [5, 10, 15] as const;
type SlideCountValue = (typeof SLIDE_COUNT_OPTIONS)[number];

const THEMES: ThemeOption[] = [
  {
    id: "academic",
    label: "Midnight Glass",
    sub: "Dark · cyan halo",
    preview: { bg: "#070b14", accent: "#22d3ee", text: "#e6f0ff" },
    config: {
      bg: "#070b14",
      accent: "#22d3ee",
      text: "#e6f0ff",
      secondary: "#94a3b8",
      titleBg: "#0c1424",
    },
  },
  {
    id: "minimal",
    label: "Linear Minimalist",
    sub: "Ivory · graphite",
    preview: { bg: "#fafaf9", accent: "#0f172a", text: "#0f172a" },
    config: {
      bg: "#fafaf9",
      accent: "#0f172a",
      text: "#0f172a",
      secondary: "#52525b",
      titleBg: "#f1f5f9",
    },
  },
  {
    id: "creative",
    label: "Teal Cyber",
    sub: "Neon teal grid",
    preview: { bg: "#031318", accent: "#14b8a6", text: "#ccfbf1" },
    config: {
      bg: "#031318",
      accent: "#14b8a6",
      text: "#ccfbf1",
      secondary: "#5eead4",
      titleBg: "#062a31",
    },
  },
];

const ACCENT_PALETTE = [
  { name: "Cyan", value: "#22d3ee" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
];

/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                    */
/* ─────────────────────────────────────────────────────────── */

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

function cycleSlideLayout(slide: SlideData): SlideData {
  if (slide.type === "title" || slide.type === "end") return slide;
  const order: SlideData["type"][] = ["content", "two_column", "quote"];
  const idx = order.indexOf(slide.type);
  const next = order[(idx + 1) % order.length]!;
  if (next === "two_column") {
    const all = slide.bullets ?? [];
    if (all.length === 0 && slide.quote) {
      return {
        ...slide,
        type: "two_column",
        leftHeader: "Key Idea",
        leftBullets: [slide.quote],
        rightHeader: "Context",
        rightBullets: [slide.attribution ?? slide.title],
      };
    }
    const mid = Math.ceil(all.length / 2);
    return {
      ...slide,
      type: "two_column",
      leftHeader: slide.leftHeader ?? "Key Points",
      leftBullets: slide.leftBullets ?? all.slice(0, mid),
      rightHeader: slide.rightHeader ?? "Details",
      rightBullets: slide.rightBullets ?? all.slice(mid),
    };
  }
  if (next === "quote") {
    return {
      ...slide,
      type: "quote",
      quote: slide.quote ?? slide.bullets?.[0] ?? slide.title,
      attribution: slide.attribution ?? slide.title,
    };
  }
  if (!slide.bullets || slide.bullets.length === 0) {
    const fromCols = [...(slide.leftBullets ?? []), ...(slide.rightBullets ?? [])];
    return {
      ...slide,
      type: "content",
      bullets: fromCols.length ? fromCols : [slide.quote ?? slide.title],
    };
  }
  return { ...slide, type: "content" };
}

function effectiveTheme(
  base: ThemeConfig,
  accentOverride: string | null,
): ThemeConfig {
  if (!accentOverride) return base;
  return { ...base, accent: accentOverride };
}

/* ─────────────────────────────────────────────────────────── */
/*  Field — labelled section wrapper                           */
/* ─────────────────────────────────────────────────────────── */

function Field({
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
          <span className="text-[10.5px] font-semibold tracking-wide text-zinc-400">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  CapsuleTrack — segmented selector with sliding glass pill  */
/* ─────────────────────────────────────────────────────────── */

function CapsuleTrack<T extends string | number>({
  trackId,
  options,
  value,
  onChange,
}: {
  trackId: string;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="relative grid gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
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
                layoutId={`pill-${trackId}`}
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
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
/*  ThemeDeck — horizontal style cards with sliding border     */
/* ─────────────────────────────────────────────────────────── */

function ThemeDeck({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {THEMES.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="relative flex flex-col gap-2 rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
            aria-pressed={active}
            style={{ willChange: "transform" }}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId="theme-deck-border"
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
                className="absolute inset-0 rounded-2xl border border-cyan-300/45 bg-cyan-300/[0.06]"
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(34,211,238,0.25) inset, 0 0 22px -8px rgba(34,211,238,0.5)",
                  willChange: "transform",
                }}
              />
            )}
            <div
              className="relative z-10 h-12 w-full overflow-hidden rounded-lg"
              style={{ background: t.preview.bg }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  top: 8,
                  width: 24,
                  height: 3,
                  borderRadius: 2,
                  background: t.preview.accent,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  bottom: 8,
                  width: 38,
                  height: 2,
                  background: t.preview.text,
                  opacity: 0.45,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  bottom: 14,
                  width: 28,
                  height: 2,
                  background: t.preview.text,
                  opacity: 0.3,
                }}
              />
            </div>
            <div className="relative z-10 text-left">
              <p
                className={`text-[11.5px] font-bold leading-tight transition-colors duration-200 ${
                  active ? "text-white" : "text-zinc-300"
                }`}
              >
                {t.label}
              </p>
              <p
                className={`mt-0.5 text-[9.5px] uppercase tracking-[0.18em] transition-colors duration-200 ${
                  active ? "text-cyan-200" : "text-zinc-600"
                }`}
              >
                {t.sub}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  NotePickerList — uploads/files mode                        */
/* ─────────────────────────────────────────────────────────── */

function NotePickerList({
  notes,
  loading,
  selectedId,
  onSelect,
  search,
  setSearch,
}: {
  notes: NoteSummary[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (n: NoteSummary | null) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-2">
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
          placeholder="Search saved notes"
          className="h-9 w-full rounded-xl border border-white/[0.06] bg-black/30 pl-9 pr-3 text-[12.5px] text-white placeholder:text-zinc-600 outline-none focus:border-white/20"
        />
      </div>
      <div className="max-h-[180px] overflow-y-auto rounded-xl border border-white/[0.05] bg-black/20">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-zinc-600">
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-5 text-center text-[12px] text-zinc-600">
            No notes match. Create one in <strong className="text-zinc-400">My Notes</strong>.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {filtered.map((n) => {
              const isSel = selectedId === n.id;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(isSel ? null : n)}
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
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  IgnitionButton — blue→purple breathe                       */
/* ─────────────────────────────────────────────────────────── */

function IgnitionButton({
  onClick,
  loading,
  disabled,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-4 text-[14px] font-bold text-white disabled:cursor-not-allowed"
      style={{
        willChange: "transform",
        background: disabled
          ? "rgba(255,255,255,0.04)"
          : "linear-gradient(135deg, #0b1a3d 0%, #1e3a8a 30%, #4f46e5 65%, #7c3aed 100%)",
        color: disabled ? "rgb(82,82,91)" : "rgb(237,233,254)",
      }}
    >
      {!disabled && !loading && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow:
              "0 0 0 1px rgba(99,102,241,0.45) inset, 0 0 32px -6px rgba(99,102,241,0.55), 0 0 60px -10px rgba(124,58,237,0.5)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
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
        {loading ? (
          <Loader2 size={16} className="animate-spin" strokeWidth={2} />
        ) : (
          <Zap size={16} strokeWidth={2} />
        )}
        {loading ? "Composing deck…" : label}
      </span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  AccentPicker modal                                         */
/* ─────────────────────────────────────────────────────────── */

function AccentPicker({
  current,
  onSelect,
  onClear,
  onClose,
}: {
  current: string;
  onSelect: (color: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      style={{ willChange: "opacity" }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/12 bg-white/5 p-6 backdrop-blur-xl"
        style={{ willChange: "transform" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              Accent
            </p>
            <h3 className="mt-0.5 text-[16px] font-bold text-white">
              Change accent color
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Close"
          >
            <X size={13} strokeWidth={1.8} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ACCENT_PALETTE.map((c) => {
            const active = current.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onSelect(c.value)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors ${
                  active
                    ? "border-white/30 bg-white/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
                aria-pressed={active}
              >
                <span
                  className="block h-7 w-7 rounded-full"
                  style={{
                    background: c.value,
                    boxShadow: `0 0 16px -2px ${c.value}80`,
                  }}
                />
                <span className="text-[11px] font-bold text-zinc-300">{c.name}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[12px] font-semibold text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          Reset to theme default
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Empty / Loading stages                                     */
/* ─────────────────────────────────────────────────────────── */

function EmptyStage() {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.015] p-10 text-center backdrop-blur-xl">
      <div className="relative mb-5">
        <motion.div
          aria-hidden
          className="absolute inset-0 -m-4 rounded-full"
          style={{
            background:
              "radial-gradient(120px 120px at 50% 50%, rgba(99,102,241,0.25), transparent 70%)",
          }}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <PresentationIcon size={42} strokeWidth={1.4} className="relative text-indigo-200/80" />
      </div>
      <p className="text-[15px] font-bold text-white">Your deck appears here</p>
      <p className="mt-1 max-w-sm text-[12.5px] text-zinc-500">
        Pick a source, dial the slide count, choose a theme, then ignite the generator.
      </p>
    </div>
  );
}

function GeneratingStage() {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 rounded-3xl border border-white/[0.06] bg-white/[0.015] p-10 text-center backdrop-blur-xl">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        style={{ willChange: "transform" }}
      >
        <Loader2 size={28} strokeWidth={1.6} className="text-indigo-300" />
      </motion.div>
      <div>
        <p className="text-[14px] font-bold text-white">Composing slides…</p>
        <p className="mt-1 text-[11.5px] text-zinc-500">
          Nova is structuring the deck. Usually 10-20 seconds.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  SlidePreview — themed slide card                           */
/* ─────────────────────────────────────────────────────────── */

function SlidePreview({
  slide,
  themeConfig,
  index,
  editing,
  onChange,
}: {
  slide: SlideData;
  themeConfig: ThemeConfig;
  index: number;
  editing?: boolean;
  onChange?: (next: SlideData) => void;
}) {
  const update = (patch: Partial<SlideData>) => onChange?.({ ...slide, ...patch });

  const editableTitle = (style: React.CSSProperties) =>
    editing ? (
      <input
        defaultValue={slide.title}
        onBlur={(e) => update({ title: e.currentTarget.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        style={{
          ...style,
          background: "rgba(255,255,255,0.06)",
          border: "1px dashed rgba(255,255,255,0.4)",
          borderRadius: 6,
          padding: "2px 6px",
          width: "100%",
          outline: "none",
        }}
      />
    ) : (
      <span style={style}>{slide.title}</span>
    );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: themeConfig.bg,
        padding: "6% 8%",
        display: "flex",
        flexDirection: "column",
        justifyContent: slide.type === "title" ? "center" : "flex-start",
      }}
    >
      {slide.type === "title" && (
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontSize: "clamp(16px, 2.6vw, 32px)",
              fontWeight: 800,
              color: themeConfig.text,
              marginBottom: 10,
              lineHeight: 1.15,
            }}
          >
            {editableTitle({
              fontSize: "inherit",
              fontWeight: 800,
              color: themeConfig.text,
            })}
          </h2>
          {slide.subtitle && (
            <p style={{ fontSize: "clamp(10px, 1.4vw, 16px)", color: themeConfig.secondary }}>
              {slide.subtitle}
            </p>
          )}
          <div
            style={{
              width: "32%",
              height: 3,
              background: themeConfig.accent,
              margin: "14px auto 0",
              borderRadius: 2,
            }}
          />
        </div>
      )}

      {slide.type === "content" && (
        <>
          <div
            style={{
              width: 4,
              height: "100%",
              background: themeConfig.accent,
              position: "absolute",
              left: 0,
              top: 0,
            }}
          />
          <h3
            style={{
              fontSize: "clamp(13px, 1.9vw, 22px)",
              fontWeight: 700,
              color: themeConfig.text,
              marginBottom: 10,
              paddingLeft: 14,
            }}
          >
            {editableTitle({ fontSize: "inherit", fontWeight: 700, color: themeConfig.text })}
          </h3>
          <div
            style={{
              width: "100%",
              height: 2,
              background: themeConfig.accent,
              marginBottom: 12,
              opacity: 0.5,
            }}
          />
          {(slide.bullets ?? []).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: themeConfig.accent, fontWeight: 700, flexShrink: 0 }}>·</span>
              {editing ? (
                <input
                  defaultValue={b}
                  onBlur={(e) => {
                    const next = [...(slide.bullets ?? [])];
                    next[i] = e.currentTarget.value;
                    update({ bullets: next });
                  }}
                  style={{
                    fontSize: "clamp(10px, 1.25vw, 14px)",
                    color: themeConfig.text,
                    lineHeight: 1.4,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px dashed rgba(255,255,255,0.4)",
                    borderRadius: 6,
                    padding: "2px 6px",
                    flex: 1,
                    outline: "none",
                  }}
                />
              ) : (
                <span style={{ fontSize: "clamp(10px, 1.25vw, 14px)", color: themeConfig.text, lineHeight: 1.4 }}>
                  {b}
                </span>
              )}
            </div>
          ))}
        </>
      )}

      {slide.type === "two_column" && (
        <>
          <h3 style={{ fontSize: "clamp(12px, 1.7vw, 20px)", fontWeight: 700, color: themeConfig.text, marginBottom: 10 }}>
            {editableTitle({ fontSize: "inherit", fontWeight: 700, color: themeConfig.text })}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
            <div>
              <p style={{ fontSize: "clamp(9px, 1.15vw, 13px)", fontWeight: 700, color: themeConfig.accent, marginBottom: 8 }}>
                {slide.leftHeader}
              </p>
              {(slide.leftBullets ?? []).map((b, i) => (
                <p key={i} style={{ fontSize: "clamp(8px, 1.05vw, 12px)", color: themeConfig.text, marginBottom: 4 }}>
                  · {b}
                </p>
              ))}
            </div>
            <div style={{ borderLeft: `1px dashed ${themeConfig.secondary}`, paddingLeft: 14 }}>
              <p style={{ fontSize: "clamp(9px, 1.15vw, 13px)", fontWeight: 700, color: themeConfig.accent, marginBottom: 8 }}>
                {slide.rightHeader}
              </p>
              {(slide.rightBullets ?? []).map((b, i) => (
                <p key={i} style={{ fontSize: "clamp(8px, 1.05vw, 12px)", color: themeConfig.text, marginBottom: 4 }}>
                  · {b}
                </p>
              ))}
            </div>
          </div>
        </>
      )}

      {slide.type === "quote" && (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <div style={{ fontSize: "clamp(40px, 7vw, 86px)", color: themeConfig.accent, lineHeight: 0.8, marginBottom: 10, fontWeight: 800 }}>&ldquo;</div>
          <p style={{ fontSize: "clamp(11px, 1.5vw, 18px)", fontStyle: "italic", color: themeConfig.text, maxWidth: "82%", lineHeight: 1.5 }}>
            {slide.quote}
          </p>
          {slide.attribution && (
            <p style={{ fontSize: "clamp(8px, 1.05vw, 13px)", color: themeConfig.secondary, marginTop: 10 }}>
              — {slide.attribution}
            </p>
          )}
        </div>
      )}

      {slide.type === "end" && (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <h2 style={{ fontSize: "clamp(15px, 2.4vw, 26px)", fontWeight: 800, color: themeConfig.text, marginBottom: 14 }}>
            {editableTitle({ fontSize: "inherit", fontWeight: 800, color: themeConfig.text })}
          </h2>
          {(slide.bullets ?? []).map((b, i) => (
            <p key={i} style={{ fontSize: "clamp(9px, 1.15vw, 14px)", color: themeConfig.secondary, marginBottom: 4 }}>
              ✓ {b}
            </p>
          ))}
        </div>
      )}

      {slide.type !== "title" && (
        <div style={{ position: "absolute", bottom: "4%", right: "4%", fontSize: "clamp(8px, 1vw, 11px)", color: themeConfig.secondary, opacity: 0.7 }}>
          {Number.isFinite(parseInt(slide.id, 10)) ? parseInt(slide.id, 10) : index + 1}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  SlideHUD + buttons                                         */
/* ─────────────────────────────────────────────────────────── */

function HudBtn({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors ${
        active ? "bg-cyan-300/15 text-cyan-200" : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SlideHUD({
  onRegen,
  onEdit,
  onAccent,
  editing,
}: {
  onRegen: () => void;
  onEdit: () => void;
  onAccent: () => void;
  editing: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      style={{ willChange: "opacity" }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/12 bg-black/65 px-1.5 py-1 backdrop-blur-md">
        <HudBtn
          icon={<Shuffle size={11} strokeWidth={1.8} />}
          label="Re-layout"
          onClick={(e) => {
            e.stopPropagation();
            onRegen();
          }}
        />
        <HudBtn
          icon={<Edit3 size={11} strokeWidth={1.8} />}
          label={editing ? "Done" : "Edit"}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          active={editing}
        />
        <HudBtn
          icon={<Palette size={11} strokeWidth={1.8} />}
          label="Accent"
          onClick={(e) => {
            e.stopPropagation();
            onAccent();
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  SlideFilmstrip — 3D horizontal carousel                    */
/* ─────────────────────────────────────────────────────────── */

function SlideFilmstrip({
  slides,
  activeIdx,
  onSelect,
  theme,
  editingId,
  onToggleEdit,
  onCycleLayout,
  onChangeSlide,
  onOpenAccent,
}: {
  slides: SlideData[];
  activeIdx: number;
  onSelect: (i: number) => void;
  theme: ThemeConfig;
  editingId: string | null;
  onToggleEdit: (id: string) => void;
  onCycleLayout: (i: number) => void;
  onChangeSlide: (i: number, next: SlideData) => void;
  onOpenAccent: () => void;
}) {
  return (
    <div className="relative" style={{ perspective: 1400 }}>
      <div className="flex items-center justify-center overflow-hidden">
        <motion.div
          className="flex items-center gap-4 py-4"
          animate={{ x: -activeIdx * 296 }}
          transition={{ type: "spring", stiffness: 220, damping: 30 }}
          style={{ willChange: "transform", transformStyle: "preserve-3d" }}
        >
          {slides.map((slide, i) => {
            const dist = i - activeIdx;
            const isActive = dist === 0;
            const isAdjacent = Math.abs(dist) === 1;
            const isVisible = Math.abs(dist) <= 2;
            return (
              <motion.div
                key={`${slide.id}-${i}`}
                onClick={() => onSelect(i)}
                animate={{
                  scale: isActive ? 1 : isAdjacent ? 0.9 : 0.84,
                  opacity: isActive ? 1 : isAdjacent ? 0.55 : 0.25,
                  rotateY: isActive ? 0 : dist > 0 ? -12 : 12,
                }}
                transition={{ type: "spring", stiffness: 220, damping: 30 }}
                whileHover={isActive ? { scale: 1.015 } : undefined}
                className="group relative flex-shrink-0 cursor-pointer"
                style={{
                  width: 280,
                  willChange: "transform",
                  transformStyle: "preserve-3d",
                  visibility: isVisible ? "visible" : "hidden",
                }}
              >
                <div
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl"
                  style={{
                    aspectRatio: "16 / 9",
                    boxShadow: isActive
                      ? "0 20px 50px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)"
                      : "0 10px 30px -16px rgba(0,0,0,0.65)",
                    willChange: "transform",
                  }}
                >
                  <SlidePreview
                    slide={slide}
                    themeConfig={theme}
                    index={i}
                    editing={editingId === slide.id}
                    onChange={(next) => onChangeSlide(i, next)}
                  />
                  {isActive && (
                    <SlideHUD
                      onRegen={() => onCycleLayout(i)}
                      onEdit={() => onToggleEdit(slide.id)}
                      onAccent={onOpenAccent}
                      editing={editingId === slide.id}
                    />
                  )}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span
                    className={`text-[10.5px] font-bold tabular-nums transition-colors ${
                      isActive ? "text-white" : "text-zinc-600"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`max-w-[200px] truncate text-[10.5px] transition-colors ${
                      isActive ? "text-zinc-300" : "text-zinc-700"
                    }`}
                  >
                    · {slide.title}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  PresentationOverlay — fullscreen mode with keyboard        */
/* ─────────────────────────────────────────────────────────── */

function PresentationOverlay({
  slides,
  index,
  setIndex,
  theme,
  onClose,
}: {
  slides: SlideData[];
  index: number;
  setIndex: (n: number) => void;
  theme: ThemeConfig;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIndex(Math.min(slides.length - 1, index + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex(Math.max(0, index - 1));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, slides.length, setIndex, onClose]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-6"
      style={{ willChange: "opacity" }}
    >
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-zinc-400">
        <span className="text-[11px] font-bold uppercase tracking-[0.28em]">Presentation Mode</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold tabular-nums text-zinc-300">
            {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Close presentation mode"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div
        className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/12 shadow-2xl"
        style={{ aspectRatio: "16 / 9", willChange: "transform" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`pres-${index}`}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{ willChange: "transform" }}
          >
            <SlidePreview slide={slide} themeConfig={theme} index={index} />
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => setIndex(Math.max(0, index - 1))}
        disabled={index === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.04] p-3 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:left-6"
        aria-label="Previous slide"
      >
        <ArrowLeft size={16} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={() => setIndex(Math.min(slides.length - 1, index + 1))}
        disabled={index === slides.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.04] p-3 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:right-6"
        aria-label="Next slide"
      >
        <ArrowRight size={16} strokeWidth={1.8} />
      </button>

      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10.5px] uppercase tracking-[0.28em] text-zinc-600">
        ← → arrow keys · Esc to exit
      </p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Page                                                       */
/* ─────────────────────────────────────────────────────────── */

export default function PresentationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  // form state
  const [sourceMode, setSourceMode] = useState<SourceMode>("notes");
  const [notesInput, setNotesInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [contextInput, setContextInput] = useState("");
  const [subject, setSubject] = useState("");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [slideCount, setSlideCount] = useState<SlideCountValue>(10);
  const [theme, setTheme] = useState<ThemeId>("academic");
  const [includeNotes, setIncludeNotes] = useState(true);

  // files-mode state
  const [savedNotes, setSavedNotes] = useState<NoteSummary[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState("");

  // generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [error, setError] = useState("");

  // UI overlays
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [accentPickerOpen, setAccentPickerOpen] = useState(false);
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [presentMode, setPresentMode] = useState(false);
  const [laserSweep, setLaserSweep] = useState(false);

  // auth gate
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/presentation");
    }
  }, [router, status]);

  // surface errors
  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  // load curriculum
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/curriculum?grade=11&limit=100");
        if (!response.ok) return;
        const data = (await response.json().catch(() => ({}))) as { courses?: CurriculumOption[] };
        setCurriculumOptions(data.courses ?? []);
      } catch {}
    })();
  }, []);

  // load saved notes on demand
  useEffect(() => {
    if (sourceMode !== "files" || savedNotes.length > 0) return;
    let cancelled = false;
    setNotesLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/notes?limit=100&sort=updated");
        const data = (await res.json().catch(() => ({}))) as { notes?: NoteSummary[] };
        if (!cancelled) setSavedNotes(data.notes ?? []);
      } catch {} finally {
        if (!cancelled) setNotesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceMode, savedNotes.length]);

  // arrow-key carousel nav (not in presentation mode)
  useEffect(() => {
    if (presentMode) return;
    const handler = (e: KeyboardEvent) => {
      if (!presentation) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setActiveSlide((s) => Math.min(presentation.slides.length - 1, s + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setActiveSlide((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentation, presentMode]);

  const wordCount = useMemo(() => {
    const trimmed = notesInput.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [notesInput]);

  const baseTheme = THEMES.find((t) => t.id === theme)?.config ?? THEMES[0]!.config;
  const liveTheme = effectiveTheme(baseTheme, accentOverride);

  const handleSelectSavedNote = useCallback(
    async (n: NoteSummary | null) => {
      if (!n) {
        setSelectedNoteId(null);
        return;
      }
      setSelectedNoteId(n.id);
      try {
        const res = await fetch(`/api/notes/${n.id}`);
        const data = (await res.json().catch(() => ({}))) as {
          note?: { content?: string };
        };
        if (data.note?.content) {
          setNotesInput(data.note.content);
          showToast(`Loaded "${n.title}"`, "success");
        }
      } catch {
        showToast("Couldn't load that note.", "error");
      }
    },
    [showToast],
  );

  const canGenerate = (() => {
    if (sourceMode === "prompt") return topicInput.trim().length > 0;
    return notesInput.trim().length > 0;
  })();

  const handleIgnite = () => {
    if (!canGenerate || isGenerating) return;
    setError("");
    setLaserSweep(true);
  };

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const isPrompt = sourceMode === "prompt";
      const input = isPrompt
        ? [topicInput.trim(), contextInput.trim()].filter(Boolean).join("\n\n")
        : notesInput;

      const response = await fetch("/api/presentation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          inputType: isPrompt ? "topic" : "notes",
          slideCount,
          style: theme,
          subject: subject.trim() || "General Study Topic",
          includeNotes,
          curriculumCode: curriculumCode || undefined,
        }),
      });

      const data = (await response.json()) as {
        presentation?: PresentationData;
        error?: string;
      };
      if (!response.ok || !data.presentation) {
        throw new Error(data.error ?? "Failed to generate presentation");
      }

      setPresentation({ ...data.presentation, includeNotes });
      setActiveSlide(0);
      setEditingSlideId(null);
      setAccentOverride(null);
      showToast("Presentation generated.", "success");

      fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "NOTE_GENERATED" }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate presentation");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    if (!presentation) return;
    setIsDownloading(true);
    setError("");
    try {
      const response = await fetch("/api/presentation/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentation: { ...presentation, includeNotes },
          theme: liveTheme,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to build PowerPoint file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (presentation.title || "kyvex_presentation").replace(/[^a-z0-9]/gi, "_");
      a.download = `${safeName}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download presentation");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSaveAsNote() {
    if (!presentation) return;
    const content = presentation.slides
      .map(
        (s, i) =>
          `## Slide ${i + 1}: ${s.title}\n\n` +
          (s.bullets ? `${s.bullets.map((b) => `- ${b}`).join("\n")}\n\n` : "") +
          (s.quote ? `> ${s.quote}\n\n` : "") +
          (s.notes ? `*Speaker notes: ${s.notes}*\n\n` : ""),
      )
      .join("\n");
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${presentation.title} (Presentation)`,
          content,
          format: "notes",
          tags: [subject.trim() || "Presentation", "Slides", "Kyvex"],
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save note");
      }
      showToast("Presentation saved to My Notes.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    }
  }

  const cycleLayoutOnSlide = (idx: number) => {
    if (!presentation) return;
    const slide = presentation.slides[idx];
    if (!slide) return;
    const next = cycleSlideLayout(slide);
    const slides = [...presentation.slides];
    slides[idx] = next;
    setPresentation({ ...presentation, slides });
    showToast(`Layout → ${next.type.replace("_", " ")}`, "info");
  };

  const updateSlide = (idx: number, next: SlideData) => {
    if (!presentation) return;
    const slides = [...presentation.slides];
    slides[idx] = next;
    setPresentation({ ...presentation, slides });
  };

  if (status === "loading") return <main className="min-h-screen bg-black" />;
  if (!session) return null;

  const totalSlides = presentation?.slides.length ?? 0;
  const activeSlideData = presentation?.slides[activeSlide] ?? null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
      {/* Faint ambient field */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 500px at 50% -10%, rgba(79,70,229,0.07), transparent 60%)," +
            "radial-gradient(700px 500px at 50% 110%, rgba(124,58,237,0.05), transparent 60%)",
        }}
      />

      <div className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-8 md:px-6 md:pt-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col items-start gap-2"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-400">
            <PresentationIcon size={12} strokeWidth={1.7} className="text-indigo-300/80" />
            Slide Studio
          </span>
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight md:text-[40px]">
            Compose. Choreograph. Present.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
            Three dials choose the source, the depth, and the visual theme. The deck builds itself.
          </p>
        </motion.header>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[28rem_minmax(0,1fr)]">
          {/* LEFT: Control Studio */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            style={{ willChange: "transform" }}
          >
            {/* breathing halo */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                boxShadow:
                  "inset 0 0 0 1px rgba(99,102,241,0.16), 0 0 36px -16px rgba(99,102,241,0.32)",
              }}
              animate={{ opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* laser wipe */}
            <AnimatePresence>
              {laserSweep && (
                <motion.div
                  key="laser"
                  aria-hidden
                  initial={{ top: 0, opacity: 0.95 }}
                  animate={{ top: "100%", opacity: [0.95, 0.95, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                  onAnimationComplete={() => {
                    setLaserSweep(false);
                    void handleGenerate();
                  }}
                  className="pointer-events-none absolute left-0 right-0 z-30"
                  style={{
                    height: 1,
                    background: "rgba(165,180,252,1)",
                    boxShadow:
                      "0 0 18px 2px rgba(99,102,241,0.9), 0 0 40px 4px rgba(124,58,237,0.55)",
                    willChange: "transform, top, opacity",
                  }}
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 flex flex-col gap-6">
              <Field
                label="Source File"
                hint={SOURCE_OPTIONS.find((s) => s.value === sourceMode)?.sub}
              >
                <CapsuleTrack
                  trackId="source"
                  options={SOURCE_OPTIONS}
                  value={sourceMode}
                  onChange={(v) => setSourceMode(v)}
                />
              </Field>

              <AnimatePresence mode="wait" initial={false}>
                {sourceMode === "notes" && (
                  <motion.div
                    key="m-notes"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <textarea
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      rows={7}
                      placeholder="Paste your notes here — Nova will structure them into slides…"
                      className="w-full rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-[13px] leading-relaxed text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20"
                    />
                    <p className="mt-1.5 text-right text-[10.5px] tabular-nums text-zinc-600">
                      {wordCount} words
                    </p>
                  </motion.div>
                )}

                {sourceMode === "files" && (
                  <motion.div
                    key="m-files"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <NotePickerList
                      notes={savedNotes}
                      loading={notesLoading}
                      selectedId={selectedNoteId}
                      onSelect={(n) => void handleSelectSavedNote(n)}
                      search={noteSearch}
                      setSearch={setNoteSearch}
                    />
                    {selectedNoteId && (
                      <p className="mt-2 truncate rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-1.5 text-[11px] text-cyan-200/90">
                        Source · loaded into editor ({wordCount} words)
                      </p>
                    )}
                  </motion.div>
                )}

                {sourceMode === "prompt" && (
                  <motion.div
                    key="m-prompt"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-2"
                  >
                    <input
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="e.g. The French Revolution, Photosynthesis…"
                      className="h-10 w-full rounded-2xl border border-white/[0.06] bg-black/30 px-4 text-[13px] text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20"
                    />
                    <textarea
                      value={contextInput}
                      onChange={(e) => setContextInput(e.target.value)}
                      rows={4}
                      placeholder="Additional context or points to include (optional)"
                      className="w-full rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-[13px] leading-relaxed text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field label="Slide Count" hint={`${slideCount} slides`}>
                <CapsuleTrack
                  trackId="count"
                  options={SLIDE_COUNT_OPTIONS.map((v) => ({
                    value: v,
                    label: String(v),
                    sub: v === 5 ? "Sprint" : v === 10 ? "Standard" : "Marathon",
                  }))}
                  value={slideCount}
                  onChange={(v) => setSlideCount(v)}
                />
              </Field>

              <Field label="Subject & Course" hint="optional">
                <div className="grid grid-cols-1 gap-2">
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Biology, History, Computer Science"
                    className="h-10 w-full rounded-2xl border border-white/[0.06] bg-black/30 px-4 text-[13px] text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20"
                  />
                  <div className="relative">
                    <select
                      value={curriculumCode}
                      onChange={(e) => setCurriculumCode(e.target.value)}
                      className="h-10 w-full appearance-none rounded-2xl border border-white/[0.06] bg-black/30 px-4 pr-9 text-[13px] text-white outline-none transition-colors focus:border-white/20"
                    >
                      <option value="" className="bg-black">
                        Ontario course (optional)
                      </option>
                      {curriculumOptions.map((c) => (
                        <option key={c.code} value={c.code} className="bg-black">
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                    <ChevronRight
                      size={12}
                      strokeWidth={1.7}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-zinc-500"
                    />
                  </div>
                </div>
              </Field>

              <Field label="Theme Deck" hint={THEMES.find((t) => t.id === theme)?.label}>
                <ThemeDeck value={theme} onChange={(id) => setTheme(id)} />
              </Field>

              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-[12.5px] font-bold text-white">Speaker notes</p>
                  <p className="text-[10.5px] text-zinc-500">
                    AI generates talking points per slide
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeNotes((v) => !v)}
                  aria-pressed={includeNotes}
                  className="relative h-6 w-11 rounded-full border border-white/10 transition-colors"
                  style={{
                    background: includeNotes
                      ? "rgba(99,102,241,0.45)"
                      : "rgba(255,255,255,0.04)",
                  }}
                >
                  <motion.span
                    aria-hidden
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow"
                    style={{
                      left: includeNotes ? 22 : 2,
                      willChange: "transform",
                    }}
                  />
                </button>
              </div>

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

              <IgnitionButton
                onClick={handleIgnite}
                loading={isGenerating || laserSweep}
                disabled={!canGenerate}
                label={
                  !canGenerate
                    ? sourceMode === "prompt"
                      ? "Enter a topic to ignite"
                      : "Add notes to ignite"
                    : "Generate Presentation"
                }
              />

              {isGenerating && (
                <p className="text-center text-[11px] text-zinc-500">
                  Usually takes 10-20 seconds.
                </p>
              )}
            </div>
          </motion.section>

          {/* RIGHT: Slide Canvas */}
          <section className="min-w-0">
            {!presentation && !isGenerating && <EmptyStage />}
            {isGenerating && <GeneratingStage />}

            {presentation && activeSlideData && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                {/* Deck header */}
                <div className="flex flex-wrap items-end justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                      Slide Deck
                    </p>
                    <h2 className="mt-1 truncate text-[22px] font-bold tracking-tight text-white">
                      {presentation.title}
                    </h2>
                    <p className="mt-1 truncate text-[11.5px] text-zinc-500">
                      {totalSlides} slides ·{" "}
                      <span className="text-zinc-300">
                        {THEMES.find((t) => t.id === theme)?.label}
                      </span>
                      {accentOverride && (
                        <span className="text-zinc-500">
                          {" · accent "}
                          <span style={{ color: accentOverride }}>●</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPresentMode(true)}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-white/[0.08]"
                    >
                      <Play size={13} strokeWidth={1.8} />
                      Start Presentation
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownload()}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} strokeWidth={1.8} />
                      )}
                      {isDownloading ? "Building…" : ".pptx"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveAsNote()}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-bold text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      <Save size={13} strokeWidth={1.8} />
                      Save as Note
                    </button>
                  </div>
                </div>

                {/* 3D Filmstrip */}
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.015] py-4 backdrop-blur-xl">
                  <SlideFilmstrip
                    slides={presentation.slides}
                    activeIdx={activeSlide}
                    onSelect={(i) => {
                      setActiveSlide(i);
                      if (editingSlideId) setEditingSlideId(null);
                    }}
                    theme={liveTheme}
                    editingId={editingSlideId}
                    onToggleEdit={(id) =>
                      setEditingSlideId((cur) => (cur === id ? null : id))
                    }
                    onCycleLayout={(i) => cycleLayoutOnSlide(i)}
                    onChangeSlide={(i, next) => updateSlide(i, next)}
                    onOpenAccent={() => setAccentPickerOpen(true)}
                  />

                  <div className="mt-2 flex items-center justify-center gap-2 px-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
                      disabled={activeSlide === 0}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft size={13} strokeWidth={1.8} />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {presentation.slides.map((s, i) => (
                        <button
                          key={`${s.id}-dot-${i}`}
                          type="button"
                          onClick={() => setActiveSlide(i)}
                          aria-label={`Go to slide ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            i === activeSlide
                              ? "w-6 bg-cyan-300"
                              : "w-1.5 bg-white/15 hover:bg-white/30"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlide((s) => Math.min(totalSlides - 1, s + 1))
                      }
                      disabled={activeSlide === totalSlides - 1}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Next slide"
                    >
                      <ChevronRight size={13} strokeWidth={1.8} />
                    </button>
                  </div>

                  <p className="text-center text-[10px] uppercase tracking-[0.22em] text-zinc-700">
                    ← → arrow keys · hover for controls
                  </p>
                </div>

                {includeNotes && activeSlideData.notes && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                      Speaker Notes · Slide {activeSlide + 1}
                    </p>
                    <p className="text-[13px] leading-relaxed text-zinc-300">
                      {activeSlideData.notes}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <RefreshCw size={11} strokeWidth={1.7} />
                  Regenerate with same settings
                </button>
              </motion.div>
            )}
          </section>
        </div>
      </div>

      {/* Accent picker modal */}
      <AnimatePresence>
        {accentPickerOpen && (
          <AccentPicker
            current={accentOverride ?? liveTheme.accent}
            onSelect={(c) => {
              setAccentOverride(c);
              setAccentPickerOpen(false);
              showToast("Accent updated.", "success");
            }}
            onClear={() => {
              setAccentOverride(null);
              setAccentPickerOpen(false);
            }}
            onClose={() => setAccentPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Presentation Mode */}
      <AnimatePresence>
        {presentMode && presentation && (
          <PresentationOverlay
            slides={presentation.slides}
            index={activeSlide}
            setIndex={(n) => setActiveSlide(n)}
            theme={liveTheme}
            onClose={() => setPresentMode(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
