"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Event broadcast by the Personal Customization Matrix whenever the user
 * toggles a feature. Payload: { enabledFeatures: string[], hiddenFeatures: string[] }.
 */
export const FEATURE_PREFS_EVENT = "kyvex:feature-preferences-changed";

let cachedSet: Set<string> | null = null;
let inFlight: Promise<Set<string>> | null = null;

async function loadEnabled(): Promise<Set<string>> {
  if (cachedSet) return cachedSet;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/feature-preferences", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      const list: string[] = Array.isArray(data?.prefs?.enabledFeatures)
        ? data.prefs.enabledFeatures
        : [];
      cachedSet = new Set(list);
      return cachedSet;
    } catch {
      cachedSet = new Set<string>();
      return cachedSet;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Returns whether a feature key is currently enabled by the user's matrix.
 *
 * - Returns `defaultValue` until the first fetch resolves (so UI doesn't
 *   flicker on first render).
 * - Re-evaluates instantly when the matrix dispatches the change event.
 *
 * @example
 *   const showFeynman = useFeatureEnabled('feynman');
 *   {showFeynman && <FeynmanButton />}
 */
export function useFeatureEnabled(key: string, defaultValue = true): boolean {
  const [enabled, setEnabled] = useState<boolean>(() =>
    cachedSet ? cachedSet.has(key) : defaultValue,
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    void loadEnabled().then((set) => {
      if (mountedRef.current) setEnabled(set.has(key));
    });

    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabledFeatures?: string[] }>).detail;
      if (detail && Array.isArray(detail.enabledFeatures)) {
        cachedSet = new Set(detail.enabledFeatures);
      } else {
        cachedSet = null; // force refetch next consumer call
        void loadEnabled().then((set) => {
          if (mountedRef.current) setEnabled(set.has(key));
        });
        return;
      }
      if (mountedRef.current) setEnabled(cachedSet.has(key));
    };

    if (typeof window !== "undefined") {
      window.addEventListener(FEATURE_PREFS_EVENT, handle as EventListener);
    }

    return () => {
      mountedRef.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(FEATURE_PREFS_EVENT, handle as EventListener);
      }
    };
  }, [key]);

  return enabled;
}

/**
 * Imperative read for non-React code (e.g., command palette filters).
 * May return `null` if preferences haven't loaded yet.
 */
export function readEnabledFeatures(): Set<string> | null {
  return cachedSet;
}
