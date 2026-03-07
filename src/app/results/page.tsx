import { redirect } from "next/navigation";
import { getExamResults } from "@/app/actions/examResults";
import { ExamResultCard } from "@/components/ExamResultCard";
import { auth } from "~/server/auth";

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
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: "24px 16px 96px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>My Results</h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>Track your academic progress</p>
        </header>

        <section
          style={{
            marginBottom: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>Average Score</p>
            <p style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 800 }}>{avgScore.toFixed(1)}%</p>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>Best Score</p>
            <p style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 800 }}>{best ? `${(best.scorePercent ?? 0).toFixed(1)}%` : "-"}</p>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>{best?.subject ?? "No exams yet"}</p>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>Total Exams Recorded</p>
            <p style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 800 }}>{allResults.length}</p>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12 }}>Improvement Trend</p>
            <p style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 800, color: trendDelta >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
              {hasTrend ? `${trendDelta >= 0 ? "↑" : "↓"} ${Math.abs(trendDelta).toFixed(1)}%` : "N/A"}
            </p>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>
              {hasTrend ? "Last 3 vs previous 3" : "Need at least 6 results"}
            </p>
          </div>
        </section>

        <form
          method="GET"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 18,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div style={{ minWidth: 220, flex: "1 1 220px" }}>
            <label htmlFor="subject" style={{ display: "block", marginBottom: 6, color: "var(--text-secondary)", fontSize: 12 }}>Subject</label>
            <select
              id="subject"
              name="subject"
              defaultValue={selectedSubject}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card-hover)",
                color: "var(--text-primary)",
                padding: "0 10px",
              }}
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 180, flex: "1 1 180px" }}>
            <label htmlFor="sort" style={{ display: "block", marginBottom: 6, color: "var(--text-secondary)", fontSize: 12 }}>Sort By</label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card-hover)",
                color: "var(--text-primary)",
                padding: "0 10px",
              }}
            >
              <option value="date">Date (Newest)</option>
              <option value="score">Score (Highest)</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              height: 40,
              borderRadius: 8,
              border: "none",
              background: "var(--accent-blue)",
              color: "var(--text-primary)",
              padding: "0 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </form>

        {sorted.length === 0 ? (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "48px 16px",
              textAlign: "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "1px solid var(--border)",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                fontSize: 30,
              }}
            >
              📊
            </div>
            <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 700 }}>No results recorded yet.</p>
            <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
              Record your first exam result from the Dashboard.
            </p>
          </div>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {sorted.map((exam) => (
              <ExamResultCard key={exam.id} exam={exam} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
