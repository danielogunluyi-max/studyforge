"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, Maximize2, Minimize2, X, GripVertical } from "lucide-react";

export type PaneDescriptor = {
  /** A short id like "nova", "youtube", "notes", "flashcards" */
  key: string;
  /** Header label, e.g. "Nova AI" */
  label: string;
  /** Optional accent colour for badge / glow tint */
  accent?: string;
  /** Optional badge ("Source" / "Output" etc.) */
  badge?: string;
  /** The actual content node (an <iframe> or any React tree) */
  content: ReactNode;
};

type Props = {
  left: PaneDescriptor;
  right: PaneDescriptor;
  /** When true, the host page hides chrome and the view fills the screen */
  focusMode?: boolean;
  onToggleFocus?: () => void;
  onClose?: () => void;
  /** When provided, allows swapping panes from inside the component */
  onSwap?: () => void;
  /** localStorage key for persisting the split percentage */
  storageKey?: string;
};

const DEFAULT_LEFT_PERCENT = 50;
const MIN_PERCENT = 25;
const MAX_PERCENT = 75;

export default function SplitView({
  left,
  right,
  focusMode = false,
  onToggleFocus,
  onClose,
  onSwap,
  storageKey = "kyvex-splitview-default",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState<number>(DEFAULT_LEFT_PERCENT);
  const [dragging, setDragging] = useState(false);

  // hydrate persisted size
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const n = Number(saved);
        if (Number.isFinite(n) && n >= MIN_PERCENT && n <= MAX_PERCENT) setLeftPercent(n);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // persist on change (debounced via timeout)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, String(leftPercent));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [leftPercent, storageKey]);

  // drag handlers
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * 100;
    const clamped = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, pct));
    setLeftPercent(clamped);
  }, []);

  const stopDrag = useCallback(() => {
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDrag);
  }, [onPointerMove]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDrag);
    },
    [onPointerMove, stopDrag],
  );

  // ESC closes focus mode if a handler is provided
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onToggleFocus) onToggleFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, onToggleFocus]);

  // keyboard nudging on the handle
  const onHandleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setLeftPercent((p) => Math.max(MIN_PERCENT, p - 2));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setLeftPercent((p) => Math.min(MAX_PERCENT, p + 2));
    } else if (e.key === "Home") {
      e.preventDefault();
      setLeftPercent(50);
    }
  };

  return (
    <div
      className={`relative flex flex-col bg-gradient-to-b from-[#0a0e1f] via-[#0d1228] to-[#0a0e1f] text-white ${
        focusMode ? "fixed inset-0 z-[80] h-screen w-screen" : "h-full w-full"
      }`}
    >
      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/30 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="rounded-md bg-white/5 px-2 py-0.5 uppercase tracking-wider">Split View</span>
          {focusMode && (
            <span className="rounded-md bg-amber-300/20 px-2 py-0.5 uppercase tracking-wider text-amber-200">
              Focus Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onSwap && (
            <button
              type="button"
              onClick={onSwap}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
              aria-label="Swap panes"
              title="Swap panes"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
            </button>
          )}
          {onToggleFocus && (
            <button
              type="button"
              onClick={onToggleFocus}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
              aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
              title={focusMode ? "Exit focus mode (Esc)" : "Enter focus mode"}
            >
              {focusMode ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" /> Exit Focus
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" /> Focus Mode
                </>
              )}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/70 transition hover:bg-red-500/20 hover:text-red-200"
              aria-label="Close split view"
              title="Close split view"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Panels */}
      <div ref={containerRef} className="relative flex flex-1 overflow-hidden">
        <div className="h-full overflow-hidden" style={{ width: `${leftPercent}%` }}>
          <PaneShell pane={left} />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={MIN_PERCENT}
          aria-valuemax={MAX_PERCENT}
          aria-valuenow={Math.round(leftPercent)}
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={onHandleKeyDown}
          className="group relative flex w-1.5 shrink-0 cursor-col-resize items-center justify-center outline-none"
          style={{ touchAction: "none" }}
        >
          <div
            className={`h-full w-[3px] rounded-full transition-all duration-200 ${
              dragging
                ? "bg-gradient-to-b from-amber-300 via-teal-300 to-amber-300 opacity-100 shadow-[0_0_28px_rgba(45,212,191,0.85)]"
                : "bg-gradient-to-b from-amber-300/40 via-teal-300/40 to-amber-300/40 opacity-50 group-hover:opacity-100 group-hover:shadow-[0_0_18px_rgba(251,191,36,0.55)] group-focus-visible:opacity-100 group-focus-visible:shadow-[0_0_18px_rgba(251,191,36,0.55)]"
            }`}
            aria-hidden="true"
          />
          <div
            className={`absolute left-1/2 top-1/2 flex h-12 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-md transition ${
              dragging
                ? "bg-teal-300/20 text-teal-100 ring-teal-300/60"
                : "text-white/40 group-hover:bg-amber-300/15 group-hover:text-amber-200 group-hover:ring-amber-300/40"
            }`}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="h-full flex-1 overflow-hidden">
          <PaneShell pane={right} />
        </div>
      </div>
    </div>
  );
}

function PaneShell({ pane }: { pane: PaneDescriptor }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-black/20 px-3 py-1.5 text-xs text-white/55 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          {pane.badge && (
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
              style={{
                backgroundColor: pane.accent ? `${pane.accent}20` : "rgba(255,255,255,0.06)",
                color: pane.accent ?? "rgba(255,255,255,0.55)",
              }}
            >
              {pane.badge}
            </span>
          )}
          <span className="truncate font-semibold text-white/85">{pane.label}</span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-[#0a0e1f]">{pane.content}</div>
    </div>
  );
}
