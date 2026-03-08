"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "~/app/_components/toast";

type Strictness = "chill" | "strict";

type PersistedFocusSession = {
  sessionId: string;
  goal: string;
  durationMins: number;
  timeLeft: number;
  distractions: number;
  startedAt: number;
  isPaused: boolean;
  strictness: Strictness;
  ambientEnabled: boolean;
  lastSavedAt: number;
};

type FocusSessionResponse = {
  id: string;
  goal: string | null;
  durationMins: number;
  startedAt: string;
};

const FOCUS_STORAGE_KEY = "focusSession";
const quotes = [
  "The secret of getting ahead is getting started.",
  "Focus on being productive instead of busy.",
  "You don't have to be great to start, but you have to start to be great.",
  "One task at a time. That's all it takes.",
  "Deep work is the superpower of the 21st century.",
  "Distraction is the enemy of vision.",
  "Small progress is still progress.",
  "Your future self is watching. Make them proud.",
  "Every minute of focus compounds.",
  "The present moment is where results live.",
];

function minutesFromSeconds(seconds: number) {
  return Math.max(0, Math.round(seconds / 60));
}

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function FocusMode() {
  const { showToast } = useToast();

  const [showStartModal, setShowStartModal] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const [goal, setGoal] = useState("");
  const [durationMins, setDurationMins] = useState(25);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customDuration, setCustomDuration] = useState("25");
  const [strictness, setStrictness] = useState<Strictness>("chill");
  const [ambientEnabled, setAmbientEnabled] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [distractions, setDistractions] = useState(0);

  const [showDistractionFlash, setShowDistractionFlash] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [quitInput, setQuitInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [isTriggerHover, setIsTriggerHover] = useState(false);

  const hiddenDuringSessionRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = durationMins > 0 ? timeLeft / (durationMins * 60) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const activeQuote = useMemo(() => quotes[currentQuoteIndex] ?? quotes[0], [currentQuoteIndex]);

  const persistSession = (override?: Partial<PersistedFocusSession>) => {
    if (!isActive || !sessionId) return;

    const payload: PersistedFocusSession = {
      sessionId,
      goal,
      durationMins,
      timeLeft,
      distractions,
      startedAt: startedAtRef.current,
      isPaused,
      strictness,
      ambientEnabled,
      lastSavedAt: Date.now(),
      ...override,
    };

    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(payload));
  };

  const clearPersistedSession = () => {
    sessionStorage.removeItem(FOCUS_STORAGE_KEY);
  };

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy.
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen exit errors.
    }
  };

  const playCompletionSound = () => {
    try {
      const ctx = new AudioContext();
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";

        const start = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
        gain.gain.linearRampToValueAtTime(0, start + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });

      window.setTimeout(() => {
        void ctx.close();
      }, 1800);
    } catch {
      // Ignore audio errors.
    }
  };

  const patchSessionEnd = async ({
    completed,
    abandoned,
    actualMins,
    distractionCount,
  }: {
    completed: boolean;
    abandoned?: boolean;
    actualMins: number;
    distractionCount: number;
  }) => {
    if (!sessionId) return;

    await fetch(`/api/focus/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed,
        abandoned: Boolean(abandoned),
        actualMins,
        distractions: distractionCount,
      }),
    }).catch(() => null);
  };

  const closeOverlay = async () => {
    setIsActive(false);
    setIsPaused(false);
    setSessionComplete(false);
    setShowQuitConfirm(false);
    setQuitInput("");
    setSessionId(null);
    setDistractions(0);
    setTimeLeft(durationMins * 60);
    clearPersistedSession();
    await exitFullscreen();
  };

  const handleSessionComplete = async () => {
    const actualMins = minutesFromSeconds(durationMins * 60 - timeLeft);

    await patchSessionEnd({
      completed: true,
      abandoned: false,
      actualMins: Math.max(actualMins, durationMins),
      distractionCount: distractions,
    });

    fetch("/api/nova", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "DECK_COMPLETED" }),
    }).catch(() => {});

    playCompletionSound();
    setSessionComplete(true);
    setIsPaused(false);
    clearPersistedSession();
  };

  const abandonSession = async () => {
    const actualMins = minutesFromSeconds(durationMins * 60 - timeLeft);

    await patchSessionEnd({
      completed: false,
      abandoned: true,
      actualMins,
      distractionCount: distractions,
    });

    showToast("Focus session ended early", "error");
    await closeOverlay();
  };

  const confirmQuit = async () => {
    if (quitInput !== "QUIT") return;
    await abandonSession();
  };

  const handleQuit = async () => {
    if (strictness === "strict") {
      setShowQuitConfirm(true);
      return;
    }

    await abandonSession();
  };

  const handlePause = () => {
    setIsPaused((prev) => !prev);
  };

  const startSession = async () => {
    const resolvedDuration = showCustomDuration
      ? Math.min(180, Math.max(5, Number(customDuration) || 25))
      : durationMins;

    setIsStarting(true);

    const response = await fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: goal.trim(),
        durationMins: resolvedDuration,
      }),
    }).catch(() => null);

    const payload = (await response?.json().catch(() => ({}))) as {
      session?: FocusSessionResponse;
      error?: string;
    };

    if (!response?.ok || !payload.session) {
      setIsStarting(false);
      showToast(payload.error ?? "Failed to start focus session", "error");
      return;
    }

    const startedAt = new Date(payload.session.startedAt).getTime();
    startedAtRef.current = Number.isFinite(startedAt) ? startedAt : Date.now();

    setSessionId(payload.session.id);
    setDurationMins(resolvedDuration);
    setTimeLeft(resolvedDuration * 60);
    setDistractions(0);
    setIsPaused(false);
    setSessionComplete(false);
    setShowQuitConfirm(false);
    setQuitInput("");
    setIsActive(true);
    setShowStartModal(false);
    setIsStarting(false);

    if (ambientEnabled) {
      document.dispatchEvent(
        new CustomEvent("ambient:play", {
          detail: { soundId: "lofi" },
        }),
      );
    }

    await requestFullscreen();

    persistSession({
      sessionId: payload.session.id,
      startedAt: startedAtRef.current,
      timeLeft: resolvedDuration * 60,
      distractions: 0,
      isPaused: false,
      durationMins: resolvedDuration,
    });
  };

  const startNewSession = async () => {
    await closeOverlay();
    setShowStartModal(true);
  };

  useEffect(() => {
    const restoreRaw = sessionStorage.getItem(FOCUS_STORAGE_KEY);
    if (!restoreRaw) return;

    try {
      const restored = JSON.parse(restoreRaw) as PersistedFocusSession;
      const elapsedFromStart = Date.now() - restored.startedAt;
      const allowedLifetime = restored.durationMins * 60 * 1000;

      if (elapsedFromStart > allowedLifetime) {
        clearPersistedSession();
        return;
      }

      const driftSeconds = restored.isPaused
        ? 0
        : Math.max(0, Math.floor((Date.now() - restored.lastSavedAt) / 1000));
      const restoredTimeLeft = Math.max(0, restored.timeLeft - driftSeconds);

      setSessionId(restored.sessionId);
      setGoal(restored.goal ?? "");
      setDurationMins(restored.durationMins);
      setCustomDuration(String(restored.durationMins));
      setTimeLeft(restoredTimeLeft);
      setDistractions(restored.distractions);
      setIsPaused(restored.isPaused);
      setStrictness(restored.strictness);
      setAmbientEnabled(restored.ambientEnabled);
      setIsActive(restoredTimeLeft > 0);
      setSessionComplete(false);
      startedAtRef.current = restored.startedAt;

      if (restoredTimeLeft <= 0) {
        clearPersistedSession();
      }
    } catch {
      clearPersistedSession();
    }
  }, []);

  useEffect(() => {
    if (!isActive || isPaused || sessionComplete) return;

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          void handleSessionComplete();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isActive, isPaused, sessionComplete]);

  useEffect(() => {
    if (!isActive || sessionComplete) return;

    const persistInterval = window.setInterval(() => {
      persistSession({ timeLeft, distractions, isPaused });
    }, 10000);

    return () => window.clearInterval(persistInterval);
  }, [isActive, sessionComplete, timeLeft, distractions, isPaused, goal, strictness, ambientEnabled, durationMins, sessionId]);

  useEffect(() => {
    if (!isActive || sessionComplete) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenDuringSessionRef.current = true;
        setDistractions((current) => current + 1);
        return;
      }

      if (hiddenDuringSessionRef.current) {
        hiddenDuringSessionRef.current = false;
        setShowDistractionFlash(true);
        window.setTimeout(() => setShowDistractionFlash(false), 800);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive, sessionComplete]);

  useEffect(() => {
    if (!isActive || sessionComplete) return;

    const quoteInterval = window.setInterval(() => {
      setQuoteVisible(false);
      window.setTimeout(() => {
        setCurrentQuoteIndex((idx) => (idx + 1) % quotes.length);
        setQuoteVisible(true);
      }, 250);
    }, 60000);

    return () => window.clearInterval(quoteInterval);
  }, [isActive, sessionComplete]);

  useEffect(() => {
    const handler = () => setShowStartModal(true);
    window.addEventListener("focus:open", handler);
    return () => window.removeEventListener("focus:open", handler);
  }, []);

  return (
    <>
      {!isActive && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 998,
          }}
        >
          <button
            onMouseEnter={() => setIsTriggerHover(true)}
            onMouseLeave={() => setIsTriggerHover(false)}
            onClick={() => setShowStartModal(true)}
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${isTriggerHover ? "var(--accent-blue)" : "var(--border-default)"}`,
              borderRadius: "24px",
              padding: "8px 18px",
              color: isTriggerHover ? "var(--accent-blue)" : "var(--text-muted)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              transition: "all 0.2s ease",
              letterSpacing: "0.04em",
            }}
          >
            🎯 Focus Mode
          </button>
        </div>
      )}

      {showStartModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => !isStarting && setShowStartModal(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "420px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>
              Start Focus Session 🎯
            </h3>
            <p style={{ margin: "6px 0 18px", color: "var(--text-muted)", fontSize: "13px" }}>
              Lock in and get it done.
            </p>

            <input
              className="input"
              placeholder="What are you focusing on? (e.g. Chapter 4 Biology)"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              style={{ marginBottom: "20px" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {[15, 25, 30, 45, 60, 90].map((mins) => {
                const active = !showCustomDuration && durationMins === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setDurationMins(mins);
                      setShowCustomDuration(false);
                    }}
                    style={{
                      borderRadius: "10px",
                      border: `1px solid ${active ? "var(--accent-blue)" : "var(--border-default)"}`,
                      background: active ? "var(--accent-blue)" : "var(--bg-elevated)",
                      color: active ? "white" : "var(--text-muted)",
                      fontWeight: active ? 700 : 500,
                      fontSize: "12px",
                      padding: "10px 8px",
                      cursor: "pointer",
                    }}
                  >
                    {mins} min
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: "10px" }}
              onClick={() => setShowCustomDuration((current) => !current)}
            >
              Custom
            </button>

            {showCustomDuration && (
              <input
                className="input"
                type="number"
                min={5}
                max={180}
                value={customDuration}
                onChange={(event) => setCustomDuration(event.target.value)}
                style={{ marginTop: "10px" }}
              />
            )}

            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStrictness("chill")}
                style={{
                  textAlign: "left",
                  borderRadius: "10px",
                  border: `1px solid ${strictness === "chill" ? "var(--accent-blue)" : "var(--border-default)"}`,
                  background: strictness === "chill" ? "var(--glow-blue)" : "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  padding: "10px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "16px" }}>😌</div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "4px" }}>Chill</div>
                <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px" }}>Easy to exit</div>
              </button>

              <button
                type="button"
                onClick={() => setStrictness("strict")}
                style={{
                  textAlign: "left",
                  borderRadius: "10px",
                  border: `1px solid ${strictness === "strict" ? "var(--accent-blue)" : "var(--border-default)"}`,
                  background: strictness === "strict" ? "var(--glow-blue)" : "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  padding: "10px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "16px" }}>🔒</div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "4px" }}>Strict</div>
                <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px" }}>Type QUIT to exit</div>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "16px",
              }}
            >
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>🎵 Play ambient sound during session</span>
              <button
                type="button"
                onClick={() => setAmbientEnabled((current) => !current)}
                style={{
                  width: "42px",
                  height: "24px",
                  borderRadius: "999px",
                  border: "1px solid var(--border-default)",
                  background: ambientEnabled ? "var(--accent-blue)" : "var(--bg-elevated)",
                  padding: "2px",
                  display: "flex",
                  justifyContent: ambientEnabled ? "flex-end" : "flex-start",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                aria-label="Toggle ambient sound"
              >
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "white",
                    display: "block",
                  }}
                />
              </button>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "18px" }}
              onClick={() => void startSession()}
              disabled={isStarting}
            >
              {isStarting ? "Starting..." : "Start Session →"}
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "var(--bg-base)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            animation: showDistractionFlash ? "distraction-flash 0.8s ease" : "none",
          }}
        >
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                top: "20%",
                left: "15%",
                width: 400,
                height: 400,
                borderRadius: "50%",
                background: "var(--glow-blue)",
                filter: "blur(80px)",
                animation: "focus-breathe 8s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "20%",
                right: "15%",
                width: 300,
                height: 300,
                borderRadius: "50%",
                background: "var(--glow-purple)",
                filter: "blur(80px)",
                animation: "focus-breathe 10s ease-in-out infinite 2s",
              }}
            />
          </div>

          {showDistractionFlash && (
            <div
              className="animate-fade-in-up"
              style={{
                position: "absolute",
                top: "24px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid var(--accent-red)",
                borderRadius: "10px",
                padding: "10px 20px",
                color: "var(--accent-red)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              ⚠️ Stay focused! Tab switch detected.
            </div>
          )}

          {sessionComplete ? (
            <div style={{ textAlign: "center", zIndex: 1 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.15)",
                  border: "2px solid var(--accent-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  margin: "0 auto 24px",
                  animation: "focus-scale-in 0.5s ease",
                }}
              >
                ✓
              </div>

              <h2 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                Session Complete! 🎉
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
                You focused for {durationMins} minutes
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "16px",
                  margin: "0 auto 32px",
                  maxWidth: "360px",
                }}
              >
                <div className="card" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-blue)" }}>{durationMins}m</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Focused</div>
                </div>
                <div className="card" style={{ padding: "16px" }}>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: distractions === 0 ? "var(--accent-green)" : "var(--accent-orange)",
                    }}
                  >
                    {distractions}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Distractions</div>
                </div>
                <div className="card" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-purple)" }}>
                    {distractions === 0 ? "💯" : distractions < 3 ? "⭐" : "👍"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Rating</div>
                </div>
              </div>

              {distractions === 0 && (
                <div
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid var(--accent-green)",
                    borderRadius: "10px",
                    padding: "10px 16px",
                    color: "var(--accent-green)",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "24px",
                  }}
                >
                  🏆 Perfect session — zero distractions!
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => void startNewSession()}>
                  🎯 Focus Again
                </button>
                <button className="btn btn-ghost" onClick={() => void closeOverlay()}>
                  ✓ Done for Now
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "32px",
                  maxWidth: "400px",
                  textAlign: "center",
                  zIndex: 1,
                }}
              >
                🎯 {goal || "Focus Session"}
              </p>

              <svg width="220" height="220" style={{ marginBottom: "8px", zIndex: 1 }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--border-default)" strokeWidth="6" />
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="none"
                  stroke={timeLeft < 60 ? "var(--accent-red)" : "var(--accent-blue)"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 110 110)"
                  style={{
                    transition: "stroke-dashoffset 1s linear, stroke 0.5s ease",
                    filter: "url(#glow)",
                  }}
                />
                <text
                  x="110"
                  y="100"
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="40"
                  fontWeight="800"
                  fontFamily="Inter, sans-serif"
                  style={{ opacity: isPaused ? 0.5 : 1, transition: "opacity 0.2s ease" }}
                >
                  {formatClock(timeLeft)}
                </text>
                <text x="110" y="128" textAnchor="middle" fill="var(--text-muted)" fontSize="12" fontFamily="Inter, sans-serif">
                  remaining
                </text>
              </svg>

              {isPaused && (
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "var(--accent-orange)",
                    letterSpacing: "0.1em",
                    marginBottom: "10px",
                    zIndex: 1,
                  }}
                >
                  ⏸ PAUSED
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  color: distractions > 3 ? "var(--accent-red)" : "var(--text-muted)",
                  marginBottom: "40px",
                  transition: "color 0.3s ease",
                  zIndex: 1,
                }}
              >
                <span>⚡</span>
                <span>
                  {distractions === 0
                    ? "No distractions — great focus!"
                    : `${distractions} distraction${distractions > 1 ? "s" : ""} detected`}
                </span>
              </div>

              <div style={{ display: "flex", gap: "12px", zIndex: 1 }}>
                <button className="btn btn-ghost" onClick={handlePause}>
                  {isPaused ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button className="btn btn-danger" onClick={() => void handleQuit()}>
                  {strictness === "strict" ? "🔒 Quit" : "✕ End Session"}
                </button>
              </div>
            </>
          )}

          {showQuitConfirm && !sessionComplete && (
            <div
              className="animate-fade-in-up"
              style={{
                position: "absolute",
                bottom: "80px",
                background: "var(--bg-card)",
                border: "1px solid var(--accent-red)",
                borderRadius: "12px",
                padding: "16px 20px",
                textAlign: "center",
                zIndex: 2,
                width: "min(420px, calc(100% - 32px))",
              }}
            >
              <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: "8px" }}>
                Type QUIT to end your session early
              </p>
              <input
                className="input"
                placeholder="QUIT"
                value={quitInput}
                onChange={(event) => setQuitInput(event.target.value.toUpperCase())}
                style={{ marginBottom: "8px", textAlign: "center", letterSpacing: "0.2em", fontWeight: 700 }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowQuitConfirm(false);
                    setQuitInput("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1 }}
                  disabled={quitInput !== "QUIT"}
                  onClick={() => void confirmQuit()}
                >
                  Confirm Quit
                </button>
              </div>
            </div>
          )}

          {!sessionComplete && (
            <p
              style={{
                position: "absolute",
                bottom: "32px",
                fontSize: "13px",
                color: "var(--text-muted)",
                fontStyle: "italic",
                maxWidth: "400px",
                textAlign: "center",
                transition: "opacity 0.5s ease",
                opacity: quoteVisible ? 1 : 0,
                zIndex: 1,
              }}
            >
              "{activeQuote}"
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes focus-breathe {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes focus-glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(79,110,247,0.1); }
          50% { box-shadow: 0 0 80px rgba(79,110,247,0.25); }
        }
        @keyframes distraction-flash {
          0% { background: rgba(239,68,68,0.0); }
          20% { background: rgba(239,68,68,0.15); }
          100% { background: rgba(239,68,68,0.0); }
        }
        @keyframes focus-scale-in {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}