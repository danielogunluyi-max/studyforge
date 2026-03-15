"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Command = {
  id: string;
  label: string;
  shortcut?: string;
  href: string;
  keywords: string;
};

const COMMANDS: Command[] = [
  { id: "dashboard", label: "Dashboard", shortcut: "Ctrl+H", href: "/dashboard", keywords: "home dashboard" },
  { id: "notes", label: "My Notes", shortcut: "Ctrl+N", href: "/my-notes", keywords: "notes study" },
  { id: "generator", label: "Generator", shortcut: "Ctrl+G", href: "/generator", keywords: "generate create notes" },
  { id: "flashcards", label: "Flashcards", shortcut: "Ctrl+F", href: "/flashcards", keywords: "cards flashcards" },
  { id: "tutor", label: "Nova AI Tutor", shortcut: "Ctrl+T", href: "/tutor", keywords: "tutor chat nova ai" },
  { id: "upload", label: "Upload", href: "/upload", keywords: "upload pdf file" },
  { id: "results", label: "My Results", href: "/results", keywords: "results scores exams history" },
  { id: "settings", label: "Settings", href: "/settings", keywords: "settings profile preferences" },
  { id: "study-groups", label: "Study Groups", href: "/study-groups", keywords: "group collaborative" },
  { id: "battle", label: "Battle Arena", href: "/battle", keywords: "battle compete quiz" },
  { id: "exam-predictor", label: "Exam Predictor", href: "/exam-predictor", keywords: "predict exam forecast" },
  { id: "concept-web", label: "Concept Web", href: "/concept-web", keywords: "concept diagram web map" },
  { id: "citations", label: "Citations", href: "/citations", keywords: "citations references bibliography" },
  { id: "calendar", label: "Calendar", href: "/calendar", keywords: "schedule planner calendar" },
  { id: "study-ghost", label: "Study Ghost", href: "/study-ghost", keywords: "ghost study streak" },
  { id: "achievements", label: "Achievements", href: "/achievements", keywords: "achievements badges trophies" },
];

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return cmd.label.toLowerCase().includes(q) || cmd.keywords.toLowerCase().includes(q);
  });

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      setSelectedIndex(0);
      router.push(href);
    },
    [router],
  );

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+K — toggle palette
      if (ctrl && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Shortcuts that should not fire when user is typing
      if (!ctrl) return;

      if (e.key === "h") {
        e.preventDefault();
        router.push("/dashboard");
        return;
      }
      if (e.key === "n" && !isInputFocused()) {
        e.preventDefault();
        router.push("/my-notes");
        return;
      }
      if (e.key === "g" && !isInputFocused()) {
        e.preventDefault();
        router.push("/generator");
        return;
      }
      if (e.key === "f" && !isInputFocused()) {
        e.preventDefault();
        router.push("/flashcards");
        return;
      }
      if (e.key === "t" && !isInputFocused()) {
        e.preventDefault();
        router.push("/tutor");
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        navigate(filtered[selectedIndex]!.href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIndex, navigate, closePalette]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[9999] flex items-start justify-center"
      style={{
        paddingTop: "20vh",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
      }}
      onClick={closePalette}
    >
      <div
        className="kv-card w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "var(--bg-elevated)", maxHeight: "60vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 106.15 6.15a7.5 7.5 0 0010.5 10.5z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands & pages..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 14,
            }}
          />
          <kbd
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid var(--border-default)",
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: "center", padding: "24px 16px", fontSize: 13, color: "var(--text-muted)" }}>
              No commands found
            </p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => navigate(cmd.href)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  border: "none",
                  background: i === selectedIndex ? "var(--bg-hover)" : "transparent",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid var(--border-default)",
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "8px 16px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 10,
            color: "var(--text-muted)",
            flexWrap: "wrap",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Ctrl+K toggle</span>
        </div>
      </div>
    </div>
  );
}
