"use client";

/**
 * Path 3 — Interactive "What-If" Grade Simulator
 * ---------------------------------------------
 * Dynamic slider-based grade projection tool with tier-specific calculations:
 *   - HIGH_SCHOOL  → Percentage-based sliders (0-100%)
 *   - COLLEGE     → 4.0 scale course grade sliders with GPA calculation
 *   - UNIVERSITY  → Credit-weighted category sliders with class average delta
 *
 * Features target grade goal input with neon visual feedback.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, GraduationCap, BookOpen, Building2, Plus } from "lucide-react";
import { useUserTier, type UserTier } from "~/lib/use-user-tier";

/* ──────────────────────────────────────────────────────────── */
/*  Types                                                       */
/* ──────────────────────────────────────────────────────────── */

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

type HSSlider = {
  id: string;
  name: string;
  value: number; // 0-100
  weight: number; // percentage weight
};

type CollegeCourse = {
  id: string;
  name: string;
  credits: number;
  grade: LetterGrade;
};

type UniCategory = {
  id: string;
  name: string;
  value: number; // 0-100
  weight: number; // percentage weight
  credits: number;
};

/* ──────────────────────────────────────────────────────────── */
/*  Component                                                   */
/* ──────────────────────────────────────────────────────────── */

interface WhatIfSimulatorProps {
  className?: string;
}

export default function WhatIfSimulator({ className = "" }: WhatIfSimulatorProps) {
  const tier = useUserTier();

  // Target grade goal state
  const [targetGoal, setTargetGoal] = useState<string>("");
  const [goalType, setGoalType] = useState<"percentage" | "gpa">("percentage");

  // HIGH_SCHOOL state
  const [hsSliders, setHSSliders] = useState<HSSlider[]>([
    { id: "1", name: "Assignments", value: 85, weight: 30 },
    { id: "2", name: "Quizzes", value: 78, weight: 20 },
    { id: "3", name: "Midterm", value: 82, weight: 25 },
    { id: "4", name: "Final Exam", value: 0, weight: 25 },
  ]);

  // COLLEGE state
  const [collegeCourses, setCollegeCourses] = useState<CollegeCourse[]>([
    { id: "1", name: "Course 1", credits: 3, grade: "B" },
    { id: "2", name: "Course 2", credits: 4, grade: "A-" },
    { id: "3", name: "Course 3", credits: 3, grade: "B+" },
    { id: "4", name: "Course 4", credits: 3, grade: "A" },
  ]);

  // UNIVERSITY state
  const [uniCategories, setUniCategories] = useState<UniCategory[]>([
    { id: "1", name: "Assignments", value: 85, weight: 30, credits: 0.5 },
    { id: "2", name: "Midterm", value: 78, weight: 25, credits: 0.25 },
    { id: "3", name: "Final Exam", value: 0, weight: 40, credits: 0.25 },
    { id: "4", name: "Participation", value: 90, weight: 5, credits: 0 },
  ]);
  const [classAverage, setClassAverage] = useState<number>(75);

  /* ──────────────────────────────────────────────────────────── */
  /*  Calculations                                               */
  /* ──────────────────────────────────────────────────────────── */

  // HIGH_SCHOOL: Weighted percentage calculation
  const hsResult = useMemo(() => {
    const totalWeight = hsSliders.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = hsSliders.reduce((sum, s) => sum + (s.value * s.weight) / 100, 0);
    const overallPercentage = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    return overallPercentage;
  }, [hsSliders]);

  // COLLEGE: GPA calculation
  const collegeResult = useMemo(() => {
    const totalCredits = collegeCourses.reduce((sum, c) => sum + c.credits, 0);
    const weightedGPA = collegeCourses.reduce(
      (sum, c) => sum + LETTER_GPA[c.grade] * c.credits,
      0
    );
    return totalCredits > 0 ? weightedGPA / totalCredits : 0;
  }, [collegeCourses]);

  // UNIVERSITY: Credit-weighted calculation with class average delta
  const uniResult = useMemo(() => {
    const totalWeight = uniCategories.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = uniCategories.reduce(
      (sum, c) => sum + (c.value * c.weight) / 100,
      0
    );
    const overallPercentage = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    const delta = overallPercentage - classAverage;
    return { percentage: overallPercentage, delta };
  }, [uniCategories, classAverage]);

  // Goal achievement check
  const goalAchieved = useMemo(() => {
    if (!targetGoal) return null;
    const target = parseFloat(targetGoal);
    if (isNaN(target)) return null;

    if (tier === "HIGHSCHOOL" || goalType === "percentage") {
      return hsResult >= target;
    } else if (tier === "COLLEGE" || goalType === "gpa") {
      return collegeResult >= target;
    } else {
      return uniResult.percentage >= target;
    }
  }, [targetGoal, goalType, tier, hsResult, collegeResult, uniResult]);

  /* ──────────────────────────────────────────────────────────── */
  /*  Handlers                                                    */
  /* ──────────────────────────────────────────────────────────── */

  const updateHSSlider = (id: string, value: number) => {
    setHSSliders((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  };

  const updateCollegeGrade = (id: string, grade: LetterGrade) => {
    setCollegeCourses((prev) => prev.map((c) => (c.id === id ? { ...c, grade } : c)));
  };

  const updateUniCategory = (id: string, value: number) => {
    setUniCategories((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
  };

  const addHSSlider = () => {
    const newId = String(hsSliders.length + 1);
    setHSSliders((prev) => [...prev, { id: newId, name: `Component ${newId}`, value: 75, weight: 10 }]);
  };

  const addCollegeCourse = () => {
    const newId = String(collegeCourses.length + 1);
    setCollegeCourses((prev) => [...prev, { id: newId, name: `Course ${newId}`, credits: 3, grade: "B" }]);
  };

  const addUniCategory = () => {
    const newId = String(uniCategories.length + 1);
    setUniCategories((prev) => [...prev, { id: newId, name: `Category ${newId}`, value: 75, weight: 10, credits: 0.25 }]);
  };

  const removeItem = <T extends { id: string }>(items: T[], id: string, setter: (items: T[]) => void) => {
    setter(items.filter((item) => item.id !== id));
  };

  /* ──────────────────────────────────────────────────────────── */
  /*  Render                                                      */
  /* ──────────────────────────────────────────────────────────── */

  const getTierIcon = () => {
    switch (tier) {
      case "HIGHSCHOOL":
        return <BookOpen size={18} className="text-cyan-400" />;
      case "COLLEGE":
        return <Building2 size={18} className="text-cyan-400" />;
      case "UNIVERSITY":
        return <GraduationCap size={18} className="text-cyan-400" />;
      default:
        return <GraduationCap size={18} className="text-cyan-400" />;
    }
  };

  const getGlowClass = () => {
    if (goalAchieved === null) return "";
    return goalAchieved
      ? "shadow-cyan-500/20 shadow-lg"
      : "shadow-amber-500/20 shadow-lg";
  };

  return (
    <div className={`bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getTierIcon()}
          <div>
            <h3 className="text-lg font-semibold text-white">What-If Simulator</h3>
            <p className="text-xs text-zinc-400">Project your grades with dynamic scenarios</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span className="text-xs font-medium text-zinc-300">{tier}</span>
        </div>
      </div>

      {/* Target Goal Input */}
      <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-zinc-400" />
          <label className="text-sm font-medium text-zinc-200">Target Grade Goal</label>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder={tier === "COLLEGE" ? "4.0" : "90"}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setGoalType("percentage")}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                goalType === "percentage"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              %
            </button>
            <button
              onClick={() => setGoalType("gpa")}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                goalType === "gpa"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              GPA
            </button>
          </div>
        </div>
      </div>

      {/* Tier-specific content */}
      {tier === "HIGHSCHOOL" && (
        <div className="space-y-4">
          {hsSliders.map((slider) => (
            <motion.div
              key={slider.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={slider.name}
                  onChange={(e) => {
                    setHSSliders((prev) =>
                      prev.map((s) => (s.id === slider.id ? { ...s, name: e.target.value } : s))
                    );
                  }}
                  className="bg-transparent text-sm font-medium text-white focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={slider.weight}
                    onChange={(e) => {
                      setHSSliders((prev) =>
                        prev.map((s) =>
                          s.id === slider.id ? { ...s, weight: parseFloat(e.target.value) || 0 } : s
                        )
                      );
                    }}
                    className="w-16 px-2 py-1 rounded bg-slate-800/50 border border-white/10 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                  <span className="text-xs text-zinc-400">%</span>
                  <button
                    onClick={() => removeItem(hsSliders, slider.id, setHSSliders)}
                    className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={slider.value}
                  onChange={(e) => updateHSSlider(slider.id, parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-sm font-semibold text-cyan-300 w-12 text-right">{slider.value}%</span>
              </div>
            </motion.div>
          ))}
          <button
            onClick={addHSSlider}
            className="w-full py-3 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Component
          </button>
        </div>
      )}

      {tier === "COLLEGE" && (
        <div className="space-y-4">
          {collegeCourses.map((course) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={course.name}
                  onChange={(e) => {
                    setCollegeCourses((prev) =>
                      prev.map((c) => (c.id === course.id ? { ...c, name: e.target.value } : c))
                    );
                  }}
                  className="bg-transparent text-sm font-medium text-white focus:outline-none flex-1"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={course.credits}
                    onChange={(e) => {
                      setCollegeCourses((prev) =>
                        prev.map((c) =>
                          c.id === course.id ? { ...c, credits: parseFloat(e.target.value) || 0 } : c
                        )
                      );
                    }}
                    className="w-16 px-2 py-1 rounded bg-slate-800/50 border border-white/10 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                  <span className="text-xs text-zinc-400">cr</span>
                  <button
                    onClick={() => removeItem(collegeCourses, course.id, setCollegeCourses)}
                    className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              <select
                value={course.grade}
                onChange={(e) => updateCollegeGrade(course.id, e.target.value as LetterGrade)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {LETTER_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade} ({LETTER_GPA[grade].toFixed(1)})
                  </option>
                ))}
              </select>
            </motion.div>
          ))}
          <button
            onClick={addCollegeCourse}
            className="w-full py-3 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Course
          </button>
        </div>
      )}

      {tier === "UNIVERSITY" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-200">Class Average</label>
              <input
                type="number"
                value={classAverage}
                onChange={(e) => setClassAverage(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 rounded bg-slate-800/50 border border-white/10 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
          </div>
          {uniCategories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => {
                    setUniCategories((prev) =>
                      prev.map((c) => (c.id === category.id ? { ...c, name: e.target.value } : c))
                    );
                  }}
                  className="bg-transparent text-sm font-medium text-white focus:outline-none flex-1"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={category.weight}
                    onChange={(e) => {
                      setUniCategories((prev) =>
                        prev.map((c) =>
                          c.id === category.id ? { ...c, weight: parseFloat(e.target.value) || 0 } : c
                        )
                      );
                    }}
                    className="w-14 px-2 py-1 rounded bg-slate-800/50 border border-white/10 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                  <span className="text-xs text-zinc-400">%</span>
                  <input
                    type="number"
                    step="0.25"
                    value={category.credits}
                    onChange={(e) => {
                      setUniCategories((prev) =>
                        prev.map((c) =>
                          c.id === category.id ? { ...c, credits: parseFloat(e.target.value) || 0 } : c
                        )
                      );
                    }}
                    className="w-14 px-2 py-1 rounded bg-slate-800/50 border border-white/10 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                  <span className="text-xs text-zinc-400">cr</span>
                  <button
                    onClick={() => removeItem(uniCategories, category.id, setUniCategories)}
                    className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={category.value}
                  onChange={(e) => updateUniCategory(category.id, parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-sm font-semibold text-cyan-300 w-12 text-right">{category.value}%</span>
              </div>
            </motion.div>
          ))}
          <button
            onClick={addUniCategory}
            className="w-full py-3 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Category
          </button>
        </div>
      )}

      {/* Result Display */}
      <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-400">Projected Result</p>
              <motion.div
                className={`text-2xl font-bold text-white transition-all duration-300 ${getGlowClass()}`}
                animate={{
                  color: goalAchieved === true ? "#22d3ee" : goalAchieved === false ? "#f59e0b" : "#ffffff",
                }}
              >
                {tier === "HIGHSCHOOL" && `${hsResult.toFixed(1)}%`}
                {tier === "COLLEGE" && `${collegeResult.toFixed(2)} GPA`}
                {tier === "UNIVERSITY" && `${uniResult.percentage.toFixed(1)}%`}
              </motion.div>
            </div>
          </div>
          {tier === "UNIVERSITY" && (
            <div className="text-right">
              <p className="text-xs text-zinc-400">Class Average Delta</p>
              <p className={`text-lg font-semibold ${uniResult.delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {uniResult.delta >= 0 ? "+" : ""}{uniResult.delta.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
        {goalAchieved !== null && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 text-sm ${
              goalAchieved ? "text-cyan-300" : "text-amber-300"
            }`}
          >
            {goalAchieved ? "✓ Goal achieved!" : "⚠ Below target goal"}
          </motion.div>
        )}
      </div>
    </div>
  );
}
