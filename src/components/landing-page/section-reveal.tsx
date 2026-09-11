"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Once-only fade-up for section blocks. Visible without JS. */
export function SectionReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("js-reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in");
      return;
    }

    const parent = el.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((node) =>
        node.classList.contains("section-reveal"),
      );
      const idx = Math.max(0, siblings.indexOf(el));
      const delay = Math.min(idx, 2) * 80;
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.classList.add("in");
        io.disconnect();
      },
      { rootMargin: "0px 0px -12px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="section-reveal">
      {children}
    </div>
  );
}
