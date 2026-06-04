"use client";

import { useEffect, useMemo, useState } from "react";

type StatusCourse = {
  code: string;
  name: string;
  grade: number;
  subject: string;
  type: string;
  isSeeded: boolean;
  expectationCount: number;
};

export default function CurriculumAdminSeederPage() {
  const [courses, setCourses] = useState<StatusCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeCode, setActiveCode] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const refreshStatus = async () => {
    const response = await fetch("/api/curriculum/admin/status", { cache: "no-store" });
    if (!response.ok) return;

    const payload = (await response.json().catch(() => ({}))) as { courses?: StatusCourse[] };
    setCourses(payload.courses ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const appendLog = (line: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${line}`].slice(-500));
  };

  const seeded = useMemo(() => courses.filter((course) => course.isSeeded).length, [courses]);
  const pending = useMemo(() => courses.length - seeded, [courses.length, seeded]);
  const progress = courses.length === 0 ? 0 : Math.round((seeded / courses.length) * 100);

  const seedOneCourse = async (courseCode: string, force = false) => {
    setActiveCode(courseCode);
    appendLog(`Starting ${courseCode}`);

    try {
      const response = await fetch("/api/curriculum/admin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode, force }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        expectationsSeeded?: number;
      };

      if (!response.ok || !payload.success) {
        appendLog(`Failed ${courseCode}: ${payload.error ?? "Unknown error"}`);
      } else {
        appendLog(`Seeded ${courseCode}: ${payload.expectationsSeeded ?? 0} expectations`);
      }
    } catch {
      appendLog(`Failed ${courseCode}: network error`);
    } finally {
      setActiveCode("");
      await refreshStatus();
    }
  };

  const seedAllPending = async () => {
    setIsSeeding(true);
    appendLog("Starting full seeding run");

    const list = courses.filter((course) => !course.isSeeded);
    for (const course of list) {
      await seedOneCourse(course.code, false);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    appendLog("Full seeding run complete");
    setIsSeeding(false);
  };

  if (isLoading) {
    return <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>Loading admin seeder...</main>;
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 100px" }}>
      <h1 className="text-title">Curriculum Auto-Seeder Admin</h1>

      <div className="card" style={{ padding: 14, marginTop: 14 }}>
        <p style={{ margin: 0 }}>Total courses in list: {courses.length}</p>
        <p style={{ marginTop: 6 }}>Already seeded: {seeded}</p>
        <p style={{ marginTop: 6 }}>Not yet seeded: {pending}</p>

        <div style={{ marginTop: 10, borderRadius: 9999, overflow: "hidden", background: "#1f2937", height: 10 }}>
          <div style={{ height: 10, width: `${progress}%`, background: "#22c55e", transition: "width 200ms ease" }} />
        </div>
        <p style={{ marginTop: 6, color: "var(--text-secondary)" }}>{seeded}/{courses.length} ({progress}%)</p>

        <button className="btn btn-primary" onClick={() => void seedAllPending()} disabled={isSeeding || pending === 0}>
          {isSeeding ? "Seeding..." : "Start Seeding"}
        </button>
      </div>

      <div className="card" style={{ marginTop: 14, padding: 14 }}>
        <p style={{ marginTop: 0, fontWeight: 700 }}>Live Logs</p>
        <div
          style={{
            background: "#020617",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 10,
            minHeight: 180,
            maxHeight: 320,
            overflowY: "auto",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {logs.length === 0 ? "No logs yet." : logs.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {courses.map((course) => {
          const statusText = course.isSeeded ? "seeded" : "pending";
          const statusColor = course.isSeeded ? "#22c55e" : "#f59e0b";

          return (
            <div key={course.code} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{course.code}</p>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>{course.name}</p>
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge">Gr. {course.grade}</span>
                  <span className="badge">{course.subject}</span>
                  <span className="badge">{course.type}</span>
                  <span className="badge" style={{ color: statusColor }}>{statusText}</span>
                  <span className="badge">{course.expectationCount} expectations</span>
                </div>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                disabled={activeCode === course.code || isSeeding}
                onClick={() => void seedOneCourse(course.code, true)}
              >
                {activeCode === course.code ? "Reseeding..." : "Reseed"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
