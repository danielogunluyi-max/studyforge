"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { FEATURE_PREFS_EVENT } from "~/lib/use-feature-enabled";
import {
  groupNavEntries,
  navEntriesFor,
  SECTION_LABELS,
  type NavSectionId,
} from "~/lib/nav-registry";

// Re-export for any legacy imports of the event from this module.
export { FEATURE_PREFS_EVENT };

type FeatureNode = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type FeatureCluster = {
  id: NavSectionId;
  title: string;
  subtitle: string;
  tagline: string;
  icon: LucideIcon;
  features: FeatureNode[];
};

const CLUSTERS: FeatureCluster[] = [];
for (const group of groupNavEntries(navEntriesFor("matrix"))) {
  const features: FeatureNode[] = group.items
    .filter((entry) => entry.featureKey)
    .map((entry) => ({
      key: entry.featureKey!,
      label: entry.label,
      description: entry.description ?? entry.label,
      icon: entry.icon,
    }));
  const lead = features[0];
  if (!lead) continue;
  CLUSTERS.push({
    id: group.id,
    title: SECTION_LABELS[group.id],
    subtitle: "Cluster",
    tagline: `Toggle ${SECTION_LABELS[group.id].toLowerCase()} surfaces on or off.`,
    icon: lead.icon,
    features,
  });
}

const SAVE_DEBOUNCE_MS = 600;
const SAVED_FLASH_MS = 1500;

type Props = {
  initialEnabled?: string[];
  initialHidden?: string[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function FeatureMatrix({ initialEnabled, initialHidden }: Props) {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(initialEnabled ?? []));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(initialHidden ?? []));
  const [loaded, setLoaded] = useState<boolean>(Boolean(initialEnabled));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const enabledRef = useRef(enabled);
  const hiddenRef = useRef(hidden);
  enabledRef.current = enabled;
  hiddenRef.current = hidden;

  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const pendingTrailingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/feature-preferences", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load feature preferences");
        const data = await res.json();
        if (cancelled) return;
        const en: string[] = Array.isArray(data?.prefs?.enabledFeatures)
          ? data.prefs.enabledFeatures
          : [];
        const hi: string[] = Array.isArray(data?.prefs?.hiddenFeatures)
          ? data.prefs.hiddenFeatures
          : [];
        setEnabled(new Set(en));
        setHidden(new Set(hi));
        setLoaded(true);
      } catch {
        if (cancelled) return;
        setError("Could not load your matrix. Try refreshing.");
        setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded]);

  const totals = useMemo(() => {
    const all = CLUSTERS.flatMap((c) => c.features.map((f) => f.key));
    const on = all.filter((k) => enabled.has(k)).length;
    return { total: all.length, on };
  }, [enabled]);

  const persistNow = useCallback(async (opts?: { keepalive?: boolean }) => {
    const nextEnabled = enabledRef.current;
    const nextHidden = hiddenRef.current;
    const enabledFeatures = Array.from(nextEnabled);
    const hiddenFeatures = Array.from(nextHidden);
    const body = JSON.stringify({ enabledFeatures, hiddenFeatures });

    if (opts?.keepalive) {
      // Unmount flush: prefer sendBeacon (survives navigation); fall back to keepalive fetch.
      try {
        const beaconOk =
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function" &&
          navigator.sendBeacon(
            "/api/feature-preferences",
            new Blob([body], { type: "application/json" }),
          );
        if (!beaconOk) {
          await fetch("/api/feature-preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
            credentials: "same-origin",
          });
        }
        dirtyRef.current = false;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(FEATURE_PREFS_EVENT, {
              detail: { enabledFeatures, hiddenFeatures },
            }),
          );
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        // Page is leaving — nothing to surface.
      }
      return;
    }

    if (inFlightRef.current) {
      pendingTrailingRef.current = true;
      return;
    }

    inFlightRef.current = true;
    pendingTrailingRef.current = false;
    dirtyRef.current = false;

    const ctrl = new AbortController();
    saveAbortRef.current = ctrl;
    let aborted = false;

    if (mountedRef.current) {
      setSaveStatus("saving");
      setError(null);
      if (savedFlashTimerRef.current) {
        clearTimeout(savedFlashTimerRef.current);
        savedFlashTimerRef.current = null;
      }
    }

    try {
      const res = await fetch("/api/feature-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("save failed");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(FEATURE_PREFS_EVENT, {
            detail: { enabledFeatures, hiddenFeatures },
          }),
        );
      }

      if (mountedRef.current) {
        setSaveStatus("saved");
        setError(null);
        savedFlashTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSaveStatus("idle");
        }, SAVED_FLASH_MS);
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        aborted = true;
        // Unmount abort — cleanup keepalive flush owns the final write.
        dirtyRef.current = true;
        return;
      }
      dirtyRef.current = true;
      if (mountedRef.current) {
        setSaveStatus("error");
        setError("Couldn't save — change kept locally.");
      }
    } finally {
      inFlightRef.current = false;
      saveAbortRef.current = null;
      if (aborted || !mountedRef.current) return;
      if (pendingTrailingRef.current || dirtyRef.current) {
        pendingTrailingRef.current = false;
        void persistNow();
      }
    }
  }, []);

  const schedulePersist = useCallback(() => {
    dirtyRef.current = true;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void persistNow();
    }, SAVE_DEBOUNCE_MS);
  }, [persistNow]);

  const handleRetry = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    dirtyRef.current = true;
    void persistNow();
  }, [persistNow]);

  // Abort only on unmount; flush dirty state via sendBeacon/keepalive so the last write lands.
  useEffect(() => {
    const flushKeepalive = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (dirtyRef.current || pendingTrailingRef.current || inFlightRef.current) {
        void persistNow({ keepalive: true });
      }
    };

    const onPageHide = () => {
      flushKeepalive();
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (savedFlashTimerRef.current) {
        clearTimeout(savedFlashTimerRef.current);
        savedFlashTimerRef.current = null;
      }
      const wasInFlight = inFlightRef.current;
      saveAbortRef.current?.abort();
      saveAbortRef.current = null;
      if (dirtyRef.current || pendingTrailingRef.current || wasInFlight) {
        void persistNow({ keepalive: true });
      }
    };
  }, [persistNow]);

  const handleToggle = useCallback(
    (key: string, next: boolean) => {
      // Sync refs + dirty before React paint so unmount keepalive sees latest state.
      const en = new Set(enabledRef.current);
      const hi = new Set(hiddenRef.current);
      if (next) {
        en.add(key);
        hi.delete(key);
      } else {
        en.delete(key);
        hi.add(key);
      }
      enabledRef.current = en;
      hiddenRef.current = hi;
      setEnabled(en);
      setHidden(hi);
      schedulePersist();
    },
    [schedulePersist],
  );

  return (
    <section>
      <div className="kv-row" style={{ borderTop: "none", paddingTop: 0, alignItems: "flex-start" }}>
        <div>
          <p className="kv-meta">Feature matrix</p>
          <p className="kv-sub" style={{ marginTop: 8 }}>
            Default sidebar is Focused (The Loop). Toggle surfaces on to opt in — anything off leaves
            the sidebar, toolbars, and command palette.
          </p>
          <button
            type="button"
            className="kv-btn-ghost"
            style={{ marginTop: 10, padding: "6px 10px" }}
            onClick={() => {
              void (async () => {
                try {
                  const res = await fetch("/api/feature-preferences", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resetToPreset: true, preset: "FOCUSED" }),
                  });
                  if (!res.ok) throw new Error("reset failed");
                  const data = await res.json();
                  const en: string[] = Array.isArray(data?.prefs?.enabledFeatures)
                    ? data.prefs.enabledFeatures
                    : [];
                  const hi: string[] = Array.isArray(data?.prefs?.hiddenFeatures)
                    ? data.prefs.hiddenFeatures
                    : [];
                  setEnabled(new Set(en));
                  setHidden(new Set(hi));
                  enabledRef.current = new Set(en);
                  hiddenRef.current = new Set(hi);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent(FEATURE_PREFS_EVENT, {
                        detail: { enabledFeatures: en, hiddenFeatures: hi },
                      }),
                    );
                  }
                  setSaveStatus("saved");
                } catch {
                  setError("Could not reset to Focused.");
                  setSaveStatus("error");
                }
              })();
            }}
          >
            Reset to Focused
          </button>
        </div>
        <div style={{ textAlign: "right" }}>
          {saveStatus === "saving" ? <p className="kv-meta">Saving…</p> : null}
          {saveStatus === "saved" ? <p className="kv-meta">Saved</p> : null}
          {saveStatus === "error" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <p className="kv-meta" style={{ color: "#E5484D" }}>
                {error ?? "Couldn't save"}
              </p>
              <button type="button" className="kv-btn-ghost" onClick={handleRetry}>
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <p className="kv-meta num" style={{ marginTop: 10 }}>
        {totals.on} / {totals.total} active
      </p>

      {CLUSTERS.map((cluster) => {
        const activeInCluster = cluster.features.filter((f) => enabled.has(f.key)).length;
        return (
          <div key={cluster.id} style={{ marginTop: 28 }}>
            <div className="kv-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div>
                <div className="kv-row-title">{cluster.title}</div>
                <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>
                  {cluster.tagline}
                </p>
              </div>
              <span className="kv-row-side num">
                {activeInCluster}/{cluster.features.length}
              </span>
            </div>
            {cluster.features.map((feature) => {
              const on = enabled.has(feature.key);
              return (
                <div key={feature.key} className="kv-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{feature.label}</div>
                    <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>
                      {feature.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Toggle ${feature.label}`}
                    disabled={!loaded}
                    onClick={() => handleToggle(feature.key, !on)}
                    className={on ? "kv-btn-ghost on" : "kv-btn-ghost"}
                    style={{ padding: "6px 10px" }}
                  >
                    {on ? "On" : "Off"}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
