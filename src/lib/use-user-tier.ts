"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tiered Academic Matrix — Phase 2
 *
 * The user's tier (HIGHSCHOOL / COLLEGE / UNIVERSITY) is the source of truth
 * for which Kyvex tools and dashboards they see by default. This hook reads
 * the tier from /api/preset on mount and re-evaluates instantly when the
 * settings page broadcasts a change.
 *
 * Settings page should `window.dispatchEvent(new CustomEvent(PRESET_CHANGED_EVENT, { detail: { preset } }))`
 * after a successful POST to /api/preset.
 */

export const PRESET_CHANGED_EVENT = "kyvex:preset-changed";

export type UserTier = "HIGHSCHOOL" | "COLLEGE" | "UNIVERSITY";

const ALLOWED_TIERS = ["HIGHSCHOOL", "COLLEGE", "UNIVERSITY"] as const;

function isTier(value: unknown): value is UserTier {
  return typeof value === "string" && (ALLOWED_TIERS as readonly string[]).includes(value);
}

let cachedTier: UserTier | null = null;
let inFlight: Promise<UserTier> | null = null;

async function loadTier(): Promise<UserTier> {
  if (cachedTier) return cachedTier;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/preset", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { preset?: string };
      cachedTier = isTier(data.preset) ? data.preset : "HIGHSCHOOL";
      return cachedTier;
    } catch {
      cachedTier = "HIGHSCHOOL";
      return cachedTier;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Returns the user's current academic tier.
 *
 * - Returns `HIGHSCHOOL` until the first fetch resolves (matches the
 *   schema default — no flicker for new users).
 * - Re-evaluates instantly when settings dispatches the change event.
 *
 * @example
 *   const tier = useUserTier();
 *   if (tier === "COLLEGE") return <CollegeGPACalc />;
 */
export function useUserTier(): UserTier {
  const [tier, setTier] = useState<UserTier>(() => cachedTier ?? "HIGHSCHOOL");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    void loadTier().then((value) => {
      if (mountedRef.current) setTier(value);
    });

    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ preset?: string }>).detail;
      if (detail && isTier(detail.preset)) {
        cachedTier = detail.preset;
        if (mountedRef.current) setTier(detail.preset);
      } else {
        // Force refetch on bare events
        cachedTier = null;
        void loadTier().then((value) => {
          if (mountedRef.current) setTier(value);
        });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PRESET_CHANGED_EVENT, handle as EventListener);
    }

    return () => {
      mountedRef.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(PRESET_CHANGED_EVENT, handle as EventListener);
      }
    };
  }, []);

  return tier;
}

/**
 * Imperative read for non-React code. May return `null` if the tier hasn't
 * been loaded yet — callers should default to `HIGHSCHOOL` in that case.
 */
export function readUserTier(): UserTier | null {
  return cachedTier;
}
