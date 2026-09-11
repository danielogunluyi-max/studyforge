"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  isNavEntryEnabled,
  MATRIX_FEATURE_KEYS,
  type NavEntry,
} from "~/lib/nav-registry";

/**
 * Event broadcast by the Personal Customization Matrix whenever the user
 * toggles a feature. Payload: { enabledFeatures: string[], hiddenFeatures: string[] }.
 */
export const FEATURE_PREFS_EVENT = "kyvex:feature-preferences-changed";

export { MATRIX_FEATURE_KEYS, isNavEntryEnabled };

let cachedSet: Set<string> | null = null;
let inFlight: Promise<Set<string> | null> | null = null;

async function loadEnabled(): Promise<Set<string> | null> {
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
      // Leave cache null so consumers keep Default = enabled.
      return null;
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
 * - Non-matrix keys are always treated as enabled.
 * - Re-evaluates instantly when the matrix dispatches the change event.
 */
export function useFeatureEnabled(key: string, defaultValue = true): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (!MATRIX_FEATURE_KEYS.has(key)) return true;
    return cachedSet ? cachedSet.has(key) : defaultValue;
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!MATRIX_FEATURE_KEYS.has(key)) {
      setEnabled(true);
      return;
    }

    void loadEnabled().then((set) => {
      if (!mountedRef.current) return;
      if (!set) {
        setEnabled(defaultValue);
        return;
      }
      setEnabled(set.has(key));
    });

    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabledFeatures?: string[] }>).detail;
      if (detail && Array.isArray(detail.enabledFeatures)) {
        cachedSet = new Set(detail.enabledFeatures);
        if (mountedRef.current) setEnabled(cachedSet.has(key));
        return;
      }
      cachedSet = null;
      void loadEnabled().then((set) => {
        if (!mountedRef.current) return;
        setEnabled(set ? set.has(key) : defaultValue);
      });
    };

    window.addEventListener(FEATURE_PREFS_EVENT, handle as EventListener);
    return () => {
      mountedRef.current = false;
      window.removeEventListener(FEATURE_PREFS_EVENT, handle as EventListener);
    };
  }, [key, defaultValue]);

  return enabled;
}

/**
 * Enabled feature-key set for nav filtering.
 * `null` = not loaded yet → treat every matrix key as enabled (default on).
 */
export function useEnabledFeatureSet(): Set<string> | null {
  const [enabled, setEnabled] = useState<Set<string> | null>(() => cachedSet);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void loadEnabled().then((set) => {
      if (mountedRef.current) setEnabled(set);
    });

    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabledFeatures?: string[] }>).detail;
      if (detail && Array.isArray(detail.enabledFeatures)) {
        cachedSet = new Set(detail.enabledFeatures);
        if (mountedRef.current) setEnabled(cachedSet);
        return;
      }
      cachedSet = null;
      void loadEnabled().then((set) => {
        if (mountedRef.current) setEnabled(set);
      });
    };

    window.addEventListener(FEATURE_PREFS_EVENT, handle as EventListener);
    return () => {
      mountedRef.current = false;
      window.removeEventListener(FEATURE_PREFS_EVENT, handle as EventListener);
    };
  }, []);

  return enabled;
}

export function useFilteredNavEntries(entries: NavEntry[]): NavEntry[] {
  const enabled = useEnabledFeatureSet();
  return useMemo(
    () => entries.filter((entry) => isNavEntryEnabled(entry, enabled)),
    [entries, enabled],
  );
}

/**
 * Imperative read for non-React code (e.g., command palette filters).
 * May return `null` if preferences haven't loaded yet.
 */
export function readEnabledFeatures(): Set<string> | null {
  return cachedSet;
}
