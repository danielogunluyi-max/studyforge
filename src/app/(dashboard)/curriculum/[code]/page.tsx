"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CurriculumLearnModal } from "~/app/_components/CurriculumLearnModal";
import { formatTorontoDate } from "~/lib/toronto-time";

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
  doneExpectations: number;
  totalExpectations: number;
  masteryPct: number;
  completed: boolean;
  textbookRef: string | null;
  topics: string[];
  inboxHint: string | null;
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

type LinkedNote = {
  id: string;
  title: string;
  format: string;
  updatedAt: string;
};

export default function CurriculumCoursePage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();

  const [course, setCourse] = useState<CurriculumCourse | null>(null);
  const [progress, setProgress] = useState<Progress>({
    completedUnits: [],
    completedExpectations: [],
    confidence: 0,
  });
  const [linkedNotes, setLinkedNotes] = useState<LinkedNote[]>([]);
  const [coverage, setCoverage] = useState<{
    doneExpectations: number;
    totalExpectations: number;
    pct: number | null;
  } | null>(null);
  const [moat, setMoat] = useState<{ textbook: string; disclaimer: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  const expectationCount = useMemo(
    () => course?.units.reduce((sum, unit) => sum + unit.expectations.length, 0) ?? 0,
    [course],
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const response = await fetch(`/api/curriculum/${code}`);
      const payload = (await response.json().catch(() => ({}))) as {
        course?: CurriculumCourse;
        progress?: Progress | null;
        linkedNotes?: LinkedNote[];
        moat?: { textbook: string; disclaimer: string } | null;
        coverage?: { doneExpectations: number; totalExpectations: number; pct: number | null };
      };
      setCourse(payload.course ?? null);
      if (payload.progress) {
        setProgress({
          completedUnits: payload.progress.completedUnits ?? [],
          completedExpectations: payload.progress.completedExpectations ?? [],
          confidence: payload.progress.confidence ?? 0,
        });
      }
      setLinkedNotes(Array.isArray(payload.linkedNotes) ? payload.linkedNotes : []);
      setMoat(payload.moat ?? null);
      setCoverage(payload.coverage ?? null);
      setIsLoading(false);
    };

    if (code) void load();
  }, [code]);

  const persistProgress = async (next: Progress) => {
    setProgress(next);
    await fetch(`/api/curriculum/${code}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    // Refresh mastery % after manual toggle
    const response = await fetch(`/api/curriculum/${code}`);
    const payload = (await response.json().catch(() => ({}))) as {
      course?: CurriculumCourse;
      coverage?: { doneExpectations: number; totalExpectations: number; pct: number | null };
    };
    if (payload.course) setCourse(payload.course);
    if (payload.coverage) setCoverage(payload.coverage);
  };

  const toggleUnit = (unitCode: string) => {
    const set = new Set(progress.completedUnits);
    if (set.has(unitCode)) set.delete(unitCode);
    else set.add(unitCode);
    void persistProgress({
      ...progress,
      completedUnits: Array.from(set),
      confidence: Math.min(100, progress.confidence + 2),
    });
  };

  const toggleExpectation = (expectationCode: string) => {
    const set = new Set(progress.completedExpectations);
    if (set.has(expectationCode)) set.delete(expectationCode);
    else set.add(expectationCode);
    void persistProgress({
      ...progress,
      completedExpectations: Array.from(set),
      confidence: Math.min(100, progress.confidence + 1),
    });
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
          <h1 className="kv-title" style={{ marginTop: 14 }}>
            {code}
          </h1>
          <p className="kv-sub" style={{ marginTop: 10 }}>
            Course not found. Seed Grade 12 maps with{" "}
            <span className="num">npm run db:seed:curriculum</span>.
          </p>
        </div>
      </main>
    );
  }

  const confidence = Math.max(0, Math.min(100, progress.confidence));

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="kv-crumb">
          Kyvex / <Link href="/curriculum">Ontario Curriculum</Link> / <b>{course.code}</b>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 14,
          }}
        >
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
            <p className="kv-sub" style={{ marginTop: 10 }}>
              {course.description}
            </p>
          </div>
          <button type="button" className="kv-btn" onClick={() => setShowLearnModal(true)}>
            Open Learn Mode
          </button>
        </div>

        <div className="kv-stats" style={{ marginTop: 28, gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kv-stat">
            <span className="kv-meta">Units</span>
            <b className="num">{course.units.length}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Expectations done</span>
            <b className="num">
              {coverage?.doneExpectations ?? 0}
              <span className="kv-meta" style={{ fontWeight: 400 }}>
                {" "}
                / {coverage?.totalExpectations ?? expectationCount}
              </span>
            </b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Coverage</span>
            <b className="num">
              {coverage?.pct !== null && coverage?.pct !== undefined ? `${coverage.pct}%` : "—"}
            </b>
          </div>
        </div>

        <div style={{ marginTop: 16, maxWidth: 280 }}>
          <span className="kv-meta num">Confidence {confidence}%</span>
          <div className="kv-bar" style={{ marginTop: 8 }}>
            <div style={{ width: `${confidence}%` }} />
          </div>
        </div>

        {moat ? (
          <section style={{ marginTop: 28 }}>
            <p className="kv-meta">Moat map · {moat.textbook}</p>
            <p className="kv-sub" style={{ marginTop: 6 }}>
              {moat.disclaimer}
            </p>
          </section>
        ) : null}

        <section style={{ marginTop: 28 }}>
          <p className="kv-meta">Units</p>
          <div style={{ marginTop: 8 }}>
            {course.units.map((unit) => {
              const open = expandedUnit === unit.code;
              return (
                <div key={unit.id}>
                  <div className="kv-row">
                    <button
                      type="button"
                      onClick={() => setExpandedUnit(open ? null : unit.code)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        color: "inherit",
                      }}
                    >
                      <div className="kv-row-title">
                        {unit.code} · {unit.title}
                      </div>
                      <div className="kv-row-sub" style={{ marginTop: 6 }}>
                        <span className="kv-chip num">{unit.masteryPct}%</span>
                        <span className="kv-chip">
                          {unit.doneExpectations}/{unit.totalExpectations} expectations
                        </span>
                        {unit.textbookRef ? (
                          <span className="kv-chip">{unit.textbookRef}</span>
                        ) : null}
                      </div>
                      <div className="kv-bar" style={{ marginTop: 8, maxWidth: 200 }}>
                        <div style={{ width: `${unit.masteryPct}%` }} />
                      </div>
                    </button>
                    <button
                      type="button"
                      className="kv-btn-ghost"
                      style={{ minHeight: 44 }}
                      onClick={() => toggleUnit(unit.code)}
                    >
                      {unit.completed ? "Undo unit" : "Mark unit"}
                    </button>
                  </div>

                  {open ? (
                    <div style={{ paddingLeft: 8, paddingBottom: 8 }}>
                      {unit.inboxHint ? (
                        <p className="kv-sub" style={{ margin: "8px 0" }}>
                          {unit.inboxHint}{" "}
                          <Link href="/smart-upload" className="kv-btn-ghost" style={{ minHeight: 40 }}>
                            Open Inbox
                          </Link>
                        </p>
                      ) : null}
                      {unit.topics.length > 0 ? (
                        <div className="kv-row-sub" style={{ marginBottom: 8 }}>
                          {unit.topics.map((t) => (
                            <span key={t} className="kv-chip">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {unit.expectations.map((expectation) => {
                        const completed = progress.completedExpectations.includes(expectation.code);
                        return (
                          <div key={expectation.id} className="kv-row">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="kv-row-title">
                                {expectation.code} · {expectation.title}
                              </div>
                              {expectation.description ? (
                                <p className="kv-sub" style={{ marginTop: 6 }}>
                                  {expectation.description}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="kv-btn-ghost"
                              style={{ minHeight: 44 }}
                              onClick={() => toggleExpectation(expectation.code)}
                            >
                              {completed ? "Undo" : "Done"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: 28 }}>
          <div className="kv-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <p className="kv-meta">Notes tagged {course.code}</p>
            <Link href={`/my-notes?tag=${encodeURIComponent(course.code)}`} className="kv-row-side num">
              {linkedNotes.length} shown
            </Link>
          </div>
          {linkedNotes.length === 0 ? (
            <p className="kv-sub" style={{ marginTop: 8 }}>
              No notes tagged {course.code} yet — tag notes or capture into Inbox with this course.
            </p>
          ) : (
            linkedNotes.map((note) => (
              <Link
                key={note.id}
                href={`/my-notes?note=${encodeURIComponent(note.id)}`}
                className="kv-row"
              >
                <div>
                  <div className="kv-row-title">{note.title}</div>
                  <div className="kv-row-sub">
                    <span className="kv-chip">{note.format}</span>
                    <span className="kv-chip">{formatTorontoDate(note.updatedAt)}</span>
                  </div>
                </div>
                <span className="kv-row-side">Open →</span>
              </Link>
            ))
          )}
        </section>
      </div>

      <CurriculumLearnModal
        open={showLearnModal}
        courseCode={course.code}
        unitOptions={course.units.map((unit) => ({ code: unit.code, title: unit.title }))}
        expectationOptions={course.units.flatMap((unit) =>
          unit.expectations.map((expectation) => ({
            code: expectation.code,
            title: expectation.title,
          })),
        )}
        onClose={() => setShowLearnModal(false)}
      />
    </main>
  );
}
