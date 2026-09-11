"use client";

import { useEffect, useRef, useState } from "react";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

const CHIP_MS = 3500;
const FLASH_MS = 300;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function runPunchFx() {
  if (prefersReducedMotion()) return () => undefined;

  document.body.classList.add("kv-egg-shake");

  const flash = document.createElement("div");
  flash.className = "kv-egg-flash";
  flash.setAttribute("aria-hidden", "true");
  document.body.appendChild(flash);

  const clear = window.setTimeout(() => {
    document.body.classList.remove("kv-egg-shake");
    flash.remove();
  }, FLASH_MS);

  return () => {
    window.clearTimeout(clear);
    document.body.classList.remove("kv-egg-shake");
    flash.remove();
  };
}

/**
 * Landing-only key-sequence eggs (Konami / punch / kengan).
 * Chips match Scholar Mode styling; dismissible; no audio.
 */
export function ScholarEgg() {
  const [chip, setChip] = useState<string | null>(null);
  const hideTimerRef = useRef(0);
  const fxCleanupRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    let konamiPos = 0;
    let buf = "";

    const dismiss = () => setChip(null);

    const showChip = (text: string) => {
      setChip(text);
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(dismiss, CHIP_MS);
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      const expected = KONAMI[konamiPos] ?? KONAMI[0];
      if (key === expected) {
        konamiPos += 1;
      } else {
        konamiPos = key === KONAMI[0] ? 1 : 0;
      }
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        buf = "";
        showChip("SCHOLAR MODE — IT WAS ALWAYS ON");
        return;
      }

      if (key.length === 1 && /^[a-z]$/.test(key)) {
        buf = (buf + key).slice(-6);
        if (buf.endsWith("punch")) {
          buf = "";
          fxCleanupRef.current?.();
          fxCleanupRef.current = runPunchFx();
          showChip("SERIOUS SERIES — ONE PUNCH. ONE MOCK.");
          return;
        }
        if (buf.endsWith("kengan")) {
          buf = "";
          showChip("FORM IS EVERYTHING — FORM A WORKSHEET INTO NOTES.");
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(hideTimerRef.current);
      fxCleanupRef.current?.();
    };
  }, []);

  function onDismiss() {
    window.clearTimeout(hideTimerRef.current);
    setChip(null);
  }

  return (
    <button
      type="button"
      className={chip ? "scholar-egg show" : "scholar-egg"}
      role="status"
      aria-live="polite"
      aria-hidden={!chip}
      tabIndex={chip ? 0 : -1}
      onClick={onDismiss}
    >
      {chip ?? "\u00a0"}
    </button>
  );
}
