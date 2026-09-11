import { getCategoryLabel } from "@/lib/gradeUtils";
import { formatTorontoDate } from "~/lib/toronto-time";

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

export function ExamResultCard({ exam }: ExamResultCardProps) {
  const score =
    typeof exam.scorePercent === "number" && !Number.isNaN(exam.scorePercent)
      ? exam.scorePercent
      : null;

  const categories = [
    { key: "gradeKU", value: exam.gradeKU },
    { key: "gradeThinking", value: exam.gradeThinking },
    { key: "gradeComm", value: exam.gradeComm },
    { key: "gradeApp", value: exam.gradeApp },
  ];
  const hasOntarioBreakdown = categories.every((item) => typeof item.value === "number");
  const recordedOn = exam.resultRecordedAt ?? exam.examDate;

  return (
    <div className="kv-row">
      <div>
        <div className="kv-row-title">{exam.subject}</div>
        <div className="kv-row-sub">
          {/^[A-Z]{3,4}\d[A-Z]$/i.test(exam.subject.trim()) ? (
            <span className="kv-chip kv-chip-course">{exam.subject}</span>
          ) : (
            <span className="kv-chip">{exam.subject}</span>
          )}
          {hasOntarioBreakdown
            ? categories.map((item) => (
                <span key={item.key} className="kv-chip">
                  {getCategoryLabel(item.key)} {Number(item.value).toFixed(1)}%
                </span>
              ))
            : null}
        </div>
        {exam.resultNotes ? (
          <p className="kv-sub" style={{ marginTop: 8 }}>
            {exam.resultNotes}
          </p>
        ) : null}
        {score != null ? (
          <div className="kv-bar" style={{ marginTop: 10, maxWidth: 220 }}>
            <div style={{ width: `${score}%` }} />
          </div>
        ) : null}
      </div>
      <div style={{ textAlign: "right" }}>
        {score != null ? (
          <span className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em" }}>
            {score.toFixed(1)}%
          </span>
        ) : (
          <span className="kv-chip kv-chip-stale">No score</span>
        )}
        <div className="kv-row-side" style={{ marginTop: 6 }}>
          {formatTorontoDate(recordedOn)}
        </div>
      </div>
    </div>
  );
}
