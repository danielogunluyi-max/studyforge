"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();

  // Global keyboard shortcuts (Ctrl+K palette is handled by CommandPalette component)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
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

  return null;
}
