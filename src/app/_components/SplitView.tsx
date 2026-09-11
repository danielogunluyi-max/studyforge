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
      className={`relative flex flex-col ${
        focusMode ? "fixed inset-0 z-[80] h-screen w-screen" : "h-full w-full"
      }`}
      style={{ background: "var(--bg-base)", color: "var(--kv-text-primary)" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: "1px solid var(--border-default)", padding: "8px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="kv-meta">Split View</span>
          {focusMode ? <span className="kv-chip">Focus</span> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onSwap && (
            <button
              type="button"
              onClick={onSwap}
              className="kv-btn-ghost"
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
              className="kv-btn-ghost"
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
              className="kv-btn-ghost"
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
          style={{ touchAction: "none", borderLeft: "1px solid var(--border-default)", borderRight: "1px solid var(--border-default)", background: dragging ? "var(--bg-hover)" : "var(--bg-elevated)" }}
        >
          <GripVertical className="h-3.5 w-3.5" style={{ color: "var(--kv-text-tertiary)" }} />
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
      <div className="flex items-center justify-between gap-2" style={{ borderBottom: "1px solid var(--border-default)", padding: "6px 12px" }}>
        <div className="flex min-w-0 items-center gap-2">
          {pane.badge ? <span className="kv-chip">{pane.badge}</span> : null}
          <span className="kv-meta" style={{ textTransform: "none", letterSpacing: 0 }}>{pane.label}</span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden" style={{ background: "var(--bg-base)" }}>{pane.content}</div>
    </div>
  );
}
