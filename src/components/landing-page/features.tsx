"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { SectionReveal } from "@/components/landing-page/section-reveal";
import { navEntriesFor } from "~/lib/nav-registry";

type FeatureItem = {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
};

function FeatureRow({
  entry,
  index,
}: {
  entry: FeatureItem;
  index: number;
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
    <Link ref={ref} href={entry.href} className="method-card">
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
  const features = navEntriesFor("landing")
    .filter((entry) => entry.description)
    .map((entry) => ({
      href: entry.href,
      label: entry.label,
      description: entry.description!,
      Icon: entry.icon,
    }));

  return (
    <section className="features-section section-grid" id="features">
      <SectionReveal>
        <div className="section-intro">
          <div className="eyebrow">02 / what ships today</div>
          <h2 className="landing-h">
            <span className="block">Tools you</span>
            <span className="block">
              <em>actually use.</em>
            </span>
          </h2>
          <p>
            Every card below is a real Kyvex surface — labels and destinations come from the same
            registry as the workspace.
          </p>
        </div>
      </SectionReveal>
      <div className="feature-grid">
        {features.map((entry, index) => (
          <FeatureRow key={entry.href} entry={entry} index={index} />
        ))}
      </div>
    </section>
  );
}
