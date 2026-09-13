"use client";

/**
 * Dashboard "Just captured" strip — latest captures across devices.
 * Refetches on window focus (no websockets).
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAPTURE_NOVA_KEY,
  writeCaptureHandoff,
} from "~/lib/capture-handoff";
import { deviceLabel, sourceLabel } from "~/lib/device-class";
import { type CaptureRecord, fetchRecentCaptures } from "~/lib/persist-capture";
import { formatTorontoDate } from "~/lib/toronto-time";
import { tutorHref } from "~/lib/tutor-mode";

export function JustCapturedStrip() {
  const router = useRouter();
  const [items, setItems] = useState<CaptureRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchRecentCaptures(8);
    setItems(next);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  if (!loaded || items.length === 0) return null;

  const askNova = (item: CaptureRecord) => {
    writeCaptureHandoff(CAPTURE_NOVA_KEY, {
      imageData: item.imageData,
      filename: `${item.title.replace(/\s+/g, "-").toLowerCase()}.png`,
      course: item.subject !== "General" ? item.subject : undefined,
      title: item.title,
      savedAt: Date.now(),
    });
    router.push(tutorHref("vision"));
  };

  const makeCards = (item: CaptureRecord) => {
    // SM-2 deck path: linked note → generateFrom; else prefill create modal from capture title.
    if (item.noteId) {
      const q = new URLSearchParams({ generateFrom: item.noteId });
      if (item.subject && item.subject !== "General") q.set("course", item.subject);
      router.push(`/flashcards?${q}`);
      return;
    }
    try {
      sessionStorage.setItem(
        "kyvex-capture-deck-topic",
        JSON.stringify({
          topic: item.title,
          subject: item.subject !== "General" ? item.subject : "",
          savedAt: Date.now(),
        }),
      );
    } catch {
      // ignore
    }
    const q = new URLSearchParams({ fromCapture: "1" });
    if (item.subject && item.subject !== "General") q.set("course", item.subject);
    router.push(`/flashcards?${q}`);
  };

  return (
    <section style={{ marginTop: 28 }} data-surface="just-captured">
      <div className="kv-row" style={{ borderTop: "none", paddingTop: 0 }}>
        <p className="kv-meta">Just captured</p>
        <Link href="/capture-studio" className="kv-row-side num" style={{ textDecoration: "none" }}>
          All →
        </Link>
      </div>
      {items.map((item) => (
        <div key={item.id} className="kv-row" style={{ alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageData}
            alt=""
            width={48}
            height={48}
            style={{
              width: 48,
              height: 48,
              objectFit: "cover",
              borderRadius: 2,
              border: "1px solid var(--border-default)",
              flexShrink: 0,
              background: "#111",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kv-row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.title}
            </div>
            <div className="kv-row-sub" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              <span className="kv-chip">{deviceLabel(item.sourceDevice)}</span>
              <span className="kv-chip">{sourceLabel(item.source)}</span>
              {item.subject && item.subject !== "General" ? (
                <span className="kv-chip kv-chip-course">{item.subject}</span>
              ) : null}
              <span className="kv-meta">{formatTorontoDate(item.createdAt)}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
            <button type="button" className="kv-btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => makeCards(item)}>
              Make cards
            </button>
            <button type="button" className="kv-btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => askNova(item)}>
              Ask Nova
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
