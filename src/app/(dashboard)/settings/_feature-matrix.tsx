"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  groupNavEntries,
  navEntriesFor,
  SECTION_LABELS,
  type NavSectionId,
} from "~/lib/nav-registry";

export const FEATURE_PREFS_EVENT = "kyvex:feature-preferences-changed";

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

type Props = {
  initialEnabled?: string[];
  initialHidden?: string[];
};

export default function FeatureMatrix({ initialEnabled, initialHidden }: Props) {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(initialEnabled ?? []));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(initialHidden ?? []));
  const [loaded, setLoaded] = useState<boolean>(Boolean(initialEnabled));
  const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/feature-preferences", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load feature preferences");
        const data = await res.json();
        if (cancelled) return;
        const en: string[] = Array.isArray(data?.prefs?.enabledFeatures) ? data.prefs.enabledFeatures : [];
        const hi: string[] = Array.isArray(data?.prefs?.hiddenFeatures) ? data.prefs.hiddenFeatures : [];
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

  const persist = useCallback(
    async (nextEnabled: Set<string>, nextHidden: Set<string>) => {
      saveAbortRef.current?.abort();
      const ctrl = new AbortController();
      saveAbortRef.current = ctrl;
      try {
        const res = await fetch("/api/feature-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabledFeatures: Array.from(nextEnabled),
            hiddenFeatures: Array.from(nextHidden),
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("save failed");
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(FEATURE_PREFS_EVENT, {
              detail: {
                enabledFeatures: Array.from(nextEnabled),
                hiddenFeatures: Array.from(nextHidden),
              },
            }),
          );
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Couldn't save toggle — change kept locally.");
      }
    },
    [],
  );

  const handleToggle = useCallback(
    (key: string, next: boolean) => {
      setEnabled((prev) => {
        const en = new Set(prev);
        if (next) en.add(key);
        else en.delete(key);

        setHidden((prevHidden) => {
          const hi = new Set(prevHidden);
          if (next) hi.delete(key);
          else hi.add(key);
          setSavingKeys((s) => {
            const n = new Set(s);
            n.add(key);
            return n;
          });
          void persist(en, hi).finally(() => {
            setSavingKeys((s) => {
              const n = new Set(s);
              n.delete(key);
              return n;
            });
          });
          return hi;
        });
        return en;
      });
    },
    [persist],
  );

  return (
    <section>
      <p className="kv-meta">Feature matrix</p>
      <p className="kv-sub" style={{ marginTop: 8 }}>
        Toggle surfaces on or off. Anything off leaves the sidebar, toolbars, and command palette.
      </p>
      <p className="kv-meta num" style={{ marginTop: 10 }}>
        {totals.on} / {totals.total} active
        {error ? <span style={{ marginLeft: 12, color: "#E5484D" }}>{error}</span> : null}
      </p>

      {CLUSTERS.map((cluster) => {
        const activeInCluster = cluster.features.filter((f) => enabled.has(f.key)).length;
        return (
          <div key={cluster.id} style={{ marginTop: 28 }}>
            <div className="kv-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div>
                <div className="kv-row-title">{cluster.title}</div>
                <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>{cluster.tagline}</p>
              </div>
              <span className="kv-row-side num">{activeInCluster}/{cluster.features.length}</span>
            </div>
            {cluster.features.map((feature) => {
              const on = enabled.has(feature.key);
              return (
                <div key={feature.key} className="kv-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{feature.label}</div>
                    <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>{feature.description}</p>
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
                    {savingKeys.has(feature.key) ? "…" : on ? "On" : "Off"}
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
