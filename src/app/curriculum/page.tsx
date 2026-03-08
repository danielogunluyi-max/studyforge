"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CourseListItem = {
  id: string;
  code: string;
  title: string;
  grade: number;
  subject: string;
  destination: string;
  description: string;
  keywords: string[];
  unitCount: number;
  expectationCount: number;
};

export default function CurriculumPage() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ grade: "11", limit: "100" });
        if (subject.trim()) params.set("subject", subject.trim());
        if (query.trim()) params.set("q", query.trim());

        const response = await fetch(`/api/curriculum?${params.toString()}`);
        const payload = (await response.json().catch(() => ({}))) as { courses?: CourseListItem[] };
        setCourses(payload.courses ?? []);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [query, subject]);

  const subjects = useMemo(() => Array.from(new Set(courses.map((course) => course.subject))).sort(), [courses]);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 className="text-title">Ontario Curriculum Hub</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>Grade 11 courses, units, and expectations.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <input className="input" placeholder="Search by code/title/topic" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="input" value={subject} onChange={(event) => setSubject(event.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: 14 }}>Loading curriculum...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 14 }}>
          {courses.map((course) => (
            <Link href={`/curriculum/${course.code}`} key={course.id} className="card" style={{ padding: 14, textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{course.code}</p>
                <span className="badge">{course.subject}</span>
              </div>
              <p style={{ marginTop: 6, fontWeight: 700 }}>{course.title}</p>
              <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 13 }}>{course.description}</p>
              <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12 }}>
                {course.unitCount} units • {course.expectationCount} expectations • {course.destination}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
