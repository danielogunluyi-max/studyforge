"use client";

/**
 * Phase 2 — Tiered Grade Calculator
 * --------------------------------
 * Three Midnight Glass calculators behind one route, gated by user.preset:
 *   - HIGHSCHOOL  → "needed on final" (existing)
 *   - COLLEGE     → cumulative GPA (4.0 scale)
 *   - UNIVERSITY  → credit-weighted % + class-average delta + bell curve
 *
 * Users can override the active view via the tier switcher (preview only —
 * doesn't change their saved preset).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

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
        return {
          id: String(entry.id ?? index),
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
  const Icon = meta.icon;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black font-sans text-white antialiased">
      {/* Background grid mesh */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {/* Tier accent halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: meta.halo, willChange: "opacity" }}
      />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center will-change-transform"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">
            <Sparkles size={11} strokeWidth={1.7} />
            Academic Matrix
          </div>
          <h1 className="mt-4 bg-gradient-to-b from-zinc-100 to-zinc-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Grade Calculator
          </h1>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400">
            <Icon size={14} strokeWidth={1.7} style={{ color: meta.accent }} />
            <span style={{ color: meta.accent }}>{meta.label}</span>
            <span className="text-zinc-600">·</span>
            <span>{meta.sub}</span>
          </p>
        </motion.header>

        {/* Tier switcher */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mx-auto mb-8 flex w-full max-w-md justify-center will-change-transform"
        >
          <TierSwitcher
            value={tier}
            override={override}
            userTier={userTier}
            onChange={setOverride}
          />
        </motion.div>

        {/* Active calculator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tier}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ willChange: "transform" }}
          >
            {tier === "HIGHSCHOOL" && <HSCalculator onSaved={loadRecent} />}
            {tier === "COLLEGE" && <CollegeGPACalculator onSaved={loadRecent} />}
            {tier === "UNIVERSITY" && <UniversityCalculator onSaved={loadRecent} />}
          </motion.div>
        </AnimatePresence>

        {/* Recent */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mx-auto mt-10 max-w-2xl will-change-transform"
        >
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
            Recent calculations
          </h2>
          <RecentCalculations rows={recent} />
        </motion.section>
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Tier switcher (segmented capsule with sliding pill)         */
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
    <div className="relative inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-2xl">
      {tiers.map((t) => {
        const meta = TIER_META[t];
        const Icon = meta.icon;
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t === userTier ? null : t)}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
            style={{ color: active ? "#0a0a0f" : "#a1a1aa" }}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId="tier-switcher-pill"
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${meta.accent} 0%, #fff 200%)`,
                  boxShadow: `0 0 0 1px ${meta.accent}33 inset, 0 8px 24px -8px ${meta.accent}66`,
                  willChange: "transform",
                }}
              />
            )}
            <Icon size={12} strokeWidth={1.8} />
            <span className="hidden sm:inline">{meta.label}</span>
          </button>
        );
      })}
      {override !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          title="Reset to your saved preset"
        >
          Reset
        </button>
      )}
    </div>
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
    <div className="mx-auto max-w-xl space-y-4">
      <GlassCard accent="#f0b429">
        <CardLabel>Course name</CardLabel>
        <GlassInput value={courseName} onChange={setCourseName} placeholder="e.g. Biology" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <PercentInput label="Current grade" value={currentGrade} onChange={setCurrentGrade} />
          <PercentInput label="Current weight" value={currentWeight} onChange={setCurrentWeight} />
          <PercentInput label="Final exam worth" value={finalWeight} onChange={setFinalWeight} />
          <PercentInput label="Target grade" value={targetGrade} onChange={setTargetGrade} />
        </div>

        <PrimaryButton
          accent="#f0b429"
          onClick={() => void calculate()}
          disabled={loading}
          className="mt-5 w-full"
        >
          {loading ? "Calculating…" : "Calculate"}
        </PrimaryButton>

        {error ? <p className="mt-3 text-[12px] text-red-400">{error}</p> : null}
      </GlassCard>

      {result && tone ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ willChange: "transform" }}
        >
          <GlassCard accent={tone.color}>
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              You need
            </p>
            <div
              className="mt-2 text-center text-6xl font-black leading-none tracking-tight tabular-nums"
              style={{ color: tone.color }}
            >
              {displayScore.toFixed(1)}%
            </div>
            <p className="mt-3 text-center text-[13px] font-semibold" style={{ color: tone.color }}>
              {tone.label}
            </p>
            <p className="mt-2 text-center text-[13px] leading-relaxed text-zinc-400">
              {result.message}
            </p>
          </GlassCard>
        </motion.div>
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
    { id: newRowId("c"), name: "", credits: "3", letterGrade: "A" },
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
    <div className="mx-auto max-w-2xl space-y-4">
      <GlassCard accent="#22d3ee">
        {/* Live GPA at top */}
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Cumulative GPA
            </p>
            <div
              className="mt-1 text-5xl font-black leading-none tracking-tight tabular-nums"
              style={{ color: tone.color }}
            >
              {gpa.toFixed(2)}
            </div>
            <p className="mt-1 text-[12px] font-semibold" style={{ color: tone.color }}>
              {tone.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Total credits
            </p>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-200">
              {totalCredits.toFixed(1)}
            </div>
          </div>
        </div>

        <CardLabel>Term name</CardLabel>
        <GlassInput value={termName} onChange={setTermName} placeholder="e.g. Fall 2026" />

        {/* Course rows */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Courses
            </p>
            <button
              type="button"
              onClick={addCourse}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08]"
            >
              <Plus size={11} strokeWidth={2} />
              Add course
            </button>
          </div>

          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {courses.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-[1fr,90px,90px,32px] items-center gap-2"
                  style={{ willChange: "transform" }}
                >
                  <GlassInput
                    value={c.name}
                    onChange={(v) => updateCourse(c.id, { name: v })}
                    placeholder="Course name"
                  />
                  <NumberInput
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
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-white/[0.03] disabled:hover:text-zinc-500"
                    aria-label="Remove course"
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <PrimaryButton
          accent="#22d3ee"
          onClick={() => void save()}
          disabled={saving || totalCredits === 0}
          className="mt-5 w-full"
        >
          <Save size={13} strokeWidth={1.8} />
          {saving ? "Saving…" : "Save Calculation"}
        </PrimaryButton>

        {error ? <p className="mt-3 text-[12px] text-red-400">{error}</p> : null}
        {savedMsg ? (
          <p className="mt-3 text-[12px] font-semibold text-cyan-300">{savedMsg}</p>
        ) : null}
      </GlassCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  UNIVERSITY — Credit-weighted % + Class Average              */
/* ──────────────────────────────────────────────────────────── */

function UniversityCalculator({ onSaved }: { onSaved: () => Promise<void> }) {
  const [termName, setTermName] = useState("");
  const [courses, setCourses] = useState<UniCourse[]>([
    { id: newRowId("u"), name: "", grade: "82", credits: "0.5", classAverage: "73" },
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
    <div className="mx-auto max-w-2xl space-y-4">
      <GlassCard accent="#a78bfa">
        {/* Live result + bell curve */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Term Average
            </p>
            <div
              className="mt-1 text-5xl font-black leading-none tracking-tight tabular-nums"
              style={{ color: tone.color }}
            >
              {stats.finalGrade.toFixed(1)}%
            </div>
            {tone.label ? (
              <p className="mt-1 text-[12px] font-semibold" style={{ color: tone.color }}>
                {tone.label}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-zinc-500">
                Add class averages to compare
              </p>
            )}
          </div>
          <BellCurve grade={stats.finalGrade} classAverage={stats.finalClassAvg} accent="#a78bfa" />
        </div>

        <CardLabel>Term name</CardLabel>
        <GlassInput value={termName} onChange={setTermName} placeholder="e.g. Fall 2026" />

        {/* Course rows */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Courses
            </p>
            <button
              type="button"
              onClick={addCourse}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08]"
            >
              <Plus size={11} strokeWidth={2} />
              Add course
            </button>
          </div>

          {/* Header row labels */}
          <div className="grid grid-cols-[1fr,72px,72px,72px,32px] gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            <span>Course</span>
            <span className="text-center">Grade %</span>
            <span className="text-center">Credits</span>
            <span className="text-center">Class avg</span>
            <span></span>
          </div>

          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {courses.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-[1fr,72px,72px,72px,32px] items-center gap-2"
                  style={{ willChange: "transform" }}
                >
                  <GlassInput
                    value={c.name}
                    onChange={(v) => updateCourse(c.id, { name: v })}
                    placeholder="Course name"
                  />
                  <NumberInput
                    value={c.grade}
                    onChange={(v) => updateCourse(c.id, { grade: v })}
                    placeholder="%"
                    min={0}
                    max={100}
                  />
                  <NumberInput
                    value={c.credits}
                    onChange={(v) => updateCourse(c.id, { credits: v })}
                    placeholder="cr"
                    min={0.25}
                    max={3}
                    step={0.25}
                  />
                  <NumberInput
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
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-white/[0.03] disabled:hover:text-zinc-500"
                    aria-label="Remove course"
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <PrimaryButton
          accent="#a78bfa"
          onClick={() => void save()}
          disabled={saving || stats.totalCredits === 0}
          className="mt-5 w-full"
        >
          <Save size={13} strokeWidth={1.8} />
          {saving ? "Saving…" : "Save Calculation"}
        </PrimaryButton>

        {error ? <p className="mt-3 text-[12px] text-red-400">{error}</p> : null}
        {savedMsg ? (
          <p className="mt-3 text-[12px] font-semibold text-violet-300">{savedMsg}</p>
        ) : null}
      </GlassCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Bell curve viz (small SVG)                                  */
/* ──────────────────────────────────────────────────────────── */

function BellCurve({
  grade,
  classAverage,
  accent,
}: {
  grade: number;
  classAverage: number | null;
  accent: string;
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

  return (
    <svg width="130" height="55" viewBox="0 0 130 55" aria-hidden>
      <defs>
        <linearGradient id="bellCurveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,50 ${points.join(" ")} 130,50`}
        fill="url(#bellCurveFill)"
        stroke={accent}
        strokeWidth="1"
        strokeOpacity="0.6"
      />
      {avgX !== null && (
        <line x1={avgX} y1="50" x2={avgX} y2="14" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" />
      )}
      <line x1={userX} y1="50" x2={userX} y2="8" stroke={accent} strokeWidth="1.5" />
      <circle cx={userX} cy="8" r="2.5" fill={accent} />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Recent calcs list                                           */
/* ──────────────────────────────────────────────────────────── */

function RecentCalculations({ rows }: { rows: RecentRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[13px] text-zinc-500">
        No calculations yet. Save your first to see it here.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <motion.div
          key={row.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(0.04 * i, 0.2) }}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl"
          style={{ willChange: "transform" }}
        >
          <div className="flex items-center gap-3">
            <TierBadge tier={row.tier} />
            <div>
              <p className="text-[13px] font-semibold text-zinc-100">{row.courseName}</p>
              <p className="text-[11px] text-zinc-500">{formatRelative(row.createdAt)}</p>
            </div>
          </div>
          <div className="text-right">
            <RecentValue row={row} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TierBadge({ tier }: { tier: UserTier }) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
      style={{
        borderColor: `${meta.accent}40`,
        background: `${meta.accent}15`,
        color: meta.accent,
      }}
      title={meta.label}
    >
      <Icon size={13} strokeWidth={1.8} />
    </span>
  );
}

function RecentValue({ row }: { row: RecentRow }) {
  if (row.tier === "COLLEGE" && typeof row.gpa === "number") {
    return (
      <>
        <div className="text-[15px] font-bold tabular-nums text-cyan-300">{row.gpa.toFixed(2)}</div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">GPA</p>
      </>
    );
  }
  if (row.tier === "UNIVERSITY" && typeof row.weightedAverage === "number") {
    return (
      <>
        <div className="text-[15px] font-bold tabular-nums text-violet-300">
          {row.weightedAverage.toFixed(1)}%
        </div>
        {typeof row.classAverage === "number" ? (
          <p className="text-[10px] tabular-nums text-zinc-500">
            avg {row.classAverage.toFixed(1)}%
          </p>
        ) : null}
      </>
    );
  }
  if (typeof row.neededOnFinal === "number") {
    return (
      <>
        <div className="text-[15px] font-bold tabular-nums text-amber-300">
          {row.neededOnFinal.toFixed(1)}%
        </div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">on final</p>
      </>
    );
  }
  return <span className="text-[12px] text-zinc-500">—</span>;
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

/* ──────────────────────────────────────────────────────────── */
/*  Reusable Midnight Glass form pieces                         */
/* ──────────────────────────────────────────────────────────── */

function GlassCard({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl"
      style={{
        boxShadow: `0 30px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px ${accent}10 inset`,
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
      {children}
    </label>
  );
}

function GlassInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/20"
      />
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="pointer-events-none absolute -bottom-px left-0 h-px w-full"
        style={{
          transformOrigin: "left",
          background:
            "linear-gradient(90deg, transparent 0%, #2dd4bf 30%, #14b8a6 50%, #06b6d4 70%, transparent 100%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}

function NumberInput({
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
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 text-center text-[13px] tabular-nums text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="pointer-events-none absolute -bottom-px left-0 h-px w-full"
        style={{
          transformOrigin: "left",
          background:
            "linear-gradient(90deg, transparent 0%, #2dd4bf 30%, #14b8a6 50%, #06b6d4 70%, transparent 100%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}

function PercentInput({
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
      <CardLabel>{label}</CardLabel>
      <div className="relative">
        <NumberInput value={value} onChange={onChange} min={0} max={100} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-500">
          %
        </span>
      </div>
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
      className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 text-center text-[13px] font-bold tabular-nums text-zinc-100 outline-none focus:border-white/20"
    >
      {LETTER_GRADES.map((g) => (
        <option key={g} value={g} className="bg-zinc-900 text-zinc-100">
          {g} ({LETTER_GPA[g].toFixed(1)})
        </option>
      ))}
    </select>
  );
}

function PrimaryButton({
  children,
  accent,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  accent: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 ${className ?? ""}`}
      style={{
        background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`,
        boxShadow: `0 0 0 1px ${accent}55 inset, 0 12px 30px -10px ${accent}66`,
        willChange: "transform",
      }}
    >
      {children}
    </motion.button>
  );
}
