"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, MonitorPlay, StickyNote, Layers } from "lucide-react";
import SplitView, { type PaneDescriptor } from "~/app/_components/SplitView";

type ToolKey = "nova" | "youtube" | "notes" | "flashcards" | "mock-exam";

type ToolDef = {
  key: ToolKey;
  label: string;
  accent: string;
  icon: typeof Sparkles;
  /** Build the iframe path. Some tools take query params (e.g. noteId). */
  buildSrc: (params: { noteId?: string | null }) => string;
};

function withEmbed(path: string): string {
  return path.includes("?") ? `${path}&embed=1` : `${path}?embed=1`;
}

const TOOLS: Record<ToolKey, ToolDef> = {
  nova: {
    key: "nova",
    label: "Nova AI",
    accent: "#2dd4bf",
    icon: Sparkles,
    buildSrc: () => withEmbed("/tutor"),
  },
  youtube: {
    key: "youtube",
    label: "YouTube Import",
    accent: "#ef4444",
    icon: MonitorPlay,
    buildSrc: () => withEmbed("/import/youtube"),
  },
  notes: {
    key: "notes",
    label: "My Notes",
    accent: "#f0b429",
    icon: StickyNote,
    buildSrc: ({ noteId }) =>
      withEmbed(noteId ? `/my-notes?open=${encodeURIComponent(noteId)}` : "/my-notes"),
  },
  flashcards: {
    key: "flashcards",
    label: "Flashcards",
    accent: "#8b5cf6",
    icon: Layers,
    buildSrc: ({ noteId }) =>
      withEmbed(noteId ? `/flashcards?generateFrom=${encodeURIComponent(noteId)}` : "/flashcards"),
  },
  "mock-exam": {
    key: "mock-exam",
    label: "Mock Exam",
    accent: "#34d399",
    icon: Sparkles,
    buildSrc: () => withEmbed("/mock-exam"),
  },
};

function isToolKey(v: string | null): v is ToolKey {
  return !!v && v in TOOLS;
}

function SplitPageInner() {
  const router = useRouter();
  const search = useSearchParams();

  const initialLeft = isToolKey(search?.get("left") ?? null) ? (search.get("left") as ToolKey) : "nova";
  const initialRight = isToolKey(search?.get("right") ?? null) ? (search.get("right") as ToolKey) : "notes";
  const noteId = search?.get("noteId") ?? null;

  const [leftKey, setLeftKey] = useState<ToolKey>(initialLeft);
  const [rightKey, setRightKey] = useState<ToolKey>(initialRight);
  const [focusMode, setFocusMode] = useState<boolean>(search?.get("focus") === "1");

  // Sync URL when selections change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("left", leftKey);
    params.set("right", rightKey);
    if (noteId) params.set("noteId", noteId);
    if (focusMode) params.set("focus", "1");
    const qs = params.toString();
    window.history.replaceState(null, "", `/split?${qs}`);
  }, [leftKey, rightKey, focusMode, noteId]);

  // Hide/show the app sidebar via a body class so the host shell can react
  useEffect(() => {
    document.body.classList.toggle("kyvex-focus-mode", focusMode);
    return () => document.body.classList.remove("kyvex-focus-mode");
  }, [focusMode]);

  const left = useMemo<PaneDescriptor>(() => buildPane(leftKey, "Source", noteId), [leftKey, noteId]);
  const right = useMemo<PaneDescriptor>(() => buildPane(rightKey, "Output", noteId), [rightKey, noteId]);

  const swap = () => {
    setLeftKey(rightKey);
    setRightKey(leftKey);
  };

  return (
    <div className={focusMode ? "h-screen w-screen" : "flex h-[calc(100vh-3.5rem)] w-full flex-col"}>
      {!focusMode && (
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl">
          <h1 className="text-base font-bold text-white">Split View</h1>
          <ToolPicker label="Left" value={leftKey} onChange={setLeftKey} disabled={rightKey} />
          <ToolPicker label="Right" value={rightKey} onChange={setRightKey} disabled={leftKey} />
          <button
            onClick={() => router.push("/dashboard")}
            className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>
      )}
      <div className="flex-1">
        <SplitView
          left={left}
          right={right}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((v) => !v)}
          onSwap={swap}
          onClose={() => router.push("/dashboard")}
          storageKey={`kyvex-split-${leftKey}-${rightKey}`}
        />
      </div>
    </div>
  );
}

function buildPane(key: ToolKey, badge: string, noteId: string | null): PaneDescriptor {
  const tool = TOOLS[key];
  const src = tool.buildSrc({ noteId });
  return {
    key: tool.key,
    label: tool.label,
    accent: tool.accent,
    badge,
    content: (
      <iframe
        src={src}
        title={tool.label}
        className="h-full w-full border-0 bg-[#0a0e1f]"
        allow="clipboard-read; clipboard-write; camera; microphone"
      />
    ),
  };
}

function ToolPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: ToolKey;
  onChange: (v: ToolKey) => void;
  disabled: ToolKey;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-white/60">
      <span className="uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ToolKey)}
        className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white outline-none focus:border-amber-300/50"
      >
        {Object.values(TOOLS).map((t) => (
          <option key={t.key} value={t.key} disabled={t.key === disabled} className="bg-[#0d1228]">
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SplitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[#0a0e1f] text-white/60">
          Loading split view…
        </div>
      }
    >
      <SplitPageInner />
    </Suspense>
  );
}
