"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { OntarioCourseField } from "~/app/_components/ontario-course-field";
import { StudyLoopDiagram } from "~/app/_components/study-loop-diagram";

const ONBOARDED_KEY = "kyvex-onboarded";
const PROFILE_KEY = "kyvex-study-profile";

type GradeChoice = "9" | "10" | "11" | "12" | "other";

const GRADES: { id: GradeChoice; label: string }[] = [
  { id: "9", label: "Grade 9" },
  { id: "10", label: "Grade 10" },
  { id: "11", label: "Grade 11" },
  { id: "12", label: "Grade 12" },
  { id: "other", label: "Other" },
];

const QUICK: Record<GradeChoice, string[]> = {
  "9": ["ENG1D", "MPM1D", "SNC1D"],
  "10": ["ENG2D", "MPM2D", "SNC2D"],
  "11": ["ENG3U", "MCR3U", "SBI3U"],
  "12": ["MHF4U", "SCH4U", "ENG4U"],
  other: ["MHF4U", "SCH4U", "ENG4U"],
};

const LOOP_STEPS = [
  {
    label: "INBOX",
    accent: true,
    body: "photo, PDF, or YouTube → notes",
  },
  {
    label: "MY NOTES",
    body: "everything you save, tagged by course",
  },
  {
    label: "FLASHCARDS",
    body: "spaced repetition that schedules itself",
  },
  {
    label: "MOCK EXAM",
    body: "15 minutes, timed, honest grading",
  },
  {
    label: "NOVA",
    body: "sit with what you missed",
  },
] as const;

function persistProfile(grade: GradeChoice | null, courses: string[]) {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "1");
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        gradeLevel: grade,
        courses,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Paper onboarding — 3-screen client state machine.
 * Storage: mirrors the old tour flag (`kyvex-onboarded`) plus
 * `kyvex-study-profile` for grade/courses (User schema has no those fields).
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [grade, setGrade] = useState<GradeChoice | null>(null);
  const [courses, setCourses] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const gradeNums = useMemo(() => {
    if (!grade || grade === "other") return [9, 10, 11, 12];
    return [Number(grade)];
  }, [grade]);

  function addCourse(code: string) {
    const next = code.trim().toUpperCase();
    if (!next || courses.includes(next) || courses.length >= 3) return;
    setCourses((prev) => [...prev, next]);
    setDraft("");
  }

  function finish() {
    persistProfile(grade, courses);
    router.replace("/dashboard");
  }

  function skip() {
    persistProfile(grade, courses);
    router.replace("/dashboard");
  }

  return (
    <div className="auth-paper">
      <div className="onboard-shell">
        <div className="onboard-top">
          <Link href="/" className="auth-logo" aria-label="Kyvex home" style={{ marginBottom: 0 }}>
            <span className="auth-k">K</span>
            <span className="auth-wordmark">kyvex</span>
          </Link>
          <button type="button" className="onboard-skip kv-meta" onClick={skip}>
            Skip
          </button>
        </div>

        <div className="onboard-card">
          {step === 1 ? (
            <>
              <h1 className="kv-title auth-heading">
                Who&apos;s <em>studying?</em>
              </h1>
              <p className="kv-meta auth-eyebrow">KYVEX / WELCOME</p>

              <p className="kv-meta auth-label">GRADE</p>
              <div className="onboard-grade-row" role="group" aria-label="Grade level">
                {GRADES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={grade === g.id ? "kv-btn-ghost on" : "kv-btn-ghost"}
                    onClick={() => setGrade(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <OntarioCourseField
                id="onboard-ontario-courses"
                value={draft}
                onChange={(code) => {
                  setDraft(code);
                  if (/^[A-Z]{3}\d[A-Z0-9]$/.test(code)) {
                    addCourse(code);
                  }
                }}
                grades={gradeNums}
                label="ONTARIO COURSE CODE"
                showChip={false}
                showHint={false}
              />

              {grade ? (
                <div className="onboard-quick">
                  {QUICK[grade].map((code) => (
                    <button
                      key={code}
                      type="button"
                      className="kv-btn-ghost"
                      disabled={courses.includes(code) || courses.length >= 3}
                      onClick={() => addCourse(code)}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              ) : null}

              {courses.length > 0 ? (
                <div className="onboard-tags">
                  {courses.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className="kv-chip-course"
                      onClick={() => setCourses((prev) => prev.filter((c) => c !== code))}
                      aria-label={`Remove ${code}`}
                    >
                      {code} ×
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="onboard-actions">
                <button type="button" className="kv-btn" onClick={() => setStep(2)}>
                  Continue →
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className="kv-title auth-heading">
                The <em>loop.</em>
              </h1>
              <p className="kv-meta auth-eyebrow">KYVEX / WELCOME</p>
              <StudyLoopDiagram steps={LOOP_STEPS} />
              <p className="auth-side-serif" style={{ marginTop: 20 }}>
                built for the night before the test.
              </p>
              <div className="onboard-actions">
                <button type="button" className="kv-btn" onClick={() => setStep(3)}>
                  Continue →
                </button>
                <button type="button" className="kv-btn-ghost" onClick={() => setStep(1)}>
                  Back
                </button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1 className="kv-title auth-heading">
                Tonight&apos;s <em>homework.</em>
              </h1>
              <p className="kv-meta auth-eyebrow">KYVEX / WELCOME</p>
              <p className="onboard-lead">
                You have a test coming. Start where every loop starts.
              </p>
              <div className="onboard-actions">
                <button
                  type="button"
                  className="kv-btn"
                  onClick={() => {
                    persistProfile(grade, courses);
                    router.replace("/dashboard");
                  }}
                >
                  Open the Inbox →
                </button>
                <button type="button" className="kv-btn-ghost" onClick={finish}>
                  Explore first
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
