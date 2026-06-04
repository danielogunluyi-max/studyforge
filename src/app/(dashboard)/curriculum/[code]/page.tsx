"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CurriculumLearnModal } from "~/app/_components/CurriculumLearnModal";

type CurriculumExpectation = {
  id: string;
  code: string;
  title: string;
  description: string;
  strand: string;
};

type CurriculumUnit = {
  id: string;
  code: string;
  title: string;
  description: string;
  weight: number;
  orderIndex: number;
  expectations: CurriculumExpectation[];
};

type CurriculumCourse = {
  id: string;
  code: string;
  title: string;
  grade: number;
  subject: string;
  destination: string;
  description: string;
  keywords: string[];
  units: CurriculumUnit[];
};

type Progress = {
  completedUnits: string[];
  completedExpectations: string[];
  confidence: number;
};

export default function CurriculumCoursePage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();

  const [course, setCourse] = useState<CurriculumCourse | null>(null);
  const [progress, setProgress] = useState<Progress>({ completedUnits: [], completedExpectations: [], confidence: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showLearnModal, setShowLearnModal] = useState(false);

  const expectationCount = useMemo(
    () => course?.units.reduce((sum, unit) => sum + unit.expectations.length, 0) ?? 0,
    [course],
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const response = await fetch(`/api/curriculum/${code}`);
      const payload = (await response.json().catch(() => ({}))) as { course?: CurriculumCourse; progress?: Progress | null };
      setCourse(payload.course ?? null);
      if (payload.progress) {
        setProgress({
          completedUnits: payload.progress.completedUnits ?? [],
          completedExpectations: payload.progress.completedExpectations ?? [],
          confidence: payload.progress.confidence ?? 0,
        });
      }
      setIsLoading(false);
    };

    if (code) {
      void load();
    }
  }, [code]);

  const persistProgress = async (next: Progress) => {
    setProgress(next);
    await fetch(`/api/curriculum/${code}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  };

  const toggleUnit = (unitCode: string) => {
    const set = new Set(progress.completedUnits);
    if (set.has(unitCode)) set.delete(unitCode);
    else set.add(unitCode);

    void persistProgress({ ...progress, completedUnits: Array.from(set), confidence: Math.min(100, progress.confidence + 2) });
  };

  const toggleExpectation = (expectationCode: string) => {
    const set = new Set(progress.completedExpectations);
    if (set.has(expectationCode)) set.delete(expectationCode);
    else set.add(expectationCode);

    void persistProgress({ ...progress, completedExpectations: Array.from(set), confidence: Math.min(100, progress.confidence + 1) });
  };

  if (isLoading) {
    return <main className="kv-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>Loading course...</main>;
  }

  if (!course) {
    return <main className="kv-page kv-empty" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>Course not found.</main>;
  }

  return (
    <main className="kv-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 100px" }}>
      <div className="kv-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 className="kv-page-title">{course.code} • {course.title}</h1>
            <p className="kv-page-subtitle" style={{ marginTop: 6, marginBottom: 0 }}>
              Grade {course.grade} • {course.subject} • {course.destination}
            </p>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>{course.description}</p>
          </div>
          <button className="kv-btn-primary" onClick={() => setShowLearnModal(true)}>Open Learn Mode</button>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge">{course.units.length} units</span>
          <span className="badge">{expectationCount} expectations</span>
          <span className="badge">Confidence {progress.confidence}%</span>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {course.units.map((unit) => {
          const completedUnit = progress.completedUnits.includes(unit.code);
          return (
            <div key={unit.id} className="kv-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{unit.code} • {unit.title}</p>
                <button className="kv-btn-ghost" onClick={() => toggleUnit(unit.code)}>
                  {completedUnit ? "Mark Incomplete" : "Mark Complete"}
                </button>
              </div>
              <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 13 }}>{unit.description}</p>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {unit.expectations.map((expectation) => {
                  const completed = progress.completedExpectations.includes(expectation.code);
                  return (
                    <div key={expectation.id} className="kv-card-elevated" style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{expectation.code} • {expectation.title}</p>
                        <button className="kv-btn-ghost" onClick={() => toggleExpectation(expectation.code)}>
                          {completed ? "Undo" : "Done"}
                        </button>
                      </div>
                      <p style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 13 }}>{expectation.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <CurriculumLearnModal
        open={showLearnModal}
        courseCode={course.code}
        unitOptions={course.units.map((unit) => ({ code: unit.code, title: unit.title }))}
        expectationOptions={course.units.flatMap((unit) =>
          unit.expectations.map((expectation) => ({ code: expectation.code, title: expectation.title })),
        )}
        onClose={() => setShowLearnModal(false)}
      />
    </main>
  );
}
