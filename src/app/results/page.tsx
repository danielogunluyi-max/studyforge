import { redirect } from "next/navigation";
import { getExamResults } from "@/app/actions/examResults";
import { ExamResultCard } from "@/components/ExamResultCard";
import { auth } from "~/server/auth";
import { ExportResultsButton } from "./export-results-button";

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
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const selectedSubject = params.subject ?? "all";
  const sort = params.sort ?? "date";

  const allResults = (await getExamResults(session.user.id)) as ResultExam[];

  const subjects = Array.from(new Set(allResults.map((exam) => exam.subject))).sort((a, b) => a.localeCompare(b));

  const filtered = allResults.filter((exam) => (selectedSubject === "all" ? true : exam.subject === selectedSubject));

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "score") {
      return (b.scorePercent ?? 0) - (a.scorePercent ?? 0);
    }
    return new Date(b.examDate).getTime() - new Date(a.examDate).getTime();
  });

  const scoreValues = allResults.map((exam) => exam.scorePercent ?? 0);
  const avgScore = average(scoreValues);
  const best = [...allResults].sort((a, b) => (b.scorePercent ?? 0) - (a.scorePercent ?? 0))[0] ?? null;
  const last3Avg = average(allResults.slice(0, 3).map((exam) => exam.scorePercent ?? 0));
  const prev3Avg = average(allResults.slice(3, 6).map((exam) => exam.scorePercent ?? 0));
  const trendDelta = last3Avg - prev3Avg;
  const hasTrend = allResults.length >= 6;

  return (
    <main className="kv-page min-h-screen pb-24">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-5 border-b border-[var(--border-subtle)] pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="kv-page-title text-[28px] font-bold tracking-tight text-white">My Results</h1>
              <p className="kv-page-subtitle mt-1.5 mb-0 text-sm text-[var(--text-secondary)]">Track your academic progress</p>
            </div>
            <ExportResultsButton results={allResults} />
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="kv-card p-4">
            <p className="text-xs text-[var(--text-secondary)]">Average Score</p>
            <p className="mt-2 text-[26px] font-extrabold text-white">{avgScore.toFixed(1)}%</p>
          </div>

          <div className="kv-card p-4">
            <p className="text-xs text-[var(--text-secondary)]">Best Score</p>
            <p className="mt-2 text-[26px] font-extrabold text-white">{best ? `${(best.scorePercent ?? 0).toFixed(1)}%` : "-"}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{best?.subject ?? "No exams yet"}</p>
          </div>

          <div className="kv-card p-4">
            <p className="text-xs text-[var(--text-secondary)]">Total Exams Recorded</p>
            <p className="mt-2 text-[26px] font-extrabold text-white">{allResults.length}</p>
          </div>

          <div className="kv-card p-4">
            <p className="text-xs text-[var(--text-secondary)]">Improvement Trend</p>
            <p className="mt-2 text-[26px] font-extrabold" style={{ color: trendDelta >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
              {hasTrend ? `${trendDelta >= 0 ? "↑" : "↓"} ${Math.abs(trendDelta).toFixed(1)}%` : "N/A"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{hasTrend ? "Last 3 vs previous 3" : "Need at least 6 results"}</p>
          </div>
        </section>

        <form method="GET" className="kv-card mb-5 flex flex-wrap items-end gap-3 p-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="subject" className="kv-label mb-1.5 block text-xs text-[var(--text-secondary)]">Subject</label>
            <select id="subject" name="subject" defaultValue={selectedSubject} className="kv-select h-10 w-full">
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px] flex-1">
            <label htmlFor="sort" className="kv-label mb-1.5 block text-xs text-[var(--text-secondary)]">Sort By</label>
            <select id="sort" name="sort" defaultValue={sort} className="kv-select h-10 w-full">
              <option value="date">Date (Newest)</option>
              <option value="score">Score (Highest)</option>
            </select>
          </div>

          <button type="submit" className="kv-btn-primary h-10 px-5">Apply</button>
        </form>

        {sorted.length === 0 ? (
          <div className="kv-card kv-empty py-12 text-center">
            <div aria-hidden="true" className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[var(--border-default)] text-3xl text-[var(--text-secondary)]">
              📊
            </div>
            <p className="font-semibold text-[var(--text-primary)]">No results recorded yet.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Record your first exam result from the Dashboard.
            </p>
          </div>
        ) : (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((exam) => (
              <ExamResultCard key={exam.id} exam={exam} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
