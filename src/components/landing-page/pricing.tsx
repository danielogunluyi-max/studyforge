"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SectionReveal } from "@/components/landing-page/section-reveal";

export function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section className="pricing section-grid" id="pricing">
      <SectionReveal>
        <div className="section-intro">
          <div className="eyebrow">05 / choose your rhythm</div>
          <h2 className="landing-h">
            <span className="block">Open mind.</span>
            <span className="block">
              <em>Deep dive.</em>
            </span>
          </h2>
          <p>Plans keep those names. Checkout is not live yet — Phase 3. Begin still creates a real account.</p>
          <div className="coming-soon">
            <i /> Coming soon
          </div>
          <div className="billing-toggle" role="group" aria-label="Billing period preview">
            <button
              type="button"
              className={billing === "monthly" ? "selected" : ""}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === "yearly" ? "selected" : ""}
              onClick={() => setBilling("yearly")}
            >
              Yearly <b>preview</b>
            </button>
          </div>
        </div>
      </SectionReveal>
      <div className="price-cards">
        <article className="price-card">
          <div className="price-top">
            <span className="plan-tag">THE STARTING POINT</span>
            <span className="price-symbol">○</span>
          </div>
          <h3>Open mind</h3>
          <p>Inbox, notes, cards, and Nova at the free rhythm — checkout not attached.</p>
          <div className="price">
            <strong>Free</strong>
            <span>coming soon</span>
          </div>
          <Link href="/register" className="outline-button">
            Begin <ArrowRight size={14} />
          </Link>
          <ul>
            <li>
              <Check size={13} /> Inbox → My Notes
            </li>
            <li>
              <Check size={13} /> Flashcards
            </li>
            <li>
              <Check size={13} /> Nova review
            </li>
          </ul>
        </article>
        <article className="price-card pro-card">
          <div className="pro-glow" />
          <div className="price-top">
            <span className="plan-tag lime-tag">FOR THE DEEP DIVE</span>
            <span className="price-symbol">✳</span>
          </div>
          <h3>Deep dive</h3>
          <p>Same loop, more room — mocks, exports, and higher limits when billing ships.</p>
          <div className="price">
            <strong>Soon</strong>
            <span>/ month · coming soon</span>
          </div>
          <span className="lime-button price-disabled">
            Coming soon <ArrowRight size={14} />
          </span>
          <ul>
            <li>
              <Check size={13} /> Mock Exam
            </li>
            <li>
              <Check size={13} /> Higher Inbox volume
            </li>
            <li>
              <Check size={13} /> Exports when Phase 3 lands
            </li>
            <li>
              <Check size={13} /> No live checkout today
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
