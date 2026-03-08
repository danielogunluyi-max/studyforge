"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getNovaState,
  xpInCurrentLevel,
  xpToNextLevel,
} from "@/lib/novaXP";
import NovaLevelUpToast from "~/app/_components/nova-levelup-toast";

type NovaStats = {
  id: string;
  userId: string;
  happiness: number;
  totalXP: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  notesGenerated: number;
  flashcardsStudied: number;
  audioConverted: number;
  battlesWon: number;
  createdAt: string;
  updatedAt: string;
};

type NovaGetResponse = {
  stats: NovaStats;
};

function sparkPath(x: number, y: number) {
  return `M${x},${y - 2} L${x + 1.1},${y - 0.8} L${x + 2.3},${y - 2} L${x + 1.5},${y - 0.2} L${x + 3.4},${y + 0.8} L${x + 1.4},${y + 0.8} L${x + 0.8},${y + 2.8} L${x + 0.2},${y + 0.8} L${x - 1.8},${y + 0.8} L${x},${y - 0.2} Z`;
}

const NovaSVG = ({ happiness, size = 48 }: { happiness: number; size?: number }) => {
  const state = getNovaState(happiness);
  const happy = happiness >= 60;
  const thriving = happiness >= 80;
  const neutral = happiness >= 40 && happiness < 60;
  const sleepy = happiness < 20;

  const eyeY = happy ? 30 : neutral ? 30 : 32;
  const eyeR = happy ? 3 : 2.5;

  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true">
      <circle cx="30" cy="32" r="22" fill="none" stroke={state.color} strokeOpacity="0.1" strokeWidth="8" />
      <circle cx="30" cy="32" r="18" fill={state.color} fillOpacity="0.2" stroke={state.color} strokeWidth="1.5" />

      <circle cx="24" cy={eyeY} r={eyeR} fill={state.color} />
      <circle cx="36" cy={eyeY} r={eyeR} fill={state.color} />

      {thriving && (
        <path d="M22 38 Q30 44 38 38" fill="none" stroke={state.color} strokeWidth="2" strokeLinecap="round" />
      )}
      {!thriving && happy && (
        <path d="M23 37 Q30 41 37 37" fill="none" stroke={state.color} strokeWidth="2" strokeLinecap="round" />
      )}
      {neutral && (
        <path d="M24 37 L36 37" fill="none" stroke={state.color} strokeWidth="2" strokeLinecap="round" />
      )}
      {happiness < 40 && (
        <path d="M22 40 Q30 35 38 40" fill="none" stroke={state.color} strokeWidth="2" strokeLinecap="round" />
      )}

      {thriving && (
        <>
          <path d={sparkPath(12, 12)} fill={state.color} />
          <path d={sparkPath(48, 10)} fill={state.color} />
          <path d={sparkPath(8, 48)} fill={state.color} />
          <path d={sparkPath(52, 45)} fill={state.color} />
        </>
      )}

      {sleepy && (
        <text x="40" y="16" fill="var(--text-muted)" fontSize="10" fontStyle="italic">
          z
        </text>
      )}
    </svg>
  );
};

function NovaExpandedCard({ stats, onCollapse }: { stats: NovaStats; onCollapse: () => void }) {
  const novaState = getNovaState(stats.happiness);
  const currentLevelXP = xpInCurrentLevel(stats.totalXP);
  const nextLevelXP = xpToNextLevel(stats.level);
  const xpPct = Math.max(0, Math.min(100, (currentLevelXP / nextLevelXP) * 100));

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Nova</span>
        <button
          onClick={onCollapse}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}
        >
          −
        </button>
      </div>

      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ display: "inline-block", animation: "nova-float 3s ease-in-out infinite" }}>
          <NovaSVG happiness={stats.happiness} size={64} />
        </div>
        <div style={{ fontSize: 12, color: novaState.color, fontWeight: 600, marginTop: 4 }}>{novaState.label}</div>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 11,
          color: "var(--text-secondary)",
          textAlign: "center",
          fontStyle: "italic",
          marginBottom: 10,
        }}
      >
        "{novaState.message}"
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          <span>Happiness</span>
          <span>{stats.happiness}/100</span>
        </div>
        <div style={{ height: 6, background: "var(--border-default)", borderRadius: 3 }}>
          <div
            style={{
              height: "100%",
              width: `${stats.happiness}%`,
              background: novaState.color,
              borderRadius: 3,
              transition: "width 0.8s ease",
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          <span>Level {stats.level} XP</span>
          <span>
            {currentLevelXP}/{nextLevelXP}
          </span>
        </div>
        <div style={{ height: 6, background: "var(--border-default)", borderRadius: 3 }}>
          <div
            style={{
              height: "100%",
              width: `${xpPct}%`,
              background: "var(--accent-purple)",
              borderRadius: 3,
              transition: "width 0.8s ease",
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10 }}>
        <div style={{ color: "var(--text-muted)" }}>
          🔥 Streak: <span style={{ color: "var(--accent-orange)" }}>{stats.streak} days</span>
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          ⚡ Total XP: <span style={{ color: "var(--accent-blue)" }}>{stats.totalXP}</span>
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          📝 Notes: <span style={{ color: "var(--text-secondary)" }}>{stats.notesGenerated}</span>
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          🃏 Cards: <span style={{ color: "var(--text-secondary)" }}>{stats.flashcardsStudied}</span>
        </div>
      </div>

      <style>{`
        @keyframes nova-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

export default function NovaPet() {
  const [stats, setStats] = useState<NovaStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const loadNova = async () => {
    try {
      const response = await fetch("/api/nova", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as Partial<NovaGetResponse>;
      if (response.ok && data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Ignore pet sync errors; sidebar should stay stable.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNova();

    const onLevelUp = (event: Event) => {
      const custom = event as CustomEvent<{ level?: number }>;
      if (typeof custom.detail?.level === "number") {
        setLevelUpLevel(custom.detail.level);
      }
      void loadNova();
    };

    const onNovaSync = () => {
      void loadNova();
    };

    window.addEventListener("nova:levelup", onLevelUp as EventListener);
    window.addEventListener("nova:sync", onNovaSync);

    return () => {
      window.removeEventListener("nova:levelup", onLevelUp as EventListener);
      window.removeEventListener("nova:sync", onNovaSync);
    };
  }, []);

  const novaState = useMemo(() => {
    if (!stats) return getNovaState(50);
    return getNovaState(stats.happiness);
  }, [stats]);

  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border-default)",
        marginTop: "auto",
      }}
    >
      <NovaLevelUpToast
        level={levelUpLevel ?? stats?.level ?? 1}
        visible={levelUpLevel !== null}
        onClose={() => setLevelUpLevel(null)}
      />

      {loading || !stats ? (
        <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
      ) : !isExpanded ? (
        <div
          onClick={() => setIsExpanded(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            padding: 4,
            borderRadius: 8,
            transition: "background 0.2s ease",
            background: "transparent",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = "var(--bg-hover)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "transparent";
          }}
        >
          <NovaSVG happiness={stats.happiness} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: novaState.color }}>Nova • Lv.{stats.level}</div>
            <div
              style={{
                height: 3,
                background: "var(--border-default)",
                borderRadius: 2,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${stats.happiness}%`,
                  background: novaState.color,
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <NovaExpandedCard stats={stats} onCollapse={() => setIsExpanded(false)} />
      )}
    </div>
  );
}
