"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  const BASE_RIGHT = 16;
  const BASE_BOTTOM = 16;
  const SESSION_KEY = "kyvex:exam-widget-offset";

  const clampOffset = (nextX: number, nextY: number) => {
    const width = widgetRef.current?.offsetWidth ?? 320;
    const height = widgetRef.current?.offsetHeight ?? 160;
    const maxRight = Math.max(0, window.innerWidth - width);
    const maxBottom = Math.max(0, window.innerHeight - height);

    const minOffsetX = BASE_RIGHT - maxRight;
    const maxOffsetX = BASE_RIGHT;
    const minOffsetY = BASE_BOTTOM - maxBottom;
    const maxOffsetY = BASE_BOTTOM;

    return {
      x: Math.max(minOffsetX, Math.min(maxOffsetX, nextX)),
      y: Math.max(minOffsetY, Math.min(maxOffsetY, nextY)),
    };
  };

  const persistOffset = (nextOffset: { x: number; y: number }) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextOffset));
    } catch {
      // Ignore persistence errors in restricted environments.
    }
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      startX: offset.x,
      startY: offset.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;

      const unclampedX = dragStartRef.current.startX + deltaX;
      const unclampedY = dragStartRef.current.startY + deltaY;
      const next = clampOffset(unclampedX, unclampedY);
      setOffset(next);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      persistOffset(offset);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        setOffset(clampOffset(parsed.x, parsed.y));
      }
    } catch {
      // Ignore malformed session data.
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setOffset((current) => clampOffset(current.x, current.y));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    persistOffset(offset);
  }, [offset]);

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

  const right = BASE_RIGHT - offset.x;
  const bottom = BASE_BOTTOM - offset.y;

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 40,
        right,
        bottom,
        width: 320,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <div
        ref={widgetRef}
        style={{
          width: "100%",
          border: `1px solid ${nearest && !isCollapsed ? urgencyColor(nearest.examDate) : "var(--border)"}`,
          borderRadius: 12,
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
        }}
      >
        <div
          onMouseDown={startDrag}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "10px 12px",
            borderBottom: isCollapsed ? "none" : "1px solid var(--border)",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
            background: "var(--bg-card-hover)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 4px)",
                gridTemplateRows: "repeat(2, 4px)",
                gap: 3,
                opacity: 0.8,
              }}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={`grip-${index}`} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-secondary)" }} />
              ))}
            </span>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: 0.6, textTransform: "uppercase" }}>
              Exam Widget
            </p>
            <span
              style={{
                borderRadius: 20,
                border: "1px solid var(--border)",
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              {upcoming.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCollapsed((prev) => !prev);
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isCollapsed ? "Expand widget" : "Collapse widget"}
          >
            {isCollapsed ? "📅" : "−"}
          </button>
        </div>

        {!isCollapsed && (
          <div style={{ padding: 12 }}>
            {!nearest ? (
              <>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>No upcoming exams</p>
                <Link href="/dashboard" style={{ marginTop: 8, display: "inline-block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  Add one →
                </Link>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nearest.subject}
                </p>
                {(() => {
                  const parts = countdownFromNow(nearest.examDate);
                  return (
                    <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: urgencyColor(nearest.examDate) }}>
                      {parts.days}d {parts.hours}h {parts.minutes}m left
                    </p>
                  );
                })()}
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  {new Date(nearest.examDate).toLocaleString()}
                </p>
              </>
            )}

            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded((prev) => !prev);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: "var(--accent-blue)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isExpanded ? "Hide list" : "View all"}
              </button>
              <Link href="/dashboard" style={{ color: "var(--accent-blue)", fontSize: 12, fontWeight: 700 }}>
                Open Dashboard →
              </Link>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                {upcoming.length === 0 ? (
                  <div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>You have no upcoming exams</p>
                    <Link href="/dashboard" style={{ marginTop: 6, display: "inline-block", fontSize: 12, fontWeight: 700, color: "var(--accent-blue)" }}>
                      Add one →
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {upcoming.map((exam) => {
                      const parts = countdownFromNow(exam.examDate);
                      return (
                        <div
                          key={exam.id}
                          style={{
                            borderRadius: 10,
                            border: "1px solid var(--border)",
                            background: "var(--bg-card-hover)",
                            padding: 8,
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {exam.subject}
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: urgencyColor(exam.examDate) }}>
                            {parts.days}d {parts.hours}h {parts.minutes}m left
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                            {new Date(exam.examDate).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

