"use client";

import { useMemo, useState } from "react";
import { recordExamResult } from "@/app/actions/examResults";
import {
  calculateOntarioOverall,
  getGradeColor,
  percentToLetter,
} from "@/lib/gradeUtils";
import { useToast } from "~/app/_components/toast";

type ResultMode = "simple" | "ontario";

type ModalExam = {
  id: string;
  subject: string;
  examDate: string;
  board: string | null;
};

type RecordResultModalProps = {
  exam: ModalExam;
  onClose: () => void;
  onSuccess: () => void;
};

function parsePercent(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function inputBaseStyle(): React.CSSProperties {
  return {
    width: "100%",
    background: "var(--bg-card-hover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    outline: "none",
  };
}

export function RecordResultModal({ exam, onClose, onSuccess }: RecordResultModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<ResultMode>("simple");
  const [scorePercent, setScorePercent] = useState("");
  const [gradeKU, setGradeKU] = useState("");
  const [gradeThinking, setGradeThinking] = useState("");
  const [gradeComm, setGradeComm] = useState("");
  const [gradeApp, setGradeApp] = useState("");
  const [resultNotes, setResultNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitHover, setSubmitHover] = useState(false);

  const simpleScore = parsePercent(scorePercent);

  const ontarioOverall = useMemo(() => {
    const ku = parsePercent(gradeKU);
    const thinking = parsePercent(gradeThinking);
    const comm = parsePercent(gradeComm);
    const app = parsePercent(gradeApp);

    if (
      typeof ku !== "number" ||
      typeof thinking !== "number" ||
      typeof comm !== "number" ||
      typeof app !== "number"
    ) {
      return undefined;
    }

    return calculateOntarioOverall(ku, thinking, comm, app);
  }, [gradeApp, gradeComm, gradeKU, gradeThinking]);

  const liveScore = mode === "simple" ? simpleScore : ontarioOverall;
  const liveLetter = typeof liveScore === "number" ? percentToLetter(liveScore) : "-";
  const liveColor = typeof liveScore === "number" ? getGradeColor(liveScore) : "var(--text-secondary)";

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await recordExamResult({
        examId: exam.id,
        mode,
        scorePercent: parsePercent(scorePercent),
        gradeKU: parsePercent(gradeKU),
        gradeThinking: parsePercent(gradeThinking),
        gradeComm: parsePercent(gradeComm),
        gradeApp: parsePercent(gradeApp),
        resultNotes,
      });

      if (!response.success) {
        setError(response.error ?? "Failed to record result");
        return;
      }

      showToast("Result recorded! 🎉", "success");
      onSuccess();
      onClose();
    } catch {
      setError("Failed to record result");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? "var(--accent-blue)" : "var(--bg-card-hover)",
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 20,
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 20, fontWeight: 700 }}>
            Record Result - {exam.subject}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--bg-card-hover)",
              color: "var(--text-secondary)",
              width: 32,
              height: 32,
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => setMode("simple")} style={modeButtonStyle(mode === "simple")}>Simple Score</button>
          <button type="button" onClick={() => setMode("ontario")} style={modeButtonStyle(mode === "ontario")}>Ontario Curriculum</button>
        </div>

        {mode === "simple" ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={scorePercent}
              onChange={(event) => setScorePercent(event.target.value)}
              style={{ ...inputBaseStyle(), fontSize: 32, fontWeight: 700, padding: "12px 14px" }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "K/U %", value: gradeKU, onChange: setGradeKU, weight: "30% weight" },
                { label: "Thinking %", value: gradeThinking, onChange: setGradeThinking, weight: "30% weight" },
                { label: "Communication %", value: gradeComm, onChange: setGradeComm, weight: "20% weight" },
                { label: "Application %", value: gradeApp, onChange: setGradeApp, weight: "20% weight" },
              ].map((item) => (
                <div key={item.label}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 13, marginBottom: 6 }}>{item.label}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={item.value}
                    onChange={(event) => item.onChange(event.target.value)}
                    style={{ ...inputBaseStyle(), padding: "10px 12px", fontSize: 16 }}
                  />
                  <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 11 }}>{item.weight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
              {mode === "ontario" ? "Ontario Overall" : "Grade Preview"}
            </p>
            <p style={{ margin: 0, color: liveColor, fontSize: 22, fontWeight: 800 }}>{liveLetter}</p>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <p style={{ margin: 0, color: "var(--text-primary)", fontSize: 24, fontWeight: 700 }}>
              {typeof liveScore === "number" ? `${liveScore.toFixed(1)}%` : "-"}
            </p>
          </div>
          <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, liveScore ?? 0))}%`,
                height: "100%",
                background: liveColor,
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>Result Notes</label>
          <textarea
            value={resultNotes}
            onChange={(event) => setResultNotes(event.target.value)}
            placeholder="Any reflections on this exam..."
            rows={4}
            style={{ ...inputBaseStyle(), resize: "vertical", padding: "10px 12px", fontSize: 14 }}
          />
        </div>

        {error && (
          <p style={{ margin: "0 0 12px", color: "var(--accent-red)", fontSize: 13 }}>{error}</p>
        )}

        <button
          type="button"
          onClick={() => {
            void submit();
          }}
          disabled={isSubmitting}
          onMouseEnter={() => setSubmitHover(true)}
          onMouseLeave={() => setSubmitHover(false)}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 8,
            background: submitHover && !isSubmitting ? "var(--accent-purple)" : "var(--accent-blue)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontWeight: 700,
            padding: "12px 16px",
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isSubmitting && (
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "var(--text-primary)",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}
          Save Result
        </button>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
