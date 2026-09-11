"use client";

import type { TutorMode } from "~/lib/tutor-mode";

const TABS: { id: TutorMode; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "voice", label: "Voice" },
  { id: "vision", label: "Vision" },
];

export function TutorModeTabs({
  mode,
  onChange,
}: {
  mode: TutorMode;
  onChange: (mode: TutorMode) => void;
}) {
  return (
    <div role="tablist" aria-label="Nova mode" className="kv-tabs" style={{ marginTop: 22 }}>
      {TABS.map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={active ? "kv-tab on" : "kv-tab"}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
