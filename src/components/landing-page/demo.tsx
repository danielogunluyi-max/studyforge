import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/landing-page/section-reveal";
import { TickUp } from "@/components/landing-page/tick-up";

const tools = [
  { href: "/smart-upload", label: "Inbox", meta: "now", current: true },
  { href: "/my-notes", label: "My Notes", meta: "", current: false },
  { href: "/flashcards", label: "Flashcards", meta: "20", current: false },
  { href: "/mock-exam", label: "Mock Exam", meta: "15m", current: false },
  { href: "/tutor", label: "Nova", meta: "", current: false },
] as const;

export function Demo() {
  return (
    <section className="demo-section section-grid" id="demo">
      <SectionReveal>
        <div className="demo-header">
          <div>
            <div className="eyebrow">04 / the workspace frame</div>
            <h2 className="landing-h">
              <span className="block">KYVEX /</span>
              <span className="block">
                <em>Inbox.</em>
              </span>
            </h2>
          </div>
          <div className="live-label">
            <span className="pulse-dot" /> the loop, named honestly
          </div>
        </div>
      </SectionReveal>
      <div className="studio-window">
        <div className="window-bar">
          <div className="window-dots">
            <span />
            <span />
            <span />
          </div>
          <span>kyvex / inbox</span>
          <span className="window-meta">WORKSHEET PHOTO</span>
        </div>
        <div className="studio-body">
          <div className="thread-side">
            <div className="thread-label">YOUR TOOLS</div>
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={tool.current ? "thread-item current" : "thread-item"}
              >
                <span className="thread-icon">{tool.current ? "◈" : "◌"}</span>
                <span>{tool.label}</span>
                {tool.meta ? <small>{tool.meta}</small> : null}
              </Link>
            ))}
            <Link href="/register" className="new-thread">
              + open Inbox
            </Link>
          </div>
          <div className="chat-area">
            <div className="chat-top">
              <span>
                open / <b>worksheet photo → notes</b>
              </span>
              <span>
                loop <i>●</i>
              </span>
            </div>
            <div className="chat-message user-message">
              Photograph the worksheet. Inbox files it. Notes land in My Notes.
            </div>
            <div className="ai-message">
              <div className="ai-avatar">K</div>
              <div>
                <span className="ai-label">KYVEX / LOOP</span>
                <p>
                  From there:{" "}
                  <strong>
                    <TickUp to={20} /> flashcards
                  </strong>
                  , a{" "}
                  <strong>
                    <TickUp to={15} suffix="-minute" /> mock
                  </strong>
                  , then <strong>Nova</strong> on what you missed. Those are the real labels — Inbox,
                  My Notes, Flashcards, Mock Exam, Nova.
                </p>
                <div className="related-links">
                  <Link href="/smart-upload">Inbox</Link>
                  <Link href="/my-notes">My Notes</Link>
                  <Link href="/flashcards">Flashcards</Link>
                  <Link href="/mock-exam">Mock Exam</Link>
                  <Link href="/tutor">Nova</Link>
                </div>
              </div>
            </div>
            <div className="prompt-row">
              <Link href="/register" className="lime-button">
                Begin <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
