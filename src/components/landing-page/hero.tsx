"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

const WORDS = [
  "a mock exam.",
  "flashcards.",
  "structured notes.",
  "a plan that sticks.",
] as const;

const SUB_COPY =
  "Photograph a page in Inbox. Kyvex turns it into notes, flashcards, a 15-minute mock, and a Nova review — the same loop you use in the app.";

const STAGES = [
  {
    id: "PHOTO",
    rail: "Inbox",
    meta: "PHOTO",
    crumb: "worksheet photo → notes",
    headline: "Photograph the worksheet. Inbox files it.",
    reply: "Notes land in My Notes — then cards, a mock, and Nova on what you missed.",
  },
  {
    id: "NOTES",
    rail: "My Notes",
    meta: "NOTES",
    crumb: "photosynthesis — light reactions",
    headline: "Structured notes landed in My Notes.",
    reply: "Open them anytime. Same note feeds flashcards and the mock.",
  },
  {
    id: "CARDS",
    rail: "Flashcards",
    meta: "CARDS",
    crumb: "photosynthesis — 20 cards",
    headline: "Twenty cards ready. First pass, not a cap.",
    reply: "Spaced repetition on the worksheet you just photographed.",
  },
  {
    id: "MOCK",
    rail: "Mock Exam",
    meta: "MOCK",
    crumb: "unit 3 mock · q3 of 10",
    headline: "Fifteen minutes. Timed. Honest grading.",
    reply: "A real check — not a confidence quiz you can game.",
  },
  {
    id: "NOVA",
    rail: "Nova",
    meta: "NOVA",
    crumb: "why I missed q6",
    headline: "Nova sits with you on every miss.",
    reply: "Walk the miss. Fix the gap. Back into the loop.",
  },
] as const;

const RAIL_META: Record<string, string> = {
  Inbox: "now",
  Flashcards: "20",
  "Mock Exam": "15m",
};

function Word({ children, delay }: { children: string; delay: string }) {
  return (
    <span className="w">
      <span style={{ animationDelay: delay }}>{children}</span>
    </span>
  );
}

/** Pad-2 stage index: ticks 00→current once on enter, then tracks the living demo. */
function StageCaptionNum({ stage }: { stage: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const stageRef = useRef(stage);
  const [n, setN] = useState(0);
  const [locked, setLocked] = useState(false);
  const target = stage + 1;
  stageRef.current = stage;

  useEffect(() => {
    if (locked) setN(target);
  }, [locked, target]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(stageRef.current + 1);
      setLocked(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const dest = stageRef.current + 1;
        const start = performance.now();
        const from = 0;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / 600);
          const eased = 1 - (1 - t) ** 3;
          setN(from + (dest - from) * eased);
          if (t < 1) requestAnimationFrame(step);
          else {
            setN(dest);
            setLocked(true);
          }
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const shown = String(Math.round(n)).padStart(2, "0");
  const label = String(target).padStart(2, "0");

  return (
    <span ref={ref} className="hero-stage-num kv-tick" aria-label={label}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

function LivingDemo() {
  const [stage, setStage] = useState(0);
  const pausedRef = useRef(false);
  const resumeAtRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let intervalId = 0;
    const advance = () => {
      if (pausedRef.current) return;
      if (Date.now() < resumeAtRef.current) return;
      setStage((s) => (s + 1) % STAGES.length);
    };
    const first = window.setTimeout(() => {
      advance();
      intervalId = window.setInterval(advance, 3200);
    }, 1800);
    return () => {
      clearTimeout(first);
      clearInterval(intervalId);
    };
  }, []);

  const current = STAGES[stage]!;

  function jumpTo(index: number) {
    setStage(index);
    resumeAtRef.current = Date.now() + 8000;
  }

  return (
    <div className="hero-demo-wrap">
      <div
        className="studio-window hero-inbox-frame hero-parallax-demo"
        aria-label="Kyvex study loop preview"
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
      >
        <div className="window-bar">
          <div className="window-dots">
            <span />
            <span />
            <span />
          </div>
          <span>kyvex / {current.rail.toLowerCase()}</span>
          <span className="window-meta">{current.meta}</span>
        </div>
        <div className="studio-body">
          <div className="thread-side" role="tablist" aria-label="Loop tools">
            <div className="thread-label">YOUR TOOLS</div>
            {STAGES.map((item, index) => {
              const active = index === stage;
              return (
                <button
                  key={item.rail}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "thread-item current" : "thread-item"}
                  onClick={() => jumpTo(index)}
                >
                  <span className="thread-icon">{active ? "◈" : "◌"}</span>
                  <span>{item.rail}</span>
                  {RAIL_META[item.rail] ? <small>{RAIL_META[item.rail]}</small> : null}
                </button>
              );
            })}
            <Link href="/register" className="new-thread">
              + open Inbox
            </Link>
          </div>
          <div className="chat-area">
            <div className="chat-top">
              <span>
                open / <b>{current.crumb}</b>
              </span>
              <span>
                loop <i>●</i>
              </span>
            </div>
            <div key={stage} className="hero-pane-copy">
              <div className="chat-message user-message">{current.headline}</div>
              <div className="ai-message">
                <div className="ai-avatar">K</div>
                <div>
                  <span className="ai-label">KYVEX / LOOP</span>
                  <p>{current.reply}</p>
                  <div className="related-links">
                    {STAGES.map((item) => (
                      <span key={item.rail}>{item.rail}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="kv-meta hero-frame-hint">Interactive — click a tool</p>
      <div className="hero-caption">
        <span>
          <StageCaptionNum stage={stage} />
          {" — INBOX → NOTES → CARDS → MOCK → NOVA"}
        </span>
        <span>SCROLL TO EXPLORE ↓</span>
      </div>
    </div>
  );
}

function SerifCycle() {
  const [index, setIndex] = useState(0);
  const [out, setOut] = useState(false);
  const phrase = WORDS[index] ?? WORDS[0];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setOut(true);
      window.setTimeout(() => {
        setIndex((v) => (v + 1) % WORDS.length);
        setOut(false);
      }, 450);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <em key={index} className={out ? "kv-cycle out" : "kv-cycle"} aria-label={phrase}>
      <span aria-hidden="true">{phrase}</span>
    </em>
  );
}

function SubIllumination() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [tokens, setTokens] = useState<string[] | null>(null);
  const [lit, setLit] = useState<boolean[]>([]);

  useEffect(() => {
    const parts = SUB_COPY.split(/\s+/).filter(Boolean);
    setTokens(parts);
    setLit(parts.map(() => false));
  }, []);

  useEffect(() => {
    if (!tokens || !ref.current) return;
    const root = ref.current;
    root.classList.add("js-illum");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLit(tokens.map(() => true));
      return;
    }

    const spans = root.querySelectorAll<HTMLSpanElement>("[data-illum]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.illum);
          if (Number.isNaN(idx)) continue;
          window.setTimeout(() => {
            setLit((prev) => {
              if (prev[idx]) return prev;
              const next = [...prev];
              next[idx] = true;
              return next;
            });
          }, idx * 40);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px -10% 0px" },
    );
    spans.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [tokens]);

  if (!tokens) {
    return (
      <p ref={ref} className="hero-subcopy">
        {SUB_COPY}
      </p>
    );
  }

  return (
    <p ref={ref} className="hero-subcopy js-illum">
      {tokens.map((word, i) => (
        <span key={`${word}-${i}`} data-illum={i} className={lit[i] ? "on" : undefined}>
          {word}
          {i < tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyeLineRef = useRef<HTMLSpanElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);

  // 11pm edition — DOM-only after mount (no React state; first paint matches SSR).
  useEffect(() => {
    const node = eyebrowRef.current;
    if (!node) return;
    if (new Date().getHours() !== 23) return;
    const span = document.createElement("span");
    span.className = "time-whisper";
    span.textContent = " · the 11pm edition";
    node.appendChild(span);
    return () => span.remove();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const demo = section.querySelector<HTMLElement>(".hero-parallax-demo");
    const eye = eyeLineRef.current;
    if (!demo || !eye) return;

    let raf = 0;
    let running = true;
    let curDemo = 0;
    let curEye = 0;
    let tgtDemo = 0;
    let tgtEye = 0;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const progress = (window.innerHeight / 2 - mid) / window.innerHeight;
      tgtDemo = Math.max(-14, Math.min(14, progress * 28));
      tgtEye = Math.max(-6, Math.min(6, -progress * 12));
    };

    const tick = () => {
      if (!running) return;
      curDemo += (tgtDemo - curDemo) * 0.12;
      curEye += (tgtEye - curEye) * 0.12;
      if (Math.abs(curDemo - tgtDemo) < 0.05) curDemo = tgtDemo;
      if (Math.abs(curEye - tgtEye) < 0.05) curEye = tgtEye;
      demo.style.setProperty("--parallax-y", `${curDemo.toFixed(2)}px`);
      eye.style.setProperty("--parallax-y", `${curEye.toFixed(2)}px`);
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => measure();
    measure();
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      demo.style.removeProperty("--parallax-y");
      eye.style.removeProperty("--parallax-y");
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero section-grid" id="top">
      <div className="hero-copy">
        <div className="eyebrow" ref={eyebrowRef}>
          <span ref={eyeLineRef} className="eyebrow-line hero-parallax-eye" /> the study loop that
          actually ships
        </div>
        <h1 className="landing-h landing-h-hero">
          <span className="block">
            <Word delay="0s">From</Word> <Word delay="0.05s">a</Word>{" "}
            <Word delay="0.1s">worksheet</Word>
          </span>
          <span className="block">
            <Word delay="0.15s">to</Word> <SerifCycle />
          </span>
        </h1>
        <SubIllumination />
        <div className="hero-actions">
          <Link href="/register" className="lime-button">
            Begin <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <a href="#how-it-works" className="ghost-button">
            <Play size={14} /> See how it works
          </a>
        </div>
        <div className="micro-proof">
          <span className="proof-mark">K</span>
          <span>
            Built in Toronto <b>·</b> Ontario Grade 11–12
          </span>
        </div>
      </div>
      <div className="hero-visual">
        <LivingDemo />
      </div>
    </section>
  );
}
