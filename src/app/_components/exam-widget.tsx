"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type ExamLite = {
  id: string;
  subject: string;
  examDate: string;
};

function examTimestamp(examDate: string) {
  const parsed = new Date(examDate);
  if (Number.isNaN(parsed.getTime())) return Number.NaN;

  // Treat date-only values as end-of-day so same-day exams stay visible.
  if (
    parsed.getHours() === 0 &&
    parsed.getMinutes() === 0 &&
    parsed.getSeconds() === 0 &&
    parsed.getMilliseconds() === 0
  ) {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed.getTime();
}

function countdown(examDate: string) {
  const target = new Date(examDate).getTime();
  const diff = Math.max(0, target - Date.now());
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  return { days, hours, minutes };
}

function urgencyColor(days: number) {
  if (days >= 30) return "text-emerald-300";
  if (days >= 14) return "text-yellow-300";
  if (days >= 7) return "text-orange-300";
  return "text-red-300";
}

export function ExamWidget() {
  const { data: session, status } = useSession();
  const [exams, setExams] = useState<ExamLite[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      setExams([]);
      return;
    }

    const load = async () => {
      const response = await fetch("/api/exams", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }).catch(() => null);
      if (!response?.ok) return;
      const payload = (await response.json().catch(() => ({}))) as { exams?: ExamLite[]; items?: ExamLite[] };
      const items = Array.isArray(payload.exams)
        ? payload.exams
        : Array.isArray(payload.items)
          ? payload.items
          : [];
      setExams(items);
    };

    void load();
    const refreshTimer = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => window.clearInterval(refreshTimer);
  }, [session?.user, status]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const nextExam = useMemo(() => {
    void tick;
    const now = Date.now();
    return [...exams]
      .filter((exam) => {
        const ts = examTimestamp(exam.examDate);
        return Number.isFinite(ts) && ts >= now;
      })
      .sort((a, b) => examTimestamp(a.examDate) - examTimestamp(b.examDate))[0] ?? null;
  }, [exams, tick]);

  if (status !== "authenticated") {
    return null;
  }

  if (!nextExam) {
    return (
      <div className="pointer-events-none fixed bottom-4 left-3 right-3 z-40 sm:left-auto sm:right-4">
        <div className="pointer-events-auto w-full rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-slate-100 shadow-2xl sm:w-80">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exam Widget</p>
          <p className="mt-1 text-sm text-slate-300">No upcoming exams</p>
          <Link href="/dashboard" className="mt-2 inline-block text-xs font-semibold text-blue-300 hover:text-blue-200">
            Open Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  const parts = countdown(nextExam.examDate);
  const urgency = urgencyColor(parts.days);

  return (
    <div className="pointer-events-none fixed bottom-4 left-3 right-3 z-40 sm:left-auto sm:right-4">
      <div className="pointer-events-auto w-full rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-slate-100 shadow-2xl sm:w-80">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next Exam</p>
        <p className="mt-1 truncate text-sm font-semibold text-white">{nextExam.subject}</p>
        <p className={`mt-1 text-sm font-semibold ${urgency}`}>
          {parts.days}d {parts.hours}h {parts.minutes}m left
        </p>
        <p className="mt-1 text-xs text-slate-400">{new Date(nextExam.examDate).toLocaleString()}</p>
        <Link href="/dashboard" className="mt-2 inline-block text-xs font-semibold text-blue-300 hover:text-blue-200">
          Open Dashboard →
        </Link>
      </div>
    </div>
  );
}
