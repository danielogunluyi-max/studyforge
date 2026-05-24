"use client";

/**
 * Genesis Welcome Tour
 * --------------------
 * Premium "Midnight Glass" first-run walkthrough.
 *
 * - bg-black/72 screen filter with a precise aperture cut around target DOM nodes
 * - Compact glass step-card slides into focus beside the spotlight
 * - Skip / Back / Next-Step toggles, ESC + arrow-key support
 * - Re-launchable via window.dispatchEvent(new Event("kyvex-launch-tour"))
 * - Hardware-accelerated only: transform / opacity / scale + will-change
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Compass,
  Layers,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";

const STORAGE_KEY = "kyvex-onboarded";

type StepSide = "right" | "bottom" | "left" | "top";

type TourStep = {
  id: string;
  badge: string;
  title: string;
  body: string;
  selector?: string;
  preferredSide?: StepSide;
  icon: ReactNode;
  cta?: { label: string; href: string };
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    badge: "01 · Genesis",
    title: "Welcome to your Kyvex workspace.",
    body: "A 30-second tour through the studio. Three rooms — sidebar, dashboard, customization. Glide through, then dive in.",
    icon: <Compass size={14} strokeWidth={1.7} />,
  },
  {
    id: "sidebar",
    badge: "02 · Navigator",
    title: "The sidebar holds every tool.",
    body: "Hover to expand, pin favourites, or switch the entire layout from Settings → Workspace. The command palette is just ⌘K away.",
    selector: '[data-tour="sidebar"]',
    preferredSide: "right",
    icon: <Layers size={14} strokeWidth={1.7} />,
  },
  {
    id: "dashboard",
    badge: "03 · Pulse",
    title: "Your daily learning pulse.",
    body: "Streak, mastery score, focus minutes, and Nova's daily prompt land here every morning. Glance once, dive in twice.",
    selector: '[data-tour="dashboard"]',
    preferredSide: "bottom",
    icon: <Sparkles size={14} strokeWidth={1.7} />,
    cta: { label: "Open dashboard", href: "/dashboard" },
  },
  {
    id: "customization",
    badge: "04 · Studio",
    title: "Make it yours.",
    body: "Toggle features on or off, change navigation, tune the look. Kyvex re-shapes around you in real time.",
    selector: '[data-tour="customization"]',
    preferredSide: "left",
    icon: <Sliders size={14} strokeWidth={1.7} />,
    cta: { label: "Open customization", href: "/settings?tab=workspace" },
  },
];

type Rect = { x: number; y: number; width: number; height: number };

const APERTURE_PADDING = 14;
const CARD_WIDTH = 340;
const CARD_HEIGHT_EST = 260;
const CARD_GAP = 18;

export default function OnboardingTour() {
  const { status } = useSession();
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const step = STEPS[stepIdx]!;

  /* ── auto-open on first authenticated session ── */
  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {}
  }, [status]);

  /* ── manual launch from anywhere ── */
  useEffect(() => {
    const launch = () => {
      setStepIdx(0);
      setVisible(true);
    };
    window.addEventListener("kyvex-launch-tour", launch);
    return () => window.removeEventListener("kyvex-launch-tour", launch);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }, []);

  const next = useCallback(() => {
    setStepIdx((s) => {
      if (s < STEPS.length - 1) return s + 1;
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      setVisible(false);
      return s;
    });
  }, []);

  const prev = useCallback(() => setStepIdx((s) => Math.max(0, s - 1)), []);

  /* ── measure target on visible / step / resize / scroll ── */
  useLayoutEffect(() => {
    if (!visible) return;

    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ w, h });

      if (!step.selector) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector(step.selector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      // Skip degenerate / hidden elements
      if (r.width < 8 || r.height < 8) {
        setTargetRect(null);
        return;
      }
      setTargetRect({ x: r.left, y: r.top, width: r.width, height: r.height });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const id = window.setInterval(measure, 600); // re-poll for late-mounting targets
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(id);
    };
  }, [visible, stepIdx, step.selector]);

  /* ── keyboard nav ── */
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, dismiss, next, prev]);

  if (!visible) return null;

  const cardPos = computeCardPosition(
    targetRect,
    step.preferredSide ?? "bottom",
    viewport,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      className="font-sans text-white antialiased"
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
    >
      {/* Spotlight aperture */}
      <Spotlight rect={targetRect} viewport={viewport} onBackdrop={dismiss} />

      {/* Step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, ...slideOffset(step.preferredSide, 1) }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...slideOffset(step.preferredSide, -1) }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          style={{
            position: "fixed",
            top: cardPos.top,
            left: cardPos.left,
            width: CARD_WIDTH,
            willChange: "transform, opacity",
          }}
          className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
        >
          {/* Top: badge + close */}
          <div className="mb-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
              {step.icon}
              {step.badge}
            </div>
            <button
              onClick={dismiss}
              aria-label="Skip tour"
              className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <X size={11} strokeWidth={1.8} />
            </button>
          </div>

          <h3 className="text-[17px] font-bold leading-snug tracking-tight text-white">
            {step.title}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
            {step.body}
          </p>

          {step.cta && (
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(STORAGE_KEY, "1");
                } catch {}
                setVisible(false);
                router.push(step.cta!.href);
              }}
              className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/90 transition-colors hover:bg-white/[0.08]"
            >
              {step.cta.label}
              <ChevronRight size={11} strokeWidth={1.8} />
            </button>
          )}

          {/* Progress dots */}
          <div className="mt-5 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 rounded-full transition-all duration-200 ${
                  i === stepIdx ? "w-6 bg-cyan-300" : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>

          {/* Footer buttons */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={dismiss}
              className="text-[12px] font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  Back
                </button>
              )}
              <motion.button
                type="button"
                onClick={next}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
                className="inline-flex items-center gap-1 rounded-xl px-4 py-1.5 text-[12px] font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #0e7490 0%, #14b8a6 50%, #06b6d4 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(34,211,238,0.3) inset, 0 12px 30px -10px rgba(20,184,166,0.4)",
                  willChange: "transform",
                }}
              >
                {stepIdx === STEPS.length - 1 ? "Finish" : "Next step"}
                <ChevronRight size={12} strokeWidth={2} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Spotlight — 4-rect aperture cutout (GPU-friendly)          */
/* ─────────────────────────────────────────────────────────── */

function Spotlight({
  rect,
  viewport,
  onBackdrop,
}: {
  rect: Rect | null;
  viewport: { w: number; h: number };
  onBackdrop: () => void;
}) {
  // No target → simple full-screen dim
  if (!rect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        onClick={onBackdrop}
        className="absolute inset-0 cursor-pointer bg-black/72"
        style={{ willChange: "opacity" }}
      />
    );
  }

  const x = Math.max(0, rect.x - APERTURE_PADDING);
  const y = Math.max(0, rect.y - APERTURE_PADDING);
  const w = Math.min(viewport.w - x, rect.width + APERTURE_PADDING * 2);
  const h = Math.min(viewport.h - y, rect.height + APERTURE_PADDING * 2);

  const dimStyle: React.CSSProperties = {
    position: "absolute",
    background: "rgba(0,0,0,0.72)",
    willChange: "opacity",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ position: "absolute", inset: 0, willChange: "opacity" }}
    >
      {/* Top */}
      <div onClick={onBackdrop} style={{ ...dimStyle, left: 0, top: 0, right: 0, height: y }} />
      {/* Bottom */}
      <div
        onClick={onBackdrop}
        style={{ ...dimStyle, left: 0, top: y + h, right: 0, bottom: 0 }}
      />
      {/* Left */}
      <div onClick={onBackdrop} style={{ ...dimStyle, left: 0, top: y, width: x, height: h }} />
      {/* Right */}
      <div
        onClick={onBackdrop}
        style={{ ...dimStyle, left: x + w, top: y, right: 0, height: h }}
      />

      {/* Aperture ring (decorative, no pointer events) */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: 14,
          boxShadow:
            "0 0 0 1px rgba(34,211,238,0.55) inset, 0 0 0 4px rgba(34,211,238,0.10), 0 0 60px -10px rgba(34,211,238,0.55)",
          pointerEvents: "none",
          willChange: "transform",
        }}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Card position helpers                                      */
/* ─────────────────────────────────────────────────────────── */

function computeCardPosition(
  rect: Rect | null,
  side: StepSide,
  viewport: { w: number; h: number },
): { top: number; left: number } {
  if (!rect) {
    return {
      top: Math.max(40, viewport.h / 2 - CARD_HEIGHT_EST / 2),
      left: Math.max(20, viewport.w / 2 - CARD_WIDTH / 2),
    };
  }

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const tryPlace = (s: StepSide): { top: number; left: number } => {
    if (s === "right") {
      return {
        left: rect.x + rect.width + CARD_GAP,
        top: cy - CARD_HEIGHT_EST / 2,
      };
    }
    if (s === "left") {
      return {
        left: rect.x - CARD_WIDTH - CARD_GAP,
        top: cy - CARD_HEIGHT_EST / 2,
      };
    }
    if (s === "bottom") {
      return {
        left: cx - CARD_WIDTH / 2,
        top: rect.y + rect.height + CARD_GAP,
      };
    }
    return {
      left: cx - CARD_WIDTH / 2,
      top: rect.y - CARD_GAP - CARD_HEIGHT_EST,
    };
  };

  let pos = tryPlace(side);

  // Auto-flip if overflowing
  const right = pos.left + CARD_WIDTH;
  const bottom = pos.top + CARD_HEIGHT_EST;
  if (right > viewport.w - 16 && side === "right") pos = tryPlace("left");
  if (pos.left < 16 && side === "left") pos = tryPlace("right");
  if (bottom > viewport.h - 16 && side === "bottom") pos = tryPlace("top");
  if (pos.top < 16 && side === "top") pos = tryPlace("bottom");

  // Final clamp
  pos.left = Math.max(16, Math.min(pos.left, viewport.w - CARD_WIDTH - 16));
  pos.top = Math.max(16, Math.min(pos.top, viewport.h - CARD_HEIGHT_EST - 16));
  return pos;
}

function slideOffset(side: StepSide | undefined, dir = 1) {
  if (!side) return { y: 12 * dir };
  if (side === "right") return { x: 12 * dir };
  if (side === "left") return { x: -12 * dir };
  if (side === "top") return { y: -12 * dir };
  return { y: 12 * dir };
}
