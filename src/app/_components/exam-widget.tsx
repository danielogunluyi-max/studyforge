"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type ExamLite = {
  id: string;
  subject: string;
  examDate: string;
};

function countdownFromNow(examDate: string) {
  const msRemaining = new Date(examDate).getTime() - new Date().getTime();
  const safeRemaining = Math.max(0, msRemaining);
  const totalMinutes = Math.floor(safeRemaining / (1000 * 60));
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  return { days, hours, minutes };
}

function urgencyColor(examDate: string) {
  const msRemaining = new Date(examDate).getTime() - new Date().getTime();
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
  return daysRemaining <= 1
    ? "var(--accent-red)"
    : daysRemaining <= 3
      ? "var(--accent-orange)"
      : daysRemaining <= 7
        ? "var(--accent-orange)"
        : "var(--accent-green)";
}

export function ExamWidget() {
  const { data: session, status } = useSession();
  const [upcomingExams, setUpcomingExams] = useState<ExamLite[]>([]);
  const [tick, setTick] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      setUpcomingExams([]);
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
      const data = Array.isArray(payload.exams)
        ? payload.exams
        : Array.isArray(payload.items)
          ? payload.items
          : [];

      const now = new Date();
      const nowMs = now.getTime();
      const upcoming = data.filter((e: ExamLite) => new Date(e.examDate).getTime() > nowMs);
      upcoming.sort((a: ExamLite, b: ExamLite) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
      setUpcomingExams(upcoming);
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

  const upcoming = useMemo(() => {
    void tick;
    return [...upcomingExams].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  }, [tick, upcomingExams]);

  const nearest = upcoming[0] ?? null;

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-3 right-3 z-40 sm:left-auto sm:right-4">
      <div
        className="pointer-events-auto w-full rounded-xl bg-slate-900/95 p-3 text-slate-100 shadow-2xl sm:w-80"
        style={{
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: nearest ? urgencyColor(nearest.examDate) : "var(--border-default)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exam Widget</p>
          <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
            {upcoming.length}
          </span>
        </div>

        {!nearest ? (
          <>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>No upcoming exams</p>
            <Link href="/dashboard" className="mt-2 inline-block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Add one →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 truncate text-sm font-semibold text-white">{nearest.subject}</p>
            {(() => {
              const parts = countdownFromNow(nearest.examDate);
              return (
                <p className="mt-1 text-sm font-semibold" style={{ color: urgencyColor(nearest.examDate) }}>
                  {parts.days}d {parts.hours}h {parts.minutes}m left
                </p>
              );
            })()}
            <p className="mt-1 text-xs text-slate-400">{new Date(nearest.examDate).toLocaleString()}</p>
          </>
        )}

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsExpanded((prev) => !prev);
            }}
            className="text-xs font-semibold text-blue-300 hover:text-blue-200"
          >
            {isExpanded ? "Hide list" : "View all"}
          </button>
          <Link href="/dashboard" className="text-xs font-semibold text-blue-300 hover:text-blue-200">
            Open Dashboard →
          </Link>
        </div>

        {isExpanded && (
          <div className="mt-3 border-t border-slate-700 pt-3">
            {upcoming.length === 0 ? (
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>You have no upcoming exams</p>
                <Link href="/dashboard" className="mt-1 inline-block text-xs font-semibold text-blue-300 hover:text-blue-200">
                  Add one →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((exam) => {
                  const parts = countdownFromNow(exam.examDate);
                  return (
                    <div key={exam.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
                      <p className="truncate text-sm font-semibold text-white">{exam.subject}</p>
                      <p className="text-xs font-semibold" style={{ color: urgencyColor(exam.examDate) }}>
                        {parts.days}d {parts.hours}h {parts.minutes}m left
                      </p>
                      <p className="text-[11px] text-slate-400">{new Date(exam.examDate).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
