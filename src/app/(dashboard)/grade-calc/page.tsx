"use client";

/**
 * Phase 2 — Tiered Grade Calculator
 * --------------------------------
 * Three calculators behind one route, gated by user.preset:
 *   - HIGHSCHOOL  → "needed on final" (existing)
 *   - COLLEGE     → cumulative GPA (4.0 scale)
 *   - UNIVERSITY  → credit-weighted % + class-average delta + bell curve
 *
 * Users can override the active view via the tier switcher (preview only —
 * doesn't change their saved preset).
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { formatTorontoDate } from "~/lib/toronto-time";
import { useUserTier, type UserTier } from "~/lib/use-user-tier";

/* ──────────────────────────────────────────────────────────── */
/*  Types                                                       */
/* ──────────────────────────────────────────────────────────── */

type RecentRow = {
  id: string;
  tier: UserTier;
  courseName: string;
  createdAt?: string;
  // Tier-specific display fields
  neededOnFinal?: number;
  gpa?: number;
  weightedAverage?: number;
  classAverage?: number;
  totalCredits?: number;
};

type HSResult = {
  neededOnFinal: number;
  isPossible: boolean;
  isEasy: boolean;
  message: string;
};

type CollegeCourse = {
  id: string;
  name: string;
  credits: string;
  letterGrade: LetterGrade;
};

type UniCourse = {
  id: string;
  name: string;
  grade: string;
  credits: string;
  classAverage: string;
};

type LetterGrade =
  | "A+" | "A" | "A-"
  | "B+" | "B" | "B-"
  | "C+" | "C" | "C-"
  | "D+" | "D" | "D-"
  | "F";

const LETTER_GPA: Record<LetterGrade, number> = {
  "A+": 4.3, A: 4.0, "A-": 3.7,
  "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7,
  "D+": 1.3, D: 1.0, "D-": 0.7,
  F: 0.0,
};

const LETTER_GRADES: LetterGrade[] = [
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D", "D-",
  "F",
];

/* ──────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ──────────────────────────────────────────────────────────── */

function asNum(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function newRowId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function resultTone(score: number): { color: string; label: string } {
  if (score <= 50) return { color: "#10b981", label: "Easy! You've basically got this 🎉" };
  if (score <= 70) return { color: "#14b8a6", label: "Totally doable 👍" };
  if (score <= 85) return { color: "#f0b429", label: "You'll need to study hard 📚" };
  if (score <= 99) return { color: "#f97316", label: "Very challenging ⚠️" };
  return { color: "#ef4444", label: "Not mathematically possible ❌" };
}

function gpaTone(gpa: number): { color: string; label: string } {
  if (gpa >= 3.7) return { color: "#22d3ee", label: "Dean's List range 🌟" };
  if (gpa >= 3.3) return { color: "#14b8a6", label: "Strong showing 💪" };
  if (gpa >= 2.7) return { color: "#a3e635", label: "Solid pass ✓" };
  if (gpa >= 2.0) return { color: "#f0b429", label: "Above academic standing" };
  return { color: "#ef4444", label: "Below academic standing ⚠️" };
}

const TIER_META: Record<
  UserTier,
  { label: string; sub: string; icon: typeof GraduationCap; accent: string; halo: string }
> = {
  HIGHSCHOOL: {
    label: "High School",
    sub: "Needed-on-final calculator",
    icon: BookOpen,
    accent: "#f0b429",
    halo: "rgba(240,180,41,0.18)",
  },
  COLLEGE: {
    label: "College",
    sub: "Cumulative GPA · 4.0 scale",
    icon: GraduationCap,
    accent: "#22d3ee",
    halo: "rgba(34,211,238,0.18)",
  },
  UNIVERSITY: {
    label: "University",
    sub: "Credit-weighted % · class average",
    icon: Building2,
    accent: "#a78bfa",
    halo: "rgba(167,139,250,0.18)",
  },
};

/* ──────────────────────────────────────────────────────────── */
/*  Page                                                        */
/* ──────────────────────────────────────────────────────────── */

export default function GradeCalcPage() {
  const userTier = useUserTier();
  const [override, setOverride] = useState<UserTier | null>(null);
  const tier = override ?? userTier;

  const [recent, setRecent] = useState<RecentRow[]>([]);

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/grade-calc", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { calcs?: Array<Record<string, unknown>> };
      const rows: RecentRow[] = (data.calcs ?? []).map((entry, index) => {
        const tierVal = typeof entry.tier === "string" ? entry.tier : "HIGHSCHOOL";
        const rowId = typeof entry.id === "string" ? entry.id : `row-${index}`;
        return {
          id: rowId,
          tier: (tierVal === "COLLEGE" || tierVal === "UNIVERSITY"
            ? tierVal
            : "HIGHSCHOOL") as UserTier,
          courseName: typeof entry.courseName === "string" ? entry.courseName : "Untitled",
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : undefined,
          neededOnFinal: typeof entry.neededOnFinal === "number" ? entry.neededOnFinal : undefined,
          gpa: typeof entry.gpa === "number" ? entry.gpa : undefined,
          weightedAverage: typeof entry.currentGrade === "number" && entry.tier === "UNIVERSITY"
            ? entry.currentGrade
            : undefined,
          classAverage: typeof entry.classAverage === "number" ? entry.classAverage : undefined,
          totalCredits: typeof entry.creditHours === "number" ? entry.creditHours : undefined,
        };
      });
      setRecent(rows);
    } catch {
      /* swallow */
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const meta = TIER_META[tier];

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="kv-crumb">Kyvex / <b>Grade Calculator</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Grade Calculator</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>{meta.sub}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 22 }}>
          <TierSwitcher
            value={tier}
            override={override}
            userTier={userTier}
            onChange={setOverride}
          />
        </div>

        <div style={{ marginTop: 28 }}>
          {tier === "HIGHSCHOOL" && <HSCalculator onSaved={loadRecent} />}
          {tier === "COLLEGE" && <CollegeGPACalculator onSaved={loadRecent} />}
          {tier === "UNIVERSITY" && <UniversityCalculator onSaved={loadRecent} />}
        </div>

        <section style={{ marginTop: 36 }}>
          <p className="kv-meta">Recent calculations</p>
          <RecentCalculations rows={recent} />
        </section>
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Tier switcher                                               */
/* ──────────────────────────────────────────────────────────── */

function TierSwitcher({
  value,
  override,
  userTier,
  onChange,
}: {
  value: UserTier;
  override: UserTier | null;
  userTier: UserTier;
  onChange: (next: UserTier | null) => void;
}) {
  const tiers: UserTier[] = ["HIGHSCHOOL", "COLLEGE", "UNIVERSITY"];

  return (
    <>
      {tiers.map((t) => {
        const meta = TIER_META[t];
        const Icon = meta.icon;
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t === userTier ? null : t)}
            className={active ? "kv-btn-ghost on" : "kv-btn-ghost"}
          >
            <Icon size={12} strokeWidth={1.8} />
            <span>{meta.label}</span>
          </button>
        );
      })}
      {override !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="kv-btn-ghost"
          title="Reset to your saved preset"
        >
          Reset
        </button>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  HIGH SCHOOL — Needed on Final                               */
/* ──────────────────────────────────────────────────────────── */

function HSCalculator({ onSaved }: { onSaved: () => Promise<void> }) {
  const [courseName, setCourseName] = useState("");
  const [currentGrade, setCurrentGrade] = useState("75");
  const [currentWeight, setCurrentWeight] = useState("70");
  const [finalWeight, setFinalWeight] = useState("30");
  const [targetGrade, setTargetGrade] = useState("85");

  const [result, setResult] = useState<HSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayScore, setDisplayScore] = useState(0);

  const tone = useMemo(() => (result ? resultTone(result.neededOnFinal) : null), [result]);

  // Animate displayScore toward result.neededOnFinal
  useEffect(() => {
    if (!result) {
      setDisplayScore(0);
      return;
    }
    const target = result.neededOnFinal;
    const duration = 1000;
    const start = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      setDisplayScore(Math.round(target * progress * 10) / 10);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [result]);

  async function calculate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/grade-calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "HIGHSCHOOL",
          courseName,
          currentGrade: asNum(currentGrade),
          currentWeight: asNum(currentWeight),
          finalWeight: asNum(finalWeight),
          targetGrade: asNum(targetGrade),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | (Partial<HSResult> & { error?: string })
        | null;
      if (!res.ok || !body) {
        setError(body?.error ?? "Could not calculate right now.");
        return;
      }
      setResult({
        neededOnFinal: typeof body.neededOnFinal === "number" ? body.neededOnFinal : 0,
        isPossible: Boolean(body.isPossible),
        isEasy: Boolean(body.isEasy),
        message: typeof body.message === "string" ? body.message : "Calculation complete.",
      });
      await onSaved();
    } catch {
      setError("Could not calculate right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <FieldLabel>Course name</FieldLabel>
      <KvInput value={courseName} onChange={setCourseName} placeholder="e.g. Biology" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <PercentField label="Current grade" value={currentGrade} onChange={setCurrentGrade} />
        <PercentField label="Current weight" value={currentWeight} onChange={setCurrentWeight} />
        <PercentField label="Final exam worth" value={finalWeight} onChange={setFinalWeight} />
        <PercentField label="Target grade" value={targetGrade} onChange={setTargetGrade} />
      </div>

      <p className="kv-meta num" style={{ marginTop: 12 }}>
        {currentWeight}/{finalWeight} term/final
      </p>

      <button
        type="button"
        onClick={() => void calculate()}
        disabled={loading}
        className="kv-btn"
        style={{ marginTop: 20 }}
      >
        {loading ? "Calculating…" : "Calculate"}
      </button>

      {error ? <p className="kv-meta" style={{ marginTop: 12, color: "#E5484D" }}>{error}</p> : null}

      {result && tone ? (
        <div style={{ marginTop: 28 }}>
          <p className="kv-meta">You need</p>
          <div
            className="kv-title num"
            style={{ fontSize: 48, fontWeight: 600, color: "var(--kv-text-primary)", marginTop: 8 }}
          >
            {displayScore.toFixed(1)}%
          </div>
          <p className="kv-meta" style={{ marginTop: 10 }}>{tone.label}</p>
          <p className="kv-sub" style={{ marginTop: 8 }}>{result.message}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  COLLEGE — Cumulative GPA (4.0 scale)                        */
/* ──────────────────────────────────────────────────────────── */

function CollegeGPACalculator({ onSaved }: { onSaved: () => Promise<void> }) {
  const [termName, setTermName] = useState("");
  const [courses, setCourses] = useState<CollegeCourse[]>([
    { id: "c-0", name: "", credits: "3", letterGrade: "A" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const { gpa, totalCredits } = useMemo(() => {
    let credits = 0;
    let points = 0;
    for (const row of courses) {
      const c = asNum(row.credits);
      if (c <= 0) continue;
      credits += c;
      points += (LETTER_GPA[row.letterGrade] ?? 0) * c;
    }
    return {
      gpa: credits > 0 ? Math.round((points / credits) * 100) / 100 : 0,
      totalCredits: credits,
    };
  }, [courses]);

  const tone = gpaTone(gpa);

  const addCourse = () =>
    setCourses((prev) => [
      ...prev,
      { id: newRowId("c"), name: "", credits: "3", letterGrade: "A" },
    ]);

  const removeCourse = (id: string) =>
    setCourses((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));

  const updateCourse = (id: string, patch: Partial<CollegeCourse>) =>
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  async function save() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const res = await fetch("/api/grade-calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "COLLEGE",
          courseName: termName,
          courses: courses.map((c) => ({
            name: c.name || "Untitled",
            credits: asNum(c.credits),
            letterGrade: c.letterGrade,
          })),
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; gpa?: number } | null;
      if (!res.ok || !body) {
        setError(body?.error ?? "Could not save.");
        return;
      }
      setSavedMsg(`Saved · GPA ${(body.gpa ?? 0).toFixed(2)}`);
      setTimeout(() => setSavedMsg(""), 3000);
      await onSaved();
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p className="kv-meta">Cumulative GPA</p>
          <div
            className="kv-title num"
            style={{ fontSize: 48, fontWeight: 600, color: "var(--kv-text-primary)", marginTop: 8 }}
          >
            {gpa.toFixed(2)}
          </div>
          <p className="kv-meta" style={{ marginTop: 8 }}>{tone.label}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="kv-meta">Total credits</p>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--kv-text-primary)", marginTop: 6 }}>
            {totalCredits.toFixed(1)}
          </div>
        </div>
      </div>

      <FieldLabel>Term name</FieldLabel>
      <KvInput value={termName} onChange={setTermName} placeholder="e.g. Fall 2026" />

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p className="kv-meta">Courses</p>
          <button type="button" onClick={addCourse} className="kv-btn-ghost">
            <Plus size={11} strokeWidth={2} />
            Add course
          </button>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {courses.map((c) => (
            <div
              key={c.id}
              style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px auto", gap: 8, alignItems: "center" }}
            >
              <KvInput
                value={c.name}
                onChange={(v) => updateCourse(c.id, { name: v })}
                placeholder="Course name"
              />
              <KvNumber
                value={c.credits}
                onChange={(v) => updateCourse(c.id, { credits: v })}
                placeholder="Credits"
                min={0.5}
                max={6}
                step={0.5}
              />
              <LetterGradeSelect
                value={c.letterGrade}
                onChange={(v) => updateCourse(c.id, { letterGrade: v })}
              />
              <button
                type="button"
                onClick={() => removeCourse(c.id)}
                disabled={courses.length <= 1}
                className="kv-btn-danger"
                aria-label="Remove course"
              >
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || totalCredits === 0}
        className="kv-btn"
        style={{ marginTop: 20 }}
      >
        <Save size={13} strokeWidth={1.8} />
        {saving ? "Saving…" : "Save Calculation"}
      </button>

      {error ? <p className="kv-meta" style={{ marginTop: 12, color: "#E5484D" }}>{error}</p> : null}
      {savedMsg ? <p className="kv-meta" style={{ marginTop: 12 }}>{savedMsg}</p> : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  UNIVERSITY — Credit-weighted % + Class Average              */
/* ──────────────────────────────────────────────────────────── */

function UniversityCalculator({ onSaved }: { onSaved: () => Promise<void> }) {
  const [termName, setTermName] = useState("");
  const [courses, setCourses] = useState<UniCourse[]>([
    { id: "u-0", name: "", grade: "82", credits: "0.5", classAverage: "73" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const stats = useMemo(() => {
    let totalCredits = 0;
    let weightedGrade = 0;
    let creditsWithAvg = 0;
    let weightedClassAvg = 0;
    for (const row of courses) {
      const credits = asNum(row.credits);
      if (credits <= 0) continue;
      const grade = asNum(row.grade);
      totalCredits += credits;
      weightedGrade += grade * credits;
      const classAvgRaw = row.classAverage.trim();
      if (classAvgRaw) {
        const ca = asNum(classAvgRaw);
        creditsWithAvg += credits;
        weightedClassAvg += ca * credits;
      }
    }
    const finalGrade = totalCredits > 0 ? weightedGrade / totalCredits : 0;
    const finalClassAvg = creditsWithAvg > 0 ? weightedClassAvg / creditsWithAvg : null;
    const delta = finalClassAvg !== null ? finalGrade - finalClassAvg : null;
    return {
      totalCredits,
      finalGrade: Math.round(finalGrade * 10) / 10,
      finalClassAvg: finalClassAvg !== null ? Math.round(finalClassAvg * 10) / 10 : null,
      delta: delta !== null ? Math.round(delta * 10) / 10 : null,
    };
  }, [courses]);

  const tone =
    stats.delta === null
      ? { color: "#a78bfa", label: "" }
      : stats.delta >= 5
        ? { color: "#22d3ee", label: `+${stats.delta.toFixed(1)} above class avg` }
        : stats.delta >= 0
          ? { color: "#a3e635", label: `+${stats.delta.toFixed(1)} vs class avg` }
          : { color: "#f97316", label: `${stats.delta.toFixed(1)} vs class avg` };

  const addCourse = () =>
    setCourses((prev) => [
      ...prev,
      { id: newRowId("u"), name: "", grade: "75", credits: "0.5", classAverage: "" },
    ]);

  const removeCourse = (id: string) =>
    setCourses((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));

  const updateCourse = (id: string, patch: Partial<UniCourse>) =>
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  async function save() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const res = await fetch("/api/grade-calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "UNIVERSITY",
          courseName: termName,
          courses: courses.map((c) => ({
            name: c.name || "Untitled",
            grade: asNum(c.grade),
            credits: asNum(c.credits),
            classAverage: c.classAverage.trim() ? asNum(c.classAverage) : undefined,
          })),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; weightedAverage?: number }
        | null;
      if (!res.ok || !body) {
        setError(body?.error ?? "Could not save.");
        return;
      }
      setSavedMsg(`Saved · ${(body.weightedAverage ?? 0).toFixed(1)}%`);
      setTimeout(() => setSavedMsg(""), 3000);
      await onSaved();
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p className="kv-meta">Term Average</p>
          <div
            className="kv-title num"
            style={{ fontSize: 48, fontWeight: 600, color: "var(--kv-text-primary)", marginTop: 8 }}
          >
            {stats.finalGrade.toFixed(1)}%
          </div>
          {tone.label ? (
            <p className="kv-meta" style={{ marginTop: 8 }}>{tone.label}</p>
          ) : (
            <p className="kv-meta" style={{ marginTop: 8 }}>Add class averages to compare</p>
          )}
        </div>
        <BellCurve grade={stats.finalGrade} classAverage={stats.finalClassAvg} />
      </div>

      <FieldLabel>Term name</FieldLabel>
      <KvInput value={termName} onChange={setTermName} placeholder="e.g. Fall 2026" />

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p className="kv-meta">Courses</p>
          <button type="button" onClick={addCourse} className="kv-btn-ghost">
            <Plus size={11} strokeWidth={2} />
            Add course
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 72px 72px 72px auto",
            gap: 8,
            marginTop: 12,
          }}
        >
          <span className="kv-meta">Course</span>
          <span className="kv-meta" style={{ textAlign: "center" }}>Grade %</span>
          <span className="kv-meta" style={{ textAlign: "center" }}>Credits</span>
          <span className="kv-meta" style={{ textAlign: "center" }}>Class avg</span>
          <span />
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {courses.map((c) => (
            <div
              key={c.id}
              style={{ display: "grid", gridTemplateColumns: "1fr 72px 72px 72px auto", gap: 8, alignItems: "center" }}
            >
              <KvInput
                value={c.name}
                onChange={(v) => updateCourse(c.id, { name: v })}
                placeholder="Course name"
              />
              <KvNumber
                value={c.grade}
                onChange={(v) => updateCourse(c.id, { grade: v })}
                placeholder="%"
                min={0}
                max={100}
              />
              <KvNumber
                value={c.credits}
                onChange={(v) => updateCourse(c.id, { credits: v })}
                placeholder="cr"
                min={0.25}
                max={3}
                step={0.25}
              />
              <KvNumber
                value={c.classAverage}
                onChange={(v) => updateCourse(c.id, { classAverage: v })}
                placeholder="avg"
                min={0}
                max={100}
              />
              <button
                type="button"
                onClick={() => removeCourse(c.id)}
                disabled={courses.length <= 1}
                className="kv-btn-danger"
                aria-label="Remove course"
              >
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || stats.totalCredits === 0}
        className="kv-btn"
        style={{ marginTop: 20 }}
      >
        <Save size={13} strokeWidth={1.8} />
        {saving ? "Saving…" : "Save Calculation"}
      </button>

      {error ? <p className="kv-meta" style={{ marginTop: 12, color: "#E5484D" }}>{error}</p> : null}
      {savedMsg ? <p className="kv-meta" style={{ marginTop: 12 }}>{savedMsg}</p> : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Bell curve viz (small SVG)                                  */
/* ──────────────────────────────────────────────────────────── */

function BellCurve({
  grade,
  classAverage,
}: {
  grade: number;
  classAverage: number | null;
}) {
  // Generate a normal-distribution curve centered at 70 with sd=12
  const mean = classAverage ?? 70;
  const sd = 12;
  const points: string[] = [];
  for (let x = 30; x <= 100; x += 2) {
    const y = Math.exp(-Math.pow(x - mean, 2) / (2 * sd * sd));
    const px = ((x - 30) / 70) * 130;
    const py = 50 - y * 38;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  const userX = ((Math.max(30, Math.min(100, grade)) - 30) / 70) * 130;
  const avgX = classAverage !== null ? ((Math.max(30, Math.min(100, classAverage)) - 30) / 70) * 130 : null;
  const stroke = "var(--kv-text-primary)";
  const muted = "var(--kv-text-tertiary)";

  return (
    <svg width="130" height="55" viewBox="0 0 130 55" aria-hidden>
      <polyline
        points={`0,50 ${points.join(" ")} 130,50`}
        fill="none"
        stroke={muted}
        strokeWidth="1"
      />
      {avgX !== null && (
        <line x1={avgX} y1="50" x2={avgX} y2="14" stroke={muted} strokeWidth="1" strokeDasharray="2 2" />
      )}
      <line x1={userX} y1="50" x2={userX} y2="8" stroke={stroke} strokeWidth="1.5" />
      <circle cx={userX} cy="8" r="2.5" fill={stroke} />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Recent calcs list                                           */
/* ──────────────────────────────────────────────────────────── */

function RecentCalculations({ rows }: { rows: RecentRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="kv-meta" style={{ marginTop: 12 }}>
        No calculations yet. Save your first to see it here.
      </p>
    );
  }
  return (
    <div>
      {rows.map((row) => (
        <div key={row.id} className="kv-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="kv-row-title">{row.courseName}</div>
            <p className="kv-meta" style={{ marginTop: 6 }}>
              {TIER_META[row.tier].label}
              {row.createdAt ? ` · ${formatTorontoDate(row.createdAt)}` : ""}
            </p>
          </div>
          <div className="kv-row-side">
            <RecentValue row={row} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentValue({ row }: { row: RecentRow }) {
  if (row.tier === "COLLEGE" && typeof row.gpa === "number") {
    return (
      <>
        <div className="kv-meta num">{row.gpa.toFixed(2)}</div>
        <p className="kv-meta">GPA</p>
      </>
    );
  }
  if (row.tier === "UNIVERSITY" && typeof row.weightedAverage === "number") {
    return (
      <>
        <div className="kv-meta num">{row.weightedAverage.toFixed(1)}%</div>
        {typeof row.classAverage === "number" ? (
          <p className="kv-meta num">avg {row.classAverage.toFixed(1)}%</p>
        ) : null}
      </>
    );
  }
  if (typeof row.neededOnFinal === "number") {
    return (
      <>
        <div className="kv-meta num">{row.neededOnFinal.toFixed(1)}%</div>
        <p className="kv-meta">on final</p>
      </>
    );
  }
  return <span className="kv-meta">—</span>;
}

/* ──────────────────────────────────────────────────────────── */
/*  Form pieces                                                 */
/* ──────────────────────────────────────────────────────────── */

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="kv-meta" style={{ marginTop: 16, marginBottom: 8 }}>{children}</p>;
}

function KvInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="kv-field"
    />
  );
}

function KvNumber({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="kv-field num"
      style={{ textAlign: "center" }}
    />
  );
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="kv-meta" style={{ marginBottom: 8 }}>{label}</p>
      <KvNumber value={value} onChange={onChange} min={0} max={100} />
    </div>
  );
}

function LetterGradeSelect({
  value,
  onChange,
}: {
  value: LetterGrade;
  onChange: (v: LetterGrade) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LetterGrade)}
      className="kv-field num"
    >
      {LETTER_GRADES.map((g) => (
        <option key={g} value={g}>
          {g} ({LETTER_GPA[g].toFixed(1)})
        </option>
      ))}
    </select>
  );
}
