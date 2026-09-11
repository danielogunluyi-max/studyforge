import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/landing-page/section-reveal";

const steps = [
  {
    index: "01",
    title: "Inbox — photograph the worksheet",
    body: "Drop a photo, PDF, recording, or YouTube link into Inbox. That is the start of the loop, not a separate upload product.",
    href: "/smart-upload",
  },
  {
    index: "02",
    title: "My Notes, then 20 flashcards",
    body: "Kyvex writes structured notes you can reopen in My Notes, then builds a deck — twenty cards is a typical first pass, not a marketing cap.",
    href: "/my-notes",
  },
  {
    index: "03",
    title: "15-minute mock, Nova review",
    body: "Run a short Mock Exam on that material, then sit with Nova on what you missed. Same names as the workspace: Mock Exam and Nova.",
    href: "/mock-exam",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="method section-grid" id="how-it-works">
      <SectionReveal>
        <div className="section-intro">
          <div className="eyebrow">03 / the real loop</div>
          <h2 className="landing-h">
            <span className="block">Worksheet in.</span>
            <span className="block">
              <em>Mock exam out.</em>
            </span>
          </h2>
          <p>
            Not a thread. Not a studio metaphor. Inbox → notes → cards → a timed mock → Nova. That is
            the product.
          </p>
        </div>
      </SectionReveal>
      <div className="method-list">
        {steps.map((step, i) => (
          <SectionReveal key={step.href}>
            <Link
              href={step.href}
              className={i === 0 ? "method-card active-card" : "method-card"}
            >
              <span className="card-index">{step.index}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <ArrowRight aria-hidden="true" />
            </Link>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
