"use client";

import { useEffect, useRef, useState } from "react";

type TickUpProps = {
  to: number;
  /** Left-pad width (e.g. 2 → "01"). */
  pad?: number;
  className?: string;
  /** Suffix rendered after the number (not animated). */
  suffix?: string;
};

/**
 * Counts 0 → `to` once on viewport enter (600ms).
 * First paint is 0 (server + client) so hydration stays matched;
 * final value is exposed via aria-label.
 */
export function TickUp({ to, pad = 0, className, suffix = "" }: TickUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || doneRef.current) return;

    const format = (v: number) => {
      const rounded = Math.round(v);
      return pad > 0 ? String(rounded).padStart(pad, "0") : String(rounded);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current = true;
      setN(to);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || doneRef.current) return;
        doneRef.current = true;
        io.disconnect();

        const start = performance.now();
        const duration = 600;
        const from = 0;

        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // ease-out cubic
          const eased = 1 - (1 - t) ** 3;
          setN(from + (to - from) * eased);
          if (t < 1) requestAnimationFrame(step);
          else setN(to);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, pad]);

  const shown = pad > 0 ? String(Math.round(n)).padStart(pad, "0") : String(Math.round(n));
  const label = pad > 0 ? String(to).padStart(pad, "0") : String(to);
  const widthCh = Math.max(String(to).length, pad);

  return (
    <span className={className} aria-label={`${label}${suffix}`}>
      <span
        ref={ref}
        className="kv-tick"
        aria-hidden="true"
        style={{ minWidth: `${widthCh}ch` }}
      >
        {shown}
      </span>
      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
    </span>
  );
}
