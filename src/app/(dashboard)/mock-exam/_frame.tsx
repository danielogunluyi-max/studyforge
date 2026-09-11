"use client";

import { useEffect, useState, type ReactNode } from "react";

function FrameTimer({
  staticTimer,
  liveTimer,
}: {
  staticTimer?: string;
  liveTimer?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!staticTimer && liveTimer == null) return null;

  const showLive = mounted && liveTimer != null;
  return (
    <span
      className="timer num"
      aria-live="polite"
      style={showLive ? { color: "var(--kv-accent-text)" } : undefined}
    >
      {showLive ? liveTimer : staticTimer}
    </span>
  );
}

export function MockExamFrame({
  children,
  meta,
  staticTimer,
  liveTimer,
}: {
  children: ReactNode;
  meta: string;
  staticTimer?: string;
  liveTimer?: string | null;
}) {
  return (
    <main className="mx-auto w-full max-w-[860px] px-4 py-8">
      <div className="kv-crumb">Kyvex / <b>Mock Exam</b></div>

      <div
        className="mt-5 border"
        style={{
          borderColor: "var(--border-default)",
          borderRadius: "var(--kv-radius)",
          background: "var(--bg-card)",
          boxShadow: "none",
        }}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <i key={i} className="frame-dot" />
            ))}
          </div>
          <span className="kv-meta mx-auto">{meta}</span>
          <FrameTimer staticTimer={staticTimer} liveTimer={liveTimer} />
        </div>

        {children}
      </div>
    </main>
  );
}

export function examFrameMeta(questionCount: number, minutes: number): string {
  return `Kyvex / Mock exam — ${questionCount} questions · ${minutes} min`;
}
