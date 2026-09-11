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
  { label: "All Grades", value: "all" },
  { label: "Gr. 9", value: "9" },
  { label: "Gr. 10", value: "10" },
  { label: "Gr. 11", value: "11" },
  { label: "Gr. 12", value: "12" },
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
        setStats(
          payload.stats ?? {
            totalCourses: payload.courses?.length ?? 0,
            seededCourses: 0,
            totalExpectations: 0,
          },
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [query, subject, grade]);

  const subjects = useMemo(
    () => Array.from(new Set(courses.map((c) => c.subject))).sort(),
    [courses],
  );
  const seededCourses = useMemo(() => courses.filter((c) => c.isSeeded), [courses]);

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="kv-crumb">
          Kyvex / <b>Ontario Curriculum</b>
        </div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Ontario Curriculum</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>
          Browse Grades 9–12 Ontario courses with seeded strands, expectations, and study workflows wired to Kyvex.
        </p>

        <div className="kv-stats" style={{ marginTop: 28, gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kv-stat">
            <span className="kv-meta">Total courses</span>
            <b className="num">{stats.totalCourses}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Seeded</span>
            <b className="num">{stats.seededCourses}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Expectations</span>
            <b className="num">{stats.totalExpectations}</b>
          </div>
        </div>

        <div className="kv-tabs" style={{ marginTop: 28, overflowX: "auto" }}>
          {GRADE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGrade(option.value)}
              className={grade === option.value ? "kv-tab on" : "kv-tab"}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          <input
            className="kv-field"
            style={{ flex: "1 1 220px" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, title, or topic"
          />
          <select
            className="kv-field"
            style={{ flex: "1 1 160px", maxWidth: 280 }}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 8 }}>
          {isLoading ? (
            <p className="kv-sub" style={{ marginTop: 16 }}>Loading courses...</p>
          ) : courses.length === 0 ? (
            <p className="kv-sub" style={{ marginTop: 16 }}>
              {subject
                ? `No ${subject} courses yet. Run the seeder from /curriculum/admin to load this subject.`
                : "No courses match your filters. Try clearing search or selecting a different grade."}
            </p>
          ) : (
            courses.map((course) => (
              <Link key={course.id} href={`/curriculum/${course.code}`} className="kv-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kv-row-title">{course.title}</div>
                  <div className="kv-row-sub">
                    <span className="kv-chip kv-chip-course">{course.code}</span>
                  </div>
                </div>
                <span className="kv-row-side">
                  Gr. {course.grade} · {course.subject}
                </span>
              </Link>
            ))
          )}
        </div>

        {!isLoading && seededCourses.length === 0 && !subject && courses.length > 0 ? (
          <p className="kv-sub" style={{ marginTop: 20 }}>
            No courses are seeded yet. Open /curriculum/admin and run the auto-seeder to populate strands and expectations.
          </p>
        ) : null}
      </div>
    </main>
  );
}
