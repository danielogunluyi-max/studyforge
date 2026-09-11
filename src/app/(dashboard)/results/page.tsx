import { redirect } from "next/navigation";
import { getExamResults } from "@/app/actions/examResults";
import { ExamResultCard } from "@/components/ExamResultCard";
import { getAuthSession } from "~/server/auth/session";
import { ExportResultsButton } from "./export-results-button";
import { loginUrlFor } from "~/lib/auth-redirect";

type ResultsPageProps = {
  searchParams?: Promise<{
    subject?: string;
    sort?: "date" | "score";
  }>;
};

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

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recordedScore(exam: ResultExam): number | null {
  return typeof exam.scorePercent === "number" && !Number.isNaN(exam.scorePercent)
    ? exam.scorePercent
    : null;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect(loginUrlFor("/results"));
  }

  const params = (await searchParams) ?? {};
  const selectedSubject = params.subject ?? "all";
  const sort = params.sort ?? "date";

  const allResults = (await getExamResults(session.user.id)) as ResultExam[];

  const subjects = Array.from(new Set(allResults.map((exam) => exam.subject))).sort((a, b) =>
    a.localeCompare(b),
  );

  const filtered = allResults.filter((exam) =>
    selectedSubject === "all" ? true : exam.subject === selectedSubject,
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "score") {
      return (recordedScore(b) ?? -1) - (recordedScore(a) ?? -1);
    }
    return new Date(b.examDate).getTime() - new Date(a.examDate).getTime();
  });

  const scoreValues = allResults
    .map(recordedScore)
    .filter((value): value is number => value != null);
  const avgScore = average(scoreValues);
  const best =
    [...allResults]
      .filter((exam) => recordedScore(exam) != null)
      .sort((a, b) => (recordedScore(b) ?? 0) - (recordedScore(a) ?? 0))[0] ?? null;

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="kv-crumb">
        Kyvex / <b>My Results</b>
      </div>
      <header className="mt-5 mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="kv-title" style={{ marginTop: 14 }}>
            My Results
          </h1>
          <p className="kv-sub mt-1.5">Recorded exam scores.</p>
        </div>
        <ExportResultsButton results={allResults} />
      </header>

      {avgScore != null ? (
        <section className="mb-8">
          <p className="kv-meta">Average score</p>
          <div
            className="num"
            style={{
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "var(--kv-text-primary)",
            }}
          >
            {avgScore.toFixed(1)}%
          </div>
          <p className="kv-meta" style={{ marginTop: 10 }}>
            {best ? `Best ${recordedScore(best)?.toFixed(1)}% · ${best.subject}` : null}
            {` · ${allResults.length} recorded`}
          </p>
        </section>
      ) : null}

      <form method="GET" className="mb-2 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="subject" className="kv-meta mb-1.5 block">
            Subject
          </label>
          <select id="subject" name="subject" defaultValue={selectedSubject} className="kv-field">
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px] flex-1">
          <label htmlFor="sort" className="kv-meta mb-1.5 block">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="kv-field">
            <option value="date">Date (Newest)</option>
            <option value="score">Score (Highest)</option>
          </select>
        </div>

        <button type="submit" className="kv-btn">
          Apply
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="kv-sub" style={{ marginTop: 24 }}>
          No results recorded yet. Record an exam result from the Dashboard.
        </p>
      ) : (
        <section>
          {sorted.map((exam) => (
            <ExamResultCard key={exam.id} exam={exam} />
          ))}
        </section>
      )}
      </div>
    </main>
  );
}
