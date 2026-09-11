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
    return (
      <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="kv-sub">Loading course...</p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="kv-crumb">
            Kyvex / <b>Ontario Curriculum</b>
          </div>
          <h1 className="kv-title" style={{ marginTop: 14 }}>{code}</h1>
          <p className="kv-sub" style={{ marginTop: 10 }}>Course not found.</p>
        </div>
      </main>
    );
  }

  const confidence = Math.max(0, Math.min(100, progress.confidence));

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="kv-crumb">
          Kyvex / <b>Ontario Curriculum</b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <div>
            <h1 className="kv-title">
              {course.code} {course.title}
            </h1>
            <div className="kv-row-sub" style={{ marginTop: 10 }}>
              <span className="kv-chip kv-chip-course">{course.code}</span>
              <span className="kv-chip">Grade {course.grade}</span>
              <span className="kv-chip">{course.subject}</span>
              <span className="kv-chip">{course.destination}</span>
            </div>
            <p className="kv-sub" style={{ marginTop: 10 }}>{course.description}</p>
          </div>
          <button type="button" className="kv-btn" onClick={() => setShowLearnModal(true)}>
            Open Learn Mode
          </button>
        </div>

        <p className="kv-meta" style={{ marginTop: 28 }}>
          {course.units.length} units · {expectationCount} expectations
        </p>
        <div style={{ marginTop: 10, maxWidth: 280 }}>
          <span className="kv-meta num">Confidence {confidence}%</span>
          <div className="kv-bar" style={{ marginTop: 8 }}>
            <div style={{ width: `${confidence}%` }} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {course.units.map((unit) => {
            const completedUnit = progress.completedUnits.includes(unit.code);
            return (
              <div key={unit.id}>
                <div className="kv-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{unit.code} · {unit.title}</div>
                    {unit.description ? (
                      <p className="kv-sub" style={{ marginTop: 6 }}>{unit.description}</p>
                    ) : null}
                  </div>
                  <button type="button" className="kv-btn-ghost" onClick={() => toggleUnit(unit.code)}>
                    {completedUnit ? "Mark Incomplete" : "Mark Complete"}
                  </button>
                </div>

                {unit.expectations.map((expectation) => {
                  const completed = progress.completedExpectations.includes(expectation.code);
                  return (
                    <div key={expectation.id} className="kv-row" style={{ paddingLeft: 16 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="kv-row-title">{expectation.code} · {expectation.title}</div>
                        {expectation.description ? (
                          <p className="kv-sub" style={{ marginTop: 6 }}>{expectation.description}</p>
                        ) : null}
                      </div>
                      <button type="button" className="kv-btn-ghost" onClick={() => toggleExpectation(expectation.code)}>
                        {completed ? "Undo" : "Done"}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
