"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  BookOpen,
  Brush,
  Calculator,
  Cpu,
  Dna,
  FlaskConical,
  Globe2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Languages,
  Layers3,
  Music2,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

/* ─────────────────────────────────────────────────────────── */
/*  Subject palette                                            */
/*  Each subject has a glow color used for the card aura,     */
/*  cursor spotlight halo, and accent badge tint.              */
/* ─────────────────────────────────────────────────────────── */

type SubjectVisual = {
  /** rgb triple for the halo & spotlight (no alpha) */
  halo: string;
  /** Hex accent for chip / icon tint */
  accent: string;
  /** Two-stop gradient end for the soft glow shadow */
  glowFar: string;
  icon: LucideIcon;
};

const SUBJECT_VISUALS: Record<string, SubjectVisual> = {
  chemistry: { halo: "240, 180, 41", accent: "#f0b429", glowFar: "245, 158, 11", icon: FlaskConical },
  science: { halo: "240, 180, 41", accent: "#f0b429", glowFar: "245, 158, 11", icon: Atom },
  physics: { halo: "59, 130, 246", accent: "#3b82f6", glowFar: "37, 99, 235", icon: Atom },
  biology: { halo: "16, 185, 129", accent: "#10b981", glowFar: "5, 150, 105", icon: Dna },
  mathematics: { halo: "59, 130, 246", accent: "#3b82f6", glowFar: "37, 99, 235", icon: Calculator },
  math: { halo: "59, 130, 246", accent: "#3b82f6", glowFar: "37, 99, 235", icon: Calculator },
  english: { halo: "168, 85, 247", accent: "#a855f7", glowFar: "139, 92, 246", icon: BookOpen },
  french: { halo: "168, 85, 247", accent: "#a855f7", glowFar: "139, 92, 246", icon: Languages },
  languages: { halo: "168, 85, 247", accent: "#a855f7", glowFar: "139, 92, 246", icon: Languages },
  history: { halo: "20, 184, 166", accent: "#14b8a6", glowFar: "13, 148, 136", icon: Landmark },
  geography: { halo: "20, 184, 166", accent: "#14b8a6", glowFar: "13, 148, 136", icon: Globe2 },
  "social studies": { halo: "20, 184, 166", accent: "#14b8a6", glowFar: "13, 148, 136", icon: Landmark },
  business: { halo: "244, 63, 94", accent: "#f43f5e", glowFar: "225, 29, 72", icon: TrendingUp },
  "computer studies": { halo: "56, 189, 248", accent: "#38bdf8", glowFar: "14, 165, 233", icon: Cpu },
  "computer science": { halo: "56, 189, 248", accent: "#38bdf8", glowFar: "14, 165, 233", icon: Cpu },
  arts: { halo: "236, 72, 153", accent: "#ec4899", glowFar: "219, 39, 119", icon: Brush },
  music: { halo: "236, 72, 153", accent: "#ec4899", glowFar: "219, 39, 119", icon: Music2 },
  health: { halo: "16, 185, 129", accent: "#10b981", glowFar: "5, 150, 105", icon: HeartPulse },
  "physical education": { halo: "16, 185, 129", accent: "#10b981", glowFar: "5, 150, 105", icon: HeartPulse },
};

const FALLBACK_VISUAL: SubjectVisual = {
  halo: "148, 163, 184",
  accent: "#94a3b8",
  glowFar: "100, 116, 139",
  icon: GraduationCap,
};

function visualFor(subject: string): SubjectVisual {
  const key = subject.toLowerCase().trim();
  if (SUBJECT_VISUALS[key]) return SUBJECT_VISUALS[key]!;
  // Try partial matches (e.g., "Mathematics, College" -> "mathematics")
  for (const [k, v] of Object.entries(SUBJECT_VISUALS)) {
    if (key.includes(k)) return v;
  }
  return FALLBACK_VISUAL;
}

/* ─────────────────────────────────────────────────────────── */
/*  Page                                                       */
/* ─────────────────────────────────────────────────────────── */

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
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
      {/* Ambient background field — single fixed gradient, no animation */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 600px at 12% -10%, rgba(59,130,246,0.06), transparent 60%)," +
            "radial-gradient(800px 600px at 95% 10%, rgba(168,85,247,0.05), transparent 60%)," +
            "radial-gradient(900px 700px at 50% 110%, rgba(240,180,41,0.04), transparent 60%)",
        }}
      />

      <div className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 md:px-6 md:pt-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col gap-3"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-400">
            <Sparkles size={12} strokeWidth={1.7} className="text-amber-300/80" />
            Ontario Curriculum Hub
          </span>
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight md:text-[42px]">
            Every course.
            <span className="ml-3 bg-gradient-to-r from-amber-200 via-zinc-100 to-blue-300 bg-clip-text text-transparent">
              Every expectation.
            </span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
            Browse Grades 9–12 Ontario courses with seeded strands, expectations, and study workflows wired to Kyvex.
          </p>
        </motion.header>

        {/* Stats strip */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total Courses" value={stats.totalCourses} delay={0.05} />
          <StatCard label="Seeded" value={stats.seededCourses} delay={0.1} accent="#10b981" />
          <StatCard label="Expectations" value={stats.totalExpectations} delay={0.15} accent="#f0b429" />
        </div>

        {/* Filters: grade chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-3 flex flex-wrap gap-2"
        >
          {GRADE_OPTIONS.map((option) => {
            const active = grade === option.value;
            return (
              <motion.button
                key={option.value}
                onClick={() => setGrade(option.value)}
                whileTap={{ scale: 0.96 }}
                animate={{
                  backgroundColor: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                  borderColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                  color: active ? "rgb(255,255,255)" : "rgb(161,161,170)",
                }}
                transition={{ duration: 0.2 }}
                className="rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-shadow hover:shadow-[0_0_24px_-12px_rgba(255,255,255,0.4)]"
                style={{ willChange: "transform" }}
              >
                {option.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-8 grid grid-cols-1 gap-3 rounded-3xl border border-white/5 bg-white/[0.025] p-3 backdrop-blur-xl sm:grid-cols-[1fr_220px]"
        >
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.7}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code, title, or topic"
              className="h-11 w-full rounded-2xl border border-white/[0.06] bg-black/30 pl-10 pr-4 text-[13px] text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20 focus:bg-black/40"
            />
          </div>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 rounded-2xl border border-white/[0.06] bg-black/30 px-4 text-[13px] text-white outline-none transition-colors focus:border-white/20 focus:bg-black/40"
          >
            <option value="">All Subjects</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Card grid */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} delay={i * 0.05} />
              ))}
            </motion.div>
          ) : courses.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-white/5 bg-white/[0.02] p-10 text-center backdrop-blur-xl"
            >
              <p className="text-base font-semibold text-white">
                {subject ? `No ${subject} courses yet` : "No courses match your filters"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {subject
                  ? "Run the seeder from /curriculum/admin to load this subject."
                  : "Try clearing search or selecting a different grade."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.06, delayChildren: 0.05 },
                },
              }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && seededCourses.length === 0 && !subject && courses.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-[13px] text-amber-200/90 backdrop-blur-xl">
            No courses are seeded yet. Open <code className="font-mono">/curriculum/admin</code> and run the auto-seeder to populate strands and expectations.
          </div>
        )}
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Stat card                                                  */
/* ─────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  delay = 0,
  accent,
}: {
  label: string;
  value: number;
  delay?: number;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-xl"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p
        className="mt-1.5 text-[28px] font-bold leading-none tabular-nums"
        style={{ color: accent ?? "#ffffff" }}
      >
        {value.toLocaleString()}
      </p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Skeleton                                                   */
/* ─────────────────────────────────────────────────────────── */

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
      className="h-[210px] rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04]" />
        <div className="flex-1">
          <div className="h-4 w-20 rounded bg-white/[0.05]" />
          <div className="mt-2 h-3 w-32 rounded bg-white/[0.03]" />
        </div>
      </div>
      <div className="mt-5 h-3 w-full rounded bg-white/[0.04]" />
      <div className="mt-2 h-3 w-4/5 rounded bg-white/[0.03]" />
      <div className="mt-2 h-3 w-3/5 rounded bg-white/[0.03]" />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Course Card                                                */
/* ─────────────────────────────────────────────────────────── */

function CourseCard({ course }: { course: CourseListItem }) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const v = visualFor(course.subject);
  const Icon = v.icon;

  const handleMove = useCallback((e: ReactPointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  const cardStyle: CSSProperties = {
    ["--mx" as any]: "50%",
    ["--my" as any]: "50%",
    ["--halo" as any]: v.halo,
    ["--glow-far" as any]: v.glowFar,
    willChange: "transform",
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring", stiffness: 280, damping: 24, mass: 0.9 },
        },
      }}
      style={{ willChange: "transform" }}
    >
      <Link
        ref={ref}
        href={`/curriculum/${course.code}`}
        onPointerMove={handleMove}
        style={cardStyle}
        className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20"
      >
        {/* Ambient subject glow — sits behind everything */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px opacity-40 transition-opacity duration-300 group-hover:opacity-90"
          style={{
            background: `radial-gradient(120% 80% at 50% 0%, rgba(var(--halo), 0.18), transparent 55%)`,
          }}
        />

        {/* Cursor spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(380px circle at var(--mx) var(--my), rgba(var(--halo), 0.16), transparent 55%)",
          }}
        />

        {/* Outer drop-shadow halo (hover only) — single shadow, GPU friendly */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            boxShadow: `0 30px 60px -28px rgba(var(--glow-far), 0.55), 0 0 0 1px rgba(var(--halo), 0.16) inset`,
          }}
        />

        <div className="relative flex h-full flex-col">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40"
                style={{
                  boxShadow: `inset 0 0 18px rgba(var(--halo), 0.22)`,
                }}
              >
                <Icon size={20} strokeWidth={1.5} style={{ color: v.accent }} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[20px] font-bold leading-none tracking-tight text-white">
                  {course.code}
                </p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: v.accent }}>
                  {course.subject} · Gr. {course.grade}
                </p>
              </div>
            </div>

            {course.isSeeded ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                Seeded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-amber-300">
                Awaiting
              </span>
            )}
          </div>

          {/* Title + description */}
          <div className="mt-5 min-w-0 flex-1">
            <p className="line-clamp-2 text-[15px] font-bold leading-snug text-white">{course.title}</p>
            <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-zinc-500">
              {course.description}
            </p>
          </div>

          {/* Footer meta */}
          <div className="mt-5 flex items-center justify-between">
            {course.isSeeded ? (
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Layers3 size={12} strokeWidth={1.7} />
                  {course.unitCount}
                </span>
                <span>·</span>
                <span>{course.expectationCount} expectations</span>
              </div>
            ) : (
              <span className="text-[11px] text-zinc-600">Run the seeder to load expectations</span>
            )}

            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ color: v.accent }}
            >
              Open →
            </span>
          </div>

          {/* Progress hairline (seeded only) */}
          {course.isSeeded && (
            <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full"
                style={{
                  width: "100%",
                  background: `linear-gradient(90deg, rgba(var(--halo), 0.85) 0%, rgba(var(--glow-far), 0.85) 100%)`,
                }}
              />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
