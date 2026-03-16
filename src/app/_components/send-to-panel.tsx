"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SendToOption = {
  label: string;
  href: string;
  icon: string;
  param: string;
};

type SendToPanelProps = {
  contentType: "note" | "deck" | "exam" | "transcript" | "essay";
  contentId?: string;
  title: string;
  content?: string;
};

const STORAGE_KEY = "kyvex:send-to-context";

export function SendToPanel({ contentType, contentId = "", title, content = "" }: SendToPanelProps) {
  const router = useRouter();
  const [options, setOptions] = useState<SendToOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedTitle = useMemo(() => title.trim(), [title]);
  const normalizedContent = useMemo(() => content.trim(), [content]);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      if (!normalizedTitle && !normalizedContent) {
        setOptions([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/send-to", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType, contentId, title: normalizedTitle }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          options?: SendToOption[];
          error?: string;
        };

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "Could not load next actions.");
          setOptions([]);
          return;
        }

        setOptions(Array.isArray(data.options) ? data.options : []);
      } catch {
        if (!cancelled) {
          setError("Could not load next actions.");
          setOptions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [contentId, contentType, normalizedContent, normalizedTitle]);

  const openOption = (option: SendToOption) => {
    const context = {
      contentType,
      contentId,
      title: normalizedTitle,
      content: normalizedContent,
      targetHref: option.href,
      targetParam: option.param,
      savedAt: Date.now(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    } catch {
      // Ignore storage failures and continue navigation.
    }

    const value = contentId || normalizedTitle || contentType;
    const separator = option.href.includes("?") ? "&" : "?";
    router.push(`${option.href}${separator}${option.param}=${encodeURIComponent(value)}`);
  };

  if (!normalizedTitle && !normalizedContent) {
    return null;
  }

  return (
    <section className="kv-card kv-card-elevated kv-stack-md" style={{ padding: 20 }}>
      <div className="kv-stack-xs">
        <p className="kv-badge kv-badge-gold" style={{ width: "fit-content" }}>Next Step</p>
        <h3 className="kv-title-sm" style={{ fontSize: 20, fontWeight: 800 }}>
          What do you want to do with this {contentType}?
        </h3>
        <p className="kv-subtitle" style={{ color: "var(--text-secondary)" }}>
          Move straight into the next study workflow without re-uploading or copying content.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="kv-skeleton kv-skeleton-card"
              style={{ minHeight: 92, borderRadius: 14 }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="kv-card-sm" style={{ color: "var(--accent-red)" }}>
          {error}
        </div>
      ) : options.length === 0 ? (
        <div className="kv-card-sm" style={{ color: "var(--text-secondary)" }}>
          No follow-up actions are available for this item yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => (
            <button
              key={`${option.href}-${option.param}`}
              type="button"
              className="kv-card-hover"
              onClick={() => openOption(option)}
              style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid var(--border-default)",
                background: "var(--bg-card)",
                textAlign: "left",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }} aria-hidden="true">{option.icon}</span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{option.label}</span>
              </div>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Open {option.label.toLowerCase()} with this {contentType} preloaded.
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default SendToPanel;