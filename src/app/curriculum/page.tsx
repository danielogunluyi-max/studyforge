"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CourseListItem = {
  id: string;
  code: string;
  title: string;
  grade: number;
  subject: string;
  category: string;
  type: string;
  destination: string;
  description: string;
  keywords: string[];
  unitCount: number;
  expectationCount: number;
  isSeeded: boolean;
};

type CurriculumStats = {
  totalCourses: number;
  seededCourses: number;
  totalExpectations: number;
};

const GRADE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Gr.9", value: "9" },
  { label: "Gr.10", value: "10" },
  { label: "Gr.11", value: "11" },
  { label: "Gr.12", value: "12" },
];

export default function CurriculumPage() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("all");
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [stats, setStats] = useState<CurriculumStats>({ totalCourses: 0, seededCourses: 0, totalExpectations: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "250" });
        if (grade !== "all") params.set("grade", grade);
        if (subject.trim()) params.set("subject", subject.trim());
        if (query.trim()) params.set("q", query.trim());

        const response = await fetch(`/api/curriculum?${params.toString()}`);
        const payload = (await response.json().catch(() => ({}))) as {
          courses?: CourseListItem[];
          stats?: CurriculumStats;
        };
        setCourses(payload.courses ?? []);
        setStats(payload.stats ?? { totalCourses: payload.courses?.length ?? 0, seededCourses: 0, totalExpectations: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [query, subject, grade]);

  const subjects = useMemo(() => Array.from(new Set(courses.map((course) => course.subject))).sort(), [courses]);
  const seededCourses = useMemo(() => courses.filter((course) => course.isSeeded), [courses]);

  return (
    <main className="kv-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 className="kv-page-title">Ontario Curriculum Hub</h1>
          <p className="kv-page-subtitle" style={{ marginTop: 4, marginBottom: 0 }}>Grades 9-12 courses, expectations, and seeding status.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
        <div className="kv-card" style={{ padding: 12 }}>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>Total Courses</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800 }}>{stats.totalCourses}</p>
        </div>
        <div className="kv-card" style={{ padding: 12 }}>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>Seeded</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800 }}>{stats.seededCourses}</p>
        </div>
        <div className="kv-card" style={{ padding: 12 }}>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>Total Expectations</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800 }}>{stats.totalExpectations}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
        {GRADE_OPTIONS.map((option) => (
          <button
            key={option.value}
            className="kv-btn-ghost"
            style={{ border: grade === option.value ? "1px solid #3b82f6" : undefined }}
            onClick={() => setGrade(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="kv-card" style={{ padding: 14, marginBottom: 16, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <input className="kv-input" placeholder="Search by code/title/topic" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="kv-select" value={subject} onChange={(event) => setSubject(event.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="kv-card" style={{ padding: 14 }}>Loading curriculum...</div>
      ) : courses.length === 0 && subject ? (
        <div className="kv-card kv-empty" style={{ padding: 14 }}>
          No {subject} courses seeded yet - run the seeder first.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 14 }}>
          {courses.map((course) => (
            <Link href={`/curriculum/${course.code}`} key={course.id} className="kv-card" style={{ padding: 14, textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{course.code}</p>
                <span className="badge">{course.subject} • Gr.{course.grade}</span>
              </div>
              <p style={{ marginTop: 6, fontWeight: 700 }}>{course.title}</p>
              <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 13 }}>{course.description}</p>
              {course.isSeeded ? (
                <>
                  <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12 }}>
                    {course.unitCount} strands • {course.expectationCount} expectations • {course.type}
                  </p>
                  <div className="kv-progress-track" style={{ marginTop: 8, borderRadius: 9999, overflow: "hidden", background: "#1f2937", height: 8 }}>
                    <div className="kv-progress-fill" style={{ width: "100%", height: 8, background: "#22c55e" }} />
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <span className="badge" style={{ color: "#f59e0b" }}>Awaiting seed</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {!isLoading && seededCourses.length === 0 && !subject && (
        <div className="kv-card kv-empty" style={{ padding: 14, marginTop: 14 }}>
          No courses are seeded yet. Open `/curriculum/admin` and run the auto-seeder.
        </div>
      )}
    </main>
  );
}
