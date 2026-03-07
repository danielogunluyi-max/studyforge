"use client";

import { useEffect, useMemo, useState } from "react";
import { getCategoryLabel, getGradeColor, percentToLetter } from "@/lib/gradeUtils";

type ExamWithResults = {
  id: string;
  subject: string;
  examDate: string | Date;
  scorePercent: number | null;
  gradeKU: number | null;
  gradeThinking: number | null;
  gradeComm: number | null;
  gradeApp: number | null;
  resultNotes: string | null;
  resultRecordedAt: string | Date | null;
};

type ExamResultCardProps = {
  exam: ExamWithResults;
};

function formatRecordedDate(value: string | Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function scoreValue(value: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function ExamResultCard({ exam }: ExamResultCardProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnimated(true);
    }, 70);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const overallScore = scoreValue(exam.scorePercent);
  const letter = percentToLetter(overallScore);
  const badgeColor = getGradeColor(overallScore);

  const categories = useMemo(
    () => [
      { key: "gradeKU", value: exam.gradeKU },
      { key: "gradeThinking", value: exam.gradeThinking },
      { key: "gradeComm", value: exam.gradeComm },
      { key: "gradeApp", value: exam.gradeApp },
    ],
    [exam.gradeApp, exam.gradeComm, exam.gradeKU, exam.gradeThinking],
  );

  const hasOntarioBreakdown = categories.every((item) => typeof item.value === "number");

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 700, fontSize: 18 }}>{exam.subject}</p>
        <span
          style={{
            borderRadius: 20,
            padding: "8px 14px",
            background: badgeColor,
            color: "var(--text-primary)",
            fontWeight: 800,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          {letter}
        </span>
      </div>

      <p style={{ margin: "8px 0 0", color: "var(--text-primary)", fontSize: 28, fontWeight: 800 }}>
        {overallScore.toFixed(1)}%
      </p>

      <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>
        Recorded on {formatRecordedDate(exam.resultRecordedAt)}
      </p>

      {hasOntarioBreakdown ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 10px", color: "var(--text-secondary)", fontSize: 13 }}>Category Breakdown</p>
          <div style={{ display: "grid", gap: 10 }}>
            {categories.map((item) => {
              const value = scoreValue(item.value);
              return (
                <div key={item.key}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>{getCategoryLabel(item.key)}</p>
                    <p style={{ margin: 0, color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}>{value.toFixed(1)}%</p>
                  </div>
                  <div style={{ width: "100%", height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${animated ? value : 0}%`,
                        height: "100%",
                        background: getGradeColor(value),
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ width: "100%", height: 10, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
            <div
              style={{
                width: `${animated ? overallScore : 0}%`,
                height: "100%",
                background: getGradeColor(overallScore),
                transition: "width 0.8s ease",
              }}
            />
          </div>
        </div>
      )}

      {exam.resultNotes && (
        <p style={{ margin: "14px 0 0", color: "var(--text-secondary)", fontStyle: "italic", fontSize: 13 }}>
          {exam.resultNotes}
        </p>
      )}
    </div>
  );
}
