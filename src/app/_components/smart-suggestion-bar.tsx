"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Suggestion = {
  type: string;
  message: string;
  href: string;
  priority: number;
};

type SipResponse = {
  sip?: {
    lastSuggestions?: unknown;
  };
  suggestions?: Suggestion[];
};

function parseSuggestions(value: unknown): Suggestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      if (typeof row.message !== "string" || typeof row.href !== "string") return null;
      return {
        type: typeof row.type === "string" ? row.type : "suggestion",
        message: row.message,
        href: row.href,
        priority: typeof row.priority === "number" ? row.priority : 99,
      };
    })
    .filter((entry): entry is Suggestion => Boolean(entry))
    .sort((left, right) => left.priority - right.priority);
}

export function SmartSuggestionBar() {
  const { status } = useSession();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      if (status !== "authenticated") return;

      const extract = async (method: "GET" | "POST") => {
        const response = await fetch("/api/sip", { method });
        const data = (await response.json().catch(() => ({}))) as SipResponse;
        return method === "GET"
          ? parseSuggestions(data.sip?.lastSuggestions)
          : parseSuggestions(data.suggestions ?? data.sip?.lastSuggestions);
      };

      try {
        let nextSuggestions = await extract("GET");
        if (nextSuggestions.length === 0) {
          nextSuggestions = await extract("POST");
        }

        if (!cancelled) {
          setSuggestions(nextSuggestions);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    };

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (suggestions.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % suggestions.length);
    }, 8000);

    return () => {
      window.clearInterval(timer);
    };
  }, [suggestions]);

  const suggestion = useMemo(() => suggestions[activeIndex] ?? null, [activeIndex, suggestions]);

  if (status !== "authenticated" || !suggestion) {
    return null;
  }

  return (
    <div
      className="page-enter"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      <div
        className="kv-card-elevated"
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "12px 14px",
          borderRadius: 16,
          background: "color-mix(in srgb, var(--bg-card) 88%, #f3c96a 12%)",
          border: "1px solid color-mix(in srgb, var(--border-default) 70%, #f3c96a 30%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          pointerEvents: "auto",
          boxShadow: "0 18px 45px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="kv-smart-suggestion-label">
            Smart Suggestion
          </p>
          <p className="kv-smart-suggestion-message" style={{ marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {suggestion.message}
          </p>
        </div>
        <Link href={suggestion.href} className="kv-btn-primary" style={{ whiteSpace: "nowrap", textDecoration: "none" }}>
          Open
        </Link>
      </div>
    </div>
  );
}

export default SmartSuggestionBar;