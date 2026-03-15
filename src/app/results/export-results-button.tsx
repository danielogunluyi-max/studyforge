"use client";

type ResultExam = {
  id: string;
  subject: string;
  examDate: Date;
  scorePercent: number | null;
  gradeKU: number | null;
  gradeThinking: number | null;
  gradeComm: number | null;
  gradeApp: number | null;
  resultNotes: string | null;
  resultRecordedAt: Date | null;
};

export function ExportResultsButton({ results }: { results: ResultExam[] }) {
  const handleExport = () => {
    if (!results.length) return;
    const header = "Subject,Score,Date,Knowledge/Understanding,Thinking,Communication,Application,Notes\n";
    const rows = results
      .map((r) => {
        const date = new Date(r.examDate).toLocaleDateString("en-CA");
        const escape = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
        return [
          escape(r.subject),
          r.scorePercent != null ? r.scorePercent.toFixed(1) : "",
          date,
          r.gradeKU != null ? r.gradeKU.toFixed(1) : "",
          r.gradeThinking != null ? r.gradeThinking.toFixed(1) : "",
          r.gradeComm != null ? r.gradeComm.toFixed(1) : "",
          r.gradeApp != null ? r.gradeApp.toFixed(1) : "",
          escape(r.resultNotes),
        ].join(",");
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kyvex-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!results.length}
      className="kv-btn-ghost text-sm"
    >
      Export CSV
    </button>
  );
}
