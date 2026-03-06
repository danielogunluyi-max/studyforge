"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";
import { useToast } from "~/app/_components/toast";

type Exam = {
  id: string;
  subject: string;
  examDate: string;
  board: string | null;
  difficulty: string | null;
  topics: string | null;
  studyPlan: string | null;
  createdAt: string;
};

type StudyPlanDay = {
  date: string;
  title: string;
  tasks: string[];
  completed?: boolean;
};

type NotesResponse = {
  notes?: Array<{ title?: string }>;
};

type PreferencesResponse = {
  studyStreak?: number;
};

type UrgencyTier = "green" | "yellow" | "orange" | "red";

type PanicTier = {
  label: string;
  color: string;
};

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];

function safeDaysUntil(examDate: string): number {
  const target = new Date(examDate).getTime();
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function countdownParts(examDate: string) {
  const target = new Date(examDate).getTime();
  const diff = Math.max(0, target - Date.now());

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return { days, hours, minutes };
}

function formatCountdown(examDate: string) {
  const { days, hours, minutes } = countdownParts(examDate);
  return `${days} days ${hours} hours ${minutes} minutes`;
}

function urgencyFromDays(days: number): UrgencyTier {
  if (days >= 30) return "green";
  if (days >= 14) return "yellow";
  if (days >= 7) return "orange";
  return "red";
}

function urgencyClasses(tier: UrgencyTier) {
  if (tier === "green") {
    return {
      badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
      text: "text-emerald-300",
      bar: "bg-emerald-500",
      pulse: "",
    };
  }

  if (tier === "yellow") {
    return {
      badge: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
      text: "text-yellow-300",
      bar: "bg-yellow-500",
      pulse: "",
    };
  }

  if (tier === "orange") {
    return {
      badge: "border-orange-500/40 bg-orange-500/15 text-orange-300",
      text: "text-orange-300",
      bar: "bg-orange-500",
      pulse: "animate-pulse",
    };
  }

  return {
    badge: "border-red-500/40 bg-red-500/15 text-red-300",
    text: "text-red-300",
    bar: "bg-red-500",
    pulse: "animate-pulse",
  };
}

function urgencyProgress(days: number) {
  if (days >= 30) return 20;
  if (days >= 14) return 45;
  if (days >= 7) return 72;
  return 92;
}

function parseTopics(topics: string | null): string[] {
  return (topics ?? "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function panicData(exam: Exam): { totalTopics: number; daysAvailable: number; topicsPerDay: number; tier: PanicTier } {
  const totalTopics = parseTopics(exam.topics).length;
  const daysAvailable = Math.max(1, safeDaysUntil(exam.examDate));
  const topicsPerDay = totalTopics === 0 ? 0 : totalTopics / daysAvailable;

  if (topicsPerDay > 3) {
    return {
      totalTopics,
      daysAvailable,
      topicsPerDay,
      tier: { label: "High pressure", color: "text-red-300" },
    };
  }

  if (topicsPerDay >= 1) {
    return {
      totalTopics,
      daysAvailable,
      topicsPerDay,
      tier: { label: "Manageable", color: "text-yellow-300" },
    };
  }

  return {
    totalTopics,
    daysAvailable,
    topicsPerDay,
    tier: { label: "Well prepared", color: "text-emerald-300" },
  };
}

function parseStudyPlan(studyPlanRaw: string | null): StudyPlanDay[] {
  if (!studyPlanRaw) return [];

  try {
    const parsed = JSON.parse(studyPlanRaw) as { days?: StudyPlanDay[] };
    return Array.isArray(parsed.days) ? parsed.days : [];
  } catch {
    return [];
  }
}

function isTodayLabel(label: string) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" }).toLowerCase();
  return label.toLowerCase().includes(today);
}

function subjectIcon(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes("math") || s.includes("algebra") || s.includes("calculus")) return "📐";
  if (s.includes("bio")) return "🧬";
  if (s.includes("chem")) return "⚗️";
  if (s.includes("phys")) return "🧲";
  if (s.includes("history")) return "🏛️";
  if (s.includes("english") || s.includes("literature")) return "📚";
  if (s.includes("computer") || s.includes("coding")) return "💻";
  return "📝";
}

export default function DashboardPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingExamId, setGeneratingExamId] = useState("");
  const [savingPlanExamId, setSavingPlanExamId] = useState("");
  const [studyStreak, setStudyStreak] = useState(0);
  const [_, setClockTick] = useState(0);
  const [noteTitles, setNoteTitles] = useState<string[]>([]);
  const [isScanningNotes, setIsScanningNotes] = useState(false);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);

  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [board, setBoard] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [topics, setTopics] = useState("");
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/exams");
      const data = (await response.json()) as { exams?: Exam[]; error?: string };
      if (!response.ok) {
        showToast(data.error ?? "Failed to load exams", "error");
        return;
      }
      setExams(data.exams ?? []);
    } catch {
      showToast("Failed to load exams", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchExams();

    void (async () => {
      const response = await fetch("/api/user/preferences");
      const data = (await response.json().catch(() => ({}))) as PreferencesResponse;
      if (response.ok) {
        setStudyStreak(data.studyStreak ?? 0);
      }
    })();

    void (async () => {
      const response = await fetch("/api/notes?limit=100");
      const data = (await response.json().catch(() => ({}))) as NotesResponse;
      if (!response.ok) return;
      const titles = (data.notes ?? []).map((note) => String(note.title ?? "").trim()).filter(Boolean);
      setNoteTitles(titles.slice(0, 40));
    })();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const sortedUpcoming = useMemo(
    () => [...exams].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()),
    [exams],
  );

  const nextExam = sortedUpcoming[0] ?? null;

  const totalExamsThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return exams.filter((exam) => {
      const date = new Date(exam.examDate);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;
  }, [exams]);

  const readinessScore = useMemo(() => {
    const allDays = exams.flatMap((exam) => parseStudyPlan(exam.studyPlan));
    if (!allDays.length) return 0;

    const completed = allDays.filter((day) => day.completed).length;
    return Math.round((completed / allDays.length) * 100);
  }, [exams]);

  const createExam = async () => {
    if (!subject.trim() || !examDate) {
      showToast("Subject and exam date/time are required", "error");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          examDate,
          board,
          difficulty,
          topics,
        }),
      });

      const data = (await response.json()) as { exam?: Exam; error?: string };
      if (!response.ok || !data.exam) {
        showToast(data.error ?? "Failed to create exam", "error");
        return;
      }

      setSubject("");
      setExamDate("");
      setBoard("");
      setDifficulty("Medium");
      setTopics("");
      showToast("Exam added", "success");
      await fetchExams();
    } catch {
      showToast("Failed to create exam", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const generateStudyPlan = async (examId: string) => {
    setGeneratingExamId(examId);

    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatePlan: true,
          noteTitles,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(data.error ?? "Failed to generate plan", "error");
        return;
      }

      showToast("Study plan generated", "success");
      await fetchExams();
    } catch {
      showToast("Failed to generate plan", "error");
    } finally {
      setGeneratingExamId("");
    }
  };

  const togglePlanDay = async (exam: Exam, dayIndex: number) => {
    const current = parseStudyPlan(exam.studyPlan);
    if (!current[dayIndex]) return;

    const nextDays = current.map((day, index) =>
      index === dayIndex ? { ...day, completed: !day.completed } : day,
    );

    setSavingPlanExamId(exam.id);

    try {
      const response = await fetch(`/api/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: nextDays }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(data.error ?? "Failed to update day", "error");
        return;
      }

      setExams((prev) =>
        prev.map((item) =>
          item.id === exam.id ? { ...item, studyPlan: JSON.stringify({ days: nextDays }) } : item,
        ),
      );
    } catch {
      showToast("Failed to update day", "error");
    } finally {
      setSavingPlanExamId("");
    }
  };

  const openScanPicker = () => {
    scanFileInputRef.current?.click();
  };

  const handleScanFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image for handwritten scanning", "error");
      return;
    }

    setIsScanningNotes(true);
    setScanConfidence(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/scan-handwritten", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as {
        text?: string;
        confidence?: number;
        error?: string;
      };

      if (!response.ok) {
        showToast(data.error ?? "Failed to scan handwritten notes", "error");
        return;
      }

      const text = String(data.text ?? "").trim();
      if (!text) {
        showToast("No readable handwritten text found", "error");
        return;
      }

      if (typeof data.confidence === "number") {
        setScanConfidence(data.confidence);
      }

      sessionStorage.setItem("studyforge:prefillText", text);
      sessionStorage.setItem("studyforge:prefillFormat", "summary");
      showToast("Handwritten notes ready in generator", "success");
      router.push("/generator?source=dashboard-scan");
    } catch {
      showToast("Failed to scan handwritten notes", "error");
    } finally {
      setIsScanningNotes(false);
    }
  };

  return (
    <main className="app-premium-dark min-h-screen bg-gray-950 text-white">
      <AppNav />

      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <PageHero
          title="Exam Countdown Dashboard"
          description="Track every upcoming exam, pressure level, and AI-generated day-by-day preparation plan."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button href="/my-notes" variant="secondary" size="sm">Open My Notes</Button>
              <Button onClick={openScanPicker} loading={isScanningNotes} disabled={isScanningNotes} variant="secondary" size="sm">
                Scan Handwritten Notes
              </Button>
            </div>
          }
        />

        <input
          ref={scanFileInputRef}
          type="file"
          accept="image/png,image/jpeg,.jpg,.jpeg"
          className="hidden"
          onChange={(event) => {
            void handleScanFile(event);
          }}
        />

        {scanConfidence !== null && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-200">
            Latest handwritten scan confidence: {scanConfidence}%
          </div>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-indigo-900/20 to-purple-900/40 p-5 shadow-xl lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Next Exam Countdown</p>
            {nextExam ? (
              <>
                <p className="mt-2 text-lg font-semibold text-slate-100">{subjectIcon(nextExam.subject)} {nextExam.subject}</p>
                <p className="mt-2 bg-gradient-to-r from-blue-300 via-cyan-300 to-purple-300 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                  {formatCountdown(nextExam.examDate)}
                </p>
                <p className="mt-2 text-xs text-slate-300">{new Date(nextExam.examDate).toLocaleString()}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-300">No exams added yet.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exams This Month</p>
            <p className="mt-2 text-4xl font-extrabold text-white">{totalExamsThisMonth}</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Study Streak</p>
            <p className="mt-2 text-4xl font-extrabold text-white">{studyStreak}</p>
            <p className="text-xs text-slate-400">days</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall Readiness Score</p>
              <p className="mt-1 text-3xl font-extrabold text-white">{readinessScore}%</p>
            </div>
            <div className="h-3 w-48 overflow-hidden rounded-full bg-slate-700 sm:w-72">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300" style={{ width: `${readinessScore}%` }} />
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-700 bg-[#0d142b] p-5 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Add Upcoming Exam</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject name"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />
            <input
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
              type="datetime-local"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <input
              value={board}
              onChange={(event) => setBoard(event.target.value)}
              placeholder="Exam board (APA, IB, Ontario...)"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              placeholder="Topics (comma separated)"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 md:col-span-2"
            />
            <Button onClick={() => void createExam()} loading={isSaving} disabled={isSaving}>
              Save Exam
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">Loading dashboard...</div>
        ) : exams.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">No exams yet. Add one above to start your countdown dashboard.</div>
        ) : (
          <div className="stagger-grid grid gap-5 xl:grid-cols-2">
            {sortedUpcoming.map((exam) => {
              const days = safeDaysUntil(exam.examDate);
              const urgencyTier = urgencyFromDays(days);
              const urgency = urgencyClasses(urgencyTier);
              const panic = panicData(exam);
              const planDays = parseStudyPlan(exam.studyPlan);

              return (
                <div key={exam.id} className="stagger-card rounded-2xl border border-slate-700 bg-[#0d142b] p-5 shadow-lg">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-bold text-white">{subjectIcon(exam.subject)} {exam.subject}</p>
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${urgency.badge} ${urgency.pulse}`}>
                      {urgencyTier.toUpperCase()} URGENCY
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">{new Date(exam.examDate).toLocaleString()} • {exam.board || "No board"} • {exam.difficulty || "Medium"}</p>

                  <p className={`mt-3 bg-gradient-to-r from-blue-300 via-purple-300 to-cyan-300 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl ${urgency.pulse}`}>
                    {formatCountdown(exam.examDate)}
                  </p>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>Panic meter</span>
                      <span>{urgencyProgress(days)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div className={`h-full ${urgency.bar}`} style={{ width: `${urgencyProgress(days)}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm">
                    <p className={`font-semibold ${panic.tier.color}`}>{panic.tier.label}</p>
                    <p className="mt-1 text-xs text-slate-300">
                      Topics: {panic.totalTopics} • Days available: {panic.daysAvailable} • Topics/day needed: {panic.topicsPerDay.toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      onClick={() => void generateStudyPlan(exam.id)}
                      loading={generatingExamId === exam.id}
                      disabled={generatingExamId === exam.id}
                      size="sm"
                    >
                      Generate Study Plan
                    </Button>
                  </div>

                  {planDays.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-slate-200">Study Timeline</p>
                      <div className="space-y-2">
                        {planDays.map((day, index) => {
                          const completed = Boolean(day.completed);
                          const today = isTodayLabel(day.date);

                          const cardClass = completed
                            ? "border-emerald-500/40 bg-emerald-500/15"
                            : today
                              ? "border-blue-500/40 bg-blue-500/15"
                              : "border-slate-700 bg-slate-900/60";

                          return (
                            <div key={`${exam.id}-${index}`} className={`rounded-lg border p-3 ${cardClass}`}>
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={completed}
                                  disabled={savingPlanExamId === exam.id}
                                  onChange={() => void togglePlanDay(exam, index)}
                                  className="mt-1 h-4 w-4 rounded border-slate-500 bg-transparent"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white">Day {index + 1} ({day.date}): {day.title}</p>
                                  {day.tasks.length > 0 && (
                                    <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-300">
                                      {day.tasks.map((task, taskIndex) => (
                                        <li key={`${exam.id}-${index}-${taskIndex}`}>{task}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
