"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  FolderOpen,
  Inbox,
  Sparkles,
  StickyNote,
  ClipboardList,
} from "lucide-react";

import { SectionReveal } from "@/components/landing-page/section-reveal";
import { DISABLED_FEATURES } from "~/lib/disabled-features";
import { navEntriesFor } from "~/lib/nav-registry";

const LANDING_BLOCKED = new Set([
  ...DISABLED_FEATURES.map((f) => f.path),
  "/exam-predictor",
]);

/** The five-tool loop — one machine, not a zoo. */
const LOOP_TOOLS: {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    href: "/smart-upload",
    label: "Inbox",
    description: "Photo, PDF, recording, or YouTube → notes.",
    Icon: Inbox,
  },
  {
    href: "/my-notes",
    label: "My Notes",
    description: "Structured notes that feed cards and mocks.",
    Icon: StickyNote,
  },
  {
    href: "/flashcards",
    label: "Flashcards",
    description: "Spaced repetition on what you just captured.",
    Icon: FolderOpen,
  },
  {
    href: "/mock-exam",
    label: "Mock Exam",
    description: "Timed MC + SA — honest check, not a confidence quiz.",
    Icon: ClipboardList,
  },
  {
    href: "/tutor",
    label: "Nova",
    description: "Study coach on every miss — then back into the loop.",
    Icon: Sparkles,
  },
];

const LOOP_HREFS = new Set(LOOP_TOOLS.map((t) => t.href));

type FeatureItem = {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
};

function FeatureRow({
  entry,
  index,
  large,
}: {
  entry: FeatureItem;
  index: number;
  large?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const Icon = entry.Icon;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("js-feature-row");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in-view");
      return;
    }
    const io = new IntersectionObserver(
      ([entryObs]) => {
        if (!entryObs?.isIntersecting) return;
        el.classList.add("in-view");
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href={entry.href}
      className={large ? "method-card method-card-loop" : "method-card"}
    >
      <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
      <div>
        <h3>{entry.label}</h3>
        <p>{entry.description}</p>
      </div>
      <Icon aria-hidden="true" />
    </Link>
  );
}

export function Features() {
  const catalog = navEntriesFor("landing")
    .filter((entry) => entry.description)
    .filter((entry) => !LANDING_BLOCKED.has(entry.href))
    .filter((entry) => !LOOP_HREFS.has(entry.href))
    .map((entry) => ({
      href: entry.href,
      label: entry.label,
      description: entry.description!,
      Icon: entry.icon,
    }));

  const [catalogOpen, setCatalogOpen] = useState(false);
  const totalTools = LOOP_TOOLS.length + catalog.length;

  return (
    <section className="features-section section-grid" id="features">
      <SectionReveal>
        <div className="section-intro">
          <div className="eyebrow">02 / the loop</div>
          <h2 className="landing-h">
            <span className="block">One machine.</span>
            <span className="block">
              <em>Five tools.</em>
            </span>
          </h2>
          <p>
            Capture → notes → cards → mock → Nova. Everything else is a cataloged part of the same
            system.
          </p>
        </div>
      </SectionReveal>

      <div className="feature-grid feature-grid-loop">
        {LOOP_TOOLS.map((entry, index) => (
          <FeatureRow key={entry.href} entry={entry} index={index} large />
        ))}
      </div>

      <div className="feature-catalog" style={{ marginTop: 28 }}>
        <button
          type="button"
          className="feature-catalog-toggle"
          aria-expanded={catalogOpen}
          aria-controls="landing-tool-catalog"
          onClick={() => setCatalogOpen((o) => !o)}
        >
          {catalogOpen ? "Hide catalog" : `See all ${totalTools}+ tools →`}
        </button>

        {catalogOpen ? (
          <div id="landing-tool-catalog" className="feature-grid" style={{ marginTop: 16 }}>
            {catalog.map((entry, index) => (
              <FeatureRow key={entry.href} entry={entry} index={LOOP_TOOLS.length + index} />
            ))}
            <p className="kv-meta" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
              Full catalog with toggles:{" "}
              <Link href="/features" style={{ color: "inherit", textDecoration: "underline" }}>
                /features
              </Link>
            </p>
          </div>
        ) : (
          <p className="kv-meta" style={{ marginTop: 10 }}>
            Or open the{" "}
            <Link href="/features" style={{ color: "inherit", textDecoration: "underline" }}>
              features catalog
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
