"use client";

import { useMemo, useState } from "react";

type LearnMode = "overview" | "lesson" | "examples" | "quiz" | "flashcards" | "exam";

type UnitItem = {
  code: string;
  title: string;
};

type ExpectationItem = {
  code: string;
  title: string;
};

type Props = {
  open: boolean;
  courseCode: string;
  unitOptions: UnitItem[];
  expectationOptions: ExpectationItem[];
  onClose: () => void;
};

const MODES: { id: LearnMode; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "lesson", label: "Lesson" },
  { id: "examples", label: "Examples" },
  { id: "quiz", label: "Quiz" },
  { id: "flashcards", label: "Flashcards" },
  { id: "exam", label: "Exam Prep" },
];

export function CurriculumLearnModal({ open, courseCode, unitOptions, expectationOptions, onClose }: Props) {
  const [mode, setMode] = useState<LearnMode>("overview");
  const [unitCode, setUnitCode] = useState("");
  const [expectationCode, setExpectationCode] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const header = useMemo(() => `Learn ${courseCode}`, [courseCode]);

  if (!open) return null;

  const generate = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/curriculum/${courseCode}/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, unitCode: unitCode || undefined, expectationCode: expectationCode || undefined, prompt }),
      });

      const payload = (await response.json().catch(() => ({}))) as { content?: string; error?: string };
      if (!response.ok || !payload.content) {
        setError(payload.error ?? "Failed to generate learning content");
        return;
      }

      setContent(payload.content);
    } catch {
      setError("Failed to generate learning content");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 900, maxHeight: "90vh", overflow: "auto", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{header}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <select className="input" value={mode} onChange={(event) => setMode(event.target.value as LearnMode)}>
            {MODES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>

          <select className="input" value={unitCode} onChange={(event) => setUnitCode(event.target.value)}>
            <option value="">All units</option>
            {unitOptions.map((unit) => (
              <option key={unit.code} value={unit.code}>{unit.code} - {unit.title}</option>
            ))}
          </select>

          <select className="input" value={expectationCode} onChange={(event) => setExpectationCode(event.target.value)}>
            <option value="">All expectations</option>
            {expectationOptions.map((expectation) => (
              <option key={expectation.code} value={expectation.code}>{expectation.code} - {expectation.title}</option>
            ))}
          </select>
        </div>

        <textarea
          className="textarea"
          style={{ marginTop: 10, minHeight: 90 }}
          placeholder="Optional: ask for a specific focus"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />

        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => void generate()} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </button>
        </div>

        {error && <p style={{ color: "var(--accent-red)", marginTop: 10 }}>{error}</p>}

        <div className="card" style={{ marginTop: 14, padding: 14, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
          {content || "Generated learning content will appear here."}
        </div>
      </div>
    </div>
  );
}
